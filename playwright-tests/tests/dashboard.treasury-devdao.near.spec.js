import { expect } from "@playwright/test";
import { test } from "../util/test.js";

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("should go to trustees dashboard", async ({ page, instanceAccount }) => {
  await page.goto(`/${instanceAccount}/widget/app?page=dashboard`);

  await expect(
    await page.locator("div.h3").filter({ hasText: "Dashboard" })
  ).toBeVisible();

  await expect(
    await page.getByText("Treasury Assets: Sputnik DAO")
  ).toBeVisible();

  await expect(await page.locator("iframe.chart")).toBeVisible();
  await page.mouse.move(600, 500);
  await page.mouse.move(1000, 500);

  await page.locator("div[role='button']").filter({ hasText: "1H" }).click();
});
