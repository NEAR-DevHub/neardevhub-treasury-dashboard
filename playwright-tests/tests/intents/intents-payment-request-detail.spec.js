import { test } from "../../util/test.js";
import { expect } from "@playwright/test";
import { redirectWeb4, getLocalWidgetContent } from "../../util/web4.js";

test("NEAR Intents payment request for ETH", async ({ page }) => {
  const instanceAccount = "webassemblymusic-treasury.near";
  const daoAccount = "webassemblymusic-treasury.sputnik-dao.near";
  const modifiedWidgets = {};
  
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
  await expect(page.locator('text=Network')).toBeVisible();
  // Look for the network name specifically under the Network label
  await expect(page.locator('span.text-capitalize').filter({ hasText: 'eth' })).toBeVisible();
  
  // Check for fee information (if present)
  const feeSection = page.locator('text=Network Fee');
  if (await feeSection.isVisible()) {
    await expect(feeSection).toBeVisible();
  }
  
  // Check for transaction links section (if present for approved payments)
  const transactionSection = page.locator('text=Transaction Links');
  if (await transactionSection.isVisible()) {
    await expect(transactionSection).toBeVisible();
    await expect(page.locator('text=View on NEAR Blocks')).toBeVisible();
  }
  
  // Take a screenshot to see the final result
  await page.screenshot({ path: 'test-results/intents-payment-detail-final.png', fullPage: true });
});

test("NEAR Intents payment request for NEAR", async ({ page }) => {
  const instanceAccount = "webassemblymusic-treasury.near";
  const daoAccount = "webassemblymusic-treasury.sputnik-dao.near";
  const modifiedWidgets = {};
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
  await expect(page.getByText("Recipient Peter Salomonsen @")).toContainText(
    "petersalomonsen.near"
  );
  await expect(
    page.locator(
      'div[data-component="widgets.treasury-factory.near/widget/components.TokenAmountAndIcon"]'
    )
  ).toContainText("0.2 wNEAR");
});
