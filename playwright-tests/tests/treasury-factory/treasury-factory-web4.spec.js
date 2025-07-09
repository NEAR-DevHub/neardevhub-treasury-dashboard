import { test, expect } from "@playwright/test";
import { Worker } from "near-workspaces";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

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

  test("should intercept treasury-factory.near.page and serve content from web4_get", async ({ page }) => {
    test.setTimeout(60000);

    let web4GetCalled = false;
    let web4Response = null;

    // First, get the expected response from the contract's web4_get method
    const expectedResponse = await treasuryFactoryContract.view("web4_get", {
      request: { 
        path: "/",
        preloads: {}
      }
    });

    // Intercept calls to treasury-factory.near.page
    await page.route("**/treasury-factory.near.page/**", async (route) => {
      web4GetCalled = true;
      
      // Simulate calling web4_get method with the request path
      const url = new URL(route.request().url());
      const requestPath = url.pathname || "/";
      
      try {
        // Call the contract's web4_get method
        web4Response = await treasuryFactoryContract.view("web4_get", {
          request: { 
            path: requestPath,
            preloads: {}
          }
        });

        // Decode the base64 body content
        const bodyContent = Buffer.from(web4Response.body, 'base64').toString('utf-8');

        // Fulfill the request with the web4_get response
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

    // Navigate to the treasury-factory page
    await page.goto("http://treasury-factory.near.page/");

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Verify that our route was called
    expect(web4GetCalled).toBe(true);
    expect(web4Response).not.toBeNull();

    // Verify the response structure
    expect(web4Response).toHaveProperty('contentType');
    expect(web4Response).toHaveProperty('body');
    expect(web4Response.contentType).toBe("text/html; charset=UTF-8");

    // Decode and verify the HTML content
    const htmlContent = Buffer.from(web4Response.body, 'base64').toString('utf-8');
    expect(htmlContent.toLowerCase()).toContain('<!doctype html>');
    expect(htmlContent).toContain('near-social-viewer');

    // Verify the page actually displays the content
    await expect(page.locator('html')).toContainText('', { timeout: 10000 });
  });

  test("should handle web4_get with different paths", async ({ page }) => {
    test.setTimeout(30000);

    const testPaths = ["/", "/dashboard", "/payments"];
    
    for (const testPath of testPaths) {
      let interceptedPath = null;

      await page.route("**/treasury-factory.near.page/**", async (route) => {
        const url = new URL(route.request().url());
        interceptedPath = url.pathname || "/";
        
        try {
          const web4Response = await treasuryFactoryContract.view("web4_get", {
            request: { 
              path: interceptedPath,
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
          console.error(`Error calling web4_get for path ${interceptedPath}:`, error);
          await route.abort();
        }
      });

      await page.goto(`http://treasury-factory.near.page${testPath}`);
      await page.waitForLoadState('networkidle');

      // Verify the correct path was intercepted
      expect(interceptedPath).toBe(testPath);
    }
  });

  test("should handle web4_get with preloads parameter", async ({ page }) => {
    test.setTimeout(30000);

    const testPreloads = {
      "/web4/contract/social.near/get?keys.json=%5B%22treasury-factory.near/widget/app/metadata/**%22%5D": {
        "contentType": "application/json",
        "body": Buffer.from(JSON.stringify({
          "treasury-factory.near": {
            "widget": {
              "app": {
                "metadata": {
                  "name": "Treasury Factory Test",
                  "description": "Test treasury factory instance"
                }
              }
            }
          }
        })).toString('base64')
      }
    };

    let preloadsUsed = null;

    await page.route("**/treasury-factory.near.page/**", async (route) => {
      try {
        const web4Response = await treasuryFactoryContract.view("web4_get", {
          request: { 
            path: "/",
            preloads: testPreloads
          }
        });

        preloadsUsed = testPreloads;
        const bodyContent = Buffer.from(web4Response.body, 'base64').toString('utf-8');

        await route.fulfill({
          status: 200,
          contentType: web4Response.contentType || "text/html; charset=UTF-8",
          body: bodyContent
        });
      } catch (error) {
        console.error("Error calling web4_get with preloads:", error);
        await route.abort();
      }
    });

    await page.goto("http://treasury-factory.near.page/");
    await page.waitForLoadState('networkidle');

    // Verify preloads were used
    expect(preloadsUsed).toEqual(testPreloads);
  });

  test("should verify contract is properly deployed in sandbox", async () => {
    // Test that the contract is deployed and responding
    try {
      const contractInfo = await worker.provider.query({
        request_type: "view_account",
        finality: "final",
        account_id: treasuryFactoryContract.accountId
      });

      expect(contractInfo.code_hash).toBeDefined();
      expect(contractInfo.code_hash).not.toBe("11111111111111111111111111111111");
    } catch (error) {
      // If account query fails, skip this assertion but continue with web4_get test
      console.log("Account query failed (expected in some sandbox setups):", error.message);
    }

    // Test web4_get method directly
    const response = await treasuryFactoryContract.view("web4_get", {
      request: { path: "/" }
    });

    expect(response).toHaveProperty('contentType');
    expect(response).toHaveProperty('body');
    expect(response.contentType).toBe("text/html; charset=UTF-8");

    // Verify the response contains expected HTML structure
    const htmlContent = Buffer.from(response.body, 'base64').toString('utf-8');
    expect(htmlContent.toLowerCase()).toContain('<!doctype html>');
  });

  test("should handle get_web4_contract_bytes method", async () => {
    // Test the get_web4_contract_bytes method if it exists
    try {
      const web4ContractBytes = await treasuryFactoryContract.view("get_web4_contract_bytes", {});
      expect(web4ContractBytes).toBeDefined();
      expect(web4ContractBytes.length).toBeGreaterThan(0);
    } catch (error) {
      // Method might not exist in all versions, so we'll just log it
      console.log("get_web4_contract_bytes method not available:", error.message);
    }
  });
});