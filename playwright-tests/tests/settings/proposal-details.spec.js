import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import {
  CurrentTimestampInNanoseconds,
  SettingsMemberProposalData,
  SettingsVotingDurationProposalData,
  SettingsVotingThresholdProposalData,
  SettingsThemeProposalData,
  OldSettingsProposalData,
} from "../../util/inventory.js";
import { mockRpcRequest } from "../../util/rpcmock.js";

const RequestType = {
  MEMBERS: "Members",
  VOTING_THRESHOLD: "Voting Threshold",
  VOTING_DURATION: "Voting Duration",
  THEME: "Theme",
  OTHER: "Settings",
};

function getProposalDataByType(type) {
  switch (type) {
    case RequestType.MEMBERS:
      return SettingsMemberProposalData;
    case RequestType.VOTING_DURATION:
      return SettingsVotingDurationProposalData;
    case RequestType.VOTING_THRESHOLD:
      return SettingsVotingThresholdProposalData;
    case RequestType.THEME:
      return SettingsThemeProposalData;
    default:
      return OldSettingsProposalData;
  }
}

async function mockSettingsProposals({ page, status, type }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposals",
    },
    modifyOriginalResultFunction: () => {
      const proposal = getProposalDataByType(type);
      let originalResult = [JSON.parse(JSON.stringify(proposal))];
      originalResult[0].id = 0;
      originalResult[0].status = status;
      originalResult[0].submission_time = CurrentTimestampInNanoseconds;
      return originalResult;
    },
  });
}

async function mockSettingProposal({ page, status, type }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposal",
    },
    modifyOriginalResultFunction: () => {
      const proposal = getProposalDataByType(type);
      let originalResult = JSON.parse(JSON.stringify(proposal));
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
  { status: "Approved", type: RequestType.THEME },
  { status: "Rejected", type: RequestType.VOTING_DURATION },
  { status: "Failed", type: RequestType.VOTING_THRESHOLD },
  { status: "Expired", type: RequestType.MEMBERS },
  { status: "InProgress", type: RequestType.OTHER },
];

async function readClipboard({ page, expectedText }) {
  const copiedText = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedText).toBe(expectedText);
}

async function checkProposalDetailPage({
  page,
  status,
  type,
  isCompactVersion,
  instanceAccount,
}) {
  const notInProgress = status !== "InProgress";
  const requestStatus = page.getByText(
    `Request ${status === "Approved" ? "Executed" : status}`
  );
  if (notInProgress) {
    await expect(requestStatus).toBeVisible({ timeout: 20_000 });
  } else {
    await expect(requestStatus).toBeHidden({ timeout: 20_000 });
  }
  await expect(
    page.locator("label").filter({ hasText: "Transaction Details" })
  ).toBeVisible();

  switch (type) {
    case RequestType.MEMBERS: {
      await expect(page.getByText("Member:")).toBeVisible();
      await expect(page.getByText("Assigned Roles")).toBeVisible();
      break;
    }
    case RequestType.VOTING_DURATION: {
      await expect(page.getByText("Old Duration")).toBeVisible();
      await expect(page.getByText("New Duration")).toBeVisible();
      break;
    }
    case RequestType.VOTING_THRESHOLD: {
      await expect(page.getByText("Old Threshold")).toBeVisible();
      await expect(page.getByText("New Threshold")).toBeVisible();
      break;
    }
    case RequestType.THEME: {
      await expect(page.getByText("Logo:")).toBeVisible();
      await expect(page.getByText("Primary Color")).toBeVisible();
      await expect(page.getByText("Theme:")).toBeVisible();

      break;
    }
  }
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
        `http://localhost:8080/${instanceAccount}/widget/app?page=settings` +
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
      expectedText: `https://near.social/${instanceAccount}/widget/app?page=settings&id=0`,
    });
    const backBtn = await page.getByRole("button", { name: " Back" });
    await backBtn.click();
    const newUrl = await page.url();
    await expect(newUrl).toBe(
      `http://localhost:8080/${instanceAccount}/widget/app?page=settings`
    );
  }
}

test.describe
  .parallel("should display settings proposals of different status correctly", () => {
  test.use({
    contextOptions: {
      permissions: ["clipboard-read", "clipboard-write"],
    },
  });
  proposalStatuses.forEach(({ status, type }) => {
    test(`proposal with status '${status}' should be displayed correctly`, async ({
      page,
      instanceAccount,
    }) => {
      const notInProgress = status !== "InProgress";
      await mockSettingsProposals({ page, status, type });
      await page.goto(`/${instanceAccount}/widget/app?page=settings`);
      await page.waitForTimeout(10_000);
      if (notInProgress) {
        await page.getByText("History", { exact: true }).click();
        await page.waitForTimeout(5_000);
      }
      const proposalCell = page.getByTestId("proposal-request-#0");
      await expect(proposalCell).toBeVisible({ timeout: 20_000 });
      await mockSettingProposal({ page, status, type });
      await proposalCell.click();

      await checkProposalDetailPage({
        page,
        status,
        instanceAccount,
        isCompactVersion: true,
        type,
      });
    });
  });

  test(`proposal details link should open correctly`, async ({
    page,
    instanceAccount,
  }) => {
    const status = "Approved";
    await mockSettingProposal({
      page,
      status,
      type: RequestType.MEMBERS,
    });
    await page.goto(`/${instanceAccount}/widget/app?page=settings&id=0`);
    await checkProposalDetailPage({
      page,
      status,
      instanceAccount,
      isCompactVersion: false,
    });
  });
});

async function approveProposal({
  page,
  sandbox,
  daoAccount,
  isCompactVersion,
  instanceAccount,
  showInsufficientBalanceModal,
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
          (!isCompactVersion ? "." : ", the payment request is highlighted.")
      )
    ).toBeVisible({ timeout: 30_000 });
  } else {
    await expect(
      page.getByText("The payment request has been successfully executed.")
    ).toBeVisible({ timeout: 30_000 });

    await expect(page.getByText("Payment Request Funded")).toBeVisible({
      timeout: 30_000,
    });
    if (isCompactVersion) {
      const historyBtn = page.getByText("View in History");
      await expect(historyBtn).toBeVisible();
      await Promise.all([page.waitForNavigation(), historyBtn.click()]);
      const currentUrl = page.url();
      await expect(currentUrl).toContain(
        `http://localhost:8080/${instanceAccount}/widget/app?page=payments&id=0`
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
    test.setTimeout(250_000);
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
