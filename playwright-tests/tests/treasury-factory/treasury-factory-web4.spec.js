import { test, expect } from "@playwright/test";
import { Worker } from "near-workspaces";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { utils } from "near-api-js";
import { setPageAuthSettings } from "../../util/sandboxrpc.js";
import http from "http";
import net from "net";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to find an available port
async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

test.describe("Treasury Factory Web4 Integration", () => {
  let worker;
  let treasuryFactoryContract;

  test.beforeEach(async ({ page }, testInfo) => {
    // Skip test if not running in treasury-testing project
    if (testInfo.project.name !== 'treasury-testing') {
      test.skip();
    }
  });

  test.beforeAll(async () => {
    // Initialize near-workspaces sandbox
    worker = await Worker.init();
    
    // Import the treasury-factory.near account from mainnet
    treasuryFactoryContract = await worker.rootAccount.importContract({
      mainnetContract: "treasury-factory.near",
    });
    
    // Load the treasury-factory contract WASM
    const wasmPath = path.resolve(__dirname, "../../../treasury-factory/target/near/treasury_factory.wasm");
    const contractWasm = fs.readFileSync(wasmPath);

    // Deploy the treasury-factory contract to the imported account
    await treasuryFactoryContract.deploy(contractWasm);
  });

  test.afterAll(async () => {
    if (worker) {
      await worker.tearDown();
    }
  });

  // Helper function to create a test server for the treasury-factory contract
  async function createTestServer() {
    const serverPort = await getAvailablePort();

    const testServer = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${serverPort}`);
      const requestPath = url.pathname || "/";

      console.log(`🌐 Server request: ${requestPath}`);

      try {
        const web4Response = await treasuryFactoryContract.view("web4_get", {
          request: {
            path: requestPath,
            preloads: {}
          }
        });

        const bodyContent = Buffer.from(web4Response.body, "base64").toString("utf-8");

        // For localhost testing, fix the instanceAccount detection
        let modifiedContent = bodyContent;
        if (
          requestPath === "/" &&
          web4Response.contentType.includes("text/html")
        ) {
          modifiedContent = bodyContent
            .replace(
              /if \(location\.host\.endsWith\("\.page"\)\)/g,
              'if (location.host.includes("localhost"))'
            )
            .replace(
              /const instanceAccount = location\.host\.split\("\."\)\[0\];/g,
              'const instanceAccount = "treasury-factory";'
            );
          console.log(`🔧 Modified HTML for localhost testing`);
        }

        // Set CORS headers to allow service worker registration
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (requestPath === "/service-worker.js") {
          res.setHeader("Content-Type", "application/javascript");
          res.setHeader("Service-Worker-Allowed", "/");
        } else {
          res.setHeader("Content-Type", web4Response.contentType || "text/html; charset=UTF-8");
        }

        res.writeHead(200);
        res.end(modifiedContent);
      } catch (error) {
        console.error("Error handling request:", error);
        res.writeHead(500);
        res.end("Internal Server Error");
      }
    });

    await new Promise((resolve) => {
      testServer.listen(serverPort, () => {
        console.log(`🚀 Test server listening on http://localhost:${serverPort}`);
        resolve();
      });
    });

    return {
      server: testServer,
      port: serverPort,
      url: `http://localhost:${serverPort}`,
      close: () =>
        new Promise((resolve) => {
          testServer.close(() => {
            console.log("🛑 Test server closed");
            resolve();
          });
        }),
    };
  }

  test("should display webassemblymusic-treasury.near under My Treasuries when logged in", async ({ page }) => {
    test.setTimeout(60000);

    let rpcMainnetRequests = [];
    let rpcFastnearRequests = [];

    // Intercept and block rpc.mainnet.near.org requests
    await page.route("**/rpc.mainnet.near.org/**", async (route) => {
      rpcMainnetRequests.push(route.request().url());
      await route.abort();
    });

    // Intercept rpc.mainnet.fastnear.com requests and track them
    await page.route("**/rpc.mainnet.fastnear.com/**", async (route) => {
      rpcFastnearRequests.push(route.request().url());
      
      const request = route.request();
      if (request.method() === "POST") {
        const postData = request.postDataJSON();
        
        // Handle web4_get calls to treasury-factory.near
        if (postData?.params?.account_id === "treasury-factory.near" && 
            postData?.params?.method_name === "web4_get") {
          try {
            const web4Response = await treasuryFactoryContract.view("web4_get", {
              request: { 
                path: postData.params.args ? 
                  JSON.parse(Buffer.from(postData.params.args_base64 || "", 'base64').toString()).request?.path || "/" 
                  : "/",
                preloads: {}
              }
            });
            
            const json = {
              jsonrpc: "2.0",
              result: {
                result: Array.from(new TextEncoder().encode(JSON.stringify(web4Response))),
              },
              id: postData.id
            };
            
            await route.fulfill({ json });
            return;
          } catch (error) {
            console.error("Error calling web4_get:", error);
          }
        }
      }
      
      // For all other requests, continue to fastnear
      await route.continue();
    });

    // Intercept calls to treasury-factory.near.page and serve content from web4_get
    await page.route("**/treasury-factory.near.page/**", async (route) => {
      const url = new URL(route.request().url());
      const requestPath = url.pathname || "/";
      
      try {
        const web4Response = await treasuryFactoryContract.view("web4_get", {
          request: { 
            path: requestPath,
            preloads: {}
          }
        });

        const bodyContent = Buffer.from(web4Response.body, 'base64').toString('utf-8');

        await route.fulfill({
          status: 200,
          contentType: web4Response.contentType || "text/html; charset=UTF-8",
          body: bodyContent
        });
      } catch (error) {
        console.error("Error calling web4_get:", error);
        await route.abort();
      }
    });

    // Navigate to the treasury-factory page first
    await page.goto("http://treasury-factory.near.page/");

    // Setup login using the existing setPageAuthSettings function
    const keyPair = utils.KeyPair.fromRandom("ed25519");
    await setPageAuthSettings(page, "petersalomonsen.near", keyPair);

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for the app to initialize
    await page.waitForTimeout(5000);

    // Look for "My Treasuries" heading
    await expect(page.getByText("My Treasuries")).toBeVisible({ timeout: 30000 });

    // Look for webassemblymusic-treasury.near specifically - use first() to avoid strict mode violation
    await expect(page.getByText("webassemblymusic-treasury").first()).toBeVisible({ timeout: 15000 });

    // Verify no requests went to rpc.mainnet.near.org
    expect(rpcMainnetRequests).toHaveLength(0);

    // Verify requests went to rpc.mainnet.fastnear.com
    expect(rpcFastnearRequests.length).toBeGreaterThan(0);

    console.log(`✅ No requests to rpc.mainnet.near.org`);
    console.log(`✅ ${rpcFastnearRequests.length} requests to rpc.mainnet.fastnear.com`);
  });

  test("should automatically register and activate service worker on localhost", async ({ page, context }) => {
    test.setTimeout(60000);

    // Create local test server
    const testServerInfo = await createTestServer();

    try {
      const consoleMessages = [];
      const rpcRequests = [];

      // Collect console messages
      page.on('console', msg => {
        const text = msg.text();
        consoleMessages.push(text);
        if (text.includes('Service Worker:') || text.includes('registered')) {
          console.log(`  📝 Console: ${text}`);
        }
      });

      // Track RPC requests
      await page.route("**/rpc.mainnet.fastnear.com/**", async (route) => {
        const request = route.request();
        const url = request.url();
        
        if (request.method() === "POST") {
          const postData = request.postDataJSON();
          rpcRequests.push({
            url,
            method: postData?.method,
            params: postData?.params
          });
        }

        await route.continue();
      });

      // Navigate to the local server (service worker should auto-register)
      await page.goto(testServerInfo.url, { waitUntil: "networkidle" });
      
      // Wait a bit for the page to load and execute scripts
      await page.waitForTimeout(2000);
      
      // Wait for automatic service worker registration from the HTML
      await page.waitForFunction(
        () => {
          if (!window.navigator.serviceWorker) {
            console.log('Service Worker API not available');
            return false;
          }
          return window.navigator.serviceWorker.ready;
        },
        { timeout: 20000 }
      );
      
      // Check if service worker is registered (don't require it to control the page immediately)
      const swStatus = await page.evaluate(async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          return {
            hasRegistration: !!registration,
            state: registration?.active?.state,
            hasController: !!navigator.serviceWorker.controller
          };
        } catch (e) {
          return { error: e.message };
        }
      });
      
      console.log('📋 SW Status after registration:', swStatus);

      // Check registration status
      const registrationResult = await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        return {
          success: !!registration,
          scope: registration?.scope,
          active: !!registration?.active,
          state: registration?.active?.state,
          controller: !!navigator.serviceWorker.controller
        };
      });

      console.log('📋 Auto-registration result:', registrationResult);
      expect(registrationResult.success).toBe(true);
      expect(registrationResult.active).toBe(true);

      // Wait for service worker to fully activate
      await page.waitForTimeout(2000);
      
      // Test caching by making requests
      await page.evaluate(async () => {
        // Trigger some fetch requests that the service worker might cache
        try {
          await fetch('https://rpc.mainnet.fastnear.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: "1",
              method: "query",
              params: {
                request_type: "call_function",
                account_id: "test.near",
                method_name: "get_balance",
                args_base64: ""
              }
            })
          });
        } catch (e) {
          console.log('Test RPC request failed (expected in test environment)');
        }
      });

      // Check console messages for service worker activity
      const swMessages = consoleMessages.filter(msg => 
        msg.includes('Service Worker') || 
        msg.includes('registered') ||
        msg.includes('activated')
      );
      
      console.log(`📝 Service Worker console messages: ${swMessages.length}`);
      console.log(`✅ Service worker is registered and active on localhost`);
      
    } finally {
      // Clean up the test server
      await testServerInfo.close();
    }
  });

  test("should serve service worker with correct content and headers", async ({ page }) => {
    test.setTimeout(30000);

    // Intercept service worker request
    let serviceWorkerResponse;
    await page.route("**/treasury-factory.near.page/service-worker.js", async (route) => {
      try {
        const web4Response = await treasuryFactoryContract.view("web4_get", {
          request: { 
            path: "/service-worker.js",
            preloads: {}
          }
        });

        const serviceWorkerContent = Buffer.from(web4Response.body, 'base64').toString('utf-8');
        serviceWorkerResponse = {
          content: serviceWorkerContent,
          contentType: web4Response.contentType || "application/javascript"
        };

        await route.fulfill({
          status: 200,
          contentType: serviceWorkerResponse.contentType,
          body: serviceWorkerContent,
          headers: {
            'Content-Type': serviceWorkerResponse.contentType,
            'Service-Worker-Allowed': '/'
          }
        });
      } catch (error) {
        console.error("Error calling web4_get for service worker:", error);
        await route.abort();
      }
    });

    // Navigate to the service worker URL
    const response = await page.goto("http://treasury-factory.near.page/service-worker.js");
    
    // Verify response
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/javascript');
    
    // Get the content and verify it contains expected service worker code
    const content = await response.text();
    expect(content).toContain('Service Worker for Treasury Factory with RPC Caching');
    expect(content).toContain('treasury-factory-rpc-cache');
    expect(content).toContain('rpc.mainnet.fastnear.com');
    expect(content).toContain('self.addEventListener("install"');
    expect(content).toContain('self.addEventListener("activate"');
    expect(content).toContain('self.addEventListener("fetch"');
    expect(content).toContain('handleRpcRequest');
    
    console.log(`✅ Service worker content is correct`);
    console.log(`📄 Service worker size: ${content.length} characters`);
  });
});