import { expect } from "@playwright/test";
import { cacheCDN, test } from "../../util/test.js";
import { mockTransactionSubmitRPCResponses } from "../../util/transaction.js";
import {
  mockNearBalances,
  mockRpcRequest,
  updateDaoPolicyMembers,
} from "../../util/rpcmock.js";
import { setDontAskAgainCacheValues } from "../../util/cache.js";
import {
  CurrentTimestampInNanoseconds,
  LockupProposalData,
} from "../../util/inventory.js";
import { InsufficientBalance } from "../../util/lib.js";

test.beforeEach(async ({ page }) => {
  await cacheCDN(page);
});

async function voteOnProposal({
  page,
  daoAccount,
  instanceAccount,
  voteStatus,
  vote,
  isMultiVote = false,
}) {
  const swapProposal = {
    ...LockupProposalData,
    submission_time: CurrentTimestampInNanoseconds,
  };
  let lastProposalId = swapProposal.id;
  let isTransactionCompleted = false;
  const contractId = daoAccount;

  const updateProposalStatus = (originalResult) => {
    originalResult = { ...swapProposal };
    if (isTransactionCompleted) {
      if (!isMultiVote) originalResult.status = voteStatus;
      if (vote === "Remove" && !isMultiVote) {
        return {
          isError: true,
          error:
            "wasm execution failed with error: HostError(GuestPanic { panic_msg: \"panicked at 'ERR_NO_PROPOSAL', sputnikdao2/src/views.rs:102:48\" })",
        };
      }
      originalResult.votes["theori.near"] = vote;
    }
    return originalResult;
  };

  await page.route(/\/proposals\/.*\?.*category=lockup/, async (route) => {
    await route.fulfill({
      json: {
        proposals: [updateProposalStatus()],
        total: 1,
      },
    });
  });
  await mockRpcRequest({
    page,
    filterParams: { method_name: "get_proposal" },
    modifyOriginalResultFunction: updateProposalStatus,
  });

  await mockRpcRequest({
    page,
    filterParams: { method_name: "get_last_proposal_id" },
    modifyOriginalResultFunction: () =>
      isTransactionCompleted ? lastProposalId + 1 : lastProposalId,
  });

  const widgetsAccount = `${
    instanceAccount.includes("testing") ? "test-widgets" : "widgets"
  }.treasury-factory.near`;

  await page.goto(`/${instanceAccount}/widget/app?page=lockup`);
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

async function performVoteAction({
  page,
  daoAccount,
  instanceAccount,
  vote,
  voteStatus,
  showFundsError,
  showVoteError,
}) {
  await voteOnProposal({
    page,
    daoAccount,
    instanceAccount,
    vote,
    voteStatus,
    isMultiVote: daoAccount === "infinex.sputnik-dao.near",
  });

  const voteButton =
    vote === "Remove"
      ? page.getByTestId("delete-btn").first()
      : page.getByRole("button", { name: vote }).first();
  await expect(voteButton).toBeEnabled({ timeout: 30_000 });
  await voteButton.click();
  if (showFundsError) {
    return;
  }
  if (showVoteError) {
    await expect(page.getByText("Insufficient Balance")).toBeVisible();
    await page.getByRole("button", { name: "Proceed Anyway" }).click();
  }
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(
    page.getByText("Awaiting transaction confirmation...")
  ).toBeVisible();
  await expect(voteButton).toBeDisabled();
}

async function mockLockupProposals({ page }) {
  await page.route(/\/proposals\/.*\?.*category=lockup/, async (route) => {
    await route.fulfill({
      json: {
        proposals: [
          {
            ...JSON.parse(JSON.stringify(LockupProposalData)),
            id: 0,
            submission_time: CurrentTimestampInNanoseconds,
            status: "InProgress",
          },
        ],
        total: 1,
      },
    });
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

          await page.route(
            /\/proposals\/.*\?.*category=lockup/,
            async (route) => {
              await route.fulfill({
                json: {
                  proposals: [
                    {
                      ...JSON.parse(JSON.stringify(LockupProposalData)),
                      id: 0,
                      submission_time: CurrentTimestampInNanoseconds,
                      status: "InProgress",
                    },
                  ],
                  total: 1,
                },
              });
            }
          );

          await page.goto(`/${instanceAccount}/widget/app?page=lockup`);

          await expect(page.getByText("Pending Requests")).toBeVisible({
            timeout: 20_000,
          });

          await expect(
            page.getByRole("cell", { name: "theori.near" })
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

test.describe("User is logged in", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test("submit action should show transaction loader and handle cancellation correctly", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    test.setTimeout(60_000);
    await updateDaoPolicyMembers({
      instanceAccount,
      page,
      isMultiVote: daoAccount === "infinex.sputnik-dao.near",
    });
    await mockLockupProposals({ page });
    await page.goto(`/${instanceAccount}/widget/app?page=lockup`);
    const approveButton = page.getByRole("button", { name: "Approve" }).first();
    await expect(approveButton).toBeEnabled({ timeout: 30_000 });

    await approveButton.click();
    await mockRpcRequest({
      page,
      filterParams: { method_name: "get_proposal" },
      modifyOriginalResultFunction: () => {
        const result = JSON.parse(JSON.stringify(LockupProposalData));
        result.submission_time = CurrentTimestampInNanoseconds;
        result.status = "InProgress";
        return result;
      },
    });
    await page.getByRole("button", { name: "Confirm" }).click();

    const loader = page.getByText("Awaiting transaction confirmation...");
    await expect(loader).toBeVisible({ timeout: 15_000 });
    await expect(approveButton).toBeDisabled();

    await page.getByRole("button", { name: "Close" }).nth(1).click();
    await page
      .locator(".toast-body")
      .getByRole("button", { name: "Cancel" })
      .click();

    await expect(loader).toBeHidden();
    await expect(approveButton).toBeEnabled();
  });

  test("export action should not be visible in pending requests tab", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(60_000);

    await page.goto(`/${instanceAccount}/widget/app?page=lockup`);
    await expect(page.getByText("Pending Requests")).toBeVisible();
    await expect(
      page.getByRole("button", { name: " Export as CSV" })
    ).toBeHidden();
  });

  test("should export transaction history", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    await page.goto(`/${instanceAccount}/widget/app?page=lockup&tab=history`);
    const exportLink = page.locator('a[download="proposals.csv"]');
    await expect(exportLink).toBeVisible();
    const href = await exportLink.getAttribute("href");
    expect(href).toContain(`/proposals/${daoAccount}?category=lockup`);
  });
});

async function checkHistoryProposal({ page, id, instanceAccount }) {
  const historyBtn = page.getByText("View in History");
  await expect(historyBtn).toBeVisible();
  await Promise.all([page.waitForNavigation(), historyBtn.click()]);
  const currentUrl = page.url();
  await expect(currentUrl).toContain(
    `http://localhost:8080/${instanceAccount}/widget/app?page=lockup&id=${id}`
  );
}
test.describe("don't ask again", function () {
  test.use({
    storageState:
      "playwright-tests/storage-states/wallet-connected-admin-with-accesskey.json",
  });

  test.beforeEach(async ({ page, instanceAccount, daoAccount }) => {
    await updateDaoPolicyMembers({
      instanceAccount,
      page,
      isMultiVote: daoAccount === "infinex.sputnik-dao.near",
    });
    await mockLockupProposals({ page });
  });

  test("should throw insufficient signed-in account balance error", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    test.setTimeout(60_000);
    await mockNearBalances({
      page,
      accountId: "theori.near",
      balance: InsufficientBalance,
      storage: 8,
    });

    await performVoteAction({
      page,
      daoAccount,
      instanceAccount,
      vote: "Approve",
      voteStatus: "Approved",
      showVoteError: false,
      showFundsError: true,
    });

    await expect(
      page
        .getByText("Please add more funds to your account and try again")
        .nth(1)
    ).toBeVisible();
  });

  test("approve request with single and multiple required votes", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    test.setTimeout(60_000);
    const isMultiVote = daoAccount === "infinex.sputnik-dao.near";

    await performVoteAction({
      page,
      daoAccount,
      instanceAccount,
      vote: "Approve",
      voteStatus: "Approved",
    });

    if (isMultiVote) {
      await expect(
        page.getByText("Your vote is counted, the request is highlighted.")
      ).toBeVisible();
      await expect(page.locator("tr").nth(1)).toHaveClass(
        "cursor-pointer proposal-row bg-highlight",
        {
          timeout: 10_000,
        }
      );
    } else {
      await expect(
        page.getByText("The request has been successfully executed.")
      ).toBeVisible({ timeout: 15_000 });
      await checkHistoryProposal({ page, id: 1, instanceAccount });
    }
  });

  test("reject request with single and multiple required votes", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    test.setTimeout(80_000);
    const isMultiVote = daoAccount === "infinex.sputnik-dao.near";
    await performVoteAction({
      page,
      daoAccount,
      instanceAccount,
      vote: "Reject",
      voteStatus: "Rejected",
    });

    if (isMultiVote) {
      await expect(
        page.getByText("Your vote is counted, the request is highlighted.")
      ).toBeVisible();
      await expect(page.locator("tr").nth(1)).toHaveClass(
        "cursor-pointer proposal-row bg-highlight",
        {
          timeout: 10_000,
        }
      );
    } else {
      await expect(
        page.getByText("The request has been rejected.")
      ).toBeVisible({ timeout: 15_000 });
      await checkHistoryProposal({ page, id: 1, instanceAccount });
    }
  });

  test("delete request with single and multiple required votes", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    test.setTimeout(80_000);
    const isMultiVote = daoAccount === "infinex.sputnik-dao.near";
    await performVoteAction({
      page,
      daoAccount,
      instanceAccount,
      vote: "Remove",
      voteStatus: "Removed",
    });

    if (isMultiVote) {
      await expect(
        page.getByText("Your vote is counted, the request is highlighted.")
      ).toBeVisible();
      await expect(page.locator("tr").nth(1)).toHaveClass(
        "cursor-pointer proposal-row bg-highlight",
        {
          timeout: 10_000,
        }
      );
    } else {
      await expect(
        page.getByText("The request has been successfully deleted.")
      ).toBeVisible({ timeout: 15_000 });
    }
  });
});
