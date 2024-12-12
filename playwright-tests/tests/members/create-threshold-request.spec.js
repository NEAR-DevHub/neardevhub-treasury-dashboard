import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

import { getTransactionModalObject } from "../../util/transaction.js";
import {
  getMockedPolicy,
  mockRpcRequest,
  updateDaoPolicyMembers,
} from "../../util/rpcmock.js";
import { getInstanceConfig } from "../../util/config.js";

const lastProposalId = 3;

const votePolicy = {
  weight_kind: "RoleWeight",
  quorum: "0",
  threshold: [0, 100],
};

async function updateLastProposalId(page) {
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
}

async function checkForVoteApproveTxn(page) {
  const txnLocator = await page
    .locator("div.modal-body code")
    .nth(1)
    .innerText();
  const dataReceived = JSON.parse(txnLocator);
  expect(dataReceived).toEqual({
    id: lastProposalId,
    action: "VoteApprove",
  });
}

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("without login", function () {
  test.beforeEach(async ({ page, instanceAccount }) => {
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    if (instanceConfig.showThresholdConfiguration === false) {
      test.skip();
    }
    await updateDaoPolicyMembers({ page });
    await page.goto(`/${instanceAccount}/widget/app?page=settings`);
    await page.getByText("Voting Thresholds").click({ timeout: 20_000 });
  });

  test("should show members of different roles", async ({ page }) => {
    test.setTimeout(60_000);
    await expect(page.getByText("Permission Groups")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Members 6")).toBeVisible();
    await expect(page.getByText("Voting Policy")).toBeVisible();
    await expect(
      page.getByText(
        "@2dada969f3743a4a41cfdb1a6e39581c2844ce8fbe25948700c85c598090b3e1",
        { exact: true }
      )
    ).toBeVisible();
    await page.getByText("Manage Members").click();
    await expect(
      page.getByText("@megha19.near", { exact: true })
    ).toBeVisible();
    await page.getByText("Vote", { exact: true }).click();
    await expect(page.getByText("@test04.near", { exact: true })).toBeVisible();
  });

  test("should disable input and hide submit button for non authorised people", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await expect(page.getByText("Permission Groups")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("dropdown-btn")).toBeDisabled();
    await expect(page.getByText("Submit")).toBeHidden();
    await expect(page.getByTestId("threshold-input")).toBeDisabled();
  });
});

async function fillInput(page, value) {
  const submitBtn = page.getByText("Submit");
  const thresholdInput = page.getByTestId("threshold-input");
  await thresholdInput.type(value);
  expect(submitBtn).toBeVisible();
}

test.describe("admin connected", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test.beforeEach(async ({ page, instanceAccount }) => {
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    if (instanceConfig.showThresholdConfiguration === false) {
      test.skip();
    }
    await updateLastProposalId(page);
    await updateDaoPolicyMembers({ page });
    await page.goto(`/${instanceAccount}/widget/app?page=settings`);
    await page.getByText("Voting Thresholds").click({ timeout: 20_000 });
    await expect(page.getByText("Submit")).toBeVisible({
      timeout: 20_000,
    });
    await page.getByTestId("dropdown-btn").click();
  });

  test("should allow only valid input for threshold", async ({ page }) => {
    test.setTimeout(60_000);
    await page.getByRole("list").getByText("Number of votes").click();
    await fillInput(page, "20097292");
    await fillInput(page, "10.323");
    await fillInput(page, "werwr");
    await fillInput(page, "$&$^&%&");
    await page.getByTestId("dropdown-btn").click();
    await page.getByRole("list").getByText("Percentage of members").click();
    await fillInput(page, "3423");
    await fillInput(page, "13.123");
    await fillInput(page, "wqeqewq");
    await fillInput(page, "$&$^&%&");
  });

  test("should be able to update policy by fixed vote count", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const submitBtn = page.getByText("Submit");
    await page.getByRole("list").getByText("Number of votes").click();
    const thresholdInput = page.getByTestId("threshold-input");
    await thresholdInput.fill("20");
    await expect(page.getByText("Maximum members allowed is ")).toBeVisible();
    await expect(submitBtn).toBeDisabled();
    await thresholdInput.fill("2");
    await submitBtn.click();
    await expect(
      page.getByText(
        "Changing this setting will require 2 vote(s) to approve requests. You will no longer be able to approve requests with 1 vote(s)."
      )
    ).toBeVisible();
    await page.getByRole("button", { name: "Confirm" }).click();
    const updatedPolicy = {
      weight_kind: "RoleWeight",
      quorum: "0",
      threshold: "2",
    };

    expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: "Update Policy",
        kind: {
          ChangePolicy: {
            policy: getMockedPolicy(updatedPolicy, votePolicy, votePolicy),
          },
        },
      },
    });
    await checkForVoteApproveTxn(page);
  });

  test("should be able to update policy by percentage", async ({ page }) => {
    test.setTimeout(120_000);
    const submitBtn = page.getByText("Submit");
    await page.getByRole("list").getByText("Percentage of members").click();
    const thresholdInput = page.getByTestId("threshold-input");
    await thresholdInput.fill("101");
    await expect(
      page.getByText("Maximum percentage allowed is ")
    ).toBeVisible();
    await expect(submitBtn).toBeDisabled();
    await thresholdInput.fill("20");
    await expect(page.getByText("Warning!")).toBeVisible();
    await submitBtn.click();
    await expect(
      page.getByText(
        "Changing this setting will require 2 vote(s) to approve requests. You will no longer be able to approve requests with 1 vote(s)."
      )
    ).toBeVisible();
    await page.getByRole("button", { name: "Confirm" }).click();
    const updatedPolicy = {
      weight_kind: "RoleWeight",
      quorum: "0",
      threshold: [20, 100],
    };

    await expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: "Update Policy",
        kind: {
          ChangePolicy: {
            policy: getMockedPolicy(updatedPolicy, votePolicy, votePolicy),
          },
        },
      },
    });
    await checkForVoteApproveTxn(page);
  });
});
