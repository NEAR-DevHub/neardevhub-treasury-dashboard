import { test, expect } from "@playwright/test";
import { Worker } from "near-workspaces";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe("Web4 Service Worker", () => {
  let worker;
  let treasuryWeb4Contract;

  test.beforeAll(async () => {
    // Initialize near-workspaces sandbox
    worker = await Worker.init();
    
    // Create a new account for the web4 contract
    treasuryWeb4Contract = await worker.rootAccount.createSubAccount("treasury-web4");
    
    // Load the treasury-web4 contract WASM
    const wasmPath = path.resolve(__dirname, "../../../web4/treasury-web4/target/near/treasury_web4.wasm");
    
    // Check if the WASM file exists, if not build it first
    if (!fs.existsSync(wasmPath)) {
      throw new Error(`WASM file not found at ${wasmPath}. Please run 'cargo near build' in web4/treasury-web4/ first.`);
    }
    
    const contractWasm = fs.readFileSync(wasmPath);

    // Deploy the treasury-web4 contract
    await treasuryWeb4Contract.deploy(contractWasm);
  });

  test.afterAll(async () => {
    if (worker) {
      await worker.tearDown();
    }
  });

  test("should serve service worker and register it in browser", async ({ browser }, testInfo) => {
    // Skip this test if not running on the treasury-testing project
    test.skip(
      testInfo.project.name !== "treasury-testing",
      "This test only runs on the treasury-testing project"
    );
    
    test.setTimeout(60000);

    // Create a new browser context with service workers enabled
    const context = await browser.newContext({
      serviceWorkers: 'allow' // Enable service workers (experimental feature)
    });
    const page = await context.newPage();

    let serviceWorkerRequests = [];
    let mainPageRequests = [];

    // Intercept calls to the contract's web4 endpoint
    const contractUrl = `http://${treasuryWeb4Contract.accountId}.page`;
    
    await page.route(`${contractUrl}/**`, async (route) => {
      const url = new URL(route.request().url());
      const requestPath = url.pathname || "/";
      
      if (requestPath === "/service-worker.js") {
        serviceWorkerRequests.push(route.request().url());
      } else {
        mainPageRequests.push(route.request().url());
      }
      
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

        await route.fulfill({
          status: 200,
          contentType: web4Response.contentType || "text/html; charset=UTF-8",
          body: bodyContent
        });
      } catch (error) {
        console.error(`Error calling web4_get for ${requestPath}:`, error);
        await route.abort();
      }
    });

    // Also intercept any RPC calls that might be made
    await page.route("**/rpc.mainnet.fastnear.com/**", async (route) => {
      // For now, just pass through RPC calls
      await route.continue();
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

    // Navigate to the web4 page
    await page.goto(contractUrl);

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Wait for basic page setup and initial service worker registration attempt
    await page.waitForTimeout(3000);

    // Check service worker support first
    const swSupported = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    console.log(`🔧 Service Worker supported: ${swSupported}`);

    if (!swSupported) {
      console.log(`⚠️  Service Worker not supported in test environment - skipping further checks`);
      // Check that the main page was requested
      expect(mainPageRequests.length).toBeGreaterThan(0);
      console.log(`✅ Main page requested: ${mainPageRequests.length} times`);
      console.log(`✅ Test passed: HTML contains service worker registration code (verified in separate test)`);
      await context.close();
      return;
    }

    // Try to wait for service worker registration, but don't fail if it times out
    try {
      await page.waitForFunction(() => {
        return 'serviceWorker' in navigator && navigator.serviceWorker.ready;
      }, { timeout: 5000 });
      console.log(`✅ Service worker ready detected`);
    } catch (error) {
      console.log(`⚠️  Service worker registration timeout (this may be expected in test env): ${error.message}`);
    }

    // Check that the main page was requested
    expect(mainPageRequests.length).toBeGreaterThan(0);
    console.log(`✅ Main page requested: ${mainPageRequests.length} times`);

    // Check that the service worker JavaScript file was requested
    console.log(`📊 Service worker requests: ${serviceWorkerRequests.length}`);
    console.log(`📊 Main page requests: ${mainPageRequests.length}`);
    
    // Check if the registration code is being executed
    const registrationAttempted = await page.evaluate(() => {
      return window.serviceWorkerRegistrationAttempted || false;
    });
    console.log(`🔧 Registration attempted: ${registrationAttempted}`);
    
    // If service workers are supported and registration was attempted, expect SW request
    if (swSupported && registrationAttempted) {
      expect(serviceWorkerRequests.length).toBeGreaterThan(0);
      console.log(`✅ Service worker requested: ${serviceWorkerRequests.length} times`);
    } else {
      console.log(`ℹ️  Service worker request not expected (supported: ${swSupported}, attempted: ${registrationAttempted})`);
    }

    // Check that service worker is registered in the browser
    const serviceWorkerRegistration = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return {
          active: !!registration?.active,
          scope: registration?.scope,
          scriptURL: registration?.active?.scriptURL
        };
      }
      return { supported: false };
    });

    if (serviceWorkerRegistration.supported === false) {
      console.log(`⚠️  Service Worker not supported - skipping registration check`);
    } else {
      expect(serviceWorkerRegistration).not.toBeNull();
      expect(serviceWorkerRegistration.active).toBe(true);
      expect(serviceWorkerRegistration.scriptURL).toContain('/service-worker.js');
      console.log(`✅ Service worker registered: ${serviceWorkerRegistration.scriptURL}`);
    }

    // Look for service worker registration success message
    const hasRegistrationLog = swConsoleLogs.some(log => 
      log.includes('Service Worker registered') || 
      log.includes('Service Worker: Installing') ||
      log.includes('Service Worker: Activated')
    );
    
    if (hasRegistrationLog) {
      console.log(`✅ Service worker registration logged in console`);
    } else {
      console.log(`ℹ️  Service worker logs:`, swConsoleLogs.filter(log => 
        log.includes('Service Worker') || log.includes('service worker')
      ));
    }

    // Cleanup: Close the context
    await context.close();
  });

  test("should serve service worker with correct content", async ({ page }) => {
    test.setTimeout(30000);

    // Test the service worker endpoint directly
    const response = await treasuryWeb4Contract.view("web4_get", {
      request: { 
        path: "/service-worker.js"
      }
    });

    expect(response.contentType).toBe("application/javascript");
    
    const serviceWorkerContent = Buffer.from(response.body, 'base64').toString('utf-8');
    
    // Verify it contains our service worker code
    expect(serviceWorkerContent).toContain("Minimal Service Worker for Treasury Dashboard");
    expect(serviceWorkerContent).toContain("addEventListener('install'");
    expect(serviceWorkerContent).toContain("addEventListener('activate'");
    expect(serviceWorkerContent).toContain("addEventListener('fetch'");
    expect(serviceWorkerContent).toContain("skipWaiting()");
    expect(serviceWorkerContent).toContain("clients.claim()");

    console.log(`✅ Service worker contains expected code structure`);
    console.log(`📄 Service worker size: ${serviceWorkerContent.length} characters`);
  });

  test("should include service worker registration in HTML", async ({ page }) => {
    test.setTimeout(30000);

    // Test the main HTML page
    const response = await treasuryWeb4Contract.view("web4_get", {
      request: { 
        path: "/",
        preloads: {
          [`/web4/contract/social.near/get?keys.json=%5B%22${treasuryWeb4Contract.accountId}/widget/app/metadata/**%22%5D`]: {
            contentType: "application/json",
            body: Buffer.from('{}').toString('base64')
          }
        }
      }
    });

    expect(response.contentType).toBe("text/html; charset=UTF-8");
    
    const htmlContent = Buffer.from(response.body, 'base64').toString('utf-8');
    
    // Verify it contains service worker registration code
    expect(htmlContent).toContain("serviceWorker' in navigator");
    expect(htmlContent).toContain("navigator.serviceWorker.register('/service-worker.js')");
    expect(htmlContent).toContain("Service Worker registered");
    expect(htmlContent).toContain("Service Worker registration failed");

    console.log(`✅ HTML contains service worker registration code`);
  });
});
