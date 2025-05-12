import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import {
  DEFAULT_WIDGET_REFERENCE_ACCOUNT_ID,
  SandboxRPC,
  SPUTNIK_DAO_FACTORY_ID,
} from "../../util/sandboxrpc.js";
import { createDAOargs } from "../../util/sputnikdao.js";
import nearApi from "near-api-js";

test("should update sputnik-dao policy and upgrade instance with it", async ({
  page,
}) => {
  test.setTimeout(120_000);

  const sandbox = new SandboxRPC();
  await sandbox.init();

  const widget_reference_account_id = DEFAULT_WIDGET_REFERENCE_ACCOUNT_ID;
  await sandbox.setupDefaultWidgetReferenceAccount();

  const instanceName = "policyupdater";

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
        createdDate: "2025-03-25",
        version: "n/a",
        type: "Policy",
        summary: "Change role name to Requestor",
        details: "",
        checkPolicy: (policy) => {
          if (policy.roles[0].name === "Requestor") {
            return true;
          } else {
           return false;
          }
        },
        getUpdatedPolicyProposal: (policy) => {
          policy.roles[0].name = "Requestor";
          return {
            updatedPolicy: policy,
            description: {
              "title": "Change role name",
              "summary": "Change name of the first role to requestor",
            },
          };
        },
        votingRequired: true,
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

  await expect(page.getByText("Change role name to Requestor")).not.toBeVisible(
    {
      timeout: 10_000,
    }
  );

  // Visiting the updates page above should have automatically marked the policy as up to date, and notification banner should disappear
  await page.goto(`https://${instanceName}.near.page/`);
  await page.waitForTimeout(500);
  await expect(
    await page.getByRole("link", { name: "Review" })
  ).not.toBeVisible();

  await sandbox.modifyWidget(
    "widgets.treasury-factory.near/widget/pages.settings.system-updates.UpdateRegistry",
    `
    return [
      {
        id: 2,
        createdDate: "2025-04-21",
        version: "n/a",
        type: "Policy",
        summary: "Change Requestor role name to Proposer",
        details: "",
        checkPolicy: (policy) => {
          if (policy.roles[0].name === "Proposer") {
            return true;
          } else {
           return false;
          }
        },
        getUpdatedPolicyProposal: (policy) => {
          policy.roles[0].name = "Proposer";
          return {
            updatedPolicy: policy,
            description: {
              "title": "Change role name",
              "summary": "Change name of the first role to proposer",
            },
          };
        },
        votingRequired: true,
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

  await expect(
    page.getByText("Change Requestor role name to Proposer")
  ).toBeVisible({
    timeout: 10_000,
  });

  await page.locator("button", { hasText: "Review" }).click();
  await page.getByRole("button", { name: "Yes, proceed" }).click();

  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(
    await page.getByRole("button", { name: "Confirm" })
  ).not.toBeVisible();

  await page.goto(
    `https://${instanceName}.near.page/?page=settings&tab=pending-requests`
  );

  await expect(await page.getByText("Change role name")).toBeVisible();
  await page.getByRole("button", { name: "Details" }).click();
  await expect(
    await page.getByText("Change name of the first role to proposer")
  ).toBeVisible();
  await expect(page.getByRole("code")).toContainText('"name": "Proposer"');

  await page.waitForTimeout(500);
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await sandbox.quitSandbox();
});
