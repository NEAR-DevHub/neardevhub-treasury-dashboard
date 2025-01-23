import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

import {
  getTransactionModalObject,
  mockTransactionSubmitRPCResponses,
} from "../../util/transaction.js";
import {
  mockNearBalances,
  mockRpcRequest,
  updateDaoPolicyMembers,
} from "../../util/rpcmock.js";
import { mockInventory } from "../../util/inventory.js";
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

async function navigateToMembersPage({ page, instanceAccount }) {
  await page.goto(`/${instanceAccount}/widget/app?page=settings`);
  await page.waitForTimeout(5_000);
  await page.getByTestId("Members").click();
  await expect(page.getByText("All Members")).toBeVisible({ timeout: 10_000 });
}

async function openAddMemberForm({ page }) {
  const createMemberRequestButton = page.getByRole("button", {
    name: "New Member",
  });

  await expect(createMemberRequestButton).toBeVisible();
  await createMemberRequestButton.click();
  await expect(page.getByRole("heading", { name: "Add Member" })).toBeVisible({
    timeout: 10_000,
  });
}

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("User is not logged in", function () {
  test.beforeEach(async ({ page, instanceAccount }) => {
    await navigateToMembersPage({ page, instanceAccount });
  });

  test("should not be able to add member or see actions", async ({ page }) => {
    await expect(
      page.getByRole("button", {
        name: "New Member",
      })
    ).toBeHidden();
    await expect(page.getByText("Actions", { exact: true })).toBeHidden();
  });
});

test.describe("User is logged in", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test.beforeEach(async ({ page, daoAccount, instanceAccount }, testInfo) => {
    await mockInventory({ page, account: daoAccount });
    await updateDaoPolicyMembers({ page });
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
    await page.getByRole("button", { name: " New Member" }).click();
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
    await updateDaoPolicyMembers({ page });
    const createMemberRequestButton = page.getByRole("button", {
      name: "New Member",
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
    await accountInput.fill("thomasguntenaar.near");
    await page.waitForTimeout(1000);

    // Submit button should be enabled
    expect(await submitBtn.isDisabled()).toBe(false);
    // Remove any roles
    const roleBtn = page.getByText("Create Requests", { exact: true });
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
    const permission = "Create Requests";
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
    await expect(page.getByText("Processing your request ...")).toBeVisible();
    const description = {
      title: "Update policy - Members Permissions",
      summary: `theori.near requested to add "${account}" to "${permission}".`,
    };
    const expectedProposalObject = {
      description: encodeToMarkdown(description),
      kind: {
        ChangePolicy: {
          policy: {
            roles: [
              {
                name: "Create Requests",
                kind: {
                  Group: [
                    "theori.near",
                    "2dada969f3743a4a41cfdb1a6e39581c2844ce8fbe25948700c85c598090b3e1",
                    "freski.near",
                    "megha19.near",
                    "thomasguntenaar.near",
                    "petersalomonsen.near",
                    "testingaccount.near",
                  ],
                },
                permissions: ["call:AddProposal", "transfer:AddProposal"],
                vote_policy: {
                  upgrade_remote: votePolicy,
                  upgrade_self: votePolicy,
                  call: votePolicy,
                  bounty_done: votePolicy,
                  policy: votePolicy,
                  config: votePolicy,
                  add_member_to_role: votePolicy,
                  set_vote_token: votePolicy,
                  vote: votePolicy,
                  transfer: votePolicy,
                  add_bounty: votePolicy,
                  remove_member_from_role: votePolicy,
                },
              },
              {
                name: "Manage Members",
                kind: {
                  Group: [
                    "petersalomonsen.near",
                    "thomasguntenaar.near",
                    "theori.near",
                    "megha19.near",
                  ],
                },
                permissions: [
                  "config:*",
                  "policy:*",
                  "add_member_to_role:*",
                  "remove_member_from_role:*",
                  "upgrade_self:*",
                  "upgrade_remote:*",
                  "set_vote_token:*",
                  "add_bounty:*",
                  "bounty_done:*",
                  "factory_info_update:*",
                  "policy_add_or_update_role:*",
                  "policy_remove_role:*",
                  "policy_update_default_vote_policy:*",
                  "policy_update_parameters:*",
                ],
                vote_policy: {
                  upgrade_remote: votePolicy,
                  upgrade_self: votePolicy,
                  call: votePolicy,
                  bounty_done: votePolicy,
                  policy: votePolicy,
                  config: votePolicy,
                  add_member_to_role: votePolicy,
                  set_vote_token: votePolicy,
                  vote: votePolicy,
                  transfer: votePolicy,
                  add_bounty: votePolicy,
                  remove_member_from_role: votePolicy,
                },
              },
              {
                name: "Vote",
                kind: {
                  Group: [
                    "megha19.near",
                    "petersalomonsen.near",
                    "treasurytestuserledger.near",
                    "tfdevhub.near",
                    "theori.near",
                    "thomasguntenaar.near",
                    "test04.near",
                    "test03.near",
                    "test05.near",
                  ],
                },
                permissions: [
                  "*:VoteReject",
                  "*:VoteApprove",
                  "*:VoteRemove",
                  "*:RemoveProposal",
                  "*:Finalize",
                ],
                vote_policy: {
                  transfer: votePolicy,
                  config: votePolicy,
                  add_bounty: votePolicy,
                  set_vote_token: votePolicy,
                  upgrade_remote: votePolicy,
                  add_member_to_role: votePolicy,
                  upgrade_self: votePolicy,
                  call: votePolicy,
                  policy: votePolicy,
                  remove_member_from_role: votePolicy,
                  bounty_done: votePolicy,
                  vote: votePolicy,
                },
              },
            ],
            default_vote_policy: {
              weight_kind: "RoleWeight",
              quorum: "0",
              threshold: [1, 2],
            },
            proposal_bond: "0",
            proposal_period: "604800000000000",
            bounty_bond: "100000000000000000000000",
            bounty_forgiveness_period: "604800000000000",
          },
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
  }) => {
    test.setTimeout(120_000);
    await openAddMemberForm({ page });
    const accountInput = page.getByPlaceholder("treasury.near");
    await accountInput.focus();
    accountInput.fill("megha19.near");
    await accountInput.blur();
    await expect(page.getByText("This user is already a member")).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
  });

  test("should update existing member permissions", async ({ page }) => {
    test.setTimeout(120_000);
    const account = "megha19.near";
    const permission = "Create Requests";
    await page
      .getByRole("row", { name: `not defined Megha ${account}` })
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
    await page
      .getByText("Create Requests", { exact: true })
      .locator(".bi")
      .click();

    const submitBtn = page.getByRole("button", { name: "Submit" });
    await expect(submitBtn).toBeAttached({ timeout: 10_000 });
    await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await submitBtn.click();
    await expect(page.getByText("Processing your request ...")).toBeVisible();
    const description = {
      title: "Update policy - Members Permissions",
      summary: `theori.near requested to remove "${account}" from "${permission}".`,
    };
    expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: encodeToMarkdown(description),
        kind: {
          ChangePolicy: {
            policy: {
              roles: [
                {
                  name: "Create Requests",
                  kind: {
                    Group: [
                      "theori.near",
                      "2dada969f3743a4a41cfdb1a6e39581c2844ce8fbe25948700c85c598090b3e1",
                      "freski.near",
                      "thomasguntenaar.near",
                      "petersalomonsen.near",
                    ],
                  },
                  permissions: ["call:AddProposal", "transfer:AddProposal"],
                  vote_policy: {
                    transfer: votePolicy,
                    bounty_done: votePolicy,
                    add_bounty: votePolicy,
                    policy: votePolicy,
                    call: votePolicy,
                    upgrade_self: votePolicy,
                    config: votePolicy,
                    set_vote_token: votePolicy,
                    upgrade_remote: votePolicy,
                    vote: votePolicy,
                    add_member_to_role: votePolicy,
                    remove_member_from_role: votePolicy,
                  },
                },
                {
                  name: "Manage Members",
                  kind: {
                    Group: [
                      "petersalomonsen.near",
                      "thomasguntenaar.near",
                      "theori.near",
                      "megha19.near",
                    ],
                  },
                  permissions: [
                    "config:*",
                    "policy:*",
                    "add_member_to_role:*",
                    "remove_member_from_role:*",
                    "upgrade_self:*",
                    "upgrade_remote:*",
                    "set_vote_token:*",
                    "add_bounty:*",
                    "bounty_done:*",
                    "factory_info_update:*",
                    "policy_add_or_update_role:*",
                    "policy_remove_role:*",
                    "policy_update_default_vote_policy:*",
                    "policy_update_parameters:*",
                  ],
                  vote_policy: {
                    upgrade_remote: votePolicy,
                    upgrade_self: votePolicy,
                    call: votePolicy,
                    bounty_done: votePolicy,
                    policy: votePolicy,
                    config: votePolicy,
                    add_member_to_role: votePolicy,
                    set_vote_token: votePolicy,
                    vote: votePolicy,
                    transfer: votePolicy,
                    add_bounty: votePolicy,
                    remove_member_from_role: votePolicy,
                  },
                },
                {
                  name: "Vote",
                  kind: {
                    Group: [
                      "megha19.near",
                      "petersalomonsen.near",
                      "treasurytestuserledger.near",
                      "tfdevhub.near",
                      "theori.near",
                      "thomasguntenaar.near",
                      "test04.near",
                      "test03.near",
                      "test05.near",
                    ],
                  },
                  permissions: [
                    "*:VoteReject",
                    "*:VoteApprove",
                    "*:VoteRemove",
                  ],
                  vote_policy: {
                    transfer: votePolicy,
                    config: votePolicy,
                    add_bounty: votePolicy,
                    set_vote_token: votePolicy,
                    upgrade_remote: votePolicy,
                    add_member_to_role: votePolicy,
                    upgrade_self: votePolicy,
                    call: votePolicy,
                    policy: votePolicy,
                    remove_member_from_role: votePolicy,
                    bounty_done: votePolicy,
                    vote: votePolicy,
                  },
                },
              ],
              default_vote_policy: {
                weight_kind: "RoleWeight",
                quorum: "0",
                threshold: [1, 2],
              },
              proposal_bond: "0",
              proposal_period: "604800000000000",
              bounty_bond: "100000000000000000000000",
              bounty_forgiveness_period: "604800000000000",
            },
          },
        },
      },
    });
  });

  test("should delete existing member from DAO", async ({ page }) => {
    test.setTimeout(60_000);
    await page
      .getByRole("row", { name: "not defined Megha megha19.near" })
      .locator("i")
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Edit Member" })
    ).toBeVisible();
    await expect(
      page
        .locator(".offcanvas-body")
        .getByText("Create Requests", { exact: true })
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(
      page.getByRole("heading", { name: "Are you sure?" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("Processing your request ...")).toBeVisible();

    const description = {
      title: "Update policy - Members Permissions",
      summary: `theori.near requested to requested to revoke all permissions of "megha19.near".`,
    };
    expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: encodeToMarkdown(description),
        kind: {
          ChangePolicy: {
            policy: {
              roles: [
                {
                  name: "Create Requests",
                  kind: {
                    Group: [
                      "theori.near",
                      "2dada969f3743a4a41cfdb1a6e39581c2844ce8fbe25948700c85c598090b3e1",
                      "freski.near",
                      "thomasguntenaar.near",
                      "petersalomonsen.near",
                    ],
                  },
                  permissions: ["call:AddProposal", "transfer:AddProposal"],
                  vote_policy: {
                    transfer: votePolicy,
                    bounty_done: votePolicy,
                    add_bounty: votePolicy,
                    policy: votePolicy,
                    call: votePolicy,
                    upgrade_self: votePolicy,
                    config: votePolicy,
                    set_vote_token: votePolicy,
                    upgrade_remote: votePolicy,
                    vote: votePolicy,
                    add_member_to_role: votePolicy,
                    remove_member_from_role: votePolicy,
                  },
                },
                {
                  name: "Manage Members",
                  kind: {
                    Group: [
                      "petersalomonsen.near",
                      "thomasguntenaar.near",
                      "theori.near",
                    ],
                  },
                  permissions: [
                    "config:*",
                    "policy:*",
                    "add_member_to_role:*",
                    "remove_member_from_role:*",
                    "upgrade_self:*",
                    "upgrade_remote:*",
                    "set_vote_token:*",
                    "add_bounty:*",
                    "bounty_done:*",
                    "factory_info_update:*",
                    "policy_add_or_update_role:*",
                    "policy_remove_role:*",
                    "policy_update_default_vote_policy:*",
                    "policy_update_parameters:*",
                  ],
                  vote_policy: {
                    upgrade_remote: votePolicy,
                    upgrade_self: votePolicy,
                    call: votePolicy,
                    bounty_done: votePolicy,
                    policy: votePolicy,
                    config: votePolicy,
                    add_member_to_role: votePolicy,
                    set_vote_token: votePolicy,
                    vote: votePolicy,
                    transfer: votePolicy,
                    add_bounty: votePolicy,
                    remove_member_from_role: votePolicy,
                  },
                },
                {
                  name: "Vote",
                  kind: {
                    Group: [
                      "petersalomonsen.near",
                      "treasurytestuserledger.near",
                      "tfdevhub.near",
                      "theori.near",
                      "thomasguntenaar.near",
                      "test04.near",
                      "test03.near",
                      "test05.near",
                    ],
                  },
                  permissions: [
                    "*:VoteReject",
                    "*:VoteApprove",
                    "*:VoteRemove",
                  ],
                  vote_policy: {
                    transfer: votePolicy,
                    config: votePolicy,
                    add_bounty: votePolicy,
                    set_vote_token: votePolicy,
                    upgrade_remote: votePolicy,
                    add_member_to_role: votePolicy,
                    upgrade_self: votePolicy,
                    call: votePolicy,
                    policy: votePolicy,
                    remove_member_from_role: votePolicy,
                    bounty_done: votePolicy,
                    vote: votePolicy,
                  },
                },
              ],
              default_vote_policy: {
                weight_kind: "RoleWeight",
                quorum: "0",
                threshold: [1, 2],
              },
              proposal_bond: "0",
              proposal_period: "604800000000000",
              bounty_bond: "100000000000000000000000",
              bounty_forgiveness_period: "604800000000000",
            },
          },
        },
      },
    });
  });
});
