import { expect } from "@playwright/test";
import { test } from "../util/test.js";
import { getTransactionModalObject } from "../util/transaction.js";
import { SandboxRPC } from "../util/sandboxrpc.js";

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
    const accName = Math.random().toString(36).slice(2, 7);

    const setupSandboxTxnProcessing = async () => {
      const widget_reference_account_id = 'treasury-testing.near';
      const sandbox = new SandboxRPC();

      await sandbox.init();
      await sandbox.attachRoutes(page);
      await sandbox.setupWidgetReferenceAccount(widget_reference_account_id);

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

      await page.getByRole("button", { name: "Confirm" }).click();

      const transactionToSend = await transactionToSendPromise;

      const createInstanceResult = await sandbox.account.functionCall({
        contractId: "treasury-factory.near",
        methodName: 'create_instance', 
        args: transactionToSend.actions[0].params.args,
        attachedDeposit: transactionToSend.actions[0].params.deposit,
      });

      expect(
        createInstanceResult.receipts_outcome.filter(receipt_outcome => receipt_outcome.outcome.status.Failure).length
      ).toBe(0);

      await page.evaluate((transactionResult) => {
        window.transactionSentPromiseResolve(transactionResult);
      }, transactionResult);
    };

    // innitial step
    await page.goto(`/${factoryAccount}/widget/app`);
    await expect(
      await page.locator("h3", { hasText: "Confirm your wallet" })
    ).toBeVisible();
    await page
      .locator("a.active", {
        hasText: "Yes, use this wallet and continue",
      })
      .click();

    // create application account name step
    await expect(
      await page.locator("h3", { hasText: "Create Application Account" })
    ).toBeVisible();
    await page.locator("input.account-input").fill(accName);
    await page.locator("a", { hasText: "Next" }).click();

    // create sputnik dao account step
    await expect(
      await page.locator("h3", { hasText: "Create Sputnik DAO Account" })
    ).toBeVisible();
    await page.locator("input.account-input").fill(accName);
    await page.locator("a", { hasText: "Next" }).click();

    // add members step
    await expect(
      await page.locator("h3", { hasText: "Add Members" })
    ).toBeVisible();
    await page.locator("a", { hasText: "Next" }).click();

    // confirm transaction step
    await expect(
      await page.locator("h3", { hasText: "Summary" })
    ).toBeVisible();

    const submitBtn = page.locator("button", { hasText: "Confirm and Create" });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // bos txn confirmation modal
    await expect(
      await page.locator(".modal-title h4", { hasText: "Confirm Transaction" })
    ).toBeVisible();

    await setupSandboxTxnProcessing();
  });
});
