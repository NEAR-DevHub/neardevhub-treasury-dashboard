import { test, expect } from "@playwright/test";

test("should go to trustees dashboard", async ({ page }) => {
  await page.goto(
    "/dashboard.treasury-devdao.near/widget/neardevhub-trustees.components.pages.app"
  );

  const dashboardHeader = await page.getByText("DevDAO Dashboard");
  await dashboardHeader.waitFor({state: 'visible'});
  expect(await dashboardHeader.isVisible()).toBeTruthy();
});
