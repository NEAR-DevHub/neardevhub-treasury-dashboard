import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

import { mockRpcRequest, mockWithFTBalance } from "../../util/rpcmock.js";
import {
  CurrentTimestampInNanoseconds,
  TransferProposalData,
} from "../../util/inventory.js";
import { mockNearPrice } from "../../util/nearblocks.js";

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

const nearPrice = 5;
test.describe("Dashboard Page", function () {
  test.beforeEach(async ({ page, instanceAccount, daoAccount }, testInfo) => {
    if (testInfo.title.includes("Should see 404 modal")) {
      await mockNearPrice({ nearPrice, page, returnError: true });
    } else {
      await mockNearPrice({ nearPrice, page });
    }

    await mockWithFTBalance({ page, daoAccount, isSufficient: true });
    await page.goto(`/${instanceAccount}/widget/app`);
    await expect(
      page.locator("div").filter({ hasText: /^Dashboard$/ })
    ).toBeVisible();
  });
  test("Portfolio should correctly displays FT tokens", async ({ page }) => {
    test.setTimeout(60_000);
    await expect(page.getByText("USDt").first()).toBeVisible();
    await expect(page.getByText("USDC").first()).toBeVisible();
  });

  test("Portfolio should correctly displays NEAR price", async ({ page }) => {
    test.setTimeout(60_000);
    await page.waitForTimeout(5_000);
    const nearPriceElements = await page
      .locator(`text=$${nearPrice}.00`)
      .count();
    expect(nearPriceElements).toBeGreaterThan(0);
  });

  test("Should see 404 modal", async ({ page }) => {
    test.setTimeout(60_000);
    await page.waitForTimeout(5_000);
    await expect(page.getByText("Whoa there, speedster")).toBeVisible();
  });
});
