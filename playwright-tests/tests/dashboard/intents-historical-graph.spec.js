import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

const baseTokens = [
  {
    token_id: "nep141:wrap.near",
    symbol: "wNEAR",
    balance: "798820851975614624715148",
    parsedBalance: "0.798820851975614624715148",
  },
  {
    token_id:
      "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
    symbol: "USDC",
    balance: "3010000",
    parsedBalance: "3.01",
  },
  {
    token_id: "nep141:btc.omft.near",
    symbol: "BTC",
    balance: "10000",
    parsedBalance: "0.0001",
  },
];

// Helper function to create data points for each period
const createDataPoints = (period, count, baseTimestamp) => {
  const dataPoints = [];
  for (let i = 0; i < count; i++) {
    dataPoints.push({
      timestamp: baseTimestamp + i * 3600000, // Add 1 hour intervals
      date: `${period} ${i + 1}`,
      tokens: baseTokens,
      totalTokens: 3,
    });
  }
  return dataPoints;
};

// Mock intents balance history data
const mockIntentsBalanceHistory = {
  "1H": createDataPoints("6:00 PM", 6, 1757850000000),
  "1D": createDataPoints("Sep 14", 12, 1757800000000),
  "1W": createDataPoints("Mon", 8, 1757500000000),
  "1M": createDataPoints("Sep", 15, 1756000000000),
  "1Y": createDataPoints("2025", 12, 1730000000000),
  All: createDataPoints("2024", 10, 1700000000000),
};

async function mockIntentsBalanceHistoryAPI({ page, daoAccount }) {
  await page.route(
    `**/api/intents-balance-history?account_id=${daoAccount}`,
    async (route) => {
      await route.fulfill({
        json: mockIntentsBalanceHistory,
        status: 200,
      });
    }
  );
}

test.describe("Intents Historical Graph", () => {
  test("should display intents historical graph with chart and token selection", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    // Mock the intents balance history API
    await mockIntentsBalanceHistoryAPI({ page, daoAccount });

    await page.goto(`/${instanceAccount}/widget/app`);

    // Wait for the page to load
    await page.waitForTimeout(5_000);

    // Look for the intents historical graph component
    expect(page.getByRole("heading", { name: "Intents" })).toBeVisible();

    // Check if chart iframe is visible
    const intentsGraph = page.getByTestId("intents-historical-graph");
    await expect(intentsGraph).toBeVisible({ timeout: 10000 });
    await intentsGraph.scrollIntoViewIfNeeded();

    // Check if token selection radio buttons are visible
    const tokenRadioButtons = intentsGraph.locator('input[type="radio"]');
    await expect(tokenRadioButtons).toHaveCount(3); // wNEAR, USDC and BTC

    // Check token labels
    await expect(intentsGraph.locator('label:has-text("wNEAR")')).toBeVisible();
    await expect(intentsGraph.locator('label:has-text("USDC")')).toBeVisible();
    await expect(intentsGraph.locator('label:has-text("BTC")')).toBeVisible();

    // Check if period selection buttons are visible
    await expect(
      intentsGraph.locator('div[role="button"]:has-text("1H")')
    ).toBeVisible();
    await expect(
      intentsGraph.locator('div[role="button"]:has-text("1D")')
    ).toBeVisible();
    await expect(
      intentsGraph.locator('div[role="button"]:has-text("1Y")')
    ).toBeVisible();

    // Check if 1Y is selected by default
    await expect(
      intentsGraph.locator('div[role="button"]:has-text("1Y").selected')
    ).toBeVisible();

    // Test token selection - click on USDC token
    const usdcRadio = intentsGraph.getByRole("button", { name: "USDC" });
    await usdcRadio.click();

    // Check if USDC token is now selected (bold text)
    await expect(
      intentsGraph.locator('label:has-text("USDC") span.fw-bold')
    ).toBeVisible();

    // Test period selection - click on 1H
    const oneHourPeriod = intentsGraph.locator(
      'div[role="button"]:has-text("1H")'
    );
    await oneHourPeriod.click();

    // Check if 1H is now selected
    await expect(
      intentsGraph.locator('div[role="button"]:has-text("1H").selected')
    ).toBeVisible();
  });

  test("should not display graph when no data is available", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    // Mock empty response
    await page.route(
      `**/api/intents-balance-history?account_id=${daoAccount}`,
      async (route) => {
        await route.fulfill({
          json: {}, // Empty object
          status: 200,
        });
      }
    );

    await page.goto(`/${instanceAccount}/widget/app`);

    // Wait for the page to load
    await page.waitForTimeout(5_000);

    // The intents historical graph should not be visible when no data
    const intentsGraph = page.getByRole("heading", { name: "Intents" });
    await expect(intentsGraph).not.toBeVisible();
  });
});
