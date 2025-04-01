import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import {
  DEFAULT_WIDGET_REFERENCE_ACCOUNT_ID,
  SandboxRPC,
} from "../../util/sandboxrpc.js";
import { createDAOargs } from "../../util/sputnikdao.js";
import nearApi from "near-api-js";

test.describe("Admin is logged in", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test("should go to system upgrade page", async ({ page }) => {
    test.setTimeout(200_000);
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
        sputnik_dao_factory_account_id: "sputnik-dao.near",
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

    await sandbox.redirectWeb4(instanceAccountId, page);
    await page.goto(
      `https://${instanceName}.near.page/widget/app?page=settings&tab=system-updates`
    );

    await page.getByText("Available Updates").click();
    await expect(page.getByText("Web4 Contract")).toBeVisible({
      timeout: 10_000,
    });

    await page.locator("#dropdownIcon").click();
    await expect(await page.getByText("Select Gateway")).toBeVisible();

    await sandbox.deployNewTreasuryFactoryWithUpdatedWeb4Contract();

    const web4selfUpgradeResult = await sandbox.account.functionCall({
      contractId: instanceAccountId,
      methodName: "self_upgrade",
      gas: 300_000_000_000_000,
    });

    expect(
      web4selfUpgradeResult.receipts_outcome.filter(
        (receipt_outcome) => receipt_outcome.outcome.status.Failure
      ).length
    ).toBe(0);

    await page.reload();

    await page.getByText("Available Updates").click();
    await expect(page.getByText("Web4 Contract")).toBeVisible({
      timeout: 10_000,
    });

    await page.locator("#dropdownIcon").click();
    await expect(await page.getByText("Gateway Select")).toBeVisible();

    await sandbox.quitSandbox();
  });
});
