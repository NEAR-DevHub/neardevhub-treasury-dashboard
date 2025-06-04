import { expect } from "@playwright/test";
import { cacheCDN, test } from "../../util/test.js";
import { getTransactionModalObject } from "../../util/transaction";
import { utils } from "near-api-js";
import {
  mockNearBalances,
  updateDaoPolicyMembers,
} from "../../util/rpcmock.js";

import { InsufficientBalance } from "../../util/lib.js";
import { SandboxRPC } from "../../util/sandboxrpc.js";
import {
  checkForStakeAmount,
  checkNewProposalSubmission,
  fillValidatorAccount,
  formatNearAmount,
  inSufficientAvailableBalance,
  mockOldJSONStakeProposals,
  mockStakedPoolBalances,
  mockStakedPools,
  mockStakeProposals,
  mockUnstakeAndWithdrawBalance,
  openStakeForm,
  openUnstakeForm,
  openWithdrawForm,
  stakedNear,
  stakedPoolAccount,
  sufficientAvailableBalance,
} from "./stake-delegation-common.js";

test.beforeEach(async ({ page }) => {
  await cacheCDN(page);
});
test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("Have valid staked requests and sufficient token balance", function () {
  test.beforeEach(async ({ page, instanceAccount, daoAccount }, testInfo) => {
    if (
      testInfo.title.includes("Should successfully parse old JSON description")
    ) {
      await mockOldJSONStakeProposals({ page });
    } else {
      await mockStakeProposals({ page });
    }

    await updateDaoPolicyMembers({
      instanceAccount,
      page,
      hasAllRole: testInfo.titlePath.includes("User with 'All role'"),
    });

    await mockStakedPools({ page, daoAccount });
    if (testInfo.title.includes("insufficient account balance")) {
      await mockNearBalances({
        page,
        accountId: "theori.near",
        balance: InsufficientBalance,
        storage: 8,
      });
    } else {
      await mockNearBalances({
        page,
        accountId: daoAccount,
        balance: sufficientAvailableBalance,
        storage: 2323,
      });
    }
    await mockStakedPoolBalances({ page });

    await page.goto(`/${instanceAccount}/widget/app?page=stake-delegation`);
    await expect(
      await page.locator("div").filter({ hasText: /^Stake Delegation$/ })
    ).toBeVisible();
    await page.waitForTimeout(5_000);
  });

  test.describe("User not logged in", function () {
    test("Should view pending and history requests", async ({ page }) => {
      test.setTimeout(80_000);
      await expect(
        page.getByRole("cell", { name: "0", exact: true })
      ).toBeVisible({ timeout: 40_000 });
      await page.getByText("History").click();
      await expect(
        page.getByRole("cell", { name: "1", exact: true })
      ).toBeVisible({ timeout: 40_000 });
    });

    test("Should successfully parse old JSON description", async ({ page }) => {
      test.setTimeout(80_000);
      await expect(
        page.getByRole("cell", { name: "this is notes", exact: true })
      ).toBeVisible({ timeout: 40_000 });
    });

    test("export action should not be visible in pending requests tab", async ({
      page,
      instanceAccount,
    }) => {
      test.setTimeout(60_000);
      await page.goto(`/${instanceAccount}/widget/app?page=stake-delegation`);
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
      test.setTimeout(60_000);
      await page.goto(
        `/${instanceAccount}/widget/app?page=stake-delegation&tab=history`
      );
      const exportLink = page.locator('a[download="proposals.csv"]');
      await expect(exportLink).toBeVisible();
      const href = await exportLink.getAttribute("href");
      expect(href).toContain(
        `/proposals/${daoAccount}?proposal_type=FunctionCall&keyword=stake,withdraw`
      );
    });
  });

  test.describe.parallel("User logged in with different roles", function () {
    const roles = [
      {
        name: "Settings role",
        storageState:
          "playwright-tests/storage-states/wallet-connected-admin-with-settings-role.json",
      },
      {
        name: "Vote role",
        storageState:
          "playwright-tests/storage-states/wallet-connected-admin-with-vote-role.json",
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

        test("should only allow authorized users to see 'Create Request' action", async ({
          page,
        }) => {
          test.setTimeout(60_000);
          await expect(page.getByText("Pending Requests")).toBeVisible();
          const createRequestButton = page.getByText("Create Request", {
            exact: true,
          });

          if (hasAllRole) {
            await expect(createRequestButton).toBeVisible();
          } else {
            await expect(createRequestButton).toBeHidden();
          }
        });
      });
    }
  });

  test.describe("Admin connected", function () {
    test.use({
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin.json",
    });

    test("insufficient account balance should show warning modal, disallow action ", async ({
      page,
    }) => {
      test.setTimeout(60_000);

      await expect(
        page.getByText(
          "Hey Ori, you don't have enough NEAR to complete actions on your treasury."
        )
      ).toBeVisible();
      await page
        .getByText("Create Request", {
          exact: true,
        })
        .click();
      await expect(
        page
          .getByText("Please add more funds to your account and try again")
          .nth(1)
      ).toBeVisible();
    });

    test("Should create stake delegation request, should throw error when invalid data is provided, should show in table after submission", async ({
      page,
      daoAccount,
    }) => {
      test.setTimeout(250_000);
      const daoName = daoAccount.split(".")[0];
      const sandbox = new SandboxRPC();
      await sandbox.init();
      await sandbox.attachRoutes(page);
      await sandbox.setupSandboxForSputnikDao(daoName);
      await sandbox.addStakeRequestProposal({
        stakedPoolAccount,
        stakingAmount: "11.00",
        daoName,
      });
      await openStakeForm({ page });

      await fillValidatorAccount({
        page,
      });
      await checkForStakeAmount({
        page,
        availableBalance: formatNearAmount(sufficientAvailableBalance),
        errorText: "Your account doesn't have sufficient balance.",
      });

      const stakingAmount = await page
        .frameLocator("iframe")
        .nth(1)
        .locator('input[placeholder="Enter amount"]')
        .first()
        .inputValue();

      await page
        .frameLocator("iframe")
        .nth(1)
        .getByRole("button", { name: "Submit" })
        .click();
      const expectedTransactionModalObject = {
        proposal: {
          description: "* Proposal Action: stake",
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
      };

      await expect(await getTransactionModalObject(page)).toEqual(
        expectedTransactionModalObject
      );
      await checkNewProposalSubmission({ page, sandbox, daoAccount, daoName });
      await sandbox.quitSandbox();
    });

    test("Should create unstake delegation request, should throw error when invalid data is provided, should show in table after submission", async ({
      page,
      daoAccount,
      instanceAccount,
    }) => {
      test.setTimeout(250_000);
      const daoName = daoAccount.split(".")[0];
      const sandbox = new SandboxRPC();
      await sandbox.init();
      await sandbox.attachRoutes(page);
      await sandbox.setupSandboxForSputnikDao(daoName);
      const args = "eyJhbW91bnQiOiIzMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAifQ==";
      const description = `* Proposal Action: withdraw <br>* Show After Proposal Id Approved: 2 <br>* Custom Notes: Following to [#2](/${instanceAccount}/widget/app?page=stake-delegation&id=2) unstake request`;
      await sandbox.addUnstakeRequestProposal({
        stakedPoolAccount,
        functionCallArgs: args,
        daoName,
      });
      await sandbox.addWithdrawRequestProposal({
        stakedPoolAccount,
        description: description,
        daoName,
      });
      await openUnstakeForm({ page });
      await fillValidatorAccount({
        page,
      });
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
      const expectedTransactionModalObject = {
        proposal: {
          description: "* Proposal Action: unstake",
          kind: {
            FunctionCall: {
              receiver_id: stakedPoolAccount,
              actions: [
                {
                  method_name: "unstake",
                  args: args,
                  deposit: "0",
                  gas: "200000000000000",
                },
              ],
            },
          },
        },
      };
      await expect(await getTransactionModalObject(page)).toEqual(
        expectedTransactionModalObject
      );
      const txnLocator = await page
        .locator("div.modal-body code")
        .nth(1)
        .innerText();
      const dataReceived = JSON.parse(txnLocator);
      const expectedTransaction2ModalObject = {
        proposal: {
          description: description,
          kind: {
            FunctionCall: {
              receiver_id: stakedPoolAccount,
              actions: [
                {
                  method_name: "withdraw_all",
                  args: "",
                  deposit: "0",
                  gas: "200000000000000",
                },
              ],
            },
          },
        },
      };
      await expect(dataReceived).toEqual(expectedTransaction2ModalObject);

      await checkNewProposalSubmission({
        page,
        sandbox,
        daoAccount,
        daoName,
        checkforMultiProposals: true,
      });

      await sandbox.quitSandbox();
    });

    test("submit action should show transaction loader and handle cancellation correctly", async ({
      page,
    }) => {
      test.setTimeout(150_000);
      await openUnstakeForm({ page });
      await fillValidatorAccount({
        page,
      });
      await checkForStakeAmount({
        page,
        availableBalance: stakedNear,
        errorText: "The amount exceeds the balance you have staked.",
      });
      const submitBtn = await page
        .frameLocator("iframe")
        .nth(1)
        .getByRole("button", { name: "Submit" });
      await submitBtn.click();
      const loader = page.getByText("Awaiting transaction confirmation...");
      await expect(loader).toBeVisible();
      await expect(submitBtn).toBeDisabled();
      await page.getByRole("button", { name: "Close" }).nth(1).click();
      await page
        .locator(".toast-body")
        .getByRole("button", { name: "Cancel" })
        .click();
      await expect(loader).toBeHidden();
      await expect(submitBtn).toBeEnabled();
    });
  });
});

test.describe("Insufficient balance ", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test.beforeEach(async ({ page, instanceAccount, daoAccount }) => {
    await mockStakeProposals({ page });
    await updateDaoPolicyMembers({ instanceAccount, page });

    await mockStakedPools({ page, daoAccount, havePools: false });
    await mockStakedPoolBalances({ page });
    await mockNearBalances({
      page,
      accountId: daoAccount,
      balance: inSufficientAvailableBalance,
      storage: 2323,
    });

    await page.goto(`/${instanceAccount}/widget/app?page=stake-delegation`);
    await expect(
      await page.locator("div").filter({ hasText: /^Stake Delegation$/ })
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
    ).toBeVisible({ timeout: 15_000 });
  });
});
