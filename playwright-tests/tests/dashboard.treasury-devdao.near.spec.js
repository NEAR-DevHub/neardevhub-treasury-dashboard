import { test, expect } from "@playwright/test";

test("should go to trustees dashboard", async ({ page }) => {
  await page.goto("/treasury-devdao.near/widget/app?page=dashboard");
  await expect(
    await page.getByRole("heading", { name: "Dashboard" })
  ).toBeVisible();
});
