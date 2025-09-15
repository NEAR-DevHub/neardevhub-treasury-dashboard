import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { SandboxRPC } from "../../util/sandboxrpc.js";
import nearApi from "near-api-js";
import { mockNearBalances } from "../../util/rpcmock.js";


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
    await mockNearBalances({page, accountId:'theori.near', balance:BigInt(10 * 10 ** 24).toString(),})
    // initial step
    await page.goto(`/${factoryAccount}/widget/app?page=create`);
    await expect(
      await page.locator("h3", { hasText: "Confirm your wallet" }),
    ).toBeVisible();

    const sandbox = new SandboxRPC();
    await sandbox.init();
    await sandbox.indexer.attachIndexerRoutes(page);

    await page.getByRole("button", { name: "Continue" }).click();

    // create application account name step
    await expect(
      await page.getByRole("heading", { name: "Create Treasury Accounts" }),
    ).toBeVisible();
    
    const treasuryInput = page.getByPlaceholder("my-treasury");
    const continueButton = page.getByRole("button", { name: "Continue" });
    
    // Test minimum length validation
    await treasuryInput.fill("a");
    await continueButton.click();
    await expect(page.getByText("Name must be at least 2 characters long")).toBeVisible();
    await expect(continueButton).toBeDisabled();
    
    // Test maximum length validation
    await treasuryInput.fill("a".repeat(65));
    await continueButton.click();
    await expect(page.getByText("Name must be at most 64 characters long")).toBeVisible();
    await expect(continueButton).toBeDisabled();
    
    // Test name ending with .near should show error
    await treasuryInput.fill("test.near");
    await continueButton.click();
    await expect(page.getByText("Name cannot end with .near")).toBeVisible();
    await expect(continueButton).toBeDisabled();
    
    // Test name containing dots should show error (for subaccount format)
    await treasuryInput.fill("test.name");
    await continueButton.click();
    await expect(page.getByText("Name cannot contain dots (subaccounts are not allowed)")).toBeVisible();
    await expect(continueButton).toBeDisabled();
    
    // Test name with capital letters should show error
    await treasuryInput.fill("TestName");
    await continueButton.click();
    await expect(page.getByText("Name parts must contain only lowercase letters, numbers, underscores, and hyphens")).toBeVisible();
    await expect(continueButton).toBeDisabled();
    
    // Test name starting with underscore
    await treasuryInput.fill("_test");
    await continueButton.click();
    await expect(page.getByText("Name parts cannot start or end with underscore or hyphen")).toBeVisible();
    await expect(continueButton).toBeDisabled();
    
    // Test name ending with hyphen
    await treasuryInput.fill("test-");
    await continueButton.click();
    await expect(page.getByText("Name parts cannot start or end with underscore or hyphen")).toBeVisible();
    await expect(continueButton).toBeDisabled();
    
    // Test consecutive underscores
    await treasuryInput.fill("test__name");
    await continueButton.click();
    await expect(page.getByText("Name parts cannot have consecutive underscores or hyphens")).toBeVisible();
    await expect(continueButton).toBeDisabled();
    
    // Test ETH-implicit account (should be disallowed for Sputnik)
    await treasuryInput.fill("0x1234567890123456789012345678901234567890");
    await continueButton.click();
    await expect(page.getByText("Name cannot be an ETH-implicit account (hex address)")).toBeVisible();
    await expect(continueButton).toBeDisabled();
    
    // Test NEAR-implicit account (should be disallowed for Sputnik)
    await treasuryInput.fill("1234567890123456789012345678901234567890123456789012345678901234");
    await continueButton.click();
    await expect(page.getByText("Name cannot be a NEAR-implicit account (hex address)")).toBeVisible();
    await expect(continueButton).toBeDisabled();
    
    // Test valid name should show preview without errors
    await treasuryInput.fill('megha19');
    await continueButton.click();
    await expect(page.getByText("Account name already exists")).toBeVisible();
    await expect(continueButton).toBeDisabled();
    
    // Test valid name format - button should be enabled
    const treasuryName = "treasury-new-megha";
    await treasuryInput.fill(treasuryName);
    await page.waitForTimeout(600); 
    await expect(page.getByText(`NEAR ${treasuryName} .near`)).toBeVisible();
    await expect(
      page.getByText(`Sputnik DAO  ${treasuryName} .`),
    ).toBeVisible();
    await expect(continueButton).toBeEnabled();
    
    await page.getByRole("button", { name: "Continue" }).click();
    // add members step
    await expect(
      page.getByRole("heading", { name: "Add Members" }),
    ).toBeVisible();
  
    await expect(page.getByText('@theori.near')).toBeVisible();

    await page.getByRole('button', { name: ' Add Member' }).click()
    await page.waitForTimeout(3_000)
    const iframe = page. locator('iframe').contentFrame()
    const accountInput = iframe.getByPlaceholder("treasury.near");
    await accountInput.fill("testingaccount.near");
    const submitButton = iframe.getByRole("button", { name: "Submit" });
    await iframe.getByText("Add Permission").click();
    await iframe.locator(".dropdown-item").first().click();
    await submitButton.click()
    await expect(page.getByText('@testingaccount.near')).toBeVisible()
    await page.getByRole("button", { name: "Continue" }).click();

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
