import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import {
  compareInstanceWeb4WithTreasuryFactory,
  redirectWeb4,
} from "../../util/web4.js";

test("should show update history", async ({ page, instanceAccount }) => {
  const contractId = instanceAccount;
  const isUpToDate = await compareInstanceWeb4WithTreasuryFactory(
    instanceAccount
  );
  await redirectWeb4({
    contractId,
    page,
    callWidgetNodeURLForContractWidgets: true,
    modifiedWidgets: {
      "widgets.treasury-factory.near/widget/pages.settings.system-updates.UpdateRegistry": `
    return [
      {
        id: 1,
        createdDate: "2025-03-28",
        version: "n/a",
        type: "Web4 Contract",
        summary: "Fixed dark theme, added lockup to all instances",
        details: "",
        votingRequired: false,
      }
  ];
  `,
    },
  });
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
