import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

import { mockTransactionSubmitRPCResponses } from "../../util/transaction";
import {
  mockNearBalances,
  mockRpcRequest,
  mockWithFTBalance,
  updateDaoPolicyMembers,
} from "../../util/rpcmock";
import { setDontAskAgainCacheValues } from "../../util/cache";
import { mockPikespeakFTTokensResponse } from "../../util/pikespeak.js";
import {
  CurrentTimestampInNanoseconds,
  TransferProposalData,
} from "../../util/inventory.js";
import { InsufficientBalance, toBase64 } from "../../util/lib.js";
import { SandboxRPC } from "../../util/sandboxrpc.js";
import { getInstanceConfig } from "../../util/config.js";

async function voteOnProposal({
  page,
  daoAccount,
  instanceAccount,
  voteStatus,
  vote,
  isMultiVote,
}) {
  const transferProposalData = JSON.parse(JSON.stringify(TransferProposalData));
  let lastProposalId = transferProposalData.id;
  let isTransactionCompleted = false;
  const contractId = daoAccount;
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposals",
    },
    modifyOriginalResultFunction: (originalResult) => {
      originalResult = transferProposalData;
      if (isTransactionCompleted && !isMultiVote) {
        originalResult.status = voteStatus;
      } else {
        originalResult.status = "InProgress";
      }
      return originalResult;
    },
  });

  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposal",
    },
    modifyOriginalResultFunction: (originalResult) => {
      originalResult = transferProposalData;
      if (isTransactionCompleted && vote === "Remove" && !isMultiVote) {
        return {
          isError: true,
          error:
            "wasm execution failed with error: HostError(GuestPanic { panic_msg: \"panicked at 'ERR_NO_PROPOSAL', sputnikdao2/src/views.rs:102:48\" })",
        };
      } else if (isTransactionCompleted) {
        if (!isMultiVote) {
          originalResult.status = voteStatus;
        }
        originalResult.votes["theori.near"] = vote;
      }
      return originalResult;
    },
  });

  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_last_proposal_id",
    },
    modifyOriginalResultFunction: (originalResult) => {
      if (isTransactionCompleted) {
        originalResult = lastProposalId + 1;
      } else {
        originalResult = lastProposalId;
      }
      return originalResult;
    },
  });

  const widgetsAccount =
    (instanceAccount.includes("testing") === true
      ? "test-widgets"
      : "widgets") + ".treasury-factory.near";
  await page.goto(`/${instanceAccount}/widget/app?page=payments`);
  await setDontAskAgainCacheValues({
    page,
    widgetSrc: `${widgetsAccount}/widget/components.VoteActions`,
    contractId,
    methodName: "act_proposal",
  });

  await mockTransactionSubmitRPCResponses(
    page,
    async ({ route, transaction_completed }) => {
      isTransactionCompleted = transaction_completed;
      await route.fallback();
    }
  );
}

async function mockPaymentProposals({ page }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposals",
    },
    modifyOriginalResultFunction: () => {
      let originalResult = [JSON.parse(JSON.stringify(TransferProposalData))];
      originalResult[0].id = 0;
      // non expired request
      originalResult[0].submission_time = CurrentTimestampInNanoseconds;
      return originalResult;
    },
  });
}

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe.parallel("User logged in with different roles", () => {
  const roles = [
    {
      name: "Create role",
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin-with-create-role.json",
      canVote: false,
    },
    {
      name: "Settings role",
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin-with-settings-role.json",
      canVote: false,
    },
    {
      name: "All role",
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin-with-all-role.json",
      canVote: true,
    },
  ];

  for (const { name, storageState, canVote } of roles) {
    test.describe(`User with '${name}'`, () => {
      test.use({ storageState });

      test(
        "should " + (canVote ? "" : "not ") + "see 'Vote' action",
        async ({ page, instanceAccount }) => {
          test.setTimeout(60_000);
          await updateDaoPolicyMembers({
            instanceAccount,
            page,
            hasAllRole: canVote,
          });

          await mockRpcRequest({
            page,
            filterParams: { method_name: "get_proposals" },
            modifyOriginalResultFunction: () => {
              const result = JSON.parse(JSON.stringify(TransferProposalData));
              result.submission_time = CurrentTimestampInNanoseconds;
              result.status = "InProgress";
              return result;
            },
          });

          await page.goto(`/${instanceAccount}/widget/app?page=payments`);

          await expect(page.getByText("Pending Requests")).toBeVisible({
            timeout: 20_000,
          });

          await expect(
            page.getByRole("cell", { name: 10, exact: true })
          ).toBeVisible({ timeout: 10_000 });

          const voteButton = page
            .getByRole("button", { name: "Approve" })
            .first();
          canVote
            ? await expect(voteButton).toBeVisible()
            : await expect(voteButton).toBeHidden();
        }
      );
    });
  }
});

test.describe("don't ask again", function () {
  test.use({
    storageState:
      "playwright-tests/storage-states/wallet-connected-admin-with-accesskey.json",
  });

  test("should throw insufficient signed in account balance error", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await updateDaoPolicyMembers({ instanceAccount, page });
    await mockNearBalances({
      page,
      accountId: "theori.near",
      balance: InsufficientBalance,
      storage: 8,
    });
    await voteOnProposal({
      page,
      daoAccount,
      instanceAccount,
      voteStatus: "Approved",
      vote: "Approve",
    });
    const approveButton = page
      .getByRole("button", {
        name: "Approve",
      })
      .first();
    await expect(approveButton).toBeEnabled({ timeout: 30_000 });
    await approveButton.click();
    await expect(
      page
        .getByText("Please add more funds to your account and try again")
        .nth(1)
    ).toBeVisible();
  });
  test("should throw insufficient dao account balance error", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ instanceAccount, page });
    await mockWithFTBalance({ page, daoAccount, isSufficient: false });
    await voteOnProposal({
      page,
      daoAccount,
      instanceAccount,
      voteStatus: "Approved",
      vote: "Approve",
    });
    const approveButton = page
      .getByRole("button", {
        name: "Approve",
      })
      .first();
    await expect(approveButton).toBeEnabled({ timeout: 30_000 });
    await approveButton.click();
    await expect(page.getByText("Insufficient Balance")).toBeVisible();
    await page.getByRole("button", { name: "Proceed Anyway" }).click();
  });

  test("approve payment request with single and multiple required votes", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    const isMultiVote = daoAccount === "infinex.sputnik-dao.near";
    const contractId = daoAccount;
    await mockPaymentProposals({ page });
    await mockWithFTBalance({ page, daoAccount, isSufficient: true });
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ instanceAccount, page, isMultiVote });
    await voteOnProposal({
      page,
      daoAccount,
      instanceAccount,
      voteStatus: "Approved",
      vote: "Approve",
      isMultiVote,
    });
    const approveButton = page
      .getByRole("button", {
        name: "Approve",
      })
      .first();
    await expect(approveButton).toBeEnabled({ timeout: 30_000 });
    await approveButton.click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(
      page.getByText("Awaiting transaction confirmation...")
    ).toBeVisible();
    await expect(approveButton).toBeDisabled();

    const transaction_toast = page.getByText(
      `Calling contract ${contractId} with method act_proposal`
    );
    await expect(transaction_toast).toBeVisible();

    await transaction_toast.waitFor({ state: "detached", timeout: 20_000 });
    await expect(transaction_toast).not.toBeVisible();
    if (isMultiVote) {
      await expect(
        page.getByText(
          "Your vote is counted, the payment request is highlighted."
        )
      ).toBeVisible();
    } else {
      await expect(
        page.getByText("The payment request has been successfully executed.")
      ).toBeVisible();
      await page.getByText("View in History").click();
    }

    await expect(page.locator("tr").nth(1)).toHaveClass("bg-highlight", {
      timeout: 10_000,
    });
  });

  test("reject payment request with single and multiple required votes", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(80_000);
    const isMultiVote = daoAccount === "infinex.sputnik-dao.near";
    await mockWithFTBalance({ page, daoAccount, isSufficient: true });
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ instanceAccount, page, isMultiVote });
    const contractId = daoAccount;
    await voteOnProposal({
      page,
      daoAccount,
      instanceAccount,
      voteStatus: "Rejected",
      vote: "Reject",
      isMultiVote,
    });

    const rejectButton = page
      .getByRole("button", {
        name: "Reject",
      })
      .first();
    await expect(rejectButton).toBeEnabled({ timeout: 10000 });
    await rejectButton.click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(
      page.getByText("Awaiting transaction confirmation...")
    ).toBeVisible();
    await expect(rejectButton).toBeDisabled();

    const transaction_toast = page.getByText(
      `Calling contract ${contractId} with method act_proposal`
    );
    await expect(transaction_toast).toBeVisible();

    await transaction_toast.waitFor({ state: "detached", timeout: 20_000 });
    await expect(transaction_toast).not.toBeVisible();
    if (isMultiVote) {
      await expect(
        page.getByText(
          "Your vote is counted, the payment request is highlighted."
        )
      ).toBeVisible();
    } else {
      await expect(
        page.getByText("The payment request has been rejected.")
      ).toBeVisible();
      await page.getByText("View in History").click();
    }

    await expect(page.locator("tr").nth(1)).toHaveClass("bg-highlight", {
      timeout: 30_000,
    });
    await page.waitForTimeout(1_000);
  });

  test("delete payment request with single and multiple required votes", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(80_000);
    const isMultiVote = daoAccount === "infinex.sputnik-dao.near";
    await mockWithFTBalance({ page, daoAccount, isSufficient: true });
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ instanceAccount, page, isMultiVote });
    const contractId = daoAccount;
    await voteOnProposal({
      page,
      daoAccount,
      instanceAccount,
      voteStatus: "Removed",
      vote: "Remove",
      isMultiVote,
    });

    const deleteButton = page.getByTestId("delete-btn").first();
    await expect(deleteButton).toBeEnabled({ timeout: 10000 });
    await deleteButton.click();
    await expect(
      page.getByText("Do you really want to delete this request?")
    ).toBeVisible();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(
      page.getByText("Awaiting transaction confirmation...")
    ).toBeVisible();

    await expect(deleteButton).toBeDisabled();

    const transaction_toast = page.getByText(
      `Calling contract ${contractId} with method act_proposal`
    );
    await expect(transaction_toast).toBeVisible();

    await transaction_toast.waitFor({ state: "detached", timeout: 20_000 });
    await expect(transaction_toast).not.toBeVisible();
    if (isMultiVote) {
      await expect(
        page.getByText(
          "Your vote is counted, the payment request is highlighted."
        )
      ).toBeVisible();
    } else {
      await expect(
        page.getByText("The payment request has been successfully deleted.")
      ).toBeVisible();
    }
  });

  test("submit action should show transaction loader and handle cancellation correctly", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    test.setTimeout(100_000);
    await mockPaymentProposals({ page });
    await mockWithFTBalance({ page, daoAccount, isSufficient: true });
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ instanceAccount, page, isMultiVote: false });
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    const approveButton = page
      .getByRole("button", {
        name: "Approve",
      })
      .first();
    await expect(approveButton).toBeEnabled({ timeout: 30_000 });
    await mockRpcRequest({
      page,
      filterParams: {
        method_name: "get_proposal",
      },
      modifyOriginalResultFunction: (originalResult) => {
        originalResult = TransferProposalData;
        originalResult.status = "InProgress";
        return originalResult;
      },
    });
    await approveButton.click();
    await page.getByRole("button", { name: "Confirm" }).click();
    const loader = page.getByText("Awaiting transaction confirmation...");
    await expect(loader).toBeVisible();
    await expect(approveButton).toBeDisabled();
    await page.getByRole("button", { name: "Close" }).nth(1).click();
    await page
      .locator(".toast-body")
      .getByRole("button", { name: "Cancel" })
      .click();
    await expect(loader).toBeHidden();
    await expect(approveButton).toBeEnabled();
  });
});

async function createSandboxAndLockupRequest({ page, daoAccount }) {
  const daoName = daoAccount.split(".")[0];
  const sandbox = new SandboxRPC();
  const proposalTitle = "Test proposal title";
  const proposalSummary = "Test proposal summary";
  const receiverAccount = daoAccount;
  const description = `* Title: ${proposalTitle} <br>* Summary: ${proposalSummary} <br>* Proposal Action: transfer`;
  await sandbox.init();
  await sandbox.attachRoutes(page);
  await sandbox.setupSandboxForSputnikDao(daoName, "theori.near");
  const lockupContractId = await sandbox.setupLockupContract(daoAccount);
  await sandbox.addFunctionCallProposal({
    method_name: "transfer",
    functionArgs: toBase64({
      amount: "3000000000000000000000000",
      receiver_id: receiverAccount,
    }),
    receiver_id: lockupContractId,
    description,
    daoName,
  });
  return { sandbox, lockupContractId };
}

async function mockLockupLiquidAmount({ page, isSufficient }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_liquid_owners_balance",
    },
    modifyOriginalResultFunction: () => {
      return isSufficient ? "3500000000000000000000000" : "0";
    },
  });
}

test.describe("Vote on Lockup payment request", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test("should throw insufficient lockup account balance error", async ({
    page,
    instanceAccount,
    daoAccount,
    lockupContract,
  }) => {
    test.setTimeout(250_000);
    if (!lockupContract) {
      console.log("no lockup contract found for instance");
      return test.skip();
    }
    const { sandbox, lockupContractId } = await createSandboxAndLockupRequest({
      page,

      daoAccount,
    });
    await updateDaoPolicyMembers({ instanceAccount, page });
    await mockLockupLiquidAmount({ page, isSufficient: false });
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    const approveButton = page
      .getByRole("button", {
        name: "Approve",
      })
      .first();
    await expect(approveButton).toBeEnabled({ timeout: 30_000 });
    await approveButton.click();
    await expect(page.getByText("Insufficient Balance")).toBeVisible();
    await page.getByRole("button", { name: "Proceed Anyway" }).click();
    await sandbox.quitSandbox();
  });

  test("approve lockup transfer payment request with single vote", async ({
    page,
    instanceAccount,
    daoAccount,
    lockupContract,
  }) => {
    test.setTimeout(250_000);
    if (!lockupContract) {
      console.log("no lockup contract found for instance");
      return test.skip();
    }
    const { sandbox } = await createSandboxAndLockupRequest({
      page,

      daoAccount,
    });
    await updateDaoPolicyMembers({ instanceAccount, page, isMultiVote: true });
    await mockLockupLiquidAmount({ page, isSufficient: true });
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    const approveButton = page
      .getByRole("button", {
        name: "Approve",
      })
      .first();
    await expect(approveButton).toBeEnabled({ timeout: 30_000 });
    await approveButton.click();

    page.evaluate(async () => {
      const selector = await document.querySelector("near-social-viewer")
        .selectorPromise;

      const wallet = await selector.wallet();

      return new Promise((resolve) => {
        wallet["signAndSendTransaction"] = async (transaction) => {
          resolve(transaction);
          return new Promise((transactionSentPromiseResolve) => {
            window.transactionSentPromiseResolve =
              transactionSentPromiseResolve;
          });
        };
      });
    });

    await expect(
      page.getByRole("heading", { name: "Confirm your vote" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    const transactionResult = await sandbox.account.functionCall({
      contractId: daoAccount,
      methodName: "act_proposal",
      args: {
        id: 0,
        action: "VoteApprove",
      },
      gas: "300000000000000",
      attachedDeposit: "0",
    });
    await page.evaluate(async (transactionResult) => {
      window.transactionSentPromiseResolve(transactionResult);
    }, transactionResult);
    await expect(page.locator("div.modal-body code").nth(0)).toBeAttached({
      attached: false,
      timeout: 10_000,
    });
    await expect(page.locator(".spinner-border")).toBeAttached({
      attached: false,
      timeout: 10_000,
    });
    await expect(page.locator(".offcanvas-body")).toBeVisible({
      visible: false,
    });
    await expect(
      page.getByText("The payment request has been successfully executed.")
    ).toBeVisible();
    await page.getByText("View in History").click();
    await expect(page.locator("tr").nth(1)).toHaveClass("bg-highlight", {
      timeout: 10_000,
    });
    await sandbox.quitSandbox();
  });
});
