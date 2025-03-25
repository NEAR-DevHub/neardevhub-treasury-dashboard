import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

import { getTransactionModalObject } from "../../util/transaction.js";
import {
  getNewPolicy,
  getOldPolicy,
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
  await expect(page.getByTestId("threshold-value-label")).toBeVisible();
}

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

async function navigateToThresholdPage({ page, instanceAccount }) {
  await page.goto(
    `/${instanceAccount}/widget/app?page=settings&selectedTab=voting-thresholds`
  );
  await expect(page.getByText("Permission Groups")).toBeVisible({
    timeout: 10_000,
  });
}

test.describe("User is not logged in", function () {
  test.beforeEach(async ({ page, instanceAccount }) => {
    await updateDaoPolicyMembers({ instanceAccount, page });
    await navigateToThresholdPage({ page, instanceAccount });
  });

  test("should show members of different roles", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(60_000);
    const hasNewPolicy = instanceAccount.includes("testing");
    const groups = hasNewPolicy
      ? ["Approver", "Admin"]
      : ["Vote", "Manage Members"];
    await expect(page.getByText("Permission Groups")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(groups[0], { exact: true }).nth(0)).toBeVisible(
      {
        timeout: 20_000,
      }
    );
    await expect(page.getByText("Who Can Vote 8")).toBeVisible();
    await expect(page.getByText("Voting Policy")).toBeVisible();
    await expect(page.getByText("@test04.near", { exact: true })).toBeVisible();
    await page.getByText(groups[1], { exact: true }).click();
    await expect(
      page.getByText("@megha19.near", { exact: true })
    ).toBeVisible();
  });
});

test.describe.parallel("User logged in with different roles", function () {
  const roles = [
    {
      name: "Create role",
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin-with-create-role.json",
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

      test(`should ${
        hasAllRole ? "enable" : "disable"
      } input and hide submit button for ${
        hasAllRole ? "" : "non"
      } authorised people`, async ({ page, instanceAccount }) => {
        test.setTimeout(60_000);
        await updateDaoPolicyMembers({
          instanceAccount,
          page,
          hasAllRole: hasAllRole,
        });

        await navigateToThresholdPage({
          page,
          instanceAccount,
        });
        await expect(page.getByText("Permission Groups")).toBeVisible({
          timeout: 20_000,
        });
        const dropdownButton = page.getByTestId("dropdown-btn");
        const submitRequestButton = page.getByText("Submit Request");
        const thresholdInput = page.getByTestId("threshold-input");

        if (hasAllRole) {
          await expect(dropdownButton).toBeEnabled();
          await expect(submitRequestButton).toBeVisible();
          await expect(thresholdInput).toBeEnabled();
        } else {
          await expect(dropdownButton).toBeDisabled();
          await expect(submitRequestButton).toBeHidden();
          await expect(thresholdInput).toBeDisabled();
        }
      });
    });
  }
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
    if (
      testInfo.title.includes(
        "should show correct threshold with default policy"
      )
    ) {
      await updateDaoPolicyMembers({
        instanceAccount,
        page,
        isDefaultPolicy: true,
      });
    } else {
      await updateDaoPolicyMembers({ instanceAccount, page });
    }
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
    instanceAccount,
  }) => {
    const hasNewPolicy = instanceAccount.includes("testing");
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
    await expect(page.getByText("Required Vote(s) for Approval")).toBeVisible();
    await expect(page.getByText("Required Vote(s) for Approval")).toBeVisible();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(
      page.getByText("Awaiting transaction confirmation...")
    ).toBeVisible();
    const updatedPolicy = {
      weight_kind: "RoleWeight",
      quorum: "0",
      threshold: "2",
    };

    const description = {
      title: "Update policy - Voting Thresholds",
      summary: `theori.near requested to change voting threshold from 1 to 2.`,
    };

    const commonParams = [votePolicy, updatedPolicy, votePolicy];
    expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: encodeToMarkdown(description),
        kind: {
          ChangePolicy: {
            policy: hasNewPolicy
              ? getNewPolicy(...commonParams)
              : getOldPolicy(...commonParams),
          },
        },
      },
    });
  });

  test("should be able to update policy by percentage", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(150_000);
    const hasNewPolicy = instanceAccount.includes("testing");
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
    await expect(page.getByText("Confirm Your Change")).toBeVisible();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(
      page.getByText("Awaiting transaction confirmation...")
    ).toBeVisible();

    const updatedPolicy = {
      weight_kind: "RoleWeight",
      quorum: "0",
      threshold: [20, 100],
    };

    const description = {
      title: "Update policy - Voting Thresholds",
      summary: `theori.near requested to change voting threshold from 1 to 2.`,
    };
    const commonParams = [votePolicy, updatedPolicy, votePolicy];

    await expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: encodeToMarkdown(description),
        kind: {
          ChangePolicy: {
            policy: hasNewPolicy
              ? getNewPolicy(...commonParams)
              : getOldPolicy(...commonParams),
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

  test("should show minimum threshold 1 vote and percentage is 1", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    const submitBtn = page.getByText("Submit Request");
    // Number of votes
    await page.getByTestId("dropdown-btn").click();
    await page.getByRole("list").getByText("Number of votes").click();
    const thresholdInput = page.getByTestId("threshold-input");
    await thresholdInput.fill("1", { force: true });
    await thresholdInput.fill("0");

    await expect(page.getByText("At least 1 member is required.")).toBeVisible({
      timeout: 20_000,
    });
    await expect(submitBtn).toBeDisabled();
    // Percentage
    await page.getByTestId("dropdown-btn").click();
    await page.getByRole("list").getByText("Percentage of members").click();
    await thresholdInput.click();
    await page.waitForTimeout(200);
    await page.keyboard.down("Control");
    await page.keyboard.press("A");
    await page.keyboard.up("Control");
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(200);
    await thresholdInput.pressSequentially("0", { delay: 100 });
    await expect(
      page.getByText("The minimum allowed percentage is 1%.")
    ).toBeVisible({ timeout: 20_000 });
    await expect(submitBtn).toBeDisabled();
    await thresholdInput.fill("20");
    await expect(page.getByText("Warning!")).toBeVisible();
    await submitBtn.click();
    await expect(page.getByText("Confirm Your Change")).toBeVisible();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(
      page.getByText("Awaiting transaction confirmation...")
    ).toBeVisible();
  });

  test("submit action should show transaction loader and handle cancellation correctly", async ({
    page,
  }) => {
    test.setTimeout(100_000);
    const thresholdInput = page.getByTestId("threshold-input");
    await thresholdInput.fill("3");
    const submitBtn = page.getByRole("button", { name: "Submit Request" });
    await submitBtn.click();
    await page.getByRole("button", { name: "Confirm" }).click();
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

  test("should show correct threshold with default policy", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    const thresholdAmt = page.getByTestId("threshold-input");
    await expect(thresholdAmt).toHaveValue("50");
    await expect(
      page.getByText(
        "This is equivalent to 5 votes with the current number of members."
      )
    ).toBeVisible();
    await thresholdAmt.fill("20");
    await expect(
      page.getByText(
        "This is equivalent to 2 votes with the current number of members."
      )
    ).toBeVisible();
    await thresholdAmt.fill("90");
    await expect(
      page.getByText(
        "This is equivalent to 8 votes with the current number of members."
      )
    ).toBeVisible();
  });

  test("should toggle action buttons based on form changes", async ({
    page,
  }) => {
    test.setTimeout(150_000);

    // Reference action buttons
    const submitRequestButton = page.getByText("Submit Request");
    const cancelButton = page.getByRole("button", { name: "Cancel" });

    // Initially, both buttons should be disabled
    await expect(submitRequestButton).toBeDisabled();
    await expect(cancelButton).toBeDisabled();

    // Entering a value in the threshold input should enable the buttons
    const thresholdInput = page.getByTestId("threshold-input");
    await thresholdInput.fill("2");

    await expect(submitRequestButton).toBeEnabled();
    await expect(cancelButton).toBeEnabled();

    // Clicking the cancel button should reset the form and disable both buttons
    await cancelButton.click();
    await expect(submitRequestButton).toBeDisabled();
    await expect(cancelButton).toBeDisabled();
  });
});
