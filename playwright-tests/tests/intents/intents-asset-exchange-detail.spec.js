import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { redirectWeb4 } from "../../util/web4.js";

/**
 * Test for NEAR Intents asset exchange proposal #30
 * Tests the exact values shown in the screenshot
 */
test.describe("NEAR Intents Asset Exchange Proposal Details", () => {
  test("should display proposal #30 with correct values", async ({ page }) => {
    test.setTimeout(60_000);

    // Use webassemblymusic-treasury.near as contractId so treasury is derived correctly
    const instanceAccount = "webassemblymusic-treasury.near";

    // Redirect to local widget code
    await redirectWeb4({
      page,
      contractId: instanceAccount,
    });

    // Modify the 1Click token prices API response to ensure consistent prices
    await page.route(
      "https://1click.chaindefuser.com/v0/tokens",
      async (route) => {
        const response = await route.fetch();
        const json = await response.json();

        // Update prices for the tokens we're testing
        const updatedTokens = json.map((token) => {
          if (token.symbol === "USDC") {
            return { ...token, price: 1 };
          }
          if (token.symbol === "BTC" || token.symbol === "bitcoin") {
            return { ...token, price: 115834 };
          }
          return token;
        });

        await route.fulfill({
          response,
          json: updatedTokens,
        });
      }
    );

    // Navigate to the proposal details page for webassemblymusic-treasury DAO
    await page.goto(
      `https://${instanceAccount}.page/?page=asset-exchange&tab=history&id=30`
    );

    // Wait for the page to load and any spinners to disappear
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5_000);

    // Wait for the page to fully load by checking for Source Wallet which appears when data is loaded

    // Verify Source Wallet - it might be in the description or as a label
    const sourceWalletLabel = page.getByText("Source Wallet", { exact: false });
    await expect(sourceWalletLabel.first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("NEAR Intents")).toBeVisible();

    // Verify Send section
    await expect(page.getByText("Send", { exact: true })).toBeVisible();
    await expect(page.getByText("20 USDC")).toBeVisible();
    await expect(page.getByText("( $20.00 )")).toBeVisible();
    await expect(page.getByText("Ethereum")).toBeVisible();
    await expect(page.getByText("1 USDC = $ 1")).toBeVisible();

    // Verify Receive section
    await expect(page.getByText("Receive", { exact: true })).toBeVisible();
    await expect(page.getByText("0.00017249 BTC")).toBeVisible();
    await expect(page.getByText("( $19.98 )")).toBeVisible();
    await expect(page.getByText("Bitcoin")).toBeVisible();
    await expect(page.getByText("1 BTC = $ 115,834")).toBeVisible();

    // Verify Price Slippage Limit
    await expect(page.getByText("Price Slippage Limit")).toBeVisible();
    await expect(page.getByText("0.5%")).toBeVisible();

    // Verify Minimum Amount Receive
    await expect(page.getByText("Minimum Amount Receive")).toBeVisible();
    await expect(page.getByText("0.00017163 BTC")).toBeVisible();
    await expect(page.getByText("( $19.88 )")).toBeVisible();

    // Verify 1Click Quote Deadline
    await expect(page.getByText("1Click Quote Deadline")).toBeVisible();
    await expect(page.getByText("Sep 22, 2025, 08:02 AM UTC")).toBeVisible();

    // Verify Estimated Time
    // Note: Historical proposal #30 was created with "10 minutes" text
    await expect(page.getByText("Estimated Time")).toBeVisible();
    await expect(page.getByText("10 minutes")).toBeVisible();

    // Verify Deposit Address
    await expect(
      page.getByText("Deposit Address", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText(
        "77caca4e7a00ef170fe885c3733684fa6166eb46933b7253ef1d4440f07e3994"
      )
    ).toBeVisible();

    // Verify Quote Signature
    await expect(page.getByText("Quote Signature")).toBeVisible();
    await expect(
      page.getByText(
        "ed25519:2SW5V4MNZ9pj9QPoCafimFysCSDK95DxfJW54rwQFdFAkmYAyfybKXwrxzoFRk4bhQTz6oo8zVeFTL3Yv6wg1zEW"
      )
    ).toBeVisible();

    // Verify proposal metadata
    await expect(page.getByText("Created By")).toBeVisible();
    await expect(page.getByText("petersalomonsen.near")).toBeVisible();

    await expect(page.getByText("Created Date")).toBeVisible();
    await expect(page.getByText("Sep 21, 2025, 08:04 AM UTC")).toBeVisible();

    await expect(page.getByText("Expires At")).toBeVisible();
    await expect(page.getByText("Sep 28, 2025, 08:04 AM UTC")).toBeVisible();

    // Verify status
    await expect(page.getByText("1 Approved")).toBeVisible();
    await expect(page.getByText("Required Votes: 1")).toBeVisible();

    // Verify the note about execution
    await expect(
      page.getByText(
        "**Must be executed before 2025-09-22T08:02:41.846Z** for transferring tokens to 1Click's deposit address for swap execution."
      )
    ).toBeVisible();
  });
});
