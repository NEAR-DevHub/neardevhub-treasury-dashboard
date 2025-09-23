import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { setDontAskAgainCacheValues } from "../../util/cache";
import { mockRpcRequest, updateDaoPolicyMembers } from "../../util/rpcmock";
import {
  CurrentTimestampInNanoseconds,
  OldSettingsProposalData,
  SettingsVotingDurationProposalData,
} from "../../util/inventory.js";
import { mockTransactionSubmitRPCResponses } from "../../util/transaction.js";

const lastProposalId = 2;

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
  await page.route(/\/proposals\/.*\?.*proposal_types=.*/, async (route) => {
    let originalResult = JSON.parse(
      JSON.stringify(SettingsVotingDurationProposalData)
    );
    originalResult.submission_time = CurrentTimestampInNanoseconds;
    if (isTransactionCompleted && !isMultiVote) {
      originalResult.status = voteStatus;
    } else {
      originalResult.status = "InProgress";
    }
    await route.fulfill({
      json: {
        proposals: [originalResult],
        total: 1,
      },
    });
  });

  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposal",
    },
    modifyOriginalResultFunction: (originalResult) => {
      originalResult = JSON.parse(
        JSON.stringify(SettingsVotingDurationProposalData)
      );
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

  await page.goto(`/${instanceAccount}/widget/app?page=settings`);
  const widgetsAccount =
    (instanceAccount.includes("testing") === true
      ? "test-widgets"
      : "widgets") + ".treasury-factory.near";

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

test.describe("User is not logged in", function () {
  test("Should navigate to different settings tabs", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(120_000);
    await page.goto(`/${instanceAccount}/widget/app?page=settings`);
    await page.waitForTimeout(5000);

    const tabs = [
      { name: "Members", url: "members" },
      { name: "Voting Thresholds", url: "voting-thresholds" },
      { name: "Voting Duration", url: "voting-duration" },
      { name: "Theme & Logo", url: "theme-logo" },
    ];

    for (const tab of tabs) {
      await page.getByRole("link", { name: tab.name }).click();
      await expect(page).toHaveURL(
        `http://localhost:8080/${instanceAccount}/widget/app?page=settings&tab=${tab.url}`
      );
      await page.waitForTimeout(5000);
      await expect(page.getByText(tab.name).first()).toBeVisible();
    }
  });
});

test.describe.parallel("User logged in with different roles", function () {
  const roles = [
    {
      name: "Create role",
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin-with-create-role.json",
    },
    {
      name: "Settings role",
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin-with-settings-role.json",
    },
    {
      name: "All role",
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin-with-all-role.json",
      hasAllRole: true,
    },
  ];

  for (const { name, storageState, hasAllRole } of roles) {
    test.describe(`User with '${name}'`, function () {
      test.use({ storageState: storageState });

      test("should only see 'Vote' action if authorized", async ({
        page,
        instanceAccount,
      }) => {
        test.setTimeout(60_000);
        await updateDaoPolicyMembers({
          instanceAccount,
          page,
          hasAllRole: hasAllRole,
        });

        await page.route(
          /\/proposals\/.*\?.*proposal_types=.*/,
          async (route) => {
            let originalResult = JSON.parse(
              JSON.stringify(SettingsVotingDurationProposalData)
            );
            originalResult.submission_time = CurrentTimestampInNanoseconds;
            originalResult.status = "InProgress";
            await route.fulfill({
              json: {
                proposals: [originalResult],
                total: 1,
              },
            });
          }
        );

        await page.goto(`/${instanceAccount}/widget/app?page=settings`);
        await expect(page.getByText("Pending Requests").nth(1)).toBeVisible({
          timeout: 20_000,
        });

        await expect(
          page.getByRole("cell", { name: 1, exact: true }).first()
        ).toBeVisible({ timeout: 10_000 });
        const approveButton = page
          .getByRole("button", { name: "Approve" })
          .first();

        if (hasAllRole) {
          await expect(approveButton).toBeVisible();
        } else {
          await expect(approveButton).toBeHidden();
        }
      });
    });
  }
});

test.describe("don't ask again", function () {
  test.use({
    storageState:
      "playwright-tests/storage-states/wallet-connected-admin-with-accesskey.json",
  });
  test("approve settings config request with single and multiple required votes", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    const isMultiVote = daoAccount === "infinex.sputnik-dao.near";
    const contractId = daoAccount;
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
      await expect(
        page.getByRole("heading", { name: "Update policy - Voting Duration" })
      ).toBeVisible();
    }
  });

  test("reject settings config request with single and multiple required votes", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(80_000);
    const isMultiVote = daoAccount === "infinex.sputnik-dao.near";
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
      await expect(
        page.getByRole("heading", { name: "Update policy - Voting Duration" })
      ).toBeVisible();
    }
  });

  test("delete settings config request with single and multiple required votes", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(80_000);
    const isMultiVote = daoAccount === "infinex.sputnik-dao.near";
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

  test("submit action should show transaction loader and handle cancellation correctly", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(100_000);
    await updateDaoPolicyMembers({ instanceAccount, page });
    const proposalData = JSON.parse(
      JSON.stringify(SettingsVotingDurationProposalData)
    );
    proposalData.submission_time = CurrentTimestampInNanoseconds;
    proposalData.status = "InProgress";
    await page.route(/\/proposals\/.*\?.*proposal_types=.*/, async (route) => {
      await route.fulfill({
        json: {
          proposals: [proposalData],
          total: 1,
        },
      });
    });
    await mockRpcRequest({
      page,
      filterParams: {
        method_name: "get_proposal",
      },
      modifyOriginalResultFunction: () => {
        return proposalData;
      },
    });
    await page.goto(`/${instanceAccount}/widget/app?page=settings`);
    const approveButton = page
      .getByRole("button", {
        name: "Approve",
      })
      .first();
    await expect(approveButton).toBeEnabled({ timeout: 30_000 });
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

  test("export action should not be visible in pending requests and history tab", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(60_000);
    await page.goto(`/${instanceAccount}/widget/app?page=settings&tab=history`);
    const exportBtn = page.getByRole("button", { name: " Export as CSV" });
    await expect(
      page.getByRole("list").getByText("Pending Requests")
    ).toBeVisible();
    await expect(exportBtn).toBeHidden();
    await page.getByText("History").click();
    await expect(exportBtn).toBeHidden();
  });
});
