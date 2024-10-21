import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

import { mockTransactionSubmitRPCResponses } from "../../util/transaction";
import { mockRpcRequest, updateDaoPolicyMembers } from "../../util/rpcmock";
import { setDontAskAgainCacheValues } from "../../util/cache";
import { mockPikespeakFTTokensResponse } from "../../util/pikespeak.js";

async function mockWithFTBalance({ page, daoAccount, isSufficient }) {
  await page.route(
    `https://api3.nearblocks.io/v1/account/${daoAccount}/inventory`,
    async (route) => {
      await route.fulfill({
        json: {
          inventory: {
            fts: [
              {
                contract: "usdt.tether-token.near",
                amount: "4500000",
                ft_meta: {
                  name: "Tether USD",
                  symbol: "USDt",
                  decimals: 6,
                  icon: "data:image/svg+xml,%3Csvg width='111' height='90' viewBox='0 0 111 90' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M24.4825 0.862305H88.0496C89.5663 0.862305 90.9675 1.64827 91.7239 2.92338L110.244 34.1419C111.204 35.7609 110.919 37.8043 109.549 39.1171L58.5729 87.9703C56.9216 89.5528 54.2652 89.5528 52.6139 87.9703L1.70699 39.1831C0.305262 37.8398 0.0427812 35.7367 1.07354 34.1077L20.8696 2.82322C21.6406 1.60483 23.0087 0.862305 24.4825 0.862305ZM79.8419 14.8003V23.5597H61.7343V29.6329C74.4518 30.2819 83.9934 32.9475 84.0642 36.1425L84.0638 42.803C83.993 45.998 74.4518 48.6635 61.7343 49.3125V64.2168H49.7105V49.3125C36.9929 48.6635 27.4513 45.998 27.3805 42.803L27.381 36.1425C27.4517 32.9475 36.9929 30.2819 49.7105 29.6329V23.5597H31.6028V14.8003H79.8419ZM55.7224 44.7367C69.2943 44.7367 80.6382 42.4827 83.4143 39.4727C81.0601 36.9202 72.5448 34.9114 61.7343 34.3597V40.7183C59.7966 40.8172 57.7852 40.8693 55.7224 40.8693C53.6595 40.8693 51.6481 40.8172 49.7105 40.7183V34.3597C38.8999 34.9114 30.3846 36.9202 28.0304 39.4727C30.8066 42.4827 42.1504 44.7367 55.7224 44.7367Z' fill='%23009393'/%3E%3C/svg%3E",
                  reference: null,
                  price: 1,
                },
              },
              {
                contract:
                  "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
                amount: isSufficient ? "1500000" : "10",
                ft_meta: {
                  name: "USDC",
                  symbol: "USDC",
                  decimals: 6,
                  icon: "",
                  reference: null,
                  price: 1,
                },
              },
            ],
            nfts: [],
          },
        },
      });
    }
  );
}

const transferProposalData = {
  id: 10,
  proposer: "thomasguntenaar.near",
  description:
    '{"title":"DevHub Developer Contributor report by Megha for 09/09/2024 - 10/06/2024","summary":"Worked on integrating new features to treasury dashboard, like asset exchange using the ref-sdk API, stake delegation, made first version live for devhub, fixed some bugs with devhub and other instances.","notes":"Treasury balance insufficient","proposalId":220}',
  kind: {
    Transfer: {
      token_id:
        "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
      receiver_id: "megha19.near",
      amount: "12",
      msg: null,
    },
  },
  vote_counts: {},
  votes: {},
  submission_time: "1728674151049926268",
};

async function voteOnProposal({
  page,
  daoAccount,
  instanceAccount,
  isReject,
  isMultiVote,
}) {
  let lastProposalId = 10;
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
        originalResult.status = isReject ? "Rejected" : "Approved";
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
      if (isTransactionCompleted) {
        if (!isMultiVote) {
          originalResult.status = isReject ? "Rejected" : "Approved";
        }
        originalResult.votes["theori.near"] = isReject ? "Reject" : "Approve";
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

  await page.goto(`/${instanceAccount}/widget/app?page=payments`);
  await setDontAskAgainCacheValues({
    page,
    widgetSrc: "treasury-devdao.near/widget/components.VoteActions",
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

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("don't ask again", function () {
  test.use({
    storageState:
      "playwright-tests/storage-states/wallet-connected-admin-with-accesskey.json",
  });
  test("should throw insufficient balance error", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await mockWithFTBalance({ page, daoAccount, isSufficient: false });
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ page });
    await voteOnProposal({
      page,
      daoAccount,
      instanceAccount,
      isReject: false,
    });
    const approveButton = page
      .getByRole("button", {
        name: "Approve",
      })
      .first();
    await expect(approveButton).toBeEnabled({ timeout: 10000 });
    await approveButton.click();
    await expect(
      page.getByText(
        "The request cannot be approved because the treasury balance is insufficient to cover the payment."
      )
    ).toBeVisible();
  });

  test("approve payment request with single and multiple required votes", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    const isMultiVote = daoAccount === "infinex.sputnik-dao.near";
    const contractId = daoAccount;
    await mockWithFTBalance({ page, daoAccount, isSufficient: true });
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ page, isMultiVote });
    await voteOnProposal({
      page,
      daoAccount,
      instanceAccount,
      isReject: false,
      isMultiVote,
    });
    const approveButton = page
      .getByRole("button", {
        name: "Approve",
      })
      .first();
    await expect(approveButton).toBeEnabled({ timeout: 10000 });
    await approveButton.click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(approveButton).toBeDisabled();

    const transaction_toast = page.getByText(
      `Calling contract ${contractId} with method act_proposal`
    );
    await expect(transaction_toast).toBeVisible();

    await transaction_toast.waitFor({ state: "detached", timeout: 10000 });
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
    test.setTimeout(60_000);
    const isMultiVote = daoAccount === "infinex.sputnik-dao.near";
    await mockWithFTBalance({ page, daoAccount, isSufficient: true });
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ page, isMultiVote });
    const contractId = daoAccount;
    await voteOnProposal({
      page,
      daoAccount,
      instanceAccount,
      isReject: true,
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

    await transaction_toast.waitFor({ state: "detached", timeout: 10000 });
    await expect(transaction_toast).not.toBeVisible();
    if (isMultiVote) {
      await expect(
        page.getByText(
          "Your vote is counted, the payment request is highlighted."
        )
      ).toBeVisible();
    } else {
      await expect(
        page.getByText("The payment has been rejected.")
      ).toBeVisible();
      await page.getByText("View in History").click();
    }

    await expect(page.locator("tr").nth(1)).toHaveClass("bg-highlight", {
      timeout: 10_000,
    });
    await page.waitForTimeout(1_000);
  });
});
