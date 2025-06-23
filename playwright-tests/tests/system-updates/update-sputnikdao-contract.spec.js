import { expect } from "@playwright/test";
import { overlayMessage, removeOverlayMessage, test } from "../../util/test.js";
import {
  DEFAULT_WIDGET_REFERENCE_ACCOUNT_ID,
  SandboxRPC,
  SPUTNIK_DAO_FACTORY_ID,
} from "../../util/sandboxrpc.js";
import { createDAOargs } from "../../util/sputnikdao.js";
import nearApi from "near-api-js";
import crypto from "crypto";

test("should update sputnik-dao contract", async ({ page }) => {
  test.setTimeout(180_000);

  const sandbox = new SandboxRPC();
  await sandbox.init();

  await page.route(
    `https://api.fastnear.com/v1/account/${sandbox.account_id}/full`,
    async (route) => {
      await route.fulfill({
        json: {
          account_id: sandbox.account_id,
          nfts: [],
          pools: [],
          state: {
            balance: "6711271810302417189284995",
            locked: "0",
            storage_bytes: 425828,
          },
          tokens: [],
        },
      });
    }
  );

  const widget_reference_account_id = DEFAULT_WIDGET_REFERENCE_ACCOUNT_ID;
  await sandbox.setupDefaultWidgetReferenceAccount();

  const instanceName = "sputnikdaocontractupdater";

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
        type: "DAO contract",
        summary: "Update to latest sputnik-dao contract",
        details: "",
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

  await expect(
    page.getByText("Update to latest sputnik-dao contract")
  ).not.toBeVisible({
    timeout: 10_000,
  });

  await page.goto(`https://${instanceName}.near.page/`);
  await page.waitForTimeout(500);
  await expect(
    await page.getByRole("link", { name: "Review" })
  ).not.toBeVisible();

  const daoContractId = `${instanceName}.${SPUTNIK_DAO_FACTORY_ID}`;

  await overlayMessage(
    page,
    "Development team is uploading a new sputnik-dao contract"
  );
  // Download the contract code of ${instanceName}.sputnik-dao.near

  const result = await sandbox.near.connection.provider.query({
    request_type: "view_code",
    account_id: daoContractId,
    finality: "final",
  });
  const currentCode = Buffer.from(result.code_base64, "base64");

  const version = await (
    await sandbox.near.account(daoContractId)
  ).viewFunction({ contractId: daoContractId, methodName: "version" });

  // Convert the binary to a string and search for "Select Gateway"
  const searchString = version;
  const replaceString = "1" + version.substring(0, version.length - 1);
  console.log(searchString, replaceString);

  const searchBuffer = Buffer.from(searchString, "utf-8");
  const replaceBuffer = Buffer.from(replaceString, "utf-8");

  const index = currentCode.indexOf(searchBuffer);
  if (index === -1) {
    console.error(`String "${searchString}" not found in the WASM binary.`);
    return;
  }

  // Replace the string in the binary
  replaceBuffer.copy(currentCode, index);

  // Store the new wasm in the factory

  const sputnikDaoFactoryAccount = await sandbox.near.account(
    SPUTNIK_DAO_FACTORY_ID
  );

  await sputnikDaoFactoryAccount.functionCall({
    contractId: SPUTNIK_DAO_FACTORY_ID,
    methodName: "store",
    args: currentCode,
    gas: 300000000000000,
    attachedDeposit: nearApi.utils.format.parseNearAmount("10"),
  });

  // compute the hash of the new wasm and set_default_code_hash

  const codeHash = crypto
    .createHash("sha256")
    .update(currentCode)
    .digest("hex");

  const base58CodeHash = nearApi.utils.serialize.base_encode(
    Buffer.from(codeHash, "hex")
  );

  await sputnikDaoFactoryAccount.functionCall({
    contractId: SPUTNIK_DAO_FACTORY_ID,
    methodName: "set_default_code_hash",
    args: { code_hash: base58CodeHash },
    gas: 300000000000000,
    attachedDeposit: nearApi.utils.format.parseNearAmount("3"),
  });

  await sandbox.modifyWidget(
    "widgets.treasury-factory.near/widget/pages.settings.system-updates.UpdateRegistry",
    `
    return [
      {
        id: 2,
        createdDate: "2025-04-25",
        version: "n/a",
        type: "DAO contract",
        summary: "Update to latest sputnik-dao contract",
        details: "",
        votingRequired: true,
      }
  ];
  `
  );

  await removeOverlayMessage(page);
  await page.goto(`https://${instanceName}.near.page/`);

  await expect(await page.getByRole("link", { name: "Review" })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("link", { name: "Review" }).click();

  await expect(await page.getByText("Available Updates")).toBeEnabled();

  await expect(
    page.getByText("Update to latest sputnik-dao contract")
  ).toBeVisible({
    timeout: 10_000,
  });

  await page.locator("button", { hasText: "Review" }).click();
  await page.getByRole("button", { name: "Yes, proceed" }).click();

  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(
    await page.getByRole("button", { name: "Confirm" })
  ).not.toBeVisible();

  await page.reload();
  await expect(
    await page.getByRole("button", { name: "Review", disabled: true })
  ).toBeVisible();
  await expect(
    page.getByText("New system updates published")
  ).not.toBeVisible();

  await page.goto(
    `https://${instanceName}.near.page/?page=settings&tab=pending-requests`
  );

  await expect(
    await page.getByText("Upgrade sputnik-dao contract")
  ).toBeVisible();

  await page.getByTestId("proposal-request-#0").click();
  await page.getByRole("button", { name: "Reject" }).nth(1).click();
  await expect(
    await page.getByRole("heading", { name: "Confirm your vote" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(await page.getByText("Confirm transaction")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(await page.getByText("Awaiting transaction")).not.toBeVisible({
    timeout: 15_000,
  });

  // After the upgrade proposal was rejected, it should be possible to create a new upgrade proposal based on the same update

  await page.goto(
    `https://${instanceName}.near.page/?page=settings&tab=system-updates`
  );

  await expect(page.getByText("New system update published")).toBeVisible();
  await expect(await page.getByRole("link", { name: "Review" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(await page.getByText("Available Updates")).toBeEnabled();

  await expect(
    page.getByText("Update to latest sputnik-dao contract")
  ).toBeVisible({
    timeout: 10_000,
  });

  await page.locator("button", { hasText: "Review" }).click();
  await page.getByRole("button", { name: "Yes, proceed" }).click();

  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(
    await page.getByRole("button", { name: "Confirm" })
  ).not.toBeVisible();

  await page.reload();
  await expect(
    await page.getByRole("button", { name: "Review", disabled: true })
  ).toBeVisible();
  await expect(
    page.getByText("New system updates published")
  ).not.toBeVisible();

  await page.goto(`https://${instanceName}.near.page/?page=settings&id=1`);

  await expect(
    await page.getByText("Upgrade sputnik-dao contract")
  ).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(await page.getByText("Confirm your vote")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(await page.getByText("Confirm transaction")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(await page.getByText("Awaiting transaction")).not.toBeVisible({
    timeout: 15_000,
  });
  // The update should now have been moved to the history

  await page.goto(
    `https://${instanceName}.near.page/?page=settings&tab=system-updates`
  );
  await page.waitForTimeout(500);
  await expect(await page.getByText("Available Updates")).toBeEnabled();
  await expect(
    await page.getByRole("link", { name: "Review" })
  ).not.toBeVisible({ timeout: 15_000 });

  await page.getByText("Available Updates").click();
  await expect(
    page.getByText("Update to latest sputnik-dao contract")
  ).not.toBeVisible();

  await page.getByText("History").click();
  await expect(
    page.getByText("Update to latest sputnik-dao contract")
  ).toBeVisible({ timeout: 15_000 });

  await page.waitForTimeout(500);
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await sandbox.quitSandbox();
});
