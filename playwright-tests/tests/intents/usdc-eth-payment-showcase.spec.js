import { test } from "../../util/test.js";
import { expect } from "@playwright/test";
import { redirectWeb4, getLocalWidgetContent } from "../../util/web4.js";

test.use({
  viewport: {
    width: 1280,
    height: 800,
  },
});
test("USDC on ETH payment showcase @treasury-testing", async ({
  page,
}, testInfo) => {
  // Skip this test if not running on the treasury-testing project
  test.skip(
    testInfo.project.name !== "treasury-testing",
    "This test only runs on the treasury-testing project"
  );

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

  // Navigate to proposal 6 - USDC on ETH payment
  await page.goto(
    "https://webassemblymusic-treasury.near.page/?page=payments&tab=history&id=6"
  );

  // Wait for page to load and show the proposal details
  await page.waitForTimeout(2000);

  // Verify this is a USDC payment by looking for the token amount
  await expect(page.locator("text=12 USDC")).toBeVisible();

  // Wait for network info and transaction links to load
  await page.waitForTimeout(3000);

  // Check that network information is displayed (should show ETH)
  await expect(
    page.locator('label:has-text("Network"):not(:has-text("Fee"))')
  ).toBeVisible();
  await expect(
    page.locator("span.text-capitalize").filter({ hasText: "eth" })
  ).toBeVisible();

  // Check that estimated fee is displayed
  await expect(page.locator('label:has-text("Estimated Fee")')).toBeVisible();
  await expect(page.locator("text=0.3 USDC")).toBeVisible();
  await expect(
    page.locator(
      "text=This is an estimated fee. Check the transaction links below for the actual fee charged."
    )
  ).toBeVisible();

  // Check that this is an approved proposal with transaction links
  await expect(page.locator("text=Payment Request Funded")).toBeVisible();
  await expect(
    page.locator('label:has-text("Transaction Links")')
  ).toBeVisible();

  // Find and click on the NEAR transaction link
  const nearTxLink = page.locator('a:has-text("on nearblocks.io")');
  await expect(nearTxLink).toBeVisible();

  // Get the href URL and navigate to it in the same tab
  const nearTxUrl = await nearTxLink.getAttribute("href");
  console.log("Navigating to NEAR transaction:", nearTxUrl);
  await page.goto(nearTxUrl);

  // Wait for the NEAR blocks page to load
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Navigate back to the treasury page
  await page.goBack();
  await page.waitForLoadState("networkidle");

  // Wait a moment before checking for target chain link
  await page.waitForTimeout(2000);

  // Find and navigate to the Ethereum transaction link (if available)
  const ethTxLink = page.locator('a:has-text("on etherscan.io")');
  if (await ethTxLink.isVisible()) {
    console.log("Found Ethereum transaction link");

    // Get the href URL and navigate to it in the same tab
    const ethTxUrl = await ethTxLink.getAttribute("href");
    console.log("Navigating to Ethereum transaction:", ethTxUrl);
    await page.goto(ethTxUrl);

    // Wait for the Etherscan page to load
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Navigate back to the treasury page
    await page.goBack();
    await page.waitForLoadState("networkidle");
  } else {
    console.log(
      "Ethereum transaction link not yet available - may still be loading from POA Bridge API"
    );
  }

  // Final pause to show the complete page
  await page.waitForTimeout(2000);

  console.log(
    "SHOWCASE COMPLETE: USDC on ETH payment with transaction links demonstrated"
  );
});
