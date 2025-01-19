import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

import { getTransactionModalObject } from "../../util/transaction.js";
import {
  getMockedPolicy,
  mockNearBalances,
  mockRpcRequest,
  updateDaoPolicyMembers,
} from "../../util/rpcmock.js";
import { InsufficientBalance, encodeToMarkdown } from "../../util/lib.js";

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

async function checkVotingDropdownChange({ page }) {
  await expect(
    page.getByText(
      "A percentage of the total group members must vote for a decision to pass"
    )
  ).toBeVisible();
  await expect(page.getByText("Enter Percentage")).toBeVisible();
  await page.getByTestId("dropdown-btn").click();
  await page.getByText("Number of votes").click();
  await expect(
    page.getByText(
      "A fixed number of votes is required for a decision to pass."
    )
  ).toBeVisible();
  await expect(page.getByText("Value")).toBeVisible();
}

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

async function navigateToThresholdPage({ page, instanceAccount }) {
  await page.goto(`/${instanceAccount}/widget/app?page=settings`);
  await page.waitForTimeout(5_000);
  await page.getByTestId("Voting Thresholds").click();
  await expect(page.getByText("Permission Groups")).toBeVisible({
    timeout: 10_000,
  });
}

test.describe("User is not logged in", function () {
  test.beforeEach(async ({ page, instanceAccount }) => {
    await updateDaoPolicyMembers({ page });
    await navigateToThresholdPage({ page, instanceAccount });
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
    await expect(page.getByText("Submit Request")).toBeHidden();
    await expect(page.getByTestId("threshold-input")).toBeDisabled();
  });
});

async function fillInput(page, value) {
  const submitBtn = page.getByText("Submit Request");
  const thresholdInput = page.getByTestId("threshold-input");
  await thresholdInput.type(value);
  expect(submitBtn).toBeVisible();
}

test.describe("User is logged in", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test.beforeEach(async ({ page, instanceAccount }, testInfo) => {
    await updateLastProposalId(page);
    await updateDaoPolicyMembers({ page });
    if (testInfo.title.includes("insufficient account balance")) {
      await mockNearBalances({
        page,
        accountId: "theori.near",
        balance: InsufficientBalance,
        storage: 8,
      });
    }
    await navigateToThresholdPage({ page, instanceAccount });
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
    await page.getByTestId("threshold-input").fill("1");
    await page
      .getByText("Submit Request", {
        exact: true,
      })
      .click();
    await expect(
      page
        .getByText("Please add more funds to your account and try again")
        .nth(1)
    ).toBeVisible();
  });

  test("should allow only valid input for threshold", async ({ page }) => {
    test.setTimeout(60_000);
    await page.getByTestId("dropdown-btn").click();
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
    test.setTimeout(150_000);
    const submitBtn = page.getByText("Submit Request");
    await page.getByTestId("dropdown-btn").click();
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
    await expect(page.getByText("Processing your request ...")).toBeVisible();
    const updatedPolicy = {
      weight_kind: "RoleWeight",
      quorum: "0",
      threshold: "2",
    };

    const description = {
      title: "Update policy - Voting Thresholds",
      summary: `theori.near requested to change voting threshold from 1 to 2.`,
    };
    expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: encodeToMarkdown(description),
        kind: {
          ChangePolicy: {
            policy: getMockedPolicy(updatedPolicy, votePolicy, votePolicy),
          },
        },
      },
    });
  });

  test("should be able to update policy by percentage", async ({ page }) => {
    test.setTimeout(150_000);
    const submitBtn = page.getByText("Submit Request");
    await page.getByTestId("dropdown-btn").click();
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
    await expect(page.getByText("Processing your request ...")).toBeVisible();

    const updatedPolicy = {
      weight_kind: "RoleWeight",
      quorum: "0",
      threshold: [20, 100],
    };

    const description = {
      title: "Update policy - Voting Thresholds",
      summary: `theori.near requested to change voting threshold from 1 to 2.`,
    };
    await expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: encodeToMarkdown(description),
        kind: {
          ChangePolicy: {
            policy: getMockedPolicy(updatedPolicy, votePolicy, votePolicy),
          },
        },
      },
    });
  });

  test("changing threshold should show correct dropdown label", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await checkVotingDropdownChange({ page });
  });

  test("cancel changed threshold should show correct dropdown label", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await checkVotingDropdownChange({ page });
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByText(
        "A percentage of the total group members must vote for a decision to pass"
      )
    ).toBeVisible();
    await expect(page.getByText("Enter Percentage")).toBeVisible();
  });
});
