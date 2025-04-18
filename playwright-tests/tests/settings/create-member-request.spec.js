import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

import {
  getTransactionModalObject,
  mockTransactionSubmitRPCResponses,
} from "../../util/transaction.js";
import {
  getNewPolicy,
  getOldPolicy,
  mockNearBalances,
  mockRpcRequest,
  updateDaoPolicyMembers,
} from "../../util/rpcmock.js";
import { mockInventory } from "../../util/inventory.js";
import { InsufficientBalance, encodeToMarkdown } from "../../util/lib.js";
import {
  CurrentTimestampInNanoseconds,
  SettingsMemberProposalData,
} from "../../util/inventory.js";

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

async function navigateToMembersPage({ page, instanceAccount }) {
  await page.goto(`/${instanceAccount}/widget/app?page=settings&tab=members`);
  await expect(page.getByText("All Members")).toBeVisible({ timeout: 10_000 });
}

async function openAddMemberForm({ page }) {
  await page.waitForTimeout(6_000);
  const createMemberRequestButton = page.getByRole("button", {
    name: "Add Member",
  });

  await expect(createMemberRequestButton).toBeVisible();
  await createMemberRequestButton.click();
  await expect(page.getByRole("heading", { name: "Add Member" })).toBeVisible({
    timeout: 10_000,
  });
}

async function mockSettingsProposals({ page }) {
  await mockRpcRequest({
    page,
    filterParams: { method_name: "get_proposals" },
    modifyOriginalResultFunction: () => {
      let originalResult = JSON.parse(
        JSON.stringify(SettingsMemberProposalData)
      );
      originalResult.submission_time = CurrentTimestampInNanoseconds;
      return originalResult;
    },
  });
}

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
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
      canManageMembers: true,
    },
  ];

  for (const { name, storageState, canManageMembers } of roles) {
    test.describe(`User with '${name}'`, function () {
      test.use({ storageState: storageState });

      test(`should ${
        canManageMembers ? "see" : "not see"
      } 'Add Member' and 'Actions'`, async ({ page, instanceAccount }) => {
        test.setTimeout(60_000);
        await updateDaoPolicyMembers({
          instanceAccount,
          page,
          hasAllRole: canManageMembers,
        });
        await navigateToMembersPage({ page, instanceAccount });

        const addMemberButton = page.getByRole("button", {
          name: "Add Member",
        });
        const actionsText = page.getByText("Actions", { exact: true });

        if (canManageMembers) {
          await expect(addMemberButton).toBeVisible();
          await expect(actionsText).toBeVisible();
        } else {
          await expect(addMemberButton).toBeHidden();
          await expect(actionsText).toBeHidden();
        }
      });
    });
  }
});

test.describe("User is logged in", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test.beforeEach(async ({ page, daoAccount, instanceAccount }, testInfo) => {
    await mockInventory({ page, account: daoAccount });
    await updateDaoPolicyMembers({ instanceAccount, page });
    await updateLastProposalId(page);
    if (testInfo.title.includes("insufficient account balance")) {
      await mockNearBalances({
        page,
        accountId: "theori.near",
        balance: InsufficientBalance,
        storage: 8,
      });
    }
    await navigateToMembersPage({ page, instanceAccount });
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
    await page.getByRole("button", { name: " Add Member" }).click();
    await expect(
      page
        .getByText("Please add more funds to your account and try again")
        .nth(1)
    ).toBeVisible();
  });

  test("should show members of the DAO", async ({ page }) => {
    test.setTimeout(60_000);
    await expect(page.getByText("Megha", { exact: true })).toBeVisible();
  });

  test("should disable submit button and show error when incorrect account id is mentioned", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    await mockInventory({ page, account: daoAccount });
    await navigateToMembersPage({ page, instanceAccount });
    await updateDaoPolicyMembers({ instanceAccount, page });
    const createMemberRequestButton = page.getByRole("button", {
      name: "Add Member",
    });
    await createMemberRequestButton.click();
    await expect(page.getByRole("heading", { name: "Add Member" })).toBeVisible(
      { timeout: 10_000 }
    );
    const submitBtn = page
      .locator(".offcanvas-body")
      .getByRole("button", { name: "Submit" });
    await expect(submitBtn).toBeAttached({ timeout: 10_000 });
    // Submit button should be disabled
    expect(await submitBtn.isDisabled()).toBe(true);
    // Add member name
    const accountInput = page.getByPlaceholder("treasury.near");
    await accountInput.fill("testingaccount.near");
    // Submit button should be disabled
    expect(await submitBtn.isDisabled()).toBe(true);
    // Add member role
    const permissionsSelect = page.locator(".dropdown-toggle").first();
    await expect(permissionsSelect).toBeVisible();
    await permissionsSelect.click();
    await page.locator(".dropdown-item").first().click();
    // Submit button should be enabled
    expect(await submitBtn.isEnabled()).toBe(true);
    // Change member name to incorrect account id example thomasguntenaar.nea without 'r'
    await accountInput.fill("thomasguntenaar.nea");
    await page.waitForTimeout(1000);
    // Submit button should be disabled & 'Please enter valid account ID' error should be visible
    expect(await submitBtn.isDisabled()).toBe(true);
    await expect(page.getByText("Please enter valid account ID")).toBeVisible();
    // Fill valid account id thomasguntenaar.near
    await accountInput.fill("testing.near");
    await page.waitForTimeout(1000);

    // Submit button should be enabled
    expect(await submitBtn.isDisabled()).toBe(false);
    // Remove any roles
    const roleBtn = page.getByText(
      instanceAccount.includes("testing") ? "Requestor" : "Create Requests",
      { exact: true }
    );
    const removeRoleBtn = roleBtn.locator("i").first();
    await removeRoleBtn.click();
    await page.waitForTimeout(1000);
    // Submit button should be disabled
    expect(await submitBtn.isDisabled()).toBe(true);
  });

  test("should add new member and after submit, show toast to view the request", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(120_000);
    const account = "testingaccount.near";
    const hasNewPolicy = instanceAccount.includes("testing");

    const permission = hasNewPolicy ? "Requestor" : "Create Requests";
    await openAddMemberForm({ page });

    const accountInput = page.getByPlaceholder("treasury.near");
    await accountInput.focus();
    accountInput.fill(account);
    await accountInput.blur();

    await page.locator(".dropdown-toggle", { hasText: "Select" }).click();
    await page.locator(".dropdown-item", { hasText: permission }).click();

    const submitBtn = await page.locator("button", { hasText: "Submit" });
    await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await submitBtn.click();
    await expect(
      page.getByText("Awaiting transaction confirmation...")
    ).toBeVisible();
    const description = {
      title: "Update policy - Members Permissions",
      summary: `theori.near requested to add "${account}" to "${permission}".`,
    };
    const commonParams = [
      votePolicy,
      votePolicy,
      votePolicy,
      [
        "theori.near",
        "2dada969f3743a4a41cfdb1a6e39581c2844ce8fbe25948700c85c598090b3e1",
        "freski.near",
        "thomasguntenaar.near",
        "petersalomonsen.near",
        "testingaccount.near",
      ],
    ];
    const updatedPolicy = hasNewPolicy
      ? getNewPolicy(...commonParams)
      : getOldPolicy(...commonParams);

    const expectedProposalObject = {
      description: encodeToMarkdown(description),
      kind: {
        ChangePolicy: {
          policy: updatedPolicy,
        },
      },
    };
    expect(await getTransactionModalObject(page)).toEqual({
      proposal: expectedProposalObject,
    });
    let isTransactionCompleted = false;
    let retryCountAfterComplete = 0;
    let newProposalId;
    await mockTransactionSubmitRPCResponses(
      page,
      /**
       * Handles RPC responses for mock transaction submission.
       *
       * @param {Object} options - The options for handling transaction submission.
       * @param {import('playwright').Route} options.route - The route of the transaction request (from Playwright).
       * @param {import('playwright').Request} options.request - The request object for the transaction (from Playwright).
       * @param {boolean} options.transaction_completed - Indicates if the transaction is completed.
       * @param {string} options.last_receiver_id - The ID of the last receiver in the transaction.
       * @param {import('playwright').Request} options.requestPostData - The post data associated with the request (from Playwright).
       * @returns {void} - No return value.
       */
      async ({ route, requestPostData }) => {
        if (
          isTransactionCompleted &&
          requestPostData.params &&
          requestPostData.params.method_name === "get_last_proposal_id"
        ) {
          console.log("get last proposal id");
          const response = await route.fetch();
          const json = await response.json();
          let result = JSON.parse(
            new TextDecoder().decode(new Uint8Array(json.result.result))
          );
          if (retryCountAfterComplete === 0) {
            result++;
            newProposalId = result;
          } else {
            retryCountAfterComplete++;
          }

          console.log("latest proposal id", result);
          json.result.result = Array.from(
            new TextEncoder().encode(JSON.stringify(result))
          );
          await route.fulfill({ response, json });
        } else if (
          isTransactionCompleted &&
          newProposalId &&
          requestPostData.params &&
          requestPostData.params.method_name === "get_proposal"
        ) {
          requestPostData.params.args_base64 = btoa(JSON.stringify({ id: 1 }));
          const response = await route.fetch({
            postData: JSON.stringify(requestPostData),
          });
          const json = await response.json();
          let result = JSON.parse(
            new TextDecoder().decode(new Uint8Array(json.result.result))
          );

          result = expectedProposalObject;
          result.id = newProposalId;

          json.result.result = Array.from(
            new TextEncoder().encode(JSON.stringify(result))
          );
          await route.fulfill({ response, json });
        } else if (
          isTransactionCompleted &&
          newProposalId &&
          requestPostData.params &&
          requestPostData.params.method_name === "get_policy"
        ) {
          const response = await route.fetch({
            postData: JSON.stringify(requestPostData),
          });
          const json = await response.json();
          let result = JSON.parse(
            new TextDecoder().decode(new Uint8Array(json.result.result))
          );
          const membersArray = result.roles[0].kind.Group;

          if (membersArray[membersArray.length - 1] !== account) {
            membersArray.push(account);
          }
          json.result.result = Array.from(
            new TextEncoder().encode(JSON.stringify(result))
          );
          await route.fulfill({ response, json });
        } else {
          await route.fallback();
        }
      }
    );

    await page.evaluate(async () => {
      const selector = await document.querySelector("near-social-viewer")
        .selectorPromise;
      const wallet = await selector.wallet();
      wallet.signAndSendTransaction = async (tx) => {
        window.transaction_completed = true;
      };
    });

    await page.getByRole("button", { name: "Confirm" }).click();

    console.log("waiting for tx to complete");
    while (!(await page.evaluate(() => window.transaction_completed))) {
      await page.waitForTimeout(100);
    }
    console.log("tx completed");
    isTransactionCompleted = true;

    while (!newProposalId) {
      await page.waitForTimeout(100);
    }

    await expect(await page.locator(".offcanvas-body")).not.toBeVisible();
    await expect(
      await page.getByText("New members policy request is submitted.")
    ).toBeVisible();
  });

  test("adding existing member to form should show warning", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(120_000);
    const hasNewPolicy = instanceAccount.includes("testing");
    const permission = hasNewPolicy ? "Requestor" : "Create Requests";
    await openAddMemberForm({ page });
    const accountInput = page.getByPlaceholder("treasury.near");
    await accountInput.focus();
    accountInput.fill("megha19.near");
    await accountInput.blur();
    const submitBtn = page.getByRole("button", { name: "Submit" });
    const cancelBtn = page.getByRole("button", { name: "Cancel" });
    await expect(submitBtn).toBeDisabled();
    await expect(cancelBtn).toBeDisabled();
    await expect(page.getByText("This user is already a member")).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
    await page.locator(".dropdown-toggle", { hasText: "Select" }).click();
    await page.locator(".dropdown-item", { hasText: permission }).click();
    await expect(submitBtn).toBeEnabled();
    await expect(cancelBtn).toBeEnabled();
  });

  test("should update existing member permissions", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(120_000);
    const account = "theori.near";
    const hasNewPolicy = instanceAccount.includes("testing");
    const permission = hasNewPolicy ? "Requestor" : "Create Requests";
    await page
      .getByRole("row", { name: `not defined Ori ${account}` })
      .locator("i")
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Edit Member" })
    ).toBeVisible();
    await expect(
      page.locator(".offcanvas-body").getByText(permission, { exact: true })
    ).toBeVisible();
    await expect(page.getByPlaceholder("treasury.near")).toBeDisabled();
    const submitBtn = page.getByRole("button", { name: "Submit" });
    const cancelBtn = page.getByRole("button", { name: "Cancel" });
    await expect(submitBtn).toBeDisabled();
    await expect(cancelBtn).toBeDisabled();
    await page.getByText(permission, { exact: true }).locator(".bi").click();

    await expect(submitBtn).toBeEnabled();
    await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await submitBtn.click();
    await expect(
      page.getByText("Awaiting transaction confirmation...")
    ).toBeVisible();
    const description = {
      title: "Update policy - Members Permissions",
      summary: `theori.near requested to remove "${account}" from "${permission}".`,
    };
    const commonParams = [
      votePolicy,
      votePolicy,
      votePolicy,
      [
        "2dada969f3743a4a41cfdb1a6e39581c2844ce8fbe25948700c85c598090b3e1",
        "freski.near",
        "thomasguntenaar.near",
        "petersalomonsen.near",
      ],
    ];
    const updatedPolicy = hasNewPolicy
      ? getNewPolicy(...commonParams)
      : getOldPolicy(...commonParams);

    expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: encodeToMarkdown(description),
        kind: {
          ChangePolicy: {
            policy: updatedPolicy,
          },
        },
      },
    });
  });

  test("should delete existing member from DAO", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(60_000);
    const hasNewPolicy = instanceAccount.includes("testing");

    await page
      .getByRole("row", { name: "not defined Ori theori.near" })
      .locator("i")
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Edit Member" })
    ).toBeVisible();
    await expect(
      page
        .locator(".offcanvas-body")
        .getByText(hasNewPolicy ? "Requestor" : "Create Requests", {
          exact: true,
        })
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(
      page.getByRole("heading", { name: "Are you sure?" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(
      page.getByText("Awaiting transaction confirmation...")
    ).toBeVisible();

    const description = {
      title: "Update policy - Members Permissions",
      summary: `theori.near requested to requested to revoke all permissions of "theori.near".`,
    };

    const commonParams = [
      votePolicy,
      votePolicy,
      votePolicy,
      [
        "2dada969f3743a4a41cfdb1a6e39581c2844ce8fbe25948700c85c598090b3e1",
        "freski.near",
        "thomasguntenaar.near",
        "petersalomonsen.near",
      ],
      ["petersalomonsen.near", "thomasguntenaar.near", "megha19.near"],
      [
        "petersalomonsen.near",
        "treasurytestuserledger.near",
        "tfdevhub.near",
        "thomasguntenaar.near",
        "test04.near",
        "test03.near",
        "test05.near",
      ],
    ];

    const updatedPolicy = hasNewPolicy
      ? getNewPolicy(...commonParams)
      : getOldPolicy(...commonParams);

    expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: encodeToMarkdown(description),
        kind: {
          ChangePolicy: {
            policy: updatedPolicy,
          },
        },
      },
    });
  });
  test("submit action should show transaction loader and handle cancellation correctly", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(100_000);
    const account = "testingaccount.near";
    const hasNewPolicy = instanceAccount.includes("testing");
    const permission = hasNewPolicy ? "Requestor" : "Create Requests";
    await openAddMemberForm({ page });
    const accountInput = page.getByPlaceholder("treasury.near");
    await accountInput.focus();
    accountInput.fill(account);
    await accountInput.blur();
    await page.locator(".dropdown-toggle", { hasText: "Select" }).click();
    await page.locator(".dropdown-item", { hasText: permission }).click();
    const submitBtn = await page.locator("button", { hasText: "Submit" });
    await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
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

  test("should show warning when adding member having non complete proposals", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(120_000);
    await mockSettingsProposals({ page });

    const account = "testingaccount.near";
    const hasNewPolicy = instanceAccount.includes("testing");

    const permission = hasNewPolicy ? "Requestor" : "Create Requests";
    await openAddMemberForm({ page });

    const accountInput = page.getByPlaceholder("treasury.near");
    await accountInput.focus();
    accountInput.fill(account);
    await accountInput.blur();

    await page.locator(".dropdown-toggle", { hasText: "Select" }).click();
    await page.locator(".dropdown-item", { hasText: permission }).click();

    const submitBtn = await page.locator("button", { hasText: "Submit" });
    await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await submitBtn.click();

    await expect(
      page.getByText(
        "This action will override your previous pending proposals. Complete exsisting one before creating a new to avoid conflicting or incomplete updates."
      )
    ).toBeVisible();

    const confirmBtn = await page.locator("button", {
      hasText: "Yes, proceed",
    });
    await confirmBtn.click();

    await expect(
      page.getByText("Awaiting transaction confirmation...")
    ).toBeVisible();
  });
});
