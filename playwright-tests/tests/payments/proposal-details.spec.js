import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import {
  CurrentTimestampInNanoseconds,
  TransferProposalData,
} from "../../util/inventory.js";
import { mockRpcRequest, mockWithFTBalance } from "../../util/rpcmock.js";
import { SandboxRPC } from "../../util/sandboxrpc.js";

async function mockPaymentProposals({ page, status }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposals",
    },
    modifyOriginalResultFunction: () => {
      let originalResult = [JSON.parse(JSON.stringify(TransferProposalData))];
      originalResult[0].id = 1;
      originalResult[0].status = status;
      originalResult[0].submission_time = CurrentTimestampInNanoseconds;
      return originalResult;
    },
  });
}

async function mockPaymentProposal({ page, status }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposal",
    },
    modifyOriginalResultFunction: () => {
      let originalResult = JSON.parse(JSON.stringify(TransferProposalData));
      originalResult.id = 1;
      originalResult.status = status;
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
  if (notInProgress) {
    await expect(
      page.getByText(
        `Payment request ${status === "Approved" ? "Funded" : status}`
      )
    ).toBeVisible({ timeout: 20_000 });
  }
  const copyReceiverAddr = await page.getByText("Copy Address");
  await expect(copyReceiverAddr).toBeVisible();
  await copyReceiverAddr.click();
  await readClipboard({ page, expectedText: "megha19.near" });

  if (isCompactVersion) {
    const highlightedProposalRow = page.locator("tr").nth(1);
    await expect(highlightedProposalRow).toHaveClass(
      "cursor-pointer proposal-row bg-highlight"
    );
    const heading = page.getByRole("heading", { name: "#1" });
    await expect(heading).toBeVisible();
    const cancelBtn = await page.locator(".cursor-pointer > .bi").first();
    await cancelBtn.click();
    await expect(heading).toBeHidden();
    await expect(highlightedProposalRow).not.toHaveClass("bg-highlight");
  } else {
    const copyLink = await page.getByText("Copy link");
    await copyLink.click();
    await readClipboard({
      page,
      expectedText: `https://near.social/${instanceAccount}/widget/app?page=payments&id=1`,
    });
    const backBtn = await page.getByRole("button", { name: " Back" });
    await backBtn.click();
    const newUrl = await page.url();
    await expect(newUrl).toBe(
      `http://localhost:8080/${instanceAccount}/widget/app?page=payments`
    );
  }
}

test.describe
  .parallel("should display proposals of different status correctly", () => {
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
      await mockPaymentProposals({ page, status });
      await page.goto(`/${instanceAccount}/widget/app?page=payments`);
      await page.waitForTimeout(10_000);
      if (notInProgress) {
        await page.getByText("History", { exact: true }).click();
        await page.waitForTimeout(5_000);
      }
      const proposalCell = page.getByTestId("proposal-request-#1");
      await expect(proposalCell).toBeVisible({ timeout: 20_000 });
      await mockPaymentProposal({ page, status });
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
    await mockPaymentProposal({ page, status });
    await page.goto(`/${instanceAccount}/widget/app?page=payments&id=1`);
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
  const proposalTitle = "Test proposal title";
  const proposalSummary = "Test proposal summary";
  const receiverAccount = daoAccount;
  await sandbox.init();
  await sandbox.attachRoutes(page);
  const isMultiVote = daoAccount === "infinex.sputnik-dao.near";
  await sandbox.setupSandboxForSputnikDao(daoName, "theori.near", isMultiVote);
  await sandbox.addPaymentRequestProposal({
    title: proposalTitle,
    summary: proposalSummary,
    amount: "5",
    receiver_id: receiverAccount,
    daoName,
  });
  return sandbox;
}

async function approveProposal({
  page,
  sandbox,
  daoAccount,
  isCompactVersion,
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
  await page.getByRole("button", { name: "Confirm" }).click();
  const transactionResult = await sandbox.account.functionCall({
    contractId: daoAccount,
    methodName: "act_proposal",
    args: {
      id: 0,
      action: "VoteApprove",
    },
    attachedDeposit: "0",
  });

  await page.getByRole("button", { name: "Confirm" }).click();
  await page.evaluate(async (transactionResult) => {
    window.transactionSentPromiseResolve(transactionResult);
  }, transactionResult);
  await page.waitForTimeout(10_000);
  if (isMultiVote) {
    if (isCompactVersion) {
      await expect(
        page.getByText(
          "Your vote is counted, the payment request is highlighted."
        )
      ).toBeVisible();
    } else {
      await expect(page.getByText("Your vote is counted.")).toBeVisible();
      await expect(page.getByText("You approved")).toBeVisible();
    }
  } else {
    await expect(
      page.getByText("The payment request has been successfully executed.")
    ).toBeVisible();
    if (!isCompactVersion) {
      await expect(page.getByText("Payment Request Funded")).toBeVisible();
    } else {
      await page.getByText("View in History").click();
      await expect(page.locator("tr").nth(1)).toHaveClass(
        "cursor-pointer proposal-row bg-highlight",
        {
          timeout: 10_000,
        }
      );
    }
  }
}

test.describe("Should vote on proposal using sandbox RPC and show updated status and toast", () => {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });
  test(`Proposal details page`, async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(200_000);
    const sandbox = await setupSandboxAndCreateProposal({ daoAccount, page });
    await mockWithFTBalance({ page, daoAccount, isSufficient: true });

    await page.goto(`/${instanceAccount}/widget/app?page=payments&id=0`);
    const approveButton = page
      .getByRole("button", {
        name: "Approve",
      })
      .first();
    await expect(approveButton).toBeEnabled({ timeout: 30_000 });
    await approveButton.click();
    await approveProposal({ page, sandbox, daoAccount });
    await sandbox.quitSandbox();
  });

  test(`Compact proposal page`, async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(200_000);
    const sandbox = await setupSandboxAndCreateProposal({ daoAccount, page });
    await mockWithFTBalance({ page, daoAccount, isSufficient: true });

    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    const proposalCell = page.getByTestId("proposal-request-#1");
    await expect(proposalCell).toBeVisible({ timeout: 20_000 });
    await proposalCell.click();
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
      isCompactVersion: true,
    });
    await sandbox.quitSandbox();
  });
});
