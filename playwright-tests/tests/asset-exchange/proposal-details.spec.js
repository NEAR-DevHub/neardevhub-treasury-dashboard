import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import {
  CurrentTimestampInNanoseconds,
  SwapProposalData,
} from "../../util/inventory.js";
import { mockRpcRequest, mockWithFTBalance } from "../../util/rpcmock.js";
import { SandboxRPC } from "../../util/sandboxrpc.js";

async function mockExchangeProposals({ page, status }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposals",
    },
    modifyOriginalResultFunction: () => {
      let originalResult = [JSON.parse(JSON.stringify(SwapProposalData))];
      originalResult[0].id = 0;
      originalResult[0].status = status;
      originalResult[0].submission_time = CurrentTimestampInNanoseconds;
      return originalResult;
    },
  });
}

async function mockExchangeProposal({ page, status }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposal",
    },
    modifyOriginalResultFunction: () => {
      let originalResult = JSON.parse(JSON.stringify(SwapProposalData));
      originalResult.id = 0;
      originalResult.status = status;

      if (status === "InProgress") {
        originalResult.submission_time = CurrentTimestampInNanoseconds;
      }
      return originalResult;
    },
  });
}

const proposalStatuses = [
  "Approved",
  "Rejected",
  "Failed",
  "Expired",
  "InProgress",
];

async function readClipboard({ page, expectedText }) {
  const copiedText = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedText).toBe(expectedText);
}

async function checkProposalDetailPage({
  page,
  status,
  isCompactVersion,
  instanceAccount,
}) {
  const notInProgress = status !== "InProgress";
  const requestStatus = page.getByText(
    `Asset Exchange Request ${status === "Approved" ? "Executed" : status}`
  );
  if (notInProgress) {
    await expect(requestStatus).toBeVisible({ timeout: 20_000 });
  } else {
    await expect(requestStatus).toBeHidden({ timeout: 20_000 });
  }
  await expect(page.getByText("0.50 USDC")).toBeVisible();
  await expect(page.getByText("0.60 USDt")).toBeVisible();
  await expect(page.getByText("Price Slippage")).toBeVisible();
  await expect(page.getByText("Minimum Amount Receive")).toBeVisible();

  if (isCompactVersion) {
    const highlightedProposalRow = page.locator("tr").nth(1);
    await expect(highlightedProposalRow).toHaveClass(
      "cursor-pointer proposal-row bg-highlight"
    );
    const heading = page.getByRole("heading", { name: "#0" });
    await expect(heading).toBeVisible();
    if (!notInProgress || status === "Approved") {
      await page.getByRole("link", { name: "" }).click();
      const backBtn = await page.getByRole("button", { name: " Back" });
      await backBtn.click();
      const newUrl = await page.url();
      await expect(newUrl).toBe(
        `http://localhost:8080/${instanceAccount}/widget/app?page=asset-exchange` +
          (notInProgress ? "&tab=history" : "")
      );
    } else {
      const cancelBtn = await page.locator(".cursor-pointer > .bi").first();
      await cancelBtn.click();
      await expect(heading).toBeHidden();
      await expect(highlightedProposalRow).not.toHaveClass("bg-highlight");
    }
  } else {
    const copyLink = await page.getByText("Copy link");
    await copyLink.click();
    await readClipboard({
      page,
      expectedText: `https://near.social/${instanceAccount}/widget/app?page=asset-exchange&id=0`,
    });
    const backBtn = await page.getByRole("button", { name: " Back" });
    await backBtn.click();
    const newUrl = await page.url();
    await expect(newUrl).toBe(
      `http://localhost:8080/${instanceAccount}/widget/app?page=asset-exchange`
    );
  }
}

test.describe
  .parallel("should display exchange proposals of different status correctly", () => {
  test.use({
    contextOptions: {
      permissions: ["clipboard-read", "clipboard-write"],
    },
  });
  proposalStatuses.forEach((status) => {
    test(`proposal with status '${status}' should be displayed correctly`, async ({
      page,
      instanceAccount,
    }) => {
      const notInProgress = status !== "InProgress";
      await mockExchangeProposals({ page, status });
      await page.goto(`/${instanceAccount}/widget/app?page=asset-exchange`);
      await page.waitForTimeout(10_000);
      if (notInProgress) {
        await page.getByText("History", { exact: true }).click();
        await page.waitForTimeout(5_000);
      }
      const proposalCell = page.getByTestId("proposal-request-#0");
      await expect(proposalCell).toBeVisible({ timeout: 20_000 });
      await mockExchangeProposal({ page, status });
      await proposalCell.click();

      await checkProposalDetailPage({
        page,
        status,
        instanceAccount,
        isCompactVersion: true,
      });
    });
  });

  test(`proposal details link should open correctly`, async ({
    page,
    instanceAccount,
  }) => {
    const status = "Approved";
    await mockExchangeProposal({ page, status });
    await page.goto(`/${instanceAccount}/widget/app?page=asset-exchange&id=0`);
    await checkProposalDetailPage({
      page,
      status,
      instanceAccount,
      isCompactVersion: false,
    });
  });
});

async function setupSandboxAndCreateProposal({ daoAccount, page }) {
  const daoName = daoAccount.split(".")[0];
  const sandbox = new SandboxRPC();
  await sandbox.init();
  await sandbox.attachRoutes(page);
  const isMultiVote = daoAccount === "infinex.sputnik-dao.near";
  await sandbox.setupSandboxForSputnikDao(daoName, "theori.near", isMultiVote);
  await sandbox.addFunctionCallProposal({
    method_name: "ft_transfer_call",
    description:
      "* Proposal Action: asset-exchange <br>* Token In: 17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1 <br>* Token Out: usdt.tether-token.near <br>* Amount In: 0.5 <br>* Slippage: 1 <br>* Amount Out: 0.6",
    receiver_id: daoAccount,
    functionArgs:
      "eyJyZWNlaXZlcl9pZCI6InYyLnJlZi1maW5hbmNlLm5lYXIiLCJhbW91bnQiOiIxMDAwMDAiLCJtc2ciOiJ7XCJmb3JjZVwiOjAsXCJhY3Rpb25zXCI6W3tcInBvb2xfaWRcIjo0NTEzLFwidG9rZW5faW5cIjpcIjE3MjA4NjI4Zjg0ZjVkNmFkMzNmMGRhM2JiYmViMjdmZmNiMzk4ZWFjNTAxYTMxYmQ2YWQyMDExZTM2MTMzYTFcIixcInRva2VuX291dFwiOlwidXNkdC50ZXRoZXItdG9rZW4ubmVhclwiLFwiYW1vdW50X2luXCI6XCIxMDAwMDBcIixcImFtb3VudF9vdXRcIjpcIjBcIixcIm1pbl9hbW91bnRfb3V0XCI6XCI5OTA3M1wifV19In0=",
    daoName,
    deposit: "1",
  });
  return sandbox;
}

async function approveProposal({
  page,
  sandbox,
  daoAccount,
  isCompactVersion,
  showInsufficientBalanceModal,
  instanceAccount,
}) {
  const isMultiVote = daoAccount === "infinex.sputnik-dao.near";
  page.evaluate(async () => {
    const selector = await document.querySelector("near-social-viewer")
      .selectorPromise;

    const wallet = await selector.wallet();

    return new Promise((resolve) => {
      wallet["signAndSendTransaction"] = async (transaction) => {
        resolve(transaction);
        return new Promise((transactionSentPromiseResolve) => {
          window.transactionSentPromiseResolve = transactionSentPromiseResolve;
        });
      };
    });
  });
  if (showInsufficientBalanceModal) {
    await expect(page.getByText("Insufficient Balance")).toBeVisible();
    await page.getByRole("button", { name: "Proceed Anyway" }).click();
  }
  const transactionResult = await sandbox.account.functionCall({
    contractId: daoAccount,
    methodName: "act_proposal",
    args: {
      id: 0,
      action: "VoteApprove",
    },
    gas: "300000000000000",
    attachedDeposit: "0",
  });
  await page.waitForTimeout(5_000);
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.waitForTimeout(5_000);
  await page.evaluate(async (transactionResult) => {
    window.transactionSentPromiseResolve(transactionResult);
  }, transactionResult);
  await expect(page.locator("div.modal-body code").nth(0)).toBeAttached({
    attached: false,
    timeout: 10_000,
  });
  await expect(page.locator(".spinner-border")).toBeAttached({
    attached: false,
    timeout: 10_000,
  });
  if (isMultiVote) {
    await expect(page.getByText("1 Approved", { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        "Your vote is counted" +
          (!isCompactVersion ? "." : ", the request is highlighted.")
      )
    ).toBeVisible({ timeout: 30_000 });
  } else {
    await expect(page.getByText("The request has Failed.")).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByText("Asset Exchange Request Failed")).toBeVisible({
      timeout: 30_000,
    });
    if (isCompactVersion) {
      const historyBtn = page.getByText("View in History");
      await expect(historyBtn).toBeVisible();
      await Promise.all([page.waitForNavigation(), historyBtn.click()]);
      const currentUrl = page.url();
      await expect(currentUrl).toContain(
        `http://localhost:8080/${instanceAccount}/widget/app?page=asset-exchange&id=0`
      );
    }
  }
}

test.describe("Should vote on exchange proposal using sandbox RPC and show updated status and toast", () => {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });
  test(`Proposal details page`, async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(300_000);
    const sandbox = await setupSandboxAndCreateProposal({ daoAccount, page });
    await mockWithFTBalance({ page, daoAccount, isSufficient: true });

    await page.goto(`/${instanceAccount}/widget/app?page=asset-exchange&id=0`);
    const approveButton = page
      .getByRole("button", {
        name: "Approve",
      })
      .first();
    await expect(approveButton).toBeEnabled({ timeout: 30_000 });
    await approveButton.click();
    await approveProposal({ page, sandbox, daoAccount, instanceAccount });
    await sandbox.quitSandbox();
  });

  test(`Proposal details page: should show insufficient balance error`, async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(300_000);
    const sandbox = await setupSandboxAndCreateProposal({ daoAccount, page });
    await page.goto(`/${instanceAccount}/widget/app?page=asset-exchange&id=0`);
    await mockWithFTBalance({ page, daoAccount, isSufficient: false });
    const approveButton = page
      .getByRole("button", {
        name: "Approve",
      })
      .first();
    await expect(approveButton).toBeEnabled({ timeout: 30_000 });
    await approveButton.click();
    await approveProposal({
      page,
      sandbox,
      daoAccount,
      showInsufficientBalanceModal: true,
      instanceAccount,
    });
    await sandbox.quitSandbox();
  });

  test(`Compact proposal page`, async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(300_000);
    const sandbox = await setupSandboxAndCreateProposal({ daoAccount, page });
    await mockWithFTBalance({ page, daoAccount, isSufficient: true });

    await page.goto(`/${instanceAccount}/widget/app?page=asset-exchange`);
    const proposalCell = page.getByTestId("proposal-request-#0");
    await expect(proposalCell).toBeVisible({ timeout: 20_000 });
    await proposalCell.click();
    await expect(page.getByRole("heading", { name: "#0" })).toBeVisible();
    const approveButton = page
      .getByRole("button", {
        name: "Approve",
      })
      .nth(1);
    await expect(approveButton).toBeEnabled({ timeout: 30_000 });
    await approveButton.click();
    await approveProposal({
      page,
      sandbox,
      daoAccount,
      isCompactVersion: true,
      instanceAccount,
    });
    await sandbox.quitSandbox();
  });
});
