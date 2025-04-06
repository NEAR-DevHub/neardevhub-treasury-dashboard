import { expect } from "@playwright/test";
import { cacheCDN, test } from "../../util/test.js";
import {
  DEFAULT_WIDGET_REFERENCE_ACCOUNT_ID,
  SandboxRPC,
} from "../../util/sandboxrpc.js";
import { createDAOargs } from "../../util/sputnikdao.js";
import nearApi from "near-api-js";

test("should update treasury factory with new web4 contract and self upgrade instance", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await cacheCDN(page);

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

  // Normal users should not see the update banner
  await page.waitForTimeout(500);
  await expect(
    await page.getByRole("link", { name: "Review" })
  ).not.toBeVisible();

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

  await page.reload();
  await expect(await page.getByRole("link", { name: "Review" })).toBeVisible();
  await page.getByRole("link", { name: "Review" }).click();

  await expect(await page.getByText("Available Updates")).toBeEnabled({
    timeout: 20_000,
  });

  await page.getByText("Available Updates").click();

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
    "widgets.treasury-factory.near/widget/pages.settings.systemupdates.UpdateRegistry",
    `
    return [
      {
          id: 99999999,
          createdDate: "2025-04-05",
          version: "n/a",
          type: "Web4 Contract",
          summary: "contract update",
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
  await page.getByText("Available Updates").click();

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

  await page.getByText("Available Updates").click();
  await expect(page.getByText("Web4 Contract")).not.toBeVisible({
    timeout: 10_000,
  });

  await page.locator("#dropdownIcon").click();
  await expect(await page.getByText("Gateway Select")).toBeVisible();

  await page.waitForTimeout(500);
  await page.goto(`https://${instanceName}.near.page/`);

  await page.waitForTimeout(500);
  await expect(
    await page.getByRole("link", { name: "Review" })
  ).not.toBeVisible();

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await sandbox.quitSandbox();
});
