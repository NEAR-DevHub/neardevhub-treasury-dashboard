import { test, expect } from "@playwright/test";
import { Worker } from "near-workspaces";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { utils } from "near-api-js";
import { setPageAuthSettings } from "../../util/sandboxrpc.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe("Treasury Factory Web4 Integration", () => {
  let worker;
  let treasuryFactoryContract;

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

  test("should serve service worker from treasury-factory contract", async ({ page }) => {
    test.setTimeout(30000);

    // Intercept calls to treasury-factory.near.page/service-worker.js
    await page.route("**/treasury-factory.near.page/service-worker.js", async (route) => {
      try {
        const web4Response = await treasuryFactoryContract.view("web4_get", {
          request: { 
            path: "/service-worker.js",
            preloads: {}
          }
        });

        const serviceWorkerContent = Buffer.from(web4Response.body, 'base64').toString('utf-8');

        await route.fulfill({
          status: 200,
          contentType: web4Response.contentType || "application/javascript",
          body: serviceWorkerContent
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
    
    console.log(`✅ Service worker served successfully from treasury-factory contract`);
  });
});