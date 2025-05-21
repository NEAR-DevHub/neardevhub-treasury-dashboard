import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import {
  CurrentTimestampInNanoseconds,
  LockupProposalData,
} from "../../util/inventory.js";
import { mockRpcRequest, mockWithFTBalance } from "../../util/rpcmock.js";
import { SandboxRPC } from "../../util/sandboxrpc.js";
import { formatTimestamp, toBase64 } from "../../util/lib.js";

async function mockLockupProposals({ page, status }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposals",
    },
    modifyOriginalResultFunction: () => {
      let originalResult = [JSON.parse(JSON.stringify(LockupProposalData))];
      originalResult[0].id = 0;
      originalResult[0].status = status;
      originalResult[0].submission_time = CurrentTimestampInNanoseconds;
      return originalResult;
    },
  });
}

async function mockLockupProposal({ page, status }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposal",
    },
    modifyOriginalResultFunction: () => {
      let originalResult = JSON.parse(JSON.stringify(LockupProposalData));
      originalResult.id = 0;
      if (status == "InProgress") {
        originalResult.submission_time = CurrentTimestampInNanoseconds;
      }
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
  const requestStatus = page.getByText(
    `Lockup Request ${status === "Approved" ? "Executed" : status}`
  );
  if (notInProgress) {
    await expect(requestStatus).toBeVisible({ timeout: 20_000 });
  } else {
    await expect(requestStatus).toBeHidden({ timeout: 20_000 });
  }

  if (status === "Approved") {
    await expect(page.getByRole("link", { name: "View Lockup" })).toBeVisible();
  }
  await expect(
    page.locator("label").filter({ hasText: "Start Date" })
  ).toBeVisible();
  await expect(
    page.locator("label").filter({ hasText: "End Date" })
  ).toBeVisible();

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
        `http://localhost:8080/${instanceAccount}/widget/app?page=lockup` +
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
      expectedText: `https://near.social/${instanceAccount}/widget/app?page=lockup&id=0`,
    });
    const backBtn = await page.getByRole("button", { name: " Back" });
    await backBtn.click();
    const newUrl = await page.url();
    await expect(newUrl).toBe(
      `http://localhost:8080/${instanceAccount}/widget/app?page=lockup`
    );
  }
}

test.describe
  .parallel("should display lockup proposals of different status correctly", () => {
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
      await mockLockupProposals({ page, status });
      await page.goto(`/${instanceAccount}/widget/app?page=lockup`);
      await page.waitForTimeout(10_000);
      if (notInProgress) {
        await page.getByText("History", { exact: true }).click();
        await page.waitForTimeout(5_000);
      }
      const proposalCell = page.getByTestId("proposal-request-#0");
      await expect(proposalCell).toBeVisible({ timeout: 20_000 });
      await mockLockupProposal({ page, status });
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
    await mockLockupProposal({ page, status });
    await page.goto(`/${instanceAccount}/widget/app?page=lockup&id=0`);
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
  const now = new Date();
  const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const functionArgs = {
    lockup_duration: "0",
    owner_account_id: daoAccount,
    lockup_timestamp: formatTimestamp(now).toString(),
    release_duration: formatTimestamp(fiveDaysLater).toString(),
  };
  if (daoAccount === "treasury-testing.near") {
    functionArgs = {
      ...functionArgs,
      whitelist_account_id: "lockup-no-whitelist.near",
      vesting_schedule: {
        VestingSchedule: {
          cliff_timestamp: formatTimestamp(now).toString(),
          end_timestamp: formatTimestamp(fiveDaysLater).toString(),
          start_timestamp: formatTimestamp(now).toString(),
        },
      },
    };
  }
  await sandbox.addFunctionCallProposal({
    method_name: "create",
    description: `Create lockup for ${daoAccount}`,
    receiver_id: "lockup.near",
    functionArgs: toBase64(functionArgs),
    deposit: "5" + "000000000000000000000000",
    daoName,
  });
  return sandbox;
}

async function approveProposal({
  page,
  sandbox,
  daoAccount,
  isCompactVersion,
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
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
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

    await expect(page.getByText("Lockup Request Failed")).toBeVisible({
      timeout: 30_000,
    });
    if (isCompactVersion) {
      const historyBtn = page.getByText("View in History");
      await expect(historyBtn).toBeVisible();
      await Promise.all([page.waitForNavigation(), historyBtn.click()]);
      const currentUrl = page.url();
      await expect(currentUrl).toContain(
        `http://localhost:8080/${instanceAccount}/widget/app?page=lockup&id=0`
      );
    }
  }
}

test.describe("Should vote on lockup proposal using sandbox RPC and show updated status and toast", () => {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });
  test(`Proposal details page`, async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(250_000);
    const sandbox = await setupSandboxAndCreateProposal({ daoAccount, page });
    await mockWithFTBalance({ page, daoAccount, isSufficient: true });

    await page.goto(`/${instanceAccount}/widget/app?page=lockup&id=0`);
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

  test(`Compact proposal page`, async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(200_000);
    const sandbox = await setupSandboxAndCreateProposal({ daoAccount, page });
    await mockWithFTBalance({ page, daoAccount, isSufficient: true });

    await page.goto(`/${instanceAccount}/widget/app?page=lockup`);
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
