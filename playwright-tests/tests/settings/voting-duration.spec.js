import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import {
  getTransactionModalObject,
  mockTransactionSubmitRPCResponses,
} from "../../util/transaction.js";
import {
  getSandboxRPC,
  setupSandboxForSputnikDao,
  killSandbox,
} from "../../util/sandboxrpc.js";

test.describe("admin connected", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test("should set voting duration", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    await page.goto(`/${instanceAccount}/widget/app?page=settings`);
    await page.getByText("Voting Duration").first().click();

    await page.waitForTimeout(500);
    const currentDurationDays = await page
      .getByPlaceholder("Enter voting duration days")
      .inputValue();
    const newDurationDays = Number(currentDurationDays) + 3;
    await page
      .getByPlaceholder("Enter voting duration days")
      .fill(newDurationDays.toString());

    await page.waitForTimeout(500);
    await page.getByText("Submit").click();

    await expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: "Change proposal period",
        kind: {
          ChangePolicyUpdateParameters: {
            parameters: {
              proposal_period: (
                BigInt(newDurationDays) *
                60n *
                60n *
                24n *
                1_000_000_000n
              ).toString(),
            },
          },
        },
      },
    });
  });

  test("cancelling set voting duration should reset to original value", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    await page.goto(`/${instanceAccount}/widget/app?page=settings`);
    await page.getByText("Voting Duration").first().click();

    await page.waitForTimeout(500);
    const currentDurationDays = await page
      .getByPlaceholder("Enter voting duration days")
      .inputValue();
    await page
      .getByPlaceholder("Enter voting duration days")
      .fill((Number(currentDurationDays) + 3).toString());

    await page.waitForTimeout(500);
    await page.getByText("Cancel").click();

    await expect(
      await page.getByPlaceholder("Enter voting duration days")
    ).toHaveValue("7");
  });

  test("changing voting duration should show changed expiry dates for pending proposals", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    const { account, sandbox } = await getSandboxRPC({ page });
    await setupSandboxForSputnikDao({ account, daoName: "devdao" });

    await page.goto(`/${instanceAccount}/widget/app?page=settings`);
    await page.getByText("Voting Duration").first().click();

    await page.waitForTimeout(500);
    const currentDurationDays = await page
      .getByPlaceholder("Enter voting duration days")
      .inputValue();
    const newDurationDays = Number(currentDurationDays) + 3;
    await page
      .getByPlaceholder("Enter voting duration days")
      .fill(newDurationDays.toString());

    await page.waitForTimeout(500);
    await page.getByText("Submit").click();

    const transactionToSendPromise = page.evaluate(async () => {
      const selector = await document.querySelector("near-social-viewer")
        .selectorPromise;

      const wallet = await selector.wallet();

      return new Promise((resolve) => {
        wallet.signAndSendTransactions = (transactions) => {
          console.log("sign and send tx", transactions);
          resolve(transactions.transactions[0]);
        };
      });
    });

    await page.getByRole("button", { name: "Confirm" }).click();

    const transactionToSend = await transactionToSendPromise;

    console.log("sending tx", JSON.stringify(transactionToSend, null, 1));
    const result = await account.functionCall({
      contractId: "devdao.sputnik-dao.near",
      methodName: "add_proposal",
      args: transactionToSend.actions[0].params.args,
      attachedDeposit: transactionToSend.actions[0].params.deposit,
    });

    console.log(result);
    await page.waitForTimeout(500);
    await killSandbox(sandbox);
  });
});
