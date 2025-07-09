import { test, expect } from "@playwright/test";
import { Worker } from "near-workspaces";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
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
    server.on('error', reject);
  });
}

test.describe("Web4 Service Worker", () => {
  let worker;
  let treasuryWeb4Contract;

  test.beforeAll(async () => {
    // Initialize near-workspaces sandbox
    worker = await Worker.init();
    
    // Create account for treasury-web4 contract
    const treasuryWeb4Account = await worker.rootAccount.createSubAccount("treasury-testing");
    treasuryWeb4Contract = treasuryWeb4Account;

    // Path to the WASM file
    const wasmPath = path.join(__dirname, "..", "..", "..", "web4", "treasury-web4", "target", "near", "treasury_web4.wasm");
    
    // Check if the WASM file exists, if not build it first
    if (!fs.existsSync(wasmPath)) {
      throw new Error(`WASM file not found at ${wasmPath}. Please run 'cargo near build' in web4/treasury-web4/ first.`);
    }
    
    const contractWasm = fs.readFileSync(wasmPath);

    // Deploy the treasury-web4 contract to treasury-testing account
    await treasuryWeb4Contract.deploy(contractWasm);
  });

  test.afterAll(async () => {
    if (worker) {
      await worker.tearDown();
    }
  });

  // Helper function to create a test server for the NEAR contract
  async function createTestServer(treasuryWeb4Contract) {
    const serverPort = await getAvailablePort();
    
    const testServer = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${serverPort}`);
      const requestPath = url.pathname || "/";
      
      console.log(`🌐 Server request: ${requestPath}`);
      
      try {
        const web4Response = await treasuryWeb4Contract.view("web4_get", {
          request: { 
            path: requestPath,
            preloads: requestPath === "/" ? {
              [`/web4/contract/social.near/get?keys.json=%5B%22${treasuryWeb4Contract.accountId}/widget/app/metadata/**%22%5D`]: {
                contentType: "application/json",
                body: Buffer.from('{}').toString('base64')
              }
            } : undefined
          }
        });

        const bodyContent = Buffer.from(web4Response.body, 'base64').toString('utf-8');
        
        // For localhost testing, fix the instanceAccount detection
        let modifiedContent = bodyContent;
        if (requestPath === "/" && web4Response.contentType.includes('text/html')) {
          modifiedContent = bodyContent
            .replace(
              /if \(location\.host\.endsWith\("\.page"\)\)/g,
              'if (location.host.includes("localhost"))'
            )
            .replace(
              /const instanceAccount = location\.host\.split\("\."\)\[0\];/g,
              'const instanceAccount = "treasury-testing";'
            );
          console.log(`🔧 Modified HTML for localhost testing`);
        }
        
        console.log(`🌐 Serving ${requestPath}: ${web4Response.contentType}, ${modifiedContent.length} bytes`);

        // Set CORS headers to allow service worker registration
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        res.setHeader('Content-Type', web4Response.contentType);
        res.statusCode = 200;
        res.end(modifiedContent);
      } catch (error) {
        console.error(`Error serving ${requestPath}:`, error);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });

    // Start the server
    await new Promise((resolve) => {
      testServer.listen(serverPort, 'localhost', () => {
        console.log(`🌐 Test server started on http://localhost:${serverPort}`);
        resolve();
      });
    });

    return {
      server: testServer,
      port: serverPort,
      url: `http://localhost:${serverPort}`,
      close: () => new Promise((resolve) => {
        testServer.close(() => {
          console.log(`🌐 Test server stopped`);
          resolve();
        });
      })
    };
  }

  test("should serve service worker and register it in browser", async ({ browser }, testInfo) => {
    // Skip this test if not running on the treasury-testing project
    test.skip(
      testInfo.project.name !== "treasury-testing",
      "This test only runs on the treasury-testing project"
    );
    
    test.setTimeout(30000);

    // Create test server
    const testServerInfo = await createTestServer(treasuryWeb4Contract);
    
    try {
      // Create a new browser context with service workers enabled
      const context = await browser.newContext({
        serviceWorkers: 'allow' // Enable service workers (experimental feature)
      });
      
      const page = await context.newPage();

      let serviceWorkerRequests = [];
      let allRequests = [];

      // Track all requests to our test server
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes(`localhost:${testServerInfo.port}`)) {
          allRequests.push(url);
          console.log(`📡 Request: ${url}`);
          
          if (url.endsWith('/service-worker.js')) {
            serviceWorkerRequests.push(url);
            console.log(`🔧 Service Worker Request: ${url}`);
          }
        }
      });

      // Check console logs for service worker registration messages
      const swConsoleLogs = [];
      page.on('console', msg => {
        const text = msg.text();
        swConsoleLogs.push(text);
        // Log service worker related messages immediately
        if (text.includes('Service Worker') || text.includes('service worker')) {
          console.log(`🔧 SW Console: ${text}`);
        }
      });

      console.log(`🌐 Navigating to ${testServerInfo.url}`);

      // Navigate directly to localhost (service workers work on localhost)
      await page.goto(testServerInfo.url);

      // Wait for service worker detection and potential registration
      await page.waitForFunction(() => {
        return 'serviceWorker' in navigator;
      });

      console.log(`🔧 Service Worker supported: ${await page.evaluate(() => 'serviceWorker' in navigator)}`);

      // Wait for a moment to let service worker registration attempt
      await page.waitForTimeout(3000);

      // Count main page requests
      const mainPageRequests = allRequests.filter(url => !url.includes('service-worker.js')).length;
      console.log(`✅ Main page requested: ${mainPageRequests} times`);

      // Check how many service worker requests were made
      console.log(`📊 Service worker requests: ${serviceWorkerRequests.length}`);
      console.log(`📊 Total requests: ${allRequests.length}`);

      // Check if registration was attempted
      const registrationAttempted = await page.evaluate(() => {
        return window.serviceWorkerRegistrationAttempted || false;
      });
      console.log(`🔧 Registration attempted: ${registrationAttempted}`);

      // Check service worker state more thoroughly
      const serviceWorkerState = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.getRegistration();
            const ready = await navigator.serviceWorker.ready;
            return {
              hasRegistration: !!registration,
              hasReady: !!ready,
              scope: registration?.scope,
              scriptURL: registration?.active?.scriptURL || registration?.installing?.scriptURL || registration?.waiting?.scriptURL,
              state: registration?.active?.state || registration?.installing?.state || registration?.waiting?.state
            };
          } catch (e) {
            return { error: e.message };
          }
        }
        return { supported: false };
      });

      if (serviceWorkerState.hasReady) {
        console.log(`✅ Service worker ready detected`);
      }
      
      if (serviceWorkerState.scriptURL) {
        console.log(`✅ Service worker registered: ${serviceWorkerState.scriptURL}`);
      }
      
      if (serviceWorkerState.state) {
        console.log(`✅ Service worker state: ${serviceWorkerState.state}`);
      }

      // Verify service worker registration was successful
      expect(serviceWorkerState.hasRegistration).toBe(true);

      // Check that the service worker is in a good state
      if (serviceWorkerState.state === 'activated') {
        console.log(`✅ Service worker is activated and working`);
        // Note: Service worker script requests often don't appear in page.on('request') 
        // because they happen outside the normal page request flow. The important thing
        // is that the service worker was successfully registered and activated.
      } else if (serviceWorkerState.state === 'installing' || serviceWorkerState.state === 'installed') {
        console.log(`ℹ️  Service worker is still installing/activating: ${serviceWorkerState.state}`);
      } else {
        console.log(`ℹ️  Service worker state: ${serviceWorkerState.state || 'unknown'}`);
      }

      await context.close();
    } finally {
      await testServerInfo.close();
    }
  });

  test("should serve service worker with correct content", async ({ request }, testInfo) => {
    // Create test server
    const testServerInfo = await createTestServer(treasuryWeb4Contract);
    
    try {
      // Make a direct request to the service worker script
      const response = await request.get(`${testServerInfo.url}/service-worker.js`);
      
      expect(response.status()).toBe(200);
      
      // Check content type
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/javascript');
      
      // Get the content
      const content = await response.text();
      
      // Verify it contains service worker code structure
      expect(content).toContain("self.addEventListener('install'");
      expect(content).toContain("self.addEventListener('activate'");
      expect(content).toContain("skipWaiting()");
      
      // Verify RPC caching functionality is present
      expect(content).toContain("rpc.mainnet.fastnear.com");
      expect(content).toContain("handleRpcRequest");
      expect(content).toContain("CACHE_NAME");
      expect(content).toContain("POST");
      
      console.log(`✅ Service worker contains expected code structure and RPC caching`);
      console.log(`📄 Service worker size: ${content.length} characters`);
    } finally {
      await testServerInfo.close();
    }
  });

  test("should include service worker registration in HTML", async ({ request }, testInfo) => {
    // Create test server
    const testServerInfo = await createTestServer(treasuryWeb4Contract);
    
    try {
      // Make request to get the HTML content
      const response = await request.get(testServerInfo.url);
      
      expect(response.status()).toBe(200);
      
      const htmlContent = await response.text();
      
      // Verify it contains service worker registration code
      expect(htmlContent).toContain("serviceWorker' in navigator");
      expect(htmlContent).toContain("navigator.serviceWorker.register('/service-worker.js')");
      expect(htmlContent).toContain("Service Worker registered");
      expect(htmlContent).toContain("Service Worker registration failed");

      console.log(`✅ HTML contains service worker registration code`);
    } finally {
      await testServerInfo.close();
    }
  });
});
