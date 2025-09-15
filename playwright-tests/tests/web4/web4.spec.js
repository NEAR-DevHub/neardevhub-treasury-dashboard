import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

test("should go directly to app widget for instance", async ({
  page,
  baseURL,
  instanceAccount,
  daoAccount,
}) => {
  const pageOrigin = `http://${instanceAccount}.page`;

  await page.route(pageOrigin, async (route, request) => {
    await route.continue({ url: baseURL });
  });
  await page.goto(pageOrigin);
  const widgetsAccount =
    (instanceAccount.includes("testing") === true
      ? "test-widgets"
      : "widgets") + ".treasury-factory.near";

  await expect(
    await page
      .locator(
        `div[data-component="${widgetsAccount}/widget/components.Navbar"]`
      )
      .first()
  ).toContainText("Dashboard");
});

test("should show gateway switch dropdown", async ({
  page,
  instanceAccount,
}) => {
  await page.goto(`/${instanceAccount}/widget/app?page=payments`);
  await page.waitForTimeout(2_000);
  await page.locator("#dropdownToggle").click();
  const web4Link = page.getByRole("link", { name: "Web4" });
  const devPortalLink = page.getByRole("link", {
    name: "NEAR Developer Portal",
  });
  const nearSocialLink = page.getByRole("link", { name: "Near Social" });
  await expect(web4Link).toBeVisible();
  await expect(devPortalLink).toBeVisible();
  await expect(nearSocialLink).toBeVisible();
});
