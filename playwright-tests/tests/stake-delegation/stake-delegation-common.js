import { expect } from "@playwright/test";
import { mockTransactionSubmitRPCResponses } from "../../util/transaction";

import { mockRpcRequest, updateDaoPolicyMembers } from "../../util/rpcmock.js";
import {
  CurrentTimestampInNanoseconds,
  OldJsonProposalData,
  StakeProposalData,
  UnStakeProposalData,
  WithdrawProposalData,
} from "../../util/inventory.js";
import { setDontAskAgainCacheValues } from "../../util/cache.js";

export const stakedNear = "0.3027";
export const sufficientAvailableBalance = "11000000000000000000000000";
export const minStorageBalance = "3500000000000000000000000";
export const inSufficientAvailableBalance = "11450";
export const stakedPoolAccount = "astro-stakers.poolv1.near";
export const multiStakedPoolAccount = "nearfans.poolv1.near";

export async function mockStakeProposals({ page }) {
  await page.route(
    /https:\/\/sputnik-indexer-divine-fog-3863\.fly\.dev\/proposals\/.*\?.*category=stake-delegation/,
    async (route) => {
      let originalResult = [
        JSON.parse(JSON.stringify(StakeProposalData)),
        JSON.parse(JSON.stringify(UnStakeProposalData)),
      ];
      originalResult[0].id = 0;
      originalResult[1].id = 1;
      // non expired request
      originalResult[0].submission_time = CurrentTimestampInNanoseconds;
      // expired request
      originalResult[1].submission_time = "1715761329133693174";
      await route.fulfill({
        json: {
          proposals: originalResult,
          total: 2,
        },
      });
    }
  );
}

export async function mockOldJSONStakeProposals({ page }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_last_proposal_id",
    },
    modifyOriginalResultFunction: (originalResult) => {
      originalResult = 3;
      return originalResult;
    },
  });
  await page.route(
    /https:\/\/sputnik-indexer-divine-fog-3863\.fly\.dev\/proposals\/.*\?.*category=stake-delegation/,
    async (route) => {
      let originalResult = [JSON.parse(JSON.stringify(OldJsonProposalData))];
      originalResult[0].submission_time = CurrentTimestampInNanoseconds;
      await route.fulfill({
        json: {
          proposals: originalResult,
          total: 1,
        },
      });
    }
  );
}

export async function mockUnstakeAndWithdrawBalance({
  page,
  hasUnstakeBalance,
  hasWithdrawBalance,
}) {
  await page.route(
    `https://archival-rpc.mainnet.fastnear.com`,
    async (route) => {
      const request = await route.request();
      const requestPostData = request.postDataJSON();

      if (
        requestPostData.params &&
        requestPostData.params.request_type === "call_function"
      )
        if (
          requestPostData.params.method_name === "get_account_unstaked_balance"
        ) {
          const json = {
            jsonrpc: "2.0",
            result: {
              block_hash: "GXEuJYXvoXoiDhtDJP8EiPXesQbQuwDSWadYzy2JAstV",
              block_height: 132031112,
              logs: [],
              result: hasUnstakeBalance
                ? [
                    34, 51, 48, 50, 54, 53, 51, 54, 56, 51, 52, 51, 53, 51, 51,
                    57, 51, 50, 52, 51, 51, 53, 55, 51, 50, 34,
                  ]
                : [34, 49, 34],
            },
            id: "dontcare",
          };
          await route.fulfill({ json });
        } else if (
          requestPostData.params.method_name ===
          "is_account_unstaked_balance_available"
        ) {
          const json = {
            jsonrpc: "2.0",
            result: {
              block_hash: "sx9uuhk3amZWRvkTEcj9bSUVVcPoUXpgeUV6LpHsQCe",
              block_height: 134584005,
              logs: [],
              result: hasWithdrawBalance
                ? [116, 114, 117, 101]
                : [102, 97, 108, 115, 101],
            },
            id: "dontcare",
          };
          await route.fulfill({ json });
        } else {
          await route.continue();
        }
    }
  );
}

export async function mockStakedPoolBalances({ page }) {
  await page.route(
    `https://archival-rpc.mainnet.fastnear.com/`,
    async (route) => {
      const request = await route.request();
      const requestPostData = request.postDataJSON();

      if (
        requestPostData.params &&
        requestPostData.params.request_type === "call_function" &&
        requestPostData.params.method_name === "get_account_staked_balance"
      ) {
        const json = {
          jsonrpc: "2.0",
          result: {
            block_hash: "GXEuJYXvoXoiDhtDJP8EiPXesQbQuwDSWadYzy2JAstV",
            block_height: 132031112,
            logs: [],
            result: [
              34, 51, 48, 50, 54, 53, 51, 54, 56, 51, 52, 51, 53, 51, 51, 57,
              51, 50, 52, 51, 51, 53, 55, 51, 50, 34,
            ],
          },
          id: "dontcare",
        };
        await route.fulfill({ json });
      } else {
        await route.continue();
      }
    }
  );
}

export async function mockStakedPools({
  daoAccount,
  page,
  havePools = true,
  multiplePools = false,
}) {
  await page.route(
    `https://api.fastnear.com/v1/account/${daoAccount}/staking`,
    async (route) => {
      const json = havePools
        ? {
            account_id: daoAccount,
            pools: multiplePools
              ? [
                  {
                    last_update_block_height: 129849269,
                    pool_id: stakedPoolAccount,
                  },
                  {
                    last_update_block_height: 129849269,
                    pool_id: multiStakedPoolAccount,
                  },
                ]
              : [
                  {
                    last_update_block_height: 129849269,
                    pool_id: stakedPoolAccount,
                  },
                ],
          }
        : {
            account_id: daoAccount,
            pools: [],
          };
      await route.fulfill({ json });
    }
  );
}

export async function mockLockupSelectedPool({ hasSelectedPool, page }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_staking_pool_account_id",
    },
    modifyOriginalResultFunction: () => {
      let originalResult = hasSelectedPool ? stakedPoolAccount : null;
      return originalResult;
    },
  });
}

export async function mockLockupNearBalances({ page, balance }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_balance",
    },
    modifyOriginalResultFunction: () => {
      let originalResult = balance;
      return originalResult;
    },
  });
}

async function selectLockupWallet(page) {
  const canvasLocator = page.locator(".offcanvas-body");
  await expect(canvasLocator.getByText("Treasury Wallet")).toBeVisible();
  await canvasLocator.getByRole("button", { name: "SputnikDAO" }).click();
  await expect(canvasLocator.getByText("Lockup")).toBeVisible();
  await canvasLocator.getByText("Lockup").click();
}

export async function openWithdrawForm({
  page,
  isLockup,
  daoAccount,
  lockupContract,
}) {
  await expect(page.getByText("Create Request", { exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await page.locator(".custom-select > .dropdown").first().click();
  await page.locator(".dropdown-menu > div:nth-child(3)").click();
  await expect(
    page.getByRole("heading", { name: "Create Withdraw Request" })
  ).toBeVisible(10_000);
  await page.waitForTimeout(10_000);
  if (isLockup) {
    await selectLockupWallet(page);
  }
}

export async function openUnstakeForm({
  page,
  isLockup,
  daoAccount,
  lockupContract,
}) {
  await expect(page.getByText("Create Request", { exact: true })).toBeVisible();
  await page.locator(".custom-select > .dropdown").first().click();
  await page.locator(".dropdown-menu > div:nth-child(2)").click();
  await expect(
    page.getByRole("heading", { name: "Create Unstake Request" })
  ).toBeVisible(10_000);
  await page.waitForTimeout(10_000);
  if (isLockup) {
    await selectLockupWallet(page);
  }
}

export async function openStakeForm({
  page,
  isLockup,
  daoAccount,
  lockupContract,
}) {
  await expect(page.getByText("Create Request", { exact: true })).toBeVisible();
  await page.locator(".custom-select > .dropdown").first().click();
  await page.locator(".dropdown-menu > div:nth-child(1)").click();
  await expect(
    page.getByRole("heading", { name: "Create Stake Request" })
  ).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(10_000);
  if (isLockup) {
    await selectLockupWallet(page);
  }
}

export async function fillValidatorAccount({ page }) {
  // validator dropdown shouldn't take more than 10 seconds
  const submitBtn = page
    .frameLocator("iframe")
    .nth(1)
    .getByRole("button", { name: "Submit" });
  await expect(submitBtn).toBeDisabled();
  const poolSelector = await page
    .frameLocator("iframe")
    .nth(1)
    .locator("#dropdown");
  await expect(poolSelector).toBeVisible({ timeout: 10_000 });
  await poolSelector.click();
  await page.waitForTimeout(1_000);

  const search = await page
    .frameLocator("iframe")
    .nth(1)
    .getByPlaceholder("Search options");
  search.focus();
  search.fill("astro");
  await page
    .frameLocator("iframe")
    .nth(1)
    .getByText(stakedPoolAccount)
    .first()
    .click();
}

export async function checkForStakeAmount({
  page,
  errorText,
  availableBalance,
}) {
  const submitBtn = page
    .frameLocator("iframe")
    .nth(1)
    .getByRole("button", { name: "Submit" });
  const stakeAmount = page
    .frameLocator("iframe")
    .nth(1)
    .getByPlaceholder("Enter amount");
  await stakeAmount.fill((parseFloat(availableBalance) + 2).toString());
  const amountErrorText = page
    .frameLocator("iframe")
    .nth(1)
    .getByText(errorText);
  await expect(amountErrorText).toBeVisible({ timeout: 10_000 });
  await expect(submitBtn).toBeDisabled();
  await page.frameLocator("iframe").nth(1).getByText("Use Max").click();
  await expect(amountErrorText).toBeHidden();
}

export async function mockLockupState({ page, lockupContract }) {
  await page.route(`https://free.rpc.fastnear.com`, async (route) => {
    const request = await route.request();
    const requestPostData = await request.postDataJSON();

    if (
      requestPostData.params &&
      requestPostData.params.account_id === lockupContract &&
      requestPostData.params.request_type === "view_state"
    ) {
      const json = {
        jsonrpc: "2.0",
        result: {
          block_hash: "2Dc8Jh8mFU8bKe16hAVcZ3waQhhdfUXwvvnsDP9djN95",
          block_height: 140432800,
          values: [
            {
              key: "U1RBVEU=",
              value:
                "DAAAAG1lZ2hhMTkubmVhcgAAACWkAAqLyiIEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAABPkZROAAABAACi6omWKxgAfKTy6T+hPRYAGAAAAGxvY2t1cC1uby13aGl0ZWxpc3QubmVhcgAA",
            },
          ],
        },
        id: "dontcare",
      };
      await route.fulfill({ json });
    } else {
      await route.continue();
    }
  });
}
const NEAR_DIVISOR = 10n ** 24n;

export function formatNearAmount(amount) {
  const numericAmount = BigInt(amount ?? "0");
  return numericAmount / NEAR_DIVISOR;
}

export async function voteOnProposal({
  page,
  daoAccount,
  instanceAccount,
  voteStatus,
  vote,
  isMultiVote,
  isWithdrawRequest,
}) {
  let lastProposalId = 2;
  let isTransactionCompleted = false;
  await updateDaoPolicyMembers({ instanceAccount, page });
  const contractId = daoAccount;
  await page.route(
    /https:\/\/sputnik-indexer-divine-fog-3863\.fly\.dev\/proposals\/.*\?.*category=stake-delegation/,
    async (route) => {
      let originalResult = [
        JSON.parse(
          JSON.stringify(
            isWithdrawRequest ? WithdrawProposalData : StakeProposalData
          )
        ),
      ];
      originalResult[0].id = 0;
      originalResult[0].submission_time = CurrentTimestampInNanoseconds;
      if (isTransactionCompleted && !isMultiVote) {
        originalResult.status = voteStatus;
      } else {
        originalResult.status = "InProgress";
      }
      await route.fulfill({
        json: {
          proposals: originalResult,
          total: 1,
        },
      });
    }
  );
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposal",
    },
    modifyOriginalResultFunction: () => {
      let originalResult = JSON.parse(JSON.stringify(StakeProposalData));
      originalResult.id = 0;
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

  await page.goto(`/${instanceAccount}/widget/app?page=stake-delegation`);
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

  await expect(
    await page.locator("div").filter({ hasText: /^Stake Delegation$/ })
  ).toBeVisible({ timeout: 20_000 });
  await mockTransactionSubmitRPCResponses(
    page,
    async ({ route, transaction_completed }) => {
      isTransactionCompleted = transaction_completed;
      await route.fallback();
    }
  );
}

export async function checkNewProposalSubmission({
  page,
  sandbox,
  checkforMultiProposals = false,
  daoAccount,
  daoName,
  requestType,
}) {
  const method = checkforMultiProposals
    ? "signAndSendTransactions"
    : "signAndSendTransaction";

  const transactionToSendPromise = page.evaluate(async (method) => {
    const selector = await document.querySelector("near-social-viewer")
      .selectorPromise;

    const wallet = await selector.wallet();

    return new Promise((resolve) => {
      wallet[method] = async (transaction) => {
        resolve(transaction);
        return new Promise((transactionSentPromiseResolve) => {
          window.transactionSentPromiseResolve = transactionSentPromiseResolve;
        });
      };
    });
  }, method);

  await page.getByRole("button", { name: "Confirm" }).click();
  const transactionToSend = await transactionToSendPromise;
  const transaction = checkforMultiProposals
    ? transactionToSend.transactions[0]
    : transactionToSend;

  const transactionResult = await sandbox.account.functionCall({
    contractId: daoAccount,
    methodName: "add_proposal",
    args: transaction.actions[0].params.args,
    attachedDeposit: transaction.actions[0].params.deposit,
  });
  await page.evaluate(async (transactionResult) => {
    window.transactionSentPromiseResolve(transactionResult);
  }, transactionResult);
  const lastProposalId = await sandbox.getLastProposalId(daoName);
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
    page.getByText(`${requestType} request has been successfully created.`)
  ).toBeVisible();
  await expect(
    page
      .getByRole("cell", { name: `${lastProposalId - 1}`, exact: true })
      .first()
  ).toBeVisible({ timeout: 20_000 });

  if (checkforMultiProposals) {
    await expect(
      page
        .getByRole("cell", { name: `${lastProposalId - 2}`, exact: true })
        .first()
    ).toBeVisible({ timeout: 20_000 });
  }
}

export async function openLockupStakingForm({
  page,
  daoAccount,
  lockupContract,
}) {
  await openStakeForm({ page, isLockup: true, daoAccount, lockupContract });
  await expect(
    page
      .frameLocator("iframe")
      .nth(1)
      .getByText(
        "You cannot split your locked funds across multiple validators."
      )
  ).toBeVisible({
    timeout: 30_000,
  });
}

export function toBase64(json) {
  return Buffer.from(JSON.stringify(json)).toString("base64");
}
