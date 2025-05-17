import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { Worker } from "near-workspaces";
import { redirectWeb4 } from "../../util/web4.js";

test.describe("Intents Deposit UI", () => {
  let worker;
  let root;
  let treasury;
  let intents;

  test.beforeAll(async () => {
    worker = await Worker.init();
    root = worker.rootAccount;

    // Import intents contract
    intents = await root.importContract({
      mainnetContract: "intents.near", // Replace with your actual intents contract if different
    });

    // Import treasury contract (dashboard instance)
    treasury = await root.importContract({
      mainnetContract: "treasury-testing.near", // Replace with your actual treasury contract
    });

    // Initialize intents contract (if necessary, adapt to your contract's init method)
    try {
      await intents.call(intents.accountId, "new", {
        config: {
          wnear_id: "wrap.near", // Adjust if your config is different
          fees: { fee: 100, fee_collector: intents.accountId },
          roles: { super_admins: [intents.accountId], admins: {}, grantees: {} },
        },
      });
    } catch (e) {
      if (!e.message.includes("Contract already initialized")) {
        throw e;
      }
    }
    // Note: Treasury contract initialization is not included here as it might be complex
    // and depends on the specific setup. Add if needed for your tests.
  });

  test.afterAll(async () => {
    await worker.tearDown();
  });

  test("should display the deposit button on the Intents Portfolio", async ({
    page,
  }) => {
    await redirectWeb4({ page, contractId: treasury.accountId });
    await page.goto(`https://${treasury.accountId}.page`);

    // Wait for the IntentsPortfolio component to be visible
    const intentsPortfolioLocator = page.locator(
      '[data-component="widgets.treasury-factory.near/widget/pages.dashboard.IntentsPortfolio"]'
    );
    await expect(intentsPortfolioLocator).toBeVisible({ timeout: 10000 });

    // Check for the "Near Intents" heading to ensure the component has loaded
    await expect(
      intentsPortfolioLocator.locator('h5:has-text("Near Intents")')
    ).toBeVisible();

    // Check for the Deposit button
    const depositButton = intentsPortfolioLocator.getByRole("button", {
      name: "Deposit",
    });
    await expect(depositButton).toBeVisible();
    await expect(depositButton).toHaveClass(/btn-success/); // Check for green color
  });

  // TODO: Add more tests for the deposit functionality once implemented
  // e.g., test("clicking deposit button opens deposit modal", async ({ page }) => { ... });
  // test("can successfully deposit NEAR via intents UI", async ({ page }) => { ... });
  // test("can successfully deposit NEP-141 token (e.g., ETH) via intents UI", async ({ page }) => { ... });
});
