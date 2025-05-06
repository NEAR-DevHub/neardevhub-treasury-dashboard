import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { SandboxRPC } from "../../util/sandboxrpc.js";
import nearApi from "near-api-js";

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("connected with ledger", function () {
  test.use({
    contextOptions: {
      permissions: ["clipboard-read", "clipboard-write"],
    },
    storageState:
      "playwright-tests/storage-states/wallet-connected-ledger.json",
  });

  test("should go to treasury self creation page", async ({
    page,
    factoryAccount,
  }) => {
    test.setTimeout(120_000);
    // initial step
    await page.goto(`/${factoryAccount}/widget/app?page=create`);
    await expect(
      await page.locator("h3", { hasText: "Confirm your wallet" }),
    ).toBeVisible();

    const sandbox = new SandboxRPC();
    await sandbox.init();

    await page.getByRole("link", { name: "Continue" }).click();

    // create application account name step
    await expect(
      await page.getByRole("heading", { name: "Create Treasury Accounts" }),
    ).toBeVisible();
    const treasuryName = "new-treasury";
    await page.getByPlaceholder("my-treasury").fill(treasuryName);
    await expect(page.getByText(`NEAR ${treasuryName} .near`)).toBeVisible();
    await expect(
      page.getByText(`Sputnik DAO  ${treasuryName} .`),
    ).toBeVisible();
    await page.getByRole("link", { name: "Continue" }).click();

    // add members step
    await expect(
      page.getByRole("heading", { name: "Add Members" }),
    ).toBeVisible();
    await expect(page.getByText("Ori theori.near Requestor")).toBeVisible();

    await page.getByRole('button', { name: ' Add Member' }).click()
    const accountInput = page.getByPlaceholder("treasury.near");
    await accountInput.fill("testingaccount.near");
    const memberSubmitBtn = page
    .locator(".offcanvas-body")
    .getByRole("button", { name: "Submit" });
    expect(await memberSubmitBtn.isDisabled()).toBe(true);
    const permissionsSelect = page.locator(".dropdown-toggle").first();
    await expect(permissionsSelect).toBeVisible();
    await permissionsSelect.click();
    await page.locator(".dropdown-item").first().click();
    expect(await memberSubmitBtn.isEnabled()).toBe(true);
    await memberSubmitBtn.click()
    await expect(page.getByText('testingaccount.near Requestor')).toBeVisible()
   await page.waitForTimeout(5_000)
    await page.getByRole("link", { name: "Continue" }).click();

    // confirm transaction step
    await expect(
      await page.locator("h3", { hasText: "Summary" }),
    ).toBeVisible();

    const submitBtn = page.locator("button", { hasText: "Confirm and Create" });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // bos txn confirmation modal
    const widget_reference_account_id = "bootstrap.treasury-factory.near";

    await sandbox.attachRoutes(page, [
      `${treasuryName}.near`,
      widget_reference_account_id,
    ]);
    console.log("sandbox initialized");
    await sandbox.setupDefaultWidgetReferenceAccount();

    const transactionToSendPromise = page.evaluate(async () => {
      const selector =
        await document.querySelector("near-social-viewer").selectorPromise;

      const wallet = await selector.wallet();

      return new Promise((resolve) => {
        wallet.signAndSendTransactions = async (transactions) => {
          resolve(transactions.transactions[0]);

          const transactionResult = await new Promise(
            (transactionSentPromiseResolve) =>
              (window.transactionSentPromiseResolve =
                transactionSentPromiseResolve),
          );
          console.log("transaction completed");
          return transactionResult;
        };
      });
    });

    await page.getByRole("button", { name: "Confirm", exact: true }).click();

    const transactionToSend = await transactionToSendPromise;

    const transactionResult = await sandbox.account.functionCall({
      contractId: transactionToSend.receiverId,
      methodName: transactionToSend.actions[0].params.methodName,
      args: transactionToSend.actions[0].params.args,
      gas: transactionToSend.actions[0].params.gas,
      attachedDeposit: transactionToSend.actions[0].params.deposit,
    });

    console.log(JSON.stringify(transactionToSend));
    expect(
      transactionToSend.actions[0].params.args.widget_reference_account_id,
    ).toEqual(widget_reference_account_id);

    await page.evaluate((transactionResult) => {
      window.transactionSentPromiseResolve(transactionResult);
    }, transactionResult);

    await expect(
      page.getByRole("heading", { name: "Congratulations! Your Treasury is ready" }),
    ).toBeVisible({ timeout: 20_000 });
    await sandbox.quitSandbox();
  });
});
