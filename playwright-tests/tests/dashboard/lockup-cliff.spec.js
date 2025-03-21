import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { mockLockupStateAndNavigateToDashboard } from "./util.js";

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("Lockup portfolio with cliff", function () {
  test("Should show start, end and cliff date", async ({
    page,
    lockupContract,
    instanceAccount,
    daoAccount,
  }) => {
    if (!lockupContract) {
      console.log("no lockup contract found for instance");
      return test.skip();
    }
    test.setTimeout(60_000);
    await mockLockupStateAndNavigateToDashboard({
      page,
      lockupContract,
      instanceAccount,
      daoAccount,
      hasCliff: true,
    });
    await page.waitForTimeout(5_000);
    await expect(page.getByText("Start Date January 30, 2025")).toBeVisible();
    await expect(page.getByText("End Date January 30, 2029")).toBeVisible();
    await expect(page.getByText("Cliff Date January 30, 2025")).toBeVisible();
  });
});
