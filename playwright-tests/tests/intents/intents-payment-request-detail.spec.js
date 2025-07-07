import { test } from "../../util/test.js";
import { expect } from "@playwright/test";
import { redirectWeb4 } from "../../util/web4.js";

test.use({
  viewport: {
    width: 1280,
    height: 800,
  },
});

test.beforeEach(async ({ page }, testInfo) => {
  // Skip all tests in this file if not running on the treasury-testing project
  test.skip(
    testInfo.project.name !== "treasury-testing",
    "These tests only run on the treasury-testing project"
  );
});

test("NEAR Intents payment request for ETH", async ({ page }) => {
  const instanceAccount = "webassemblymusic-treasury.near";
  const daoAccount = "webassemblymusic-treasury.sputnik-dao.near";
  const modifiedWidgets = {};

  // Capture browser console logs
  page.on("console", (msg) => {
    if (msg.type() === "log" || msg.type() === "error") {
      console.log(`Browser ${msg.type()}: ${msg.text()}`);
    }
  });

  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    networkId: "mainnet",
    modifiedWidgets,
    callWidgetNodeURLForContractWidgets: false,
  });
  await page.goto(
    "https://webassemblymusic-treasury.near.page/?page=payments&tab=history&id=2"
  );
  await expect(page.getByText("Recipient @")).toContainText(
    "0xa029Ca6D14b97749889702eE16E7d168a1094aFE"
  );
  await expect(
    page.locator(
      'div[data-component="widgets.treasury-factory.near/widget/components.TokenAmountAndIcon"]'
    )
  ).toContainText("0.005 ETH");

  // Wait for network info to load
  await page.waitForTimeout(3000);

  // Check that network information is displayed for intents payments
  await expect(page.locator("text=Network")).toBeVisible();
  // Look for the network name specifically under the Network label
  await expect(
    page.locator("span.text-capitalize").filter({ hasText: "Ethereum" })
  ).toBeVisible();

  // Check for fee information (if present)
  const feeSection = page.getByText("Estimated Fee", { exact: true });
  await expect(feeSection).toBeVisible({ timeout: 15_000 });

  // Check for transaction links section - this should always be present for approved proposals
  await expect(
    page.locator('label:has-text("Transaction Links")')
  ).toBeVisible();

  // Check for NEAR Blocks link
  const nearBlocksButton = page.locator('a:has-text("on nearblocks.io")');
  await expect(nearBlocksButton).toBeVisible();

  // Check for the specific transaction link to the actual execution transaction
  await expect(
    page.locator(
      'a[href*="nearblocks.io/txns/2trLm2bSSFiUDt2xckM3UW6C6BND4iksiqEihaEjtcbC"]'
    )
  ).toBeVisible();

  // Check for target chain transaction link (Ethereum in this case)
  await expect(
    page.locator(
      'a[href*="etherscan.io/tx/0x8f52efccdccc3bddc82abc15e259b3d1671959a9694f09d20276892a5863e8d6"]'
    )
  ).toBeVisible();

  // Verify that no fallback transaction links are shown
  await expect(
    page.locator('a:has-text("Search execution")')
  ).not.toBeVisible();

  // Take a screenshot to see the final result
  await page.screenshot({
    path: "test-results/intents-payment-detail-final.png",
    fullPage: true,
  });

  await page.waitForTimeout(500);
});

test("NEAR Intents payment request for NEAR", async ({ page }) => {
  const instanceAccount = "webassemblymusic-treasury.near";
  const daoAccount = "webassemblymusic-treasury.sputnik-dao.near";
  const modifiedWidgets = {};

  // Capture browser console logs
  page.on("console", (msg) => {
    if (msg.type() === "log" || msg.type() === "error") {
      console.log(`Browser ${msg.type()}: ${msg.text()}`);
    }
  });

  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    networkId: "mainnet",
    modifiedWidgets,
    callWidgetNodeURLForContractWidgets: false,
  });
  await page.goto(
    "https://webassemblymusic-treasury.near.page/?page=payments&tab=history&id=4"
  );
  await expect(
    page.locator(
      'div[data-component="widgets.treasury-factory.near/widget/components.TokenAmountAndIcon"]'
    )
  ).toContainText("0.2 wNEAR");

  const recipientArea = page.getByText("Recipient Peter Salomonsen @");
  await expect(recipientArea).toBeVisible();
  await expect(recipientArea).toContainText("petersalomonsen.near");
  await expect(
    recipientArea.locator(
      'img[src="https://i.near.social/magic/large/https://near.social/magic/img/account/petersalomonsen.near"]'
    )
  ).toBeVisible();

  // Wait for network info to load
  await page.waitForTimeout(3000);

  // Check that network information is displayed for intents payments
  await expect(page.locator("text=Network")).toBeVisible();
  await expect(
    page.locator("span.text-capitalize").filter({ hasText: "Near Protocol" })
  ).toBeVisible();

  // Check for transaction links section - this should always be present for approved proposals
  await expect(page.locator("text=Payment Request Funded")).toBeVisible();
  await expect(
    page.locator('label:has-text("Transaction Links")')
  ).toBeVisible();

  // Check for NEAR Blocks link
  const nearBlocksButton = page.locator('a:has-text("on nearblocks.io")');
  await expect(nearBlocksButton).toBeVisible();

  // For NEAR-to-NEAR intents payments, target chain transaction link should NOT be shown
  const targetTxLink = page.locator(
    'a:has-text("on etherscan.io"), a:has-text("on polygonscan.com"), a:has-text("on bscscan.com")'
  );
  await expect(targetTxLink).not.toBeVisible();

  console.log(
    "SUCCESS: Target chain transaction link correctly hidden for NEAR payment"
  );

  // grabbing screenshots is needed to ensure all elements are rendered on the video
  await page.screenshot({ fullPage: true });
  await page.waitForTimeout(1000);
});

test("Regular payment request shows transaction links", async ({ page }) => {
  const instanceAccount = "webassemblymusic-treasury.near";
  const daoAccount = "webassemblymusic-treasury.sputnik-dao.near";
  const modifiedWidgets = {};

  // Capture browser console logs
  page.on("console", (msg) => {
    if (msg.type() === "log" || msg.type() === "error") {
      console.log(`Browser ${msg.type()}: ${msg.text()}`);
    }
  });

  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    networkId: "mainnet",
    modifiedWidgets,
    callWidgetNodeURLForContractWidgets: false,
  });

  // Navigate to a regular (non-intents) approved payment request
  // Using id=8 which is confirmed to be a regular (non-intents) payment
  await page.goto(
    "https://webassemblymusic-treasury.near.page/?page=payments&tab=history&id=8"
  );

  const recipientArea = page.getByText("Recipient Peter Salomonsen @");
  await expect(recipientArea).toBeVisible();
  await expect(recipientArea).toContainText("petersalomonsen.near");
  await expect(
    recipientArea.locator(
      'img[src="https://i.near.social/magic/large/https://near.social/magic/img/account/petersalomonsen.near"]'
    )
  ).toBeVisible();

  // Wait for the page to load
  await page.waitForTimeout(3000);

  // Check that this is an approved proposal and verify transaction links
  await expect(page.locator("text=Payment Request Funded")).toBeVisible();

  // Check for transaction links section - this should always be present for approved proposals
  await expect(page.locator("text=Payment Request Funded")).toBeVisible();
  await expect(page.locator('label:has-text("Transaction Links")')).toBeVisible(
    { timeout: 15_000 }
  );

  // Check for NEAR Blocks link
  const nearBlocksButton = page.locator('a:has-text("on nearblocks.io")');
  await expect(nearBlocksButton).toBeVisible();

  // For regular (non-intents) payments, target chain transaction link should NOT be shown
  const targetTxLink = page.locator(
    'a:has-text("on etherscan.io"), a:has-text("on polygonscan.com"), a:has-text("on bscscan.com")'
  );
  await expect(targetTxLink).not.toBeVisible();

  console.log(
    "SUCCESS: Target chain transaction link correctly hidden for regular payment"
  );

  // grabbing screenshots is needed to ensure all elements are rendered on the video
  await page.screenshot({ fullPage: true });
  await page.waitForTimeout(1000);
});
