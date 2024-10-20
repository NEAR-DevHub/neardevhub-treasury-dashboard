import { test as base } from "@playwright/test";

export const test = base.extend({
  instanceAccount: ["treasury-devdao.near", { option: true }],
  daoAccount: ["devdao.sputnik-dao.near", { option: true }],
});

test.afterEach(async ({ page }) => {
  try {
    await page.unrouteAll();
  } catch (error) {
    console.warn("Error during unrouteAll, ignoring:", error);
  }
});
