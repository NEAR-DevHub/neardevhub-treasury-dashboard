import { expect } from "@playwright/test";
import { test } from "../util/test.js";

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("should go to trustees dashboard", async ({ page, instanceAccount }) => {
  async function expectElementsAreChanged(initBalanceText, initDateText) {
    const updatedBalanceText = await valueElement.textContent();
    expect(updatedBalanceText).not.toBe(initBalanceText);
    const updatedDateText = await dateElement.textContent();
    expect(updatedDateText).not.toBe(initDateText);
  }

  await page.goto(`/${instanceAccount}/widget/app?page=dashboard`);

  await expect(
    await page.locator("div.h3").filter({ hasText: "Dashboard" })
  ).toBeVisible();

  await expect(
    await page.getByText("Treasury Assets: Sputnik DAO")
  ).toBeVisible();

  // verify chart interaction and data
  const valueElement = await page.locator(".balance-value");
  const initBalanceText = await valueElement.textContent();
  const dateElement = await page.locator(".balance-date");
  const initDateText = await dateElement.textContent();

  await expect(await page.locator("iframe.chart")).toBeVisible();
  await page.waitForTimeout(5000);

  await page.mouse.move(600, 500);
  expectElementsAreChanged(initBalanceText, initDateText);

  await page.locator("div[role='button']").filter({ hasText: "1H" }).click();
  expectElementsAreChanged(initBalanceText, initDateText);
});
