import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import {
  compareInstanceWeb4WithTreasuryFactory,
  redirectWeb4,
} from "../../util/web4.js";

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("should show update history", async ({ page, instanceAccount }) => {
  const contractId = instanceAccount;
  const isUpToDate = await compareInstanceWeb4WithTreasuryFactory(
    instanceAccount
  );
  await redirectWeb4({ contractId, page });
  await page.goto(`https://${contractId}.page/?page=settings`);
  await page.getByText("System updates").click();

  if (isUpToDate) {
    await page.getByText("Available Updates").click();
    await expect(page.getByText("2025-03-28")).not.toBeVisible();
    await expect(
      page.getByText("Fixed dark theme, added lockup to all instances")
    ).not.toBeVisible();

    await page.getByText("History").click();
    await expect(page.getByText("2025-03-28")).toBeVisible();
    await expect(
      page.getByText("Fixed dark theme, added lockup to all instances")
    ).toBeVisible();
  } else {
    await page.getByText("Available Updates").click();
    await expect(page.getByText("2025-03-28")).toBeVisible();
    await expect(
      page.getByText("Fixed dark theme, added lockup to all instances")
    ).toBeVisible();

    await page.getByText("History").click();
    await expect(page.getByText("2025-03-28")).not.toBeVisible();
    await expect(
      page.getByText("Fixed dark theme, added lockup to all instances")
    ).not.toBeVisible();
  }
});
