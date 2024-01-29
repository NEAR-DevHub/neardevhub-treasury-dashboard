import { test, expect } from "@playwright/test";

test("should go to trustees dashboard", async ({ page }) => {
  await page.goto(
    "/dashboard.treasury-devdao.near/widget/neardevhub-trustees-dashboard-bos.components.pages.homepage"
  );
  expect(await page.getByText("Learn more at BOS Component")).toBeTruthy();
});
