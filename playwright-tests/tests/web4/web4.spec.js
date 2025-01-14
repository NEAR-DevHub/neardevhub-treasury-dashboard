import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

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
  ).toContainText(daoAccount);
});
