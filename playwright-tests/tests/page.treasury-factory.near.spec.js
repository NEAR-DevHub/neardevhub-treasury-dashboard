import { expect } from "@playwright/test";
import { test } from "../util/test.js";

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("admin connected", function () {
  test.use({
    contextOptions: {
      permissions: ["clipboard-read", "clipboard-write"],
    },
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test("should go to treasury self creation page", async ({
    page,
    factoryAccount,
  }) => {
    await page.goto(`/${factoryAccount}/widget/app?page`);

    await expect(
      await page.locator("h3").filter({ hasText: "Treasury Creation" })
    ).toBeVisible();

    await expect(await page.getByText("Treasury Creation")).toBeVisible();

    await page
      .locator("a")
      .filter({ hasText: "Yes, use this wallet and continue" })
      .click();
  });
});
