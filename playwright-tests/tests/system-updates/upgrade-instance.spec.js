import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import {
  DEFAULT_WIDGET_REFERENCE_ACCOUNT_ID,
  SandboxRPC,
  SPUTNIK_DAO_FACTORY_ID,
} from "../../util/sandboxrpc.js";
import { createDAOargs } from "../../util/sputnikdao.js";
import nearApi from "near-api-js";

test("should update treasury factory with new web4 contract and self upgrade instance", async ({
  page,
}) => {
  test.setTimeout(150_000);

  const sandbox = new SandboxRPC();
  await sandbox.init();

  const widget_reference_account_id = DEFAULT_WIDGET_REFERENCE_ACCOUNT_ID;
  await sandbox.setupDefaultWidgetReferenceAccount();

  const instanceName = "theupgradable";

  const instanceAccountId = `${instanceName}.near`;

  const createInstanceResult = await sandbox.account.functionCall({
    contractId: "treasury-factory.near",
    methodName: "create_instance",
    args: {
      sputnik_dao_factory_account_id: SPUTNIK_DAO_FACTORY_ID,
      social_db_account_id: "social.near",
      widget_reference_account_id: widget_reference_account_id,
      name: instanceName,
      create_dao_args: Buffer.from(
        JSON.stringify(
          createDAOargs({
            instanceName: instanceName,
            adminAccountId: sandbox.account.accountId,
          })
        )
      ).toString("base64"),
    },
    gas: 300000000000000,
    attachedDeposit: nearApi.utils.format.parseNearAmount("9"),
  });

  expect(
    createInstanceResult.receipts_outcome.filter(
      (receipt_outcome) => receipt_outcome.outcome.status.Failure
    ).length
  ).toBe(0);

  // The initial update that is already applied, so should automatically be dismissed when visiting the updates page
  await sandbox.modifyWidget(
    "widgets.treasury-factory.near/widget/pages.settings.system-updates.UpdateRegistry",
    `
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
  `
  );

  await sandbox.redirectWeb4(instanceAccountId, page);

  await page.goto(`https://${instanceName}.near.page`);

  // Normal users should not see the update banner
  await page.waitForTimeout(500);
  await expect(
    await page.getByRole("link", { name: "Review" })
  ).not.toBeVisible();

  await sandbox.setPageAuthSettingsWithSandboxAccountKeys(page);

  await expect(await page.getByRole("link", { name: "Review" })).toBeVisible();
  await page.getByRole("link", { name: "Review" }).click();

  await expect(await page.getByText("Available Updates")).toBeEnabled({
    timeout: 20_000,
  });

  await page.locator("#dropdownIcon").click();
  await expect(await page.getByText("Select Gateway")).toBeVisible();
  await page.waitForTimeout(500);
  await page.locator("#dropdownIcon").click();

  await expect(page.getByText("Web4 Contract")).not.toBeVisible({
    timeout: 10_000,
  });

  // Visiting the updates page above should have automatically marked the web4 contract as up to date, and notification banner should disappear
  await page.goto(`https://${instanceName}.near.page/`);
  await page.waitForTimeout(500);
  await expect(
    await page.getByRole("link", { name: "Review" })
  ).not.toBeVisible();

  // Deploy the new treasury factory with an updated web4 contract

  await sandbox.deployNewTreasuryFactoryWithUpdatedWeb4Contract(page);
  await sandbox.modifyWidget(
    "widgets.treasury-factory.near/widget/pages.settings.system-updates.UpdateRegistry",
    `
    return [
      {
          id: 99999999,
          createdDate: "2025-04-05",
          version: "n/a",
          type: "Web4 Contract",
          summary: "contract update test",
          votingRequired: false
      }
  ];
  `
  );

  await page.goto(`https://${instanceName}.near.page/`);

  await expect(await page.getByRole("link", { name: "Review" })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("link", { name: "Review" }).click();

  await expect(await page.getByText("Available Updates")).toBeEnabled();

  await expect(page.getByText("Web4 Contract")).toBeVisible({
    timeout: 10_000,
  });

  await page.locator("button", { hasText: "Review" }).click();
  await page.getByRole("button", { name: "Yes, proceed" }).click();

  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(
    await page.getByRole("button", { name: "Confirm" })
  ).not.toBeVisible();

  await page.reload();

  await expect(await page.getByText("Available Updates")).toBeEnabled();

  await expect(page.getByText("Web4 Contract")).not.toBeVisible({
    timeout: 10_000,
  });

  await page.locator("#dropdownIcon").click();
  await expect(await page.getByText("Gateway Select")).toBeVisible({
    timeout: 15_000,
  });

  await page.waitForTimeout(500);
  await page.goto(`https://${instanceName}.near.page/`);

  await page.waitForTimeout(500);
  await expect(
    await page.getByRole("link", { name: "Review" })
  ).not.toBeVisible();

  await page.getByText("Settings").click();
  await page.getByText("System updates").click();
  await page.getByText("History").click();
  await expect(page.getByText("2025-04-05")).toBeVisible();
  await expect(page.getByText("99999999")).toBeVisible();
  await expect(page.getByText("contract update test")).toBeVisible();

  await page.waitForTimeout(500);

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await sandbox.quitSandbox();
});
