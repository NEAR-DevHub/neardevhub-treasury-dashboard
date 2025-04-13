import { expect } from "@playwright/test";
import { cacheCDN, test } from "../../util/test.js";
import { mockRpcRequest } from "../../util/rpcmock.js";
import { voteOnProposal } from "./stake-delegation-common.js";

test.beforeEach(async ({ page }) => {
  await cacheCDN(page);
});
test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("Don't ask again connected", function () {
  test.use({
    storageState:
      "playwright-tests/storage-states/wallet-connected-admin-with-accesskey.json",
  });
  test("Should approve a stake request", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(120_000);
    const isMultiVote = daoAccount === "infinex.sputnik-dao.near";
    await voteOnProposal({
      page,
      daoAccount,
      instanceAccount,
      voteStatus: "Approved",
      vote: "Approve",
      isMultiVote,
    });
    const approveButton = page.getByRole("button", {
      name: "Approve",
    });

    await expect(approveButton).toBeEnabled({ timeout: 40_000 });
    await approveButton.click();
    expect(
      page.getByRole("heading", { name: "Confirm your vote" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Confirm" }).click();
    const transaction_toast = page.getByText(
      `Calling contract ${daoAccount} with method act_proposal`
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
      ).toBeVisible({ timeout: 15_000 });
    }
  });

  test("Should reject a stake request", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(120_000);
    const isMultiVote = daoAccount === "infinex.sputnik-dao.near";
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
    await expect(rejectButton).toBeEnabled({ timeout: 40_000 });
    await rejectButton.click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(rejectButton).toBeDisabled();

    const transaction_toast = page.getByText(
      `Calling contract ${daoAccount} with method act_proposal`
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
        page.getByText("The payment request has been rejected.")
      ).toBeVisible();
    }
  });

  test("Should remove a stake request", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(120_000);
    const isMultiVote = daoAccount === "infinex.sputnik-dao.near";
    await voteOnProposal({
      page,
      daoAccount,
      instanceAccount,
      voteStatus: "Removed",
      vote: "Remove",
      isMultiVote,
    });

    const deleteButton = page.getByTestId("delete-btn").first();

    await expect(deleteButton).toBeEnabled({ timeout: 40_000 });
    await deleteButton.click();
    await expect(
      page.getByText("Do you really want to delete this request?")
    ).toBeVisible();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(deleteButton).toBeDisabled();

    const transaction_toast = page.getByText(
      `Calling contract ${daoAccount} with method act_proposal`
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
        page.getByText("The payment request has been successfully deleted.")
      ).toBeVisible();
    }
  });

  test("Should approve a withdraw request, when amount is ready to be withdrawn", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    test.setTimeout(150_000);
    await mockRpcRequest({
      page,
      filterParams: {
        method_name: "is_account_unstaked_balance_available",
      },
      modifyOriginalResultFunction: () => {
        return true;
      },
    });
    const isMultiVote = daoAccount === "infinex.sputnik-dao.near";
    await voteOnProposal({
      page,
      daoAccount,
      instanceAccount,
      voteStatus: "Approved",
      vote: "Approve",
      isMultiVote,
      isWithdrawRequest: true,
    });
    const approveButton = page.getByRole("button", {
      name: "Approve",
    });

    await expect(approveButton).toBeEnabled({ timeout: 40_000 });
    await approveButton.click();
    expect(
      page.getByRole("heading", { name: "Confirm your vote" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Confirm" }).click();
    const transaction_toast = page.getByText(
      `Calling contract ${daoAccount} with method act_proposal`
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
    }
  });
});
