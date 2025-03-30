import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import {
  DEFAULT_WIDGET_REFERENCE_ACCOUNT_ID,
  SandboxRPC,
} from "../../util/sandboxrpc";
import { createDAOargs } from "../../util/sputnikdao.js";
import nearApi from "near-api-js";

test.describe("Admin is logged in", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test("should go to system upgrade page", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(200_000);
    const sandbox = new SandboxRPC();
    await sandbox.init();

    const widget_reference_account_id = DEFAULT_WIDGET_REFERENCE_ACCOUNT_ID;
    await sandbox.setupDefaultWidgetReferenceAccount();

    const instance_name = "theupgradable";

    const createInstanceResult = await sandbox.account.functionCall({
      contractId: "treasury-factory.near",
      methodName: "create_instance",
      args: {
        sputnik_dao_factory_account_id: "sputnik-dao.near",
        social_db_account_id: "social.near",
        widget_reference_account_id: widget_reference_account_id,
        name: instance_name,
        create_dao_args: Buffer.from(
          JSON.stringify(
            createDAOargs({
              instanceName: instance_name,
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

    await page.goto(
      `/${instanceAccount}/widget/app?page=settings&selectedTab=system-updates`
    );
    await page.getByText("Available Updates").click();
    await expect(page.getByText("Web4 Contract")).toBeVisible({
      timeout: 10_000,
    });

    await sandbox.quitSandbox();
  });
});
