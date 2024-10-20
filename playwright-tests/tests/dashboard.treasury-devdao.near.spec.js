import { expect } from "@playwright/test";
import { test } from "../util/test.js";

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("should go to trustees dashboard", async ({ page, instanceAccount }) => {
  await page.goto(`/${instanceAccount}/widget/app?page=dashboard`);
  await expect(
    await page.getByRole("heading", { name: "Dashboard" })
  ).toBeVisible();
});
