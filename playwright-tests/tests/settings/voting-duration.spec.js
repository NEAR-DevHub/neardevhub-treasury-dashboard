import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { getTransactionModalObject } from "../../util/transaction.js";
import { SandboxRPC } from "../../util/sandboxrpc.js";
import { mockRpcRequest } from "../../util/rpcmock.js";

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

  test("should show confirmation toast", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    const daoName = "devdao";

    const sandbox = new SandboxRPC();
    await sandbox.init();
    await sandbox.attachRoutes(page);
    await sandbox.setupSandboxForSputnikDao(daoName);

    await sandbox.addPaymentRequestProposal({
      title: "Test payment",
      summary: "Pay something",
      amount: "56000000",
      receiver_id: "webassemblymusic.near",
      daoName,
    });

    await mockRpcRequest({
      page,
      filterParams: {
        method_name: "get_proposals",
      },
      modifyOriginalResultFunction: (originalResult) => {
        console.log("GP:", originalResult);
        return originalResult;
      },
    });

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

    await sandbox.account.functionCall({
      contractId: "devdao.sputnik-dao.near",
      methodName: "add_proposal",
      args: transactionToSend.actions[0].params.args,
      attachedDeposit: transactionToSend.actions[0].params.deposit,
    });

    await sandbox.quitSandbox();
  });

  test("changing voting duration should show changed expiry dates for pending proposals", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    const lastProposalId = 100;
    await mockRpcRequest({
      page,
      filterParams: {
        account_id: daoAccount,
      },
      modifyOriginalResultFunction: (originalResult, postData, args) => {
        if (postData.params.method_name === "get_proposals") {
          const proposals = [];
          for (
            let id = args.from_index;
            id < args.from_index + args.limit;
            id++
          ) {
            proposals.push({
              id,
              proposer: "neardevgov.near",
              description: `Add tester${id}.near as council member`,
              kind: {
                AddMemberToRole: {
                  member_id: `tester${id}.near`,
                  role: "council",
                },
              },
              status: ["InProgress", "Approved", "Expired"][id % 3],
              vote_counts: { council: [1, 0, 0] },
              votes: { "neardevgov.near": "Approve" },
              submission_time: (
                BigInt(new Date().getTime()) * 1_000_000n -
                BigInt(lastProposalId - id) * 1_000_000_000n * 60n * 60n * 4n
              ).toString(),
            });
          }
          return proposals;
        } else if (postData.params.method_name === "get_last_proposal_id") {
          return lastProposalId;
        } else {
          return originalResult;
        }
      },
    });

    await page.goto(`/${instanceAccount}/widget/app?page=settings`);
    await page.getByText("Voting Duration").first().click();

    await page.waitForTimeout(500);
    const currentDurationDays = await page
      .getByPlaceholder("Enter voting duration days")
      .inputValue();
    const newDurationDays = Number(currentDurationDays) - 2;
    await page
      .getByPlaceholder("Enter voting duration days")
      .fill(newDurationDays.toString());

    await expect(await page.locator(".alert-danger")).toBeVisible();
    await expect(await page.locator(".alert-danger")).toHaveText(
      "The following proposals will expire because of the changed duration"
    );
    await expect(await page.locator(".proposal-that-will-expire")).toHaveCount(
      4
    );
  });
});
