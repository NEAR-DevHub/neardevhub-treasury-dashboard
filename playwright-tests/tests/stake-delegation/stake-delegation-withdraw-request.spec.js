import { expect } from "@playwright/test";
import { cacheCDN, test } from "../../util/test.js";
import { getTransactionModalObject } from "../../util/transaction";
import { mockRpcRequest, updateDaoPolicyMembers } from "../../util/rpcmock.js";
import { SandboxRPC } from "../../util/sandboxrpc.js";
import {
  checkNewProposalSubmission,
  mockStakedPools,
  mockUnstakeAndWithdrawBalance,
  multiStakedPoolAccount,
  openWithdrawForm,
  stakedPoolAccount,
  voteOnProposal,
} from "./stake-delegation-common.js";

test.beforeEach(async ({ page }) => {
  await cacheCDN(page);
});
test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("Withdraw request", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test.beforeEach(async ({ page, instanceAccount, daoAccount }) => {
    await updateDaoPolicyMembers({ instanceAccount, page });
    await page.goto(`/${instanceAccount}/widget/app?page=stake-delegation`);
    await mockStakedPools({ daoAccount, page, havePools: true });
    await expect(
      await page.locator("div").filter({ hasText: /^Stake Delegation$/ })
    ).toBeVisible();
  });

  test("User has not unstaked tokens, show warning screen", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await mockUnstakeAndWithdrawBalance({
      page,
      hasUnstakeBalance: false,
      hasWithdrawBalance: false,
    });
    await openWithdrawForm({ page });
    await expect(
      page.getByText(
        "You don’t have any unstaked balance available for withdrawal."
      )
    ).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Unstaked tokens are not ready to be withdrawn, show warning screen", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await mockUnstakeAndWithdrawBalance({
      page,
      hasUnstakeBalance: true,
      hasWithdrawBalance: false,
    });
    await openWithdrawForm({ page });
    await expect(
      page.getByText(
        "Your balance is not ready for withdrawal yet. It is pending release and will take 1–2 days."
      )
    ).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Have valid withdraw tokens from one pool, should show in table after submission", async ({
    page,
    daoAccount,
  }) => {
    test.setTimeout(250_000);
    const daoName = daoAccount.split(".")[0];
    const sandbox = new SandboxRPC();
    await sandbox.init();
    await sandbox.attachRoutes(page);
    await sandbox.setupSandboxForSputnikDao(daoName);
    await sandbox.addWithdrawRequestProposal({
      stakedPoolAccount,
      description: `* Proposal Action: withdraw <br>* Amount: 3.0265368343533935e+23`,
      daoName,
    });
    await mockUnstakeAndWithdrawBalance({
      page,
      hasUnstakeBalance: true,
      hasWithdrawBalance: true,
    });
    await openWithdrawForm({ page });
    await expect(page.getByText("Available for withdrawal:")).toBeVisible({
      timeout: 10_000,
    });
    const submitBtn = page.getByRole("button", { name: "Submit" });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.dblclick();
    const expectedTransactionModalObject = {
      proposal: {
        description: `* Proposal Action: withdraw <br>* Amount: 3.0265368343533935e+23`,
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
    await expect(await getTransactionModalObject(page)).toEqual(
      expectedTransactionModalObject
    );
    await checkNewProposalSubmission({ page, sandbox, daoAccount, daoName });
    await sandbox.quitSandbox();
  });

  test("Have valid withdraw tokens from multiple pools", async ({
    page,
    daoAccount,
    instanceAccount,
    lockupContract,
  }) => {
    test.setTimeout(250_000);
    if (lockupContract) {
      console.log("lockup contract found for instance");
      return test.skip();
    }
    const daoName = daoAccount.split(".")[0];
    const sandbox = new SandboxRPC();
    await sandbox.init();
    await sandbox.attachRoutes(page);
    await sandbox.setupSandboxForSputnikDao(daoName);
    const description = `* Proposal Action: withdraw <br>* Amount: 3.0265368343533935e+23`;
    await sandbox.addWithdrawRequestProposal({
      stakedPoolAccount,
      description,
      daoName,
    });
    await sandbox.addWithdrawRequestProposal({
      stakedPoolAccount: multiStakedPoolAccount,
      description,
      daoName,
    });
    await updateDaoPolicyMembers({ instanceAccount, page });
    await mockStakedPools({ daoAccount, page, multiplePools: true });
    await page.goto(`/${instanceAccount}/widget/app?page=stake-delegation`);
    await mockUnstakeAndWithdrawBalance({
      page,
      hasUnstakeBalance: true,
      hasWithdrawBalance: true,
    });
    await openWithdrawForm({ page });
    await expect(
      page.locator(".offcanvas-body").getByText(stakedPoolAccount)
    ).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText(
        "By submitting, you request to withdraw all available funds. A separate withdrawal request will be created for each validator"
      )
    ).toBeVisible({
      timeout: 10_000,
    });
    const submitBtn = page.getByRole("button", { name: "Submit" });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.dblclick();
    // proposals for both the pools
    await expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: `* Proposal Action: withdraw <br>* Amount: 3.0265368343533935e+23`,
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
    });

    const txnLocator = await page
      .locator("div.modal-body code")
      .nth(1)
      .innerText();
    const dataReceived = JSON.parse(txnLocator);
    expect(dataReceived).toEqual({
      proposal: {
        description: `* Proposal Action: withdraw <br>* Amount: 3.0265368343533935e+23`,
        kind: {
          FunctionCall: {
            receiver_id: multiStakedPoolAccount,
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
    });
    await checkNewProposalSubmission({
      page,
      sandbox,
      daoAccount,
      daoName,
      checkforMultiProposals: true,
    });
    await sandbox.quitSandbox();
  });

  test("Vote on withdraw request, when amount is not ready", async ({
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
        return false;
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
    await expect(
      page.getByText("Voting is not available before unstaking release")
    ).toBeEnabled({ timeout: 10_000 });
  });
});
