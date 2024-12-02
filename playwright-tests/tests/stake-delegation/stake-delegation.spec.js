import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { getInstanceConfig } from "../../util/config.js";
import {
  getTransactionModalObject,
  mockTransactionSubmitRPCResponses,
} from "../../util/transaction";
import { utils } from "near-api-js";
import { mockRpcRequest, updateDaoPolicyMembers } from "../../util/rpcmock.js";
import {
  CurrentTimestampInNanoseconds,
  StakeProposalData,
  UnStakeProposalData,
} from "../../util/inventory.js";
import { setDontAskAgainCacheValues } from "../../util/cache.js";

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

const stakedNear = "0.3027";
const sufficientAvailableBalance = "11000000000000000000000000";
const inSufficientAvailableBalance = "11450";
const stakedPoolAccount = "astro-stakers.poolv1.near";

async function mockStakeProposals({ page }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposals",
    },
    modifyOriginalResultFunction: () => {
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
      return originalResult;
    },
  });
}

async function mockStakedPoolBalances({ page }) {
  await page.route(`https://archival-rpc.mainnet.near.org/`, async (route) => {
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
            34, 51, 48, 50, 54, 53, 51, 54, 56, 51, 52, 51, 53, 51, 51, 57, 51,
            50, 52, 51, 51, 53, 55, 51, 50, 34,
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

async function mockNearBalances({ page, daoAccount, balance }) {
  await page.route(
    `https://api.fastnear.com/v1/account/${daoAccount}/full`,
    async (route) => {
      const json = {
        account_id: daoAccount,
        nfts: [],
        pools: [],
        state: {
          balance: balance,
          locked: "0",
          storage_bytes: 677278,
        },
        tokens: [],
      };

      await route.fulfill({ json });
    }
  );
}

export async function mockStakedPools({ daoAccount, page, havePools = true }) {
  await page.route(
    `https://api.fastnear.com/v1/account/${daoAccount}/staking`,
    async (route) => {
      const json = havePools
        ? {
            account_id: daoAccount,
            pools: [
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

async function selectLockupAccount({ page, daoAccount, lockupContract, isStakeRequest }) {
  await page.getByRole("button", { name: daoAccount }).click();
  await page.getByText(lockupContract).nth(isStakeRequest ? 0 : 1).click();
}

async function openUnstakeForm({ page, isLockup, daoAccount, lockupContract }) {
  await expect(page.getByText("Create Request", { exact: true })).toBeVisible();
  await page.locator(".h-100 > .p-2").click();
  await page.getByText("Unstake", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Create Unstake Request" })
  ).toBeVisible(10_000);
  await page.waitForTimeout(10_000);
  if (isLockup) {
    await selectLockupAccount({ page, daoAccount, lockupContract });
  }
}

async function fillValidatorAccount({ page, isStakeRequest }) {
  const poolSelector = isStakeRequest
    ? await page.getByTestId("validator-dropdown").first()
    : await page.getByTestId("validator-dropdown").nth(1);
  await expect(poolSelector).toBeVisible({ timeout: 30_000 });
  await poolSelector.click();
  await page.waitForTimeout(5_000);

  const search = await page.getByPlaceholder("Search");
  search.focus();
  search.fill("astro");
  await page.getByText(stakedPoolAccount).first().click();
}

async function checkForStakeAmount({ page, errorText, availableBalance }) {
  const submitBtn = page.getByRole("button", { name: "Submit" });
  const stakeAmount = page.getByRole("spinbutton");
  await stakeAmount.fill((parseFloat(availableBalance) + 2).toString());
  await stakeAmount.blur();
  const amountErrorText = page.getByText(errorText);
  await expect(amountErrorText).toBeVisible();
  await expect(submitBtn).toBeDisabled();
  await page.getByText("Use Max").click();
  await expect(amountErrorText).toBeHidden();
}

const NEAR_DIVISOR = 10n ** 24n;

function formatNearAmount(amount) {
  const numericAmount = BigInt(amount ?? "0");
  return numericAmount / NEAR_DIVISOR;
}

test.describe("Have valid staked requests and sufficient token balance", function () {
  test.beforeEach(async ({ page, instanceAccount, daoAccount }) => {
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    if (
      !instanceConfig.navbarLinks.find(
        (navbarLink) => navbarLink.href === "?page=stake-delegation"
      )
    ) {
      console.log("no stake delegation page configured for instance");
      return test.skip();
    }
    await mockStakeProposals({ page });
    await updateDaoPolicyMembers({ page });
    await mockStakedPools({ page, daoAccount });
    await mockNearBalances({
      page,
      daoAccount,
      balance: sufficientAvailableBalance,
    });
    await mockStakedPoolBalances({ page });

    await page.goto(`/${instanceAccount}/widget/app?page=stake-delegation`);
    await expect(
      await page.locator("div").filter({ hasText: /^Stake Delegation$/ })
    ).toBeVisible();
  });

  test.describe("User not logged in", function () {
    test("Should view pending and history requests", async ({ page }) => {
      test.setTimeout(60_000);
      await expect(
        page.getByRole("cell", { name: "0", exact: true })
      ).toBeVisible({ timeout: 20_000 });
      await page.getByText("History").click();
      await expect(
        page.getByRole("cell", { name: "1", exact: true })
      ).toBeVisible({ timeout: 20_000 });
    });
  });

  test.describe("Admin connected", function () {
    test.use({
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin.json",
    });

    test("Should create stake delegation request, should throw error when invalid data is provided", async ({
      page,
    }) => {
      test.setTimeout(100_000);
      const createRequestButton = await page.getByText("Create Request", {
        exact: true,
      });
      await createRequestButton.click();
      await page.waitForTimeout(10_000);

      await fillValidatorAccount({
        page,
        isStakeRequest: true,
      });
      await checkForStakeAmount({
        page,
        availableBalance: formatNearAmount(sufficientAvailableBalance),
        errorText: "Your account doesn't have sufficient balance.",
      });

      const stakingAmount = await page
        .locator('input[placeholder="Enter amount"]')
        .first()
        .inputValue();
      await page.getByRole("button", { name: "Submit" }).click();
      await expect(await getTransactionModalObject(page)).toEqual({
        proposal: {
          description: '{"isStakeRequest":true,"notes":null}',
          kind: {
            FunctionCall: {
              receiver_id: stakedPoolAccount,
              actions: [
                {
                  method_name: "deposit_and_stake",
                  args: "",
                  deposit: utils.format.parseNearAmount(stakingAmount),
                  gas: "200000000000000",
                },
              ],
            },
          },
        },
      });
    });

    test("Should create unstake delegation request, should throw error when invalid data is provided", async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await openUnstakeForm({ page });
      await fillValidatorAccount({
        page,
      });
      await checkForStakeAmount({
        page,
        availableBalance: stakedNear,
        errorText: "The amount exceeds the balance you have staked.",
      });
      await page.getByRole("button", { name: "Submit" }).click();
      await expect(await getTransactionModalObject(page)).toEqual({
        proposal: {
          description: '{"isStakeRequest":true,"notes":null}',
          kind: {
            FunctionCall: {
              receiver_id: stakedPoolAccount,
              actions: [
                {
                  method_name: "unstake",
                  args: "eyJhbW91bnQiOiIzMDI3MDAwMDAwMDAwMDAwMDAwMDAwMDAifQ==",
                  deposit: "0",
                  gas: "200000000000000",
                },
              ],
            },
          },
        },
      });
    });
  });
});

async function openLockupStakingForm({ page, daoAccount, lockupContract }) {
  const createRequestButton = await page.getByText("Create Request", {
    exact: true,
  });
  await createRequestButton.click();
  await page.waitForTimeout(10_000);
  await selectLockupAccount({ page, daoAccount, lockupContract,isStakeRequest: true });
  await expect(
    page.getByText(
      "You cannot split the locked amount across multiple validators."
    )
  ).toBeVisible({
    timeout: 10_000,
  });
}

function toBase64(json) {
  return Buffer.from(JSON.stringify(json)).toString("base64");
}

test.describe("Lockup staking", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test.beforeEach(async ({ page, instanceAccount, daoAccount }) => {
    const instanceConfig = await getInstanceConfig({
      page,
      instanceAccount,
    });
    if (!instanceConfig.lockupContract) {
      console.log("no lockup contract found for instance");
      return test.skip();
    }

    await mockStakeProposals({ page });
    await updateDaoPolicyMembers({ page });
    await mockNearBalances({
      page,
      daoAccount,
      balance: sufficientAvailableBalance,
    });
    await mockLockupNearBalances({
      page,
      balance: sufficientAvailableBalance,
    });

    await page.goto(`/${instanceAccount}/widget/app?page=stake-delegation`);
    await expect(
      await page.locator("div").filter({ hasText: /^Stake Delegation$/ })
    ).toBeVisible();
  });

  test.describe("Without selected pool", function () {
    const lastProposalId = 10;
    test.beforeEach(async ({ page , lockupContract}) => {
      await mockLockupSelectedPool({ hasSelectedPool: false, page });
      await mockRpcRequest({
        page,
        filterParams: {
          method_name: "get_last_proposal_id",
        },
        modifyOriginalResultFunction: (originalResult) => {
          originalResult = lastProposalId;
          return originalResult;
        },
      });
      await mockStakedPools({
        page,
        daoAccount: lockupContract,
        havePools: false,
      });
    });

    test("Should whitelist staking pool and create stake delegation request", async ({
      page,
      daoAccount,
      lockupContract,
    }) => {
      test.setTimeout(120_000);
      await openLockupStakingForm({ page, daoAccount, lockupContract });
      await fillValidatorAccount({
        page,
        isStakeRequest: true,
      });
      await checkForStakeAmount({
        page,
        availableBalance: formatNearAmount(sufficientAvailableBalance),
        errorText: "Your account doesn't have sufficient balance.",
      });
      await page.getByRole("button", { name: "Submit" }).click();
      await expect(await getTransactionModalObject(page)).toEqual({
        proposal: {
          description:
            '{"isStakeRequest":true,"warningNotes":"Approve to continue staking with this validator"}',
          kind: {
            FunctionCall: {
              receiver_id: lockupContract,
              actions: [
                {
                  method_name: "select_staking_pool",
                  args: toBase64({
                    staking_pool_account_id: stakedPoolAccount,
                  }),
                  deposit: "0",
                  gas: "100000000000000",
                },
              ],
            },
          },
        },
      });
      const txnLocator = await page
        .locator("div.modal-body code")
        .nth(1)
        .innerText();
      const dataReceived = JSON.parse(txnLocator);
      expect(dataReceived).toEqual({
        proposal: {
          description: `{"isStakeRequest":true,"notes":null,"showAfterProposalIdApproved":${lastProposalId}}`,
          kind: {
            FunctionCall: {
              receiver_id: lockupContract,
              actions: [
                {
                  method_name: "deposit_and_stake",
                  args: toBase64({
                    amount: sufficientAvailableBalance,
                  }),
                  deposit: "0",
                  gas: "150000000000000",
                },
              ],
            },
          },
        },
      });
    });

    test("Create unstake request, should show no validator staked error", async ({
      page,
      daoAccount,
      lockupContract
    }) => {
      test.setTimeout(120_000);
      await openUnstakeForm({
        page,
        isLockup: true,
        daoAccount,
        lockupContract,
      });
      await expect(
        page.getByText(
          "You do not have any validators to unstake from. You must first stake tokens with a validator."
        )
      ).toBeVisible();
    });
  });

  test.describe("With selected pool", function () {
    test.beforeEach(async ({ page, daoAccount, lockupContract }) => {
      await mockLockupSelectedPool({ hasSelectedPool: true, page });
      await mockStakedPools({
        page,
        daoAccount: lockupContract,
        havePools: true,
      });
      await mockStakedPoolBalances({ page });
    });

    test("Already whitelisted pool, shouldn't allow pool selection, only create stake delegation request", async ({
      page,
      daoAccount,
      lockupContract,
    }) => {
      test.setTimeout(120_000);
      await openLockupStakingForm({ page, daoAccount, lockupContract });
      const poolSelector = page.locator(".custom-select").first();
      const hasDisabledClassOnChild = await poolSelector
        .locator(".disabled")
        .count();
      await expect(hasDisabledClassOnChild).toBeGreaterThan(0);
      await checkForStakeAmount({
        page,
        availableBalance: formatNearAmount(sufficientAvailableBalance),
        errorText: "Your account doesn't have sufficient balance.",
      });
      await page.getByRole("button", { name: "Submit" }).click();
      await expect(await getTransactionModalObject(page)).toEqual({
        proposal: {
          description: '{"isStakeRequest":true,"notes":null}',
          kind: {
            FunctionCall: {
              receiver_id: lockupContract,
              actions: [
                {
                  method_name: "deposit_and_stake",
                  args: toBase64({
                    amount: "10697370000000000000000000000000",
                  }),
                  deposit: "0",
                  gas: "150000000000000",
                },
              ],
            },
          },
        },
      });
    });

    test("Create unstake request", async ({
      page,
      daoAccount,
      lockupContract,
    }) => {
      test.setTimeout(120_000);
      await openUnstakeForm({
        page,
        isLockup: true,
        daoAccount,
        lockupContract,
      });
      await page.waitForTimeout(10_000)
      const poolSelector = await page.locator(".custom-select");
      const hasDisabledClassOnChild = await poolSelector
        .locator(".disabled")
        .count();
      await expect(hasDisabledClassOnChild).toBeGreaterThan(0);
      await checkForStakeAmount({
        page,
        availableBalance: stakedNear,
        errorText: "The amount exceeds the balance you have staked.",
      });
      await page.getByRole("button", { name: "Submit" }).click();
      await expect(await getTransactionModalObject(page)).toEqual({
        proposal: {
          description: '{"isStakeRequest":true,"notes":null}',
          kind: {
            FunctionCall: {
              receiver_id: lockupContract,
              actions: [
                {
                  method_name: "unstake",
                  args: "eyJhbW91bnQiOiIzMDI3MDAwMDAwMDAwMDAwMDAwMDAwMDAifQ==",
                  deposit: "0",
                  gas: "200000000000000",
                },
              ],
            },
          },
        },
      });
    });
  });
});

async function voteOnProposal({
  page,
  daoAccount,
  instanceAccount,
  voteStatus,
  vote,
  isMultiVote,
}) {
  let lastProposalId = 2;
  let isTransactionCompleted = false;
  const instanceConfig = await getInstanceConfig({ page, instanceAccount });
  if (
    !instanceConfig.navbarLinks.find(
      (navbarLink) => navbarLink.href === "?page=stake-delegation"
    )
  ) {
    console.log("no stake delegation page configured for instance");
    return test.skip();
  }
  await updateDaoPolicyMembers({ page });
  const contractId = daoAccount;
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposals",
    },
    modifyOriginalResultFunction: () => {
      let originalResult = [JSON.parse(JSON.stringify(StakeProposalData))];
      originalResult[0].id = 0;
      originalResult[0].submission_time = CurrentTimestampInNanoseconds;
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
    modifyOriginalResultFunction: () => {
      let originalResult = JSON.parse(JSON.stringify(StakeProposalData));
      originalResult.id = 0;
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

  await page.goto(`/${instanceAccount}/widget/app?page=stake-delegation`);

  await setDontAskAgainCacheValues({
    page,
    widgetSrc: "treasury-devdao.near/widget/components.VoteActions",
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

    await transaction_toast.waitFor({ state: "detached", timeout: 10000 });
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

    await transaction_toast.waitFor({ state: "detached", timeout: 10000 });
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

    await transaction_toast.waitFor({ state: "detached", timeout: 10000 });
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
});

test.describe("Insufficient balance ", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test.beforeEach(async ({ page, instanceAccount, daoAccount }) => {
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    if (
      !instanceConfig.navbarLinks.find(
        (navbarLink) => navbarLink.href === "?page=stake-delegation"
      )
    ) {
      console.log("no stake delegation page configured for instance");
      return test.skip();
    }
    await mockStakeProposals({ page });
    await updateDaoPolicyMembers({ page });

    await mockStakedPools({ page, daoAccount, havePools: false });
    await mockStakedPoolBalances({ page });
    await mockNearBalances({
      page,
      daoAccount,
      balance: inSufficientAvailableBalance,
    });
    await page.goto(`/${instanceAccount}/widget/app?page=stake-delegation`);
    await expect(
      await page.locator("div").filter({ hasText: /^Stake Delegation$/ })
    ).toBeVisible();
  });

  test("Should throw error with approve vote when account has insufficient near balance", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const approveButton = page.getByRole("button", {
      name: "Approve",
    });

    await expect(approveButton).toBeEnabled({ timeout: 40_000 });
    await approveButton.click();
    await expect(
      page.getByText(
        "The request cannot be approved because the treasury balance is insufficient to cover the payment."
      )
    ).toBeVisible();
  });

  test("Should show warning when account has no staked near tokens", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openUnstakeForm({ page });
    await expect(
      page.getByText(
        "You do not have any validators to unstake from. You must first stake tokens with a validator."
      )
    ).toBeVisible();
  });
});
