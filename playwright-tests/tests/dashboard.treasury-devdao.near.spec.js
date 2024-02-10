import { test, expect } from "@playwright/test";

test("should go to trustees dashboard", async ({ page }) => {
  await page.goto(
    "/dashboard.treasury-devdao.near/widget/neardevhub-trustees.components.pages.app"
  );
  
  expect(await page.getByText("DevDAO Dashboard").isVisible()).toBeTruthy();
});
