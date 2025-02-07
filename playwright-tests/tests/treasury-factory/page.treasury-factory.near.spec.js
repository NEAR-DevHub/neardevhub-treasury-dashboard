import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { SandboxRPC } from "../../util/sandboxrpc.js";
import nearApi from "near-api-js";

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("admin connected", function () {
  test.use({
    contextOptions: {
      permissions: ["clipboard-read", "clipboard-write"],
    },
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test("should go to treasury self creation page", async ({
    page,
    factoryAccount,
  }) => {
    test.setTimeout(120_000);
    const setupSandboxTxnProcessing = async () => {
      const widget_reference_account_id = "bootstrap.treasury-factory.near";
      const sandbox = new SandboxRPC();

      await sandbox.init();
      await sandbox.attachRoutes(page);
      console.log("sandbox initialized");
      await sandbox.setupDefaultWidgetReferenceAccount();

      const transactionToSendPromise = page.evaluate(async () => {
        const selector = await document.querySelector("near-social-viewer")
          .selectorPromise;

        const wallet = await selector.wallet();

        return new Promise((resolve) => {
          wallet.signAndSendTransactions = async (transactions) => {
            resolve(transactions.transactions[0]);

            return await new Promise(
              (transactionSentPromiseResolve) =>
                (window.transactionSentPromiseResolve =
                  transactionSentPromiseResolve)
            );
          };
        });
      });

      await page.getByRole("button", { name: "Confirm", exact: true }).click();

      const transactionToSend = await transactionToSendPromise;

      console.log(JSON.stringify(transactionToSend));
      expect(
        transactionToSend.actions[0].params.args.widget_reference_account_id
      ).toEqual(widget_reference_account_id);

      const accessKey = await sandbox.getDevUserAccountAccessKey();
      const transaction = await nearApi.transactions.createTransaction(
          sandbox.account_id,
          accessKey.publicKey,
          "treasury-factory.near",
          accessKey.accessKey.nonce+1n,
          [nearApi.transactions.functionCall("create_instance", transactionToSend.actions[0].params.args, 300000000000000, nearApi.utils.format.parseNearAmount("9"))],
          nearApi.utils.serialize.base_decode(accessKey.accessKey.block_hash)
      );
      const [txHash, signedTx] = await nearApi.transactions.signTransaction(transaction, sandbox.account.connection.signer, sandbox.account_id, sandbox.account.connection.networkId);


      await page.evaluate(async (signedTx) => {
        const nearApi = await import("near-api-js");
        const transactionResult = await nearApi.connection.sendTransaction(signedTx);
        window.transactionSentPromiseResolve(transactionResult);
      }, signedTx);

      await sandbox.quitSandbox();
    };

    // innitial step
    await page.goto(`/${factoryAccount}/widget/app`);
    await expect(
      await page.locator("h3", { hasText: "Confirm your wallet" })
    ).toBeVisible();
    await page.getByRole('link', { name: 'Continue' }).click();

    // create application account name step
    await expect(
      await page.getByRole('heading', { name: 'Create Treasury Accounts' })
    ).toBeVisible();
    const treasuryName = "new-treasury";
    await page.getByPlaceholder('my-treasury').fill(treasuryName);
    await expect(await page.getByText(`NEAR ${treasuryName} .near`)).toBeVisible();
    await expect(await page.getByText(`Sputnik DAO  ${treasuryName} .`)).toBeVisible();
    await page.getByRole('link', { name: 'Continue' }).click();

    // add members step
    await expect(
      await page.getByRole('heading', { name: 'Add Members' })
    ).toBeVisible();
    await expect(await page.getByText('Ori theori.near Create')).toBeVisible();

    await page.getByRole('link', { name: 'Continue' }).click();

    // confirm transaction step
    await expect(
      await page.locator("h3", { hasText: "Summary" })
    ).toBeVisible();

    const submitBtn = page.locator("button", { hasText: "Confirm and Create" });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // bos txn confirmation modal
    await setupSandboxTxnProcessing();

    await expect(
      await page.locator("h5", { hasText: "Congrats! Your Treasury is ready" })
    ).toBeVisible();
  });
});
