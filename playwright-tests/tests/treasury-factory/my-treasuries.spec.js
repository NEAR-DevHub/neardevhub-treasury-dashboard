import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { mockUserDaos } from "../../util/rpcmock.js";

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("My Treasuries", () => {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test("Should navigate to create treasury page when user don't have any existing DAOs", async ({
    page,
    factoryAccount,
  }) => {
    test.setTimeout(120_000);
    await mockUserDaos({ page, accountId: "megha19.near" });
    await page.goto(`/${factoryAccount}/widget/app`);
    await page.waitForTimeout(3_000);
    await expect(
      page.getByRole("heading", { name: "Treasury Creation" }),
    ).toBeVisible();
  });

  test("Should show user treasuries and DAOs", async ({
    page,
    factoryAccount,
  }) => {
    test.setTimeout(120_000);
    await mockUserDaos({ page, accountId: "theori.near" });
    await page.goto(`/${factoryAccount}/widget/app`);
    await expect(
      page.locator("h3", { hasText: "My Treasuries" }),
    ).toBeVisible();
    await expect(page.getByText("testing name")).toBeVisible();
    await expect(page.getByText("Total Balance").nth(0)).toBeVisible();
    await expect(page.getByText("Other DAOs")).toBeVisible();

    const [newPage] = await Promise.all([
      page.context().waitForEvent("page"),
      page.getByRole("link", { name: "testing name" }).click(),
    ]);
    await newPage.waitForLoadState();
    await expect(newPage.url()).toBe("https://treasury-testing.near.page/");
  });
});
