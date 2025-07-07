import { test } from "../../util/test.js";
import { expect } from "@playwright/test";
import { redirectWeb4, getLocalWidgetContent } from "../../util/web4.js";

test.use({
  viewport: {
    width: 1280,
    height: 800,
  },
});
test("USDC on ETH payment request detail", async ({ page }, testInfo) => {
  // Skip this test if not running on the treasury-testing project
  test.skip(
    testInfo.project.name !== "treasury-testing",
    "This test only runs on the treasury-testing project"
  );
  test.setTimeout(60_000);

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

  const networkSection = page.getByText("Network Ethereum");
  await expect(
    networkSection.locator(
      'img[src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgdmlld0JveD0iMCAwIDI0IDI0Ij4KICAgIDxnIGNsaXAtcGF0aD0idXJsKCNldGhlcmV1bV9fYSkiPgogICAgICAgIDxwYXRoIGZpbGw9IiMwMDAiIGQ9Ik0yNCAwSDB2MjRoMjR6Ii8+CiAgICAgICAgPHBhdGggZmlsbD0iIzhGRkNGMyIgZD0iTTEyIDR2NS45MTJsNSAyLjIzN3oiLz4KICAgICAgICA8cGF0aCBmaWxsPSIjQ0FCQ0Y4IiBkPSJtMTIgNC01IDguMTQ4IDUtMi4yMzV6Ii8+CiAgICAgICAgPHBhdGggZmlsbD0iI0NCQTdGNSIgZD0iTTEyIDE1Ljk4VjIwbDUtNi45MnoiLz4KICAgICAgICA8cGF0aCBmaWxsPSIjNzRBMEYzIiBkPSJNMTIgMjB2LTQuMDJsLTUtMi45eiIvPgogICAgICAgIDxwYXRoIGZpbGw9IiNDQkE3RjUiIGQ9Im0xMiAxNS4wNDkgNS0yLjktNS0yLjIzNnoiLz4KICAgICAgICA8cGF0aCBmaWxsPSIjNzRBMEYzIiBkPSJtNyAxMi4xNDkgNSAyLjlWOS45MTN6Ii8+CiAgICAgICAgPHBhdGggZmlsbD0iIzIwMjY5OSIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJtMTIgMTUuMDQ4LTUtMi45TDEyIDRsNSA4LjE0OHptLTQuNjctMy4xMzYgNC41ODgtNy40NzV2NS40MzV6bS0uMDY4LjIwNCA0LjY1Ni0yLjA2OHY0Ljc2OHptNC44MTYtMi4wNjh2NC43NjhsNC42NTMtMi43em0wLS4xNzYgNC41ODggMi4wNC00LjU4OC03LjQ3NXoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPgogICAgICAgIDxwYXRoIGZpbGw9IiMyMDI2OTkiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0ibTEyIDE1LjkxNy01LTIuODRMMTIgMjBsNS02LjkyNHptLTQuNDQtMi4zNDEgNC4zNiAyLjQ4djMuNTZ6bTQuNTE5IDIuNDh2My41Nmw0LjM2LTYuMDR6IiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz4KICAgIDwvZz4KICAgIDxkZWZzPgogICAgICAgIDxjbGlwUGF0aCBpZD0iZXRoZXJldW1fX2EiPgogICAgICAgICAgICA8cGF0aCBmaWxsPSIjZmZmIiBkPSJNMCAwaDI0djI0SDB6Ii8+CiAgICAgICAgPC9jbGlwUGF0aD4KICAgIDwvZGVmcz4KPC9zdmc+Cg=="]'
    )
  ).toBeVisible();

  // Find and click on the NEAR transaction link
  const nearTxLink = page.locator('a:has-text("on nearblocks.io")');

  await expect(nearTxLink).toBeVisible();
  await nearTxLink.hover();
  await page.waitForTimeout(500);
  // Get the href URL and navigate to it in the same tab
  const nearTxUrl = await nearTxLink.getAttribute("href");
  console.log("Navigating to NEAR transaction:", nearTxUrl);
  expect(nearTxUrl).toBe(
    "https://nearblocks.io/txns/BQcD4XxrXwBVryBkuyXevsuk9eFQhZ23gXusQPaxTJ32"
  );
  await page.goto(nearTxUrl);

  // Wait for the NEAR blocks page to load
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Navigate back to the treasury page
  await page.goBack();
  await expect(page.locator("text=12 USDC")).toBeVisible();

  // Wait a moment before checking for target chain link
  await page.waitForTimeout(200);

  // Find and navigate to the Ethereum transaction link (if available)
  const ethTxLink = page.locator('a:has-text("on etherscan.io")');
  await ethTxLink.hover();
  await page.waitForTimeout(500);
  console.log("Found Ethereum transaction link");

  // Get the href URL and navigate to it in the same tab
  const ethTxUrl = await ethTxLink.getAttribute("href");
  console.log("Navigating to Ethereum transaction:", ethTxUrl);
  expect(ethTxUrl).toBe(
    "https://etherscan.io/tx/0xe1169baab6d9c0b459c2129c2660486a742a4986175fc86e2417054c0f8b5ad0"
  );

  await page.goto(ethTxUrl);

  // Wait for the Etherscan page to load
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Navigate back to the treasury page
  await page.goBack();
  await expect(page.locator("text=12 USDC")).toBeVisible();

  console.log(
    "SHOWCASE COMPLETE: USDC on ETH payment with transaction links demonstrated"
  );
});
