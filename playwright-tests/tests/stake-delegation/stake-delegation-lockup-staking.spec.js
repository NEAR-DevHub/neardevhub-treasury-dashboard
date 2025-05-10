import { expect } from "@playwright/test";
import { cacheCDN, test } from "../../util/test.js";

import { getTransactionModalObject } from "../../util/transaction";
import {
  mockNearBalances,
  mockRpcRequest,
  updateDaoPolicyMembers,
} from "../../util/rpcmock.js";
import Big from "big.js";
import {
  checkForStakeAmount,
  fillValidatorAccount,
  formatNearAmount,
  minStorageBalance,
  mockLockupNearBalances,
  mockLockupSelectedPool,
  mockLockupState,
  mockStakedPoolBalances,
  mockStakedPools,
  mockStakeProposals,
  openLockupStakingForm,
  openUnstakeForm,
  stakedNear,
  stakedPoolAccount,
  sufficientAvailableBalance,
  toBase64,
} from "./stake-delegation-common.js";

test.beforeEach(async ({ page }) => {
  await cacheCDN(page);
});
test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("Lockup staking", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test.beforeEach(
    async ({ page, instanceAccount, daoAccount, lockupContract }) => {
      if (!lockupContract) {
        console.log("no lockup contract found for instance");
        return test.skip();
      }

      await mockStakeProposals({ page });
      await updateDaoPolicyMembers({ instanceAccount, page });
      await mockNearBalances({
        page,
        accountId: daoAccount,
        balance: sufficientAvailableBalance,
        storage: 2323,
      });

      await mockLockupNearBalances({
        page,
        balance: sufficientAvailableBalance,
      });

      await page.goto(`/${instanceAccount}/widget/app?page=stake-delegation`);
      await expect(
        await page.locator("div").filter({ hasText: /^Stake Delegation$/ })
      ).toBeVisible();
    }
  );

  test.describe("Without selected pool", function () {
    const lastProposalId = 10;
    test.beforeEach(async ({ page, lockupContract }) => {
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
      instanceAccount,
    }) => {
      test.setTimeout(120_000);
      await openLockupStakingForm({
        page,
        daoAccount,
        lockupContract,
        instanceAccount,
      });
      await fillValidatorAccount({
        page,
      });
      await checkForStakeAmount({
        page,
        availableBalance: formatNearAmount(sufficientAvailableBalance),
        errorText: "Your account doesn't have sufficient balance.",
      });
      await page
        .frameLocator("iframe")
        .nth(1)
        .getByRole("button", { name: "Submit" })
        .click();
      await expect(
        page.getByText("Awaiting transaction confirmation...")
      ).toBeVisible();

      await expect(await getTransactionModalObject(page)).toEqual({
        proposal: {
          description:
            "* Proposal Action: stake <br>* Custom Notes: Approve to designate this validator with this lockup account. Lockup accounts can only have one validator.",
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
          description: `* Proposal Action: stake <br>* Show After Proposal Id Approved: ${lastProposalId}`,
          kind: {
            FunctionCall: {
              receiver_id: lockupContract,
              actions: [
                {
                  method_name: "deposit_and_stake",
                  args: toBase64({
                    amount: (
                      BigInt(sufficientAvailableBalance) -
                      BigInt(minStorageBalance)
                    ).toString(),
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
      lockupContract,
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
    const lastProposalId = 10;

    test.beforeEach(async ({ page, daoAccount, lockupContract }) => {
      await mockLockupSelectedPool({ hasSelectedPool: true, page });
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
        havePools: true,
      });
      await mockStakedPoolBalances({ page });
    });

    test("Already whitelisted pool, shouldn't allow pool selection, only create stake delegation request", async ({
      page,
      daoAccount,
      lockupContract,
      instanceAccount,
    }) => {
      test.setTimeout(120_000);
      await openLockupStakingForm({
        page,
        daoAccount,
        lockupContract,
        instanceAccount,
      });
      await page.waitForTimeout(2_000);
      const poolSelector = page
        .frameLocator("iframe")
        .nth(1)
        .locator(".custom-select")
        .first();
      await expect(poolSelector).toBeVisible({ timeout: 20_000 });
      const hasDisabledClassOnChild = await poolSelector
        .locator(".disabled")
        .count();
      await expect(hasDisabledClassOnChild).toBeGreaterThan(0);
      await checkForStakeAmount({
        page,
        availableBalance: formatNearAmount(sufficientAvailableBalance),
        errorText: "Your account doesn't have sufficient balance.",
      });
      await page
        .frameLocator("iframe")
        .nth(1)
        .getByRole("button", { name: "Submit" })
        .click();
      await expect(
        page.getByText("Awaiting transaction confirmation...")
      ).toBeVisible();

      await expect(await getTransactionModalObject(page)).toEqual({
        proposal: {
          description: "* Proposal Action: stake",
          kind: {
            FunctionCall: {
              receiver_id: lockupContract,
              actions: [
                {
                  method_name: "deposit_and_stake",
                  args: toBase64({
                    amount: Big(7.2).mul(Big(10).pow(24)).toFixed(),
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
      instanceAccount,
    }) => {
      test.setTimeout(120_000);
      await openUnstakeForm({
        page,
        isLockup: true,
        daoAccount,
        lockupContract,
      });
      await page.waitForTimeout(2_000);
      const poolSelector = await page
        .frameLocator("iframe")
        .nth(1)
        .locator(".custom-select");
      const hasDisabledClassOnChild = await poolSelector
        .locator(".disabled")
        .count();
      await expect(hasDisabledClassOnChild).toBeGreaterThan(0);
      await checkForStakeAmount({
        page,
        availableBalance: stakedNear,
        errorText: "The amount exceeds the balance you have staked.",
      });
      await page
        .frameLocator("iframe")
        .nth(1)
        .getByRole("button", { name: "Submit" })
        .click();
      await expect(
        page.getByText("Awaiting transaction confirmation...")
      ).toBeVisible();

      await expect(await getTransactionModalObject(page)).toEqual({
        proposal: {
          description: "* Proposal Action: unstake",
          kind: {
            FunctionCall: {
              receiver_id: lockupContract,
              actions: [
                {
                  method_name: "unstake",
                  args: "eyJhbW91bnQiOiIzMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAifQ==",
                  deposit: "0",
                  gas: "200000000000000",
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
          description: `* Proposal Action: withdraw <br>* Show After Proposal Id Approved: ${lastProposalId} <br>* Custom Notes: Following to [#${lastProposalId}](/${instanceAccount}/widget/app?page=stake-delegation&id=${lastProposalId}) unstake request`,
          kind: {
            FunctionCall: {
              receiver_id: lockupContract,
              actions: [
                {
                  method_name: "withdraw_all_from_staking_pool",
                  args: "",
                  deposit: "0",
                  gas: "250000000000000",
                },
              ],
            },
          },
        },
      });
    });
  });

  test.describe("Wallet dropdown shouldn't be visible when staking is not allowed", async () => {
    const dropdownOptions = [
      { name: "Stake", option: 1 },
      { name: "Unstake", option: 2 },
      { name: "Withdraw", option: 3 },
    ];

    const shouldntDisplayWalletDropdownSelectorWhenOpening = async ({
      page,
      lockupContract,
      option,
      name,
    }) => {
      test.setTimeout(120_000);
      await expect(
        page.getByText("Create Request", { exact: true })
      ).toBeVisible();
      await mockLockupState({ page, lockupContract });
      await page.locator(".custom-select > .dropdown").first().click();
      await page
        .locator(`.dropdown-menu > div:nth-child(${option})`)
        .click({ timeout: 20_000 });
      await expect(page.getByText("Ready to stake")).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        page.getByRole("heading", { name: `Create ${name} Request` })
      ).toBeVisible(10_000);
      await page.waitForTimeout(5_000);
      await expect(
        page.locator(".offcanvas-body").getByText("Treasury Wallet")
      ).toBeHidden();
    };

    test(`shouldn't display wallet dropdown selector when opening Stake request`, async ({
      page,
      lockupContract,
    }) => {
      await shouldntDisplayWalletDropdownSelectorWhenOpening({
        page,
        lockupContract,
        option: dropdownOptions[0].option,
        name: dropdownOptions[0].name,
      });
    });
    test(`shouldn't display wallet dropdown selector when opening Unstake request`, async ({
      page,
      lockupContract,
    }) => {
      await shouldntDisplayWalletDropdownSelectorWhenOpening({
        page,
        lockupContract,
        option: dropdownOptions[1].option,
        name: dropdownOptions[1].name,
      });
    });
    test(`shouldn't display wallet dropdown selector when opening Withdraw request`, async ({
      page,
      lockupContract,
    }) => {
      await shouldntDisplayWalletDropdownSelectorWhenOpening({
        page,
        lockupContract,
        option: dropdownOptions[2].option,
        name: dropdownOptions[2].name,
      });
    });
  });
});
