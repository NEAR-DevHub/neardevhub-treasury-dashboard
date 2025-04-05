import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import {
  DEFAULT_WIDGET_REFERENCE_ACCOUNT_ID,
  SandboxRPC,
} from "../../util/sandboxrpc.js";
import { createDAOargs } from "../../util/sputnikdao.js";
import nearApi from "near-api-js";

test("should update treasury factory with new web4 contract and self upgrade instance", async ({
  page,
}) => {
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

  await page.goto(`https://${instanceName}.near.page`);
  const keyPair = await sandbox.keyStore.getKey("sandbox", sandbox.account_id);
  await page.evaluate(
    ({ accountId, publicKey, privateKey }) => {
      localStorage.setItem("near-social-vm:v01::accountId:", accountId);
      localStorage.setItem(
        `near-api-js:keystore:${accountId}:mainnet`,
        privateKey
      );
      localStorage.setItem(
        "near-wallet-selector:recentlySignedInWallets",
        JSON.stringify(["my-near-wallet"])
      );
      localStorage.setItem(
        "near-wallet-selector:selectedWalletId",
        JSON.stringify("my-near-wallet")
      );
      localStorage.setItem(
        "near_app_wallet_auth_key",
        JSON.stringify({ accountId, allKeys: [publicKey] })
      );
      localStorage.setItem(
        "near-wallet-selector:contract",
        JSON.stringify({ contractId: "social.near", methodNames: [] })
      );
    },
    {
      accountId: sandbox.account_id,
      publicKey: keyPair.getPublicKey().toString(),
      privateKey: keyPair.toString(),
    }
  );
  await page.goto(
    `https://${instanceName}.near.page/widget/app?page=settings&tab=system-updates`
  );

  await expect(await page.getByText("Available Updates")).toBeEnabled();

  await page.getByText("Available Updates").click({ timeout: 7_000 });
  await expect(page.getByText("Web4 Contract")).toBeVisible({
    timeout: 10_000,
  });

  await page.locator("#dropdownIcon").click();
  await expect(await page.getByText("Select Gateway")).toBeVisible();
  await page.waitForTimeout(500);
  await page.locator("#dropdownIcon").click();

  await sandbox.deployNewTreasuryFactoryWithUpdatedWeb4Contract(page);

  await page.locator("button", { hasText: "Review" }).click();
  await page.getByRole("button", { name: "Yes, proceed" }).click();

  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(
    await page.getByRole("button", { name: "Confirm" })
  ).not.toBeVisible();

  await page.reload();

  await expect(await page.getByText("Available Updates")).toBeEnabled();

  await page.getByText("Available Updates").click();
  await expect(page.getByText("Web4 Contract")).toBeVisible({
    timeout: 10_000,
  });

  await page.locator("#dropdownIcon").click();
  await expect(await page.getByText("Gateway Select")).toBeVisible();

  await page.waitForTimeout(500);
  await sandbox.quitSandbox();
});
