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

  test("should display the deposit button in the Total Balance card", async ({
    page,
  }) => {
    await redirectWeb4({ page, contractId: treasury.accountId });
    await page.goto(`https://${treasury.accountId}.page`);

    // Wait for the main dashboard content to load, e.g., the Total Balance card
    const totalBalanceCardLocator = page.locator(".card.card-body", {
      hasText: "Total Balance",
    });
    await expect(totalBalanceCardLocator).toBeVisible({ timeout: 20000 }); // Increased timeout

    // Check for the Deposit button within the Total Balance card
    const depositButton = totalBalanceCardLocator.getByRole("button", {
      name: "Deposit",
    });
    await expect(depositButton).toBeVisible();
    await expect(depositButton).toHaveClass(/btn-success/); // Check for green color
  });

  test("clicking deposit button opens deposit modal with correct initial content", async ({
    page,
  }) => {
    await redirectWeb4({ page, contractId: treasury.accountId });
    await page.goto(`https://${treasury.accountId}.page`);

    const totalBalanceCardLocator = page.locator(".card.card-body", {
      hasText: "Total Balance",
    });
    await expect(totalBalanceCardLocator).toBeVisible({ timeout: 20000 });

    const depositButton = totalBalanceCardLocator.getByRole("button", {
      name: "Deposit",
    });
    await depositButton.click();

    const modalLocator = page.locator(".modal-dialog");
    await expect(modalLocator).toBeVisible({ timeout: 10000 });

    await expect(
      modalLocator.locator("h5.modal-title:has-text('Deposit Funds')")
    ).toBeVisible();

    // Check for the introductory text with treasuryDaoID
    await expect(
      modalLocator.locator(`p.mb-0:has-text("Deposit options for: ${treasury.accountId}")`)
    ).toBeVisible();
    
    // Check Sputnik Tab button is visible and active by default
    const sputnikTabButton = modalLocator.getByRole("button", { name: "Sputnik DAO (NEAR Only)" });
    await expect(sputnikTabButton).toBeVisible();
    await expect(sputnikTabButton).toHaveClass(/active/);

    // Check Sputnik tab content is visible
    await expect(modalLocator.locator("p:has-text('Deposit NEAR to this Sputnik DAO address:')")).toBeVisible();
    const sputnikAddressContainer = modalLocator.locator('p:has-text("Deposit NEAR to this Sputnik DAO address:")').locator('xpath=./following-sibling::div[1]');
    await expect(sputnikAddressContainer.locator(`strong:has-text("${treasury.accountId}")`)).toBeVisible();

    // Check Near Intents Tab button is visible but not active
    const intentsTabButton = modalLocator.getByRole("button", { name: "Near Intents (Multi-Asset)" });
    await expect(intentsTabButton).toBeVisible();
    await expect(intentsTabButton).not.toHaveClass(/active/);

    // Check Near Intents tab content (descriptive paragraph) is NOT visible initially
    await expect(modalLocator.locator("p:has-text('Deposit NEAR or other supported tokens to this Near Intents enabled address:')")).not.toBeVisible();

    const closeButtonFooter = modalLocator.getByRole("button", { name: "Close" });
    await expect(closeButtonFooter).toBeVisible();

    const closeButtonHeader = modalLocator.locator(".modal-header .btn-close");
    await expect(closeButtonHeader).toBeVisible();
    
    await closeButtonFooter.click();
    await expect(modalLocator).not.toBeVisible();
  });

  test("should handle tab switching and display correct content in deposit modal", async ({ page }) => {
    await redirectWeb4({ page, contractId: treasury.accountId });
    await page.goto(`https://${treasury.accountId}.page`);

    const totalBalanceCardLocator = page.locator(".card.card-body", { hasText: "Total Balance" });
    await expect(totalBalanceCardLocator).toBeVisible({ timeout: 20000 });
    const depositButton = totalBalanceCardLocator.getByRole("button", { name: "Deposit" });
    await depositButton.click();

    const modalLocator = page.locator(".modal-dialog");
    await expect(modalLocator).toBeVisible({ timeout: 10000 });

    const sputnikTabButton = modalLocator.getByRole("button", { name: "Sputnik DAO (NEAR Only)" });
    const intentsTabButton = modalLocator.getByRole("button", { name: "Near Intents (Multi-Asset)" });
    const sputnikWarningLocator = modalLocator.locator("div.alert-warning");
    const intentsWarningLocator = modalLocator.locator("div.alert-info");

    // Initial state: Sputnik tab should be active
    await expect(sputnikTabButton).toHaveClass(/active/);
    await expect(intentsTabButton).not.toHaveClass(/active/);
    await expect(sputnikWarningLocator).toBeVisible();
    await expect(sputnikWarningLocator).toContainText("Only deposit NEAR to this address for Sputnik DAO operations.");
    await expect(intentsWarningLocator).not.toBeVisible();

    // Verify Sputnik tab copy button
    const sputnikCopyButtonContainer = modalLocator.locator('p:has-text("Deposit NEAR to this Sputnik DAO address:")').locator('xpath=./following-sibling::div[1]');
    const sputnikCopyButton = sputnikCopyButtonContainer.getByRole('button');
    await expect(sputnikCopyButton).toBeVisible();
    await expect(sputnikCopyButton).toContainText("Copy");
    await expect(sputnikCopyButton.locator('i.bi-clipboard')).toBeVisible();

    await sputnikCopyButton.click();
    await expect(sputnikCopyButton).toContainText("Copied");
    await expect(sputnikCopyButton.locator('i.bi-check-lg')).toBeVisible();
    // Check for revert, allowing time for the 2s timeout in component
    await expect(sputnikCopyButton.locator('i.bi-clipboard')).toBeVisible({ timeout: 3000 });
    await expect(sputnikCopyButton).toContainText("Copy", { timeout: 3000 });

    // Switch to Near Intents tab
    await intentsTabButton.click();
    await expect(intentsTabButton).toHaveClass(/active/);
    await expect(sputnikTabButton).not.toHaveClass(/active/);
    await expect(sputnikWarningLocator).not.toBeVisible();
    await expect(intentsWarningLocator).toBeVisible();
    await expect(intentsWarningLocator).toContainText("You can deposit NEAR, ETH, wBTC, SOL");
    
    const intentsNoteLocator = modalLocator.locator("p.small.text-muted:has-text('Note: While the address is the same')");
    await expect(intentsNoteLocator).toBeVisible();

    // Verify Near Intents tab copy button
    const intentsCopyButtonContainer = modalLocator.locator('p:has-text("Deposit NEAR or other supported tokens to this Near Intents enabled address:")').locator('xpath=./following-sibling::div[1]');
    const intentsCopyButton = intentsCopyButtonContainer.getByRole('button');
    await expect(intentsCopyButton).toBeVisible();
    await expect(intentsCopyButton).toContainText("Copy");
    await expect(intentsCopyButton.locator('i.bi-clipboard')).toBeVisible();

    await intentsCopyButton.click();
    await expect(intentsCopyButton).toContainText("Copied");
    await expect(intentsCopyButton.locator('i.bi-check-lg')).toBeVisible();
    // Check for revert
    await expect(intentsCopyButton.locator('i.bi-clipboard')).toBeVisible({ timeout: 3000 });
    await expect(intentsCopyButton).toContainText("Copy", { timeout: 3000 });

    // Close the modal
    const closeButtonFooter = modalLocator.getByRole("button", { name: "Close" });
    await closeButtonFooter.click();
    await expect(modalLocator).not.toBeVisible();
  });

  // TODO: Add tests for QR code visibility and copy functionality (once QR is re-implemented)
});
