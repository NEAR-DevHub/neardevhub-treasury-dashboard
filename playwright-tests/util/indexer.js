import { exec, spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Indexer configuration
const INDEXER_PORT = 5001;
const INDEXER_URL = `http://localhost:${INDEXER_PORT}`;

// Global indexer management
let globalIndexerProcess = null;

/**
 * Kill any existing indexer process on the default port
 */
async function killExistingIndexer() {
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    // Find and kill any process using the indexer port
    const { stdout } = await execAsync(`lsof -ti:${INDEXER_PORT}`);
    if (stdout.trim()) {
      const pids = stdout.trim().split("\n");
      for (const pid of pids) {
        console.log(`Killing existing indexer process: ${pid}`);
        await execAsync(`kill -9 ${pid}`);
      }
      // Wait a bit for the process to fully terminate
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    // No process found or already killed
    console.log("No existing indexer process found");
  }
}

export class Indexer {
  constructor(rpcUrl = null) {
    this.indexer = null;
    this.isReady = false;
    this.rpcUrl = rpcUrl;
  }

  async init() {
    if (!this.rpcUrl) {
      throw new Error("RPC URL is required to start the indexer");
    }

    // Kill any existing indexer before starting a new one
    await killExistingIndexer();

    console.log(`Starting indexer with RPC URL: ${this.rpcUrl}`);

    const indexerPath = join(__dirname, "sputnik-indexer");
    const env = { ...process.env, PORT: INDEXER_PORT.toString() };

    this.indexer = spawn(indexerPath, [this.rpcUrl], {
      stdio: ["pipe", "pipe", "pipe"],
      env: env,
    });

    // Store reference for global cleanup
    globalIndexerProcess = this.indexer;

    return new Promise((resolve, reject) => {
      this.indexer.stdout.on("data", (data) => {
        const output = data.toString();
        console.log("Indexer stdout:", output);

        if (output.includes("Rocket has launched")) {
          console.log("Indexer startup detected!");
          this.isReady = true;

          resolve();
        }
      });

      this.indexer.stderr.on("data", (data) => {
        const error = data.toString();
        console.error("Indexer stderr:", error);

        if (error.includes("Address already in use")) {
          reject(
            new Error(
              `Port ${INDEXER_PORT} is already in use. Please kill existing indexer process.`
            )
          );
        }
      });

      this.indexer.on("error", (error) => {
        console.error("Indexer process error:", error);

        reject(error);
      });

      this.indexer.on("exit", (code) => {
        if (code !== 0) {
          console.error(`Indexer process exited with code ${code}`);

          reject(new Error(`Indexer process exited with code ${code}`));
        }
      });
    });
  }

  async stop() {
    if (this.indexer) {
      this.indexer.kill();
      this.isReady = false;
      console.log("✅ Indexer stopped");

      // Clear global reference
      if (globalIndexerProcess === this.indexer) {
        globalIndexerProcess = null;
      }
    }
  }

  /**
   * Create a route handler for Playwright to redirect indexer requests
   * @param {import('playwright').Page} page - Playwright page object
   */
  async attachIndexerRoutes(page) {
    const handleIndexerRoute = async (route, request) => {
      try {
        
        const url = new URL(request.url());
        const localIndexerUrl = `${INDEXER_URL}${url.pathname}${url.search}`;

        const response = await fetch(localIndexerUrl);
        const data = await response.json();
        console.log("response", data);

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      } catch (error) {
        console.error("❌ Error fetching from local indexer:", error);
        console.log("Falling back to original request");
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
 * Global cleanup function to be called at the end of test suites
 */
export async function cleanupGlobalIndexer() {
  if (globalIndexerProcess) {
    console.log("Cleaning up global indexer process...");
    globalIndexerProcess.kill();
    globalIndexerProcess = null;
  }

  // Also kill any remaining processes on the port
  await killExistingIndexer();
}
