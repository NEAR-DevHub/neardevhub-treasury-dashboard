import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import {
  CurrentTimestampInNanoseconds,
  WithdrawProposalData,
  StakeProposalData,
  UnStakeProposalData,
} from "../../util/inventory.js";
import { mockRpcRequest, mockWithFTBalance } from "../../util/rpcmock.js";
import { SandboxRPC } from "../../util/sandboxrpc.js";
import { stakedPoolAccount, toBase64 } from "./stake-delegation-common.js";
const RequestType = {
  STAKE: "Stake",
  UNSTAKE: "Unstake",
  WITHDRAW: "Withdraw",
};

function getProposalDataByType(type) {
  switch (type) {
    case RequestType.STAKE:
      return StakeProposalData;
    case RequestType.UNSTAKE:
      return UnStakeProposalData;
    case RequestType.WITHDRAW:
      return WithdrawProposalData;
  }
}

async function mockStakeDelegationProposals({ page, status, type }) {
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

async function mockStakeDelegationProposal({ page, status, type }) {
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
  { status: "Approved", type: RequestType.STAKE },
  { status: "Rejected", type: RequestType.UNSTAKE },
  { status: "Failed", type: RequestType.WITHDRAW },
  { status: "Expired", type: RequestType.STAKE },
  { status: "InProgress", type: RequestType.UNSTAKE },
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
    `Request ${status === "Approved" ? "Executed" : status}`
  );
  if (notInProgress) {
    await expect(requestStatus).toBeVisible({ timeout: 20_000 });
  } else {
    await expect(requestStatus).toBeHidden({ timeout: 20_000 });
  }
  await expect(page.getByText("Request Type")).toBeVisible();
  await expect(
    page.locator("label").filter({ hasText: "Amount" })
  ).toBeVisible();
  await expect(
    page.locator("label").filter({ hasText: "Validator" })
  ).toBeVisible();
  await expect(
    page.getByText(".poolv1.near").nth(isCompactVersion ? 1 : 0)
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
        `http://localhost:8080/${instanceAccount}/widget/app?page=stake-delegation` +
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
      expectedText: `https://near.social/${instanceAccount}/widget/app?page=stake-delegation&id=0`,
    });
    const backBtn = await page.getByRole("button", { name: " Back" });
    await backBtn.click();
    const newUrl = await page.url();
    await expect(newUrl).toBe(
      `http://localhost:8080/${instanceAccount}/widget/app?page=stake-delegation`
    );
  }
}

test.describe
  .parallel("should display stake delegation proposals of different status correctly", () => {
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
      await mockStakeDelegationProposals({ page, status, type });
      await page.goto(`/${instanceAccount}/widget/app?page=stake-delegation`);
      await page.waitForTimeout(10_000);
      if (notInProgress) {
        await page.getByText("History", { exact: true }).click();
        await page.waitForTimeout(5_000);
      }
      const proposalCell = page.getByTestId("proposal-request-#0");
      await expect(proposalCell).toBeVisible({ timeout: 20_000 });
      await mockStakeDelegationProposal({ page, status, type });
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
    await mockStakeDelegationProposal({
      page,
      status,
      type: RequestType.STAKE,
    });
    await page.goto(
      `/${instanceAccount}/widget/app?page=stake-delegation&id=0`
    );
    await checkProposalDetailPage({
      page,
      status,
      instanceAccount,
      isCompactVersion: false,
    });
  });
});

async function setupSandboxAndCreateProposal({
  instanceAccount,
  daoAccount,
  page,
  type,
}) {
  const daoName = daoAccount.split(".")[0];
  const sandbox = new SandboxRPC();
  await sandbox.init();
  await sandbox.attachRoutes(page);
  const isMultiVote = daoAccount === "infinex.sputnik-dao.near";
  await sandbox.setupSandboxForSputnikDao(daoName, "theori.near", isMultiVote);
  if (type === RequestType.STAKE) {
    await sandbox.addStakeRequestProposal({
      stakedPoolAccount,
      stakingAmount: "1.00",
      daoName,
    });
  }

  if (type === RequestType.UNSTAKE) {
    const args = toBase64({ amount: "300000000000000000000000" });
    const description = `* Proposal Action: withdraw <br>* Show After Proposal Id Approved: 0 <br>* Custom Notes: Following to [#0](/${instanceAccount}/widget/app?page=stake-delegation&id=0) unstake request`;
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
  }

  if (type === RequestType.WITHDRAW) {
    await sandbox.addWithdrawRequestProposal({
      stakedPoolAccount,
      description: `* Proposal Action: withdraw <br>* Amount: 3e+23`,
      daoName,
    });
  }

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
      proposal: StakeProposalData.kind,
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

    await expect(page.getByText("Request Failed")).toBeVisible({
      timeout: 30_000,
    });
    if (isCompactVersion) {
      const historyBtn = page.getByText("View in History");
      await expect(historyBtn).toBeVisible();
      await Promise.all([page.waitForNavigation(), historyBtn.click()]);
      const currentUrl = page.url();
      await expect(currentUrl).toContain(
        `http://localhost:8080/${instanceAccount}/widget/app?page=stake-delegation&id=0`
      );
    }
  }
}

test.describe("Should vote on stake delegation proposal using sandbox RPC and show updated status and toast", () => {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test(`Stake Proposal details page`, async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(250_000);
    const sandbox = await setupSandboxAndCreateProposal({
      daoAccount,
      page,
      type: RequestType.STAKE,
    });
    await mockWithFTBalance({ page, daoAccount, isSufficient: true });

    await page.goto(
      `/${instanceAccount}/widget/app?page=stake-delegation&id=0`
    );
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

  test(`Unstake Proposal details page`, async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(250_000);
    const sandbox = await setupSandboxAndCreateProposal({
      instanceAccount,
      daoAccount,
      page,
      type: RequestType.UNSTAKE,
    });
    await mockWithFTBalance({ page, daoAccount, isSufficient: true });

    await page.goto(
      `/${instanceAccount}/widget/app?page=stake-delegation&id=0`
    );
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

  test(`Withdraw Proposal details page`, async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(250_000);
    const sandbox = await setupSandboxAndCreateProposal({
      instanceAccount,
      daoAccount,
      page,
      type: RequestType.WITHDRAW,
    });
    await mockWithFTBalance({ page, daoAccount, isSufficient: true });

    await page.goto(
      `/${instanceAccount}/widget/app?page=stake-delegation&id=0`
    );
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
    const sandbox = await setupSandboxAndCreateProposal({
      daoAccount,
      page,
      type: RequestType.STAKE,
    });
    await mockWithFTBalance({ page, daoAccount, isSufficient: true });
    await page.goto(`/${instanceAccount}/widget/app?page=stake-delegation`);
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
