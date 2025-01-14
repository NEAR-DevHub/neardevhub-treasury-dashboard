import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { setDontAskAgainCacheValues } from "../../util/cache";
import { mockRpcRequest, updateDaoPolicyMembers } from "../../util/rpcmock";
import {
  CurrentTimestampInNanoseconds,
  OldSettingsProposalData,
  SettingsProposalData,
} from "../../util/inventory.js";
import { mockTransactionSubmitRPCResponses } from "../../util/transaction.js";

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

const lastProposalId = 2;
async function mockSettingsProposals({ page }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_last_proposal_id",
    },
    modifyOriginalResultFunction: () => {
      return lastProposalId;
    },
  });
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposals",
    },
    modifyOriginalResultFunction: () => {
      let originalResult = [
        JSON.parse(JSON.stringify(SettingsProposalData)),
        JSON.parse(JSON.stringify(OldSettingsProposalData)),
      ];
      originalResult[0].id = 0;
      originalResult[1].id = 1;
      // non expired request
      originalResult[0].submission_time = CurrentTimestampInNanoseconds;
      return originalResult;
    },
  });
}

async function voteOnProposal({
  page,
  daoAccount,
  instanceAccount,
  voteStatus,
  vote,
  isMultiVote,
}) {
  let isTransactionCompleted = false;
  const contractId = daoAccount;
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposals",
    },
    modifyOriginalResultFunction: (originalResult) => {
      originalResult = JSON.parse(JSON.stringify(SettingsProposalData));
      originalResult.submission_time = CurrentTimestampInNanoseconds;
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
      originalResult = JSON.parse(JSON.stringify(SettingsProposalData));
      if (isTransactionCompleted) {
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

  await page.goto(`/${instanceAccount}/widget/app?page=settings`);
  await setDontAskAgainCacheValues({
    page,
    widgetSrc: "widgets.treasury-factory.near/widget/components.VoteActions",
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

test.describe("User is not logged in", function () {
  test("View pending and history page", async ({ page, instanceAccount }) => {
    test.setTimeout(120_000);
    await mockSettingsProposals({ page });
    await page.goto(`/${instanceAccount}/widget/app?page=settings`);
    await page.waitForTimeout(20_000);
    await expect(
      page.getByRole("cell", { name: "0", exact: true })
    ).toBeVisible({ timeout: 20_000 });
    const detailsBtn = page
      .locator("tbody")
      .getByRole("cell", { name: "Details" });
    // check details w/ and w/o summary
    await expect(detailsBtn).toBeVisible();
    await detailsBtn.click();
    await expect(page.getByText("Summary")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.getByText("History").click();
    await expect(
      page.getByRole("cell", { name: "1", exact: true })
    ).toBeVisible({ timeout: 20_000 });
    await expect(detailsBtn).toBeVisible();
    await detailsBtn.click();
    await expect(page.getByText("Summary")).toBeHidden();
    await expect(page.getByText("Transaction Details")).toBeVisible();
    await expect(page.getByText("Expired")).toBeVisible();
  });
});

test.describe("don't ask again", function () {
  test.use({
    storageState:
      "playwright-tests/storage-states/wallet-connected-admin-with-accesskey.json",
  });
  test("approve payment request with single and multiple required votes", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    const isMultiVote = daoAccount === "infinex.sputnik-dao.near";
    const contractId = daoAccount;
    await updateDaoPolicyMembers({ page, isMultiVote });
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
    await expect(approveButton).toBeDisabled();

    const transaction_toast = page.getByText(
      `Calling contract ${contractId} with method act_proposal`
    );
    await expect(transaction_toast).toBeVisible();

    await transaction_toast.waitFor({ state: "detached", timeout: 20_000 });
    await expect(transaction_toast).not.toBeVisible();
    if (isMultiVote) {
      await expect(
        page.getByText("Your vote is counted, the request is highlighted.")
      ).toBeVisible();
    } else {
      await expect(
        page.getByText("The request has been successfully executed.")
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
    await updateDaoPolicyMembers({ page, isMultiVote });
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
    await expect(rejectButton).toBeDisabled();

    const transaction_toast = page.getByText(
      `Calling contract ${contractId} with method act_proposal`
    );
    await expect(transaction_toast).toBeVisible();

    await transaction_toast.waitFor({ state: "detached", timeout: 20_000 });
    await expect(transaction_toast).not.toBeVisible();
    if (isMultiVote) {
      await expect(
        page.getByText("Your vote is counted, the request is highlighted.")
      ).toBeVisible();
    } else {
      await expect(
        page.getByText("The request has been rejected.")
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
    await updateDaoPolicyMembers({ page, isMultiVote });
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
    await expect(deleteButton).toBeDisabled();

    const transaction_toast = page.getByText(
      `Calling contract ${contractId} with method act_proposal`
    );
    await expect(transaction_toast).toBeVisible();

    await transaction_toast.waitFor({ state: "detached", timeout: 20_000 });
    await expect(transaction_toast).not.toBeVisible();
    if (isMultiVote) {
      await expect(
        page.getByText("Your vote is counted, the request is highlighted.")
      ).toBeVisible();
    } else {
      await expect(
        page.getByText("The request has been successfully deleted.")
      ).toBeVisible();
    }
  });
});
