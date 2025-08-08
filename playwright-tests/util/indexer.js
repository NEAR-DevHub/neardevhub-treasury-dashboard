import { exec, spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { platform, arch } from "os";
import { promisify } from "util";
import { access } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cache OS detection to avoid repeated calls
const OS_INFO = {
  platform: platform(),
  architecture: arch(),
  binaryPath: null,
};

// Indexer configuration with port pool management
const PORT_CONFIG = {
  start: 5001,
  range: 100,
  nextAvailable: 5001,
  usedPorts: new Set(),
};

// Global indexer management with weak references for better GC
let globalIndexerProcesses = new Map(); // Track processes by port

// Cache for execAsync to avoid repeated promisify calls
const execAsync = promisify(exec);

// Logging utility for consistent output
const logger = {
  info: (msg) => console.log(`[Indexer] ${msg}`),
  error: (msg) => console.error(`[Indexer] ❌ ${msg}`),
  success: (msg) => console.log(`[Indexer] ✅ ${msg}`),
  debug: (msg) => process.env.DEBUG && console.log(`[Indexer] 🔍 ${msg}`),
};

/**
 * Get the appropriate indexer binary path based on OS and architecture
 */
function getIndexerBinaryPath() {
  if (OS_INFO.binaryPath) {
    return OS_INFO.binaryPath;
  }

  // Navigate to the indexer-builds directory
  const buildsDir = join(__dirname, "..", "indexer-builds");

  if (OS_INFO.platform === "darwin") {
    // macOS - use unified binary for both architectures
    OS_INFO.binaryPath = join(buildsDir, "sputnik-indexer-mac");
  } else if (OS_INFO.platform === "linux") {
    // Linux - use unified binary for both architectures
    OS_INFO.binaryPath = join(buildsDir, "sputnik-indexer-linux");
  } else {
    throw new Error(
      `Unsupported OS: ${OS_INFO.platform} (${OS_INFO.architecture})`
    );
  }

  return OS_INFO.binaryPath;
}

/**
 * Find an available port for the indexer - optimized with port pool
 */
async function findAvailablePort() {
  const { start, range, nextAvailable } = PORT_CONFIG;

  // Try from next available port first
  for (let port = nextAvailable; port < start + range; port++) {
    if (!PORT_CONFIG.usedPorts.has(port)) {
      try {
        const { stdout } = await execAsync(`lsof -ti:${port}`);
        if (!stdout.trim()) {
          PORT_CONFIG.nextAvailable = port + 1;
          PORT_CONFIG.usedPorts.add(port);
          return port;
        }
      } catch (error) {
        // Port is available (lsof returns error when no process found)
        PORT_CONFIG.nextAvailable = port + 1;
        PORT_CONFIG.usedPorts.add(port);
        return port;
      }
    }
  }

  // If no port found from nextAvailable, scan from start
  for (let port = start; port < start + range; port++) {
    if (!PORT_CONFIG.usedPorts.has(port)) {
      try {
        const { stdout } = await execAsync(`lsof -ti:${port}`);
        if (!stdout.trim()) {
          PORT_CONFIG.nextAvailable = port + 1;
          PORT_CONFIG.usedPorts.add(port);
          return port;
        }
      } catch (error) {
        // Port is available
        PORT_CONFIG.nextAvailable = port + 1;
        PORT_CONFIG.usedPorts.add(port);
        return port;
      }
    }
  }

  throw new Error("No available ports in range");
}

/**
 * Release a port back to the pool
 */
function releasePort(port) {
  PORT_CONFIG.usedPorts.delete(port);
  logger.debug(`Released port ${port} back to pool`);
}

/**
 * Kill any existing indexer process on a specific port - optimized version
 */
async function killExistingIndexer(port) {
  try {
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    if (stdout.trim()) {
      const pids = stdout
        .trim()
        .split("\n")
        .filter((pid) => pid.trim());
      if (pids.length > 0) {
        logger.info(
          `Killing existing indexer process on port ${port}: ${pids.join(", ")}`
        );
        // Kill all processes at once instead of one by one
        await execAsync(`kill -9 ${pids.join(" ")}`);
        // Reduced wait time
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  } catch (error) {
    // Port is free or no process found - this is expected
  }
}

export class Indexer {
  constructor(rpcUrl = null) {
    this.indexer = null;
    this.isReady = false;
    this.rpcUrl = rpcUrl;
    this.port = null;
    this.indexerUrl = null;
    this.startupTimeout = null;
    this.cleanupCalled = false;

    // Ensure cleanup on process exit - only add listeners once
    if (!Indexer.cleanupListenersAdded) {
      const cleanupHandler = () => {
        if (!this.cleanupCalled) {
          this.cleanup();
        }
      };

      process.on("exit", cleanupHandler);
      process.on("SIGINT", cleanupHandler);
      process.on("SIGTERM", cleanupHandler);
      process.on("uncaughtException", cleanupHandler);
      process.on("unhandledRejection", cleanupHandler);
      Indexer.cleanupListenersAdded = true;
    }
  }

  async init() {
    if (!this.rpcUrl) {
      throw new Error("RPC URL is required to start the indexer");
    }

    // Find an available port
    this.port = await findAvailablePort();
    this.indexerUrl = `http://localhost:${this.port}`;

    // Kill any existing indexer on this port
    await killExistingIndexer(this.port);

    logger.info(
      `Starting indexer on port ${this.port} with RPC URL: ${this.rpcUrl}`
    );

    const indexerPath = getIndexerBinaryPath();
    logger.debug(`Using indexer binary: ${indexerPath}`);

    // Check if binary exists
    try {
      await access(indexerPath);
    } catch (error) {
      throw new Error(
        `Indexer binary not found: ${indexerPath}. Please ensure the appropriate binary is available in playwright-tests/indexer-builds/`
      );
    }

    const env = {
      ...process.env,
      PORT: this.port.toString(),
      NEAR_RPC_URL: this.rpcUrl,
    };

    this.indexer = spawn(indexerPath, [], {
      stdio: ["pipe", "pipe", "pipe"],
      env: env,
    });

    // Store reference for global cleanup
    globalIndexerProcesses.set(this.port, this.indexer);

    return new Promise((resolve, reject) => {
      // Set a timeout for startup detection
      this.startupTimeout = setTimeout(() => {
        logger.info("Indexer startup timeout - assuming it's ready");
        this.isReady = true;
        resolve();
      }, 15000); // 15 second timeout

      this.indexer.stdout.on("data", (data) => {
        const output = data.toString();
        logger.debug(`Indexer stdout: ${output.trim()}`);

        if (
          output.includes("Rocket has launched") ||
          output.includes("launched from")
        ) {
          logger.success("Indexer startup detected!");
          this.isReady = true;
          if (this.startupTimeout) {
            clearTimeout(this.startupTimeout);
            this.startupTimeout = null;
          }
          resolve();
        }
      });

      this.indexer.stderr.on("data", (data) => {
        const error = data.toString();
        logger.error(`Indexer stderr: ${error.trim()}`);

        if (error.includes("Address already in use")) {
          this.cleanup(); // Clean up before rejecting
          if (this.startupTimeout) {
            clearTimeout(this.startupTimeout);
            this.startupTimeout = null;
          }
          reject(
            new Error(
              `Port ${this.port} is already in use. Please kill existing indexer process.`
            )
          );
        }
      });

      this.indexer.on("error", (error) => {
        logger.error(`Indexer process error: ${error.message}`);
        this.cleanup(); // Clean up before rejecting
        if (this.startupTimeout) {
          clearTimeout(this.startupTimeout);
          this.startupTimeout = null;
        }
        reject(error);
      });

      this.indexer.on("exit", (code) => {
        if (code !== 0) {
          logger.error(`Indexer process exited with code ${code}`);
          this.cleanup(); // Clean up before rejecting
          if (this.startupTimeout) {
            clearTimeout(this.startupTimeout);
            this.startupTimeout = null;
          }
          reject(new Error(`Indexer process exited with code ${code}`));
        }
      });
    });
  }

  async stop() {
    await this.cleanup();
  }

  cleanup() {
    if (this.cleanupCalled) {
      return; // Prevent double cleanup
    }
    this.cleanupCalled = true;

    if (this.startupTimeout) {
      clearTimeout(this.startupTimeout);
      this.startupTimeout = null;
    }

    if (this.indexer) {
      try {
        this.indexer.kill("SIGKILL"); // Force kill
        this.isReady = false;
        logger.success(`Indexer stopped on port ${this.port}`);

        // Clear global reference
        globalIndexerProcesses.delete(this.port);

        // Release port back to pool
        if (this.port) {
          releasePort(this.port);
        }
      } catch (error) {
        logger.error(
          `Error stopping indexer on port ${this.port}: ${error.message}`
        );
      }
    }
  }

  /**
   * Create a route handler for Playwright to redirect indexer requests - optimized version
   * @param {import('playwright').Page} page - Playwright page object
   */
  async attachIndexerRoutes(page) {
    const handleIndexerRoute = async (route, request) => {
      try {
        const url = new URL(request.url());
        const localIndexerUrl = `${this.indexerUrl}${url.pathname}${url.search}`;

        // Add timeout to fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(localIndexerUrl, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        logger.debug("Indexer response received successfully");

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      } catch (error) {
        logger.error(`Error fetching from local indexer: ${error.message}`);
        logger.debug("Falling back to original request");
        await route.continue();
      }
    };

    // Apply indexer route handler to sputnik-indexer.fly.dev URLs
    await page.route("**/sputnik-indexer.fly.dev/**", handleIndexerRoute);

    // Also apply to browser context for comprehensive coverage
    const browserContext = page.context();
    await browserContext.route(
      "**/sputnik-indexer.fly.dev/**",
      handleIndexerRoute
    );
  }
}

/**
 * Global cleanup function to be called at the end of test suites - optimized version
 */
export async function cleanupGlobalIndexer() {
  logger.info("Cleaning up all indexer processes...");

  // Kill all tracked indexer processes in parallel
  const killPromises = [];
  for (const [port, process] of globalIndexerProcesses) {
    logger.info(`Killing indexer process on port ${port}`);
    killPromises.push(
      (async () => {
        try {
          process.kill("SIGKILL");
        } catch (error) {
          logger.error(
            `Error killing process on port ${port}: ${error.message}`
          );
        }
      })()
    );
  }

  await Promise.all(killPromises);
  globalIndexerProcesses.clear();

  // Reset port pool
  PORT_CONFIG.usedPorts.clear();
  PORT_CONFIG.nextAvailable = PORT_CONFIG.start;

  // Also kill any remaining processes in the port range - batch operation
  const portRange = Array.from(
    { length: PORT_CONFIG.range },
    (_, i) => PORT_CONFIG.start + i
  );
  const batchSize = 10;

  for (let i = 0; i < portRange.length; i += batchSize) {
    const batch = portRange.slice(i, i + batchSize);
    await Promise.all(batch.map((port) => killExistingIndexer(port)));
  }
}

/**
 * Force cleanup all indexer processes (for emergency cleanup) - optimized version
 */
export async function forceCleanupAllIndexers() {
  logger.info("Force cleaning up all indexer processes...");

  try {
    // Kill all processes in the port range in batches
    const portRange = Array.from(
      { length: PORT_CONFIG.range },
      (_, i) => PORT_CONFIG.start + i
    );
    const batchSize = 10;

    for (let i = 0; i < portRange.length; i += batchSize) {
      const batch = portRange.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (port) => {
          try {
            const { stdout } = await execAsync(`lsof -ti:${port}`);
            if (stdout.trim()) {
              const pids = stdout
                .trim()
                .split("\n")
                .filter((pid) => pid.trim());
              if (pids.length > 0) {
                logger.info(
                  `Force killing processes ${pids.join(", ")} on port ${port}`
                );
                await execAsync(`kill -9 ${pids.join(" ")}`);
              }
            }
          } catch (error) {
            // Port is free or no process found
          }
        })
      );
    }

    // Clear global tracking and reset port pool
    globalIndexerProcesses.clear();
    PORT_CONFIG.usedPorts.clear();
    PORT_CONFIG.nextAvailable = PORT_CONFIG.start;

    logger.success("Force cleanup completed");
  } catch (error) {
    logger.error(`Error during force cleanup: ${error.message}`);
  }
}

// Export port pool info for debugging
export function getPortPoolInfo() {
  return {
    usedPorts: Array.from(PORT_CONFIG.usedPorts),
    nextAvailable: PORT_CONFIG.nextAvailable,
    totalUsed: PORT_CONFIG.usedPorts.size,
  };
}
