import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

import {
  getTransactionModalObject,
  mockTransactionSubmitRPCResponses,
} from "../../util/transaction.js";
import { mockRpcRequest, updateDaoPolicyMembers } from "../../util/rpcmock.js";
import { getInstanceConfig } from "../../util/config.js";
import { mockInventory } from "../../util/inventory.js";

const lastProposalId = 3;

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
test.describe("admin connected", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test("should show members of the DAO", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await mockInventory({ page, account: daoAccount });
    await updateDaoPolicyMembers({ page });
    await page.goto(`/${instanceAccount}/widget/app?page=settings`);
    await expect(page.getByText("Megha", { exact: true })).toBeVisible();
  });

  test("should disable submit button and show error when incorrect account id is mentioned", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    await mockInventory({ page, account: daoAccount });
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    await page.goto(`/${instanceAccount}/widget/app?page=settings`);
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
  // TODO: add the check after form submission, the loader should disappear and the list should be visible
  test("should add new member and after submit, show in the member list", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await mockInventory({ page, account: daoAccount });
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    await page.goto(`/${instanceAccount}/widget/app?page=settings`);
    await updateDaoPolicyMembers({ page });
    await updateLastProposalId(page);
    const createMemberRequestButton = page.getByRole("button", {
      name: "New Member",
    });
    await expect(createMemberRequestButton).toBeVisible();
    await createMemberRequestButton.click();
    await expect(page.getByRole("heading", { name: "Add Member" })).toBeVisible(
      { timeout: 10_000 }
    );
    const accountInput = page.getByPlaceholder("treasury.near");
    accountInput.fill("testingaccount.near");

    await page.locator(".dropdown-toggle").first().click();

    await page.locator(".dropdown-item").first().click();

    await page
      .getByRole("button", { name: "Submit" })
      .scrollIntoViewIfNeeded({ timeout: 10_000 });
    await page.getByRole("button", { name: "Submit" }).click();
    expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: "Change policy",
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
                  permissions: [
                    "call:AddProposal",
                    "transfer:AddProposal",
                    "config:Finalize",
                  ],
                  vote_policy: {
                    transfer: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    bounty_done: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    add_bounty: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    policy: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    call: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    upgrade_self: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    config: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    set_vote_token: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    upgrade_remote: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    vote: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    add_member_to_role: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    remove_member_from_role: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
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
                  ],
                  vote_policy: {
                    upgrade_remote: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    upgrade_self: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    call: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    bounty_done: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    policy: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    config: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    add_member_to_role: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    set_vote_token: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    vote: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    transfer: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    add_bounty: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    remove_member_from_role: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
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
                    transfer: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    config: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    add_bounty: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    set_vote_token: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    upgrade_remote: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    add_member_to_role: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    upgrade_self: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    call: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    policy: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    remove_member_from_role: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    bounty_done: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    vote: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
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
    await checkForVoteApproveTxn(page);
    await page.getByRole("button", { name: "Confirm" }).click();
  });

  test("should update existing member permissions", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await mockInventory({ page, account: daoAccount });
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    await updateDaoPolicyMembers({ page });
    await updateLastProposalId(page);
    await page.goto(`/${instanceAccount}/widget/app?page=settings`);
    await page
      .getByRole("row", { name: "not defined Megha megha19.near" })
      .locator("i")
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Edit Member" })
    ).toBeVisible();
    await expect(
      page.getByText("Create Requests", { exact: true })
    ).toBeVisible();
    await page.locator("i").first().click();
    const submitBtn = page.getByRole("button", { name: "Submit" });
    await expect(submitBtn).toBeAttached({ timeout: 10_000 });
    await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await submitBtn.click();
    expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: "Change policy",
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
                  permissions: [
                    "call:AddProposal",
                    "transfer:AddProposal",
                    "config:Finalize",
                  ],
                  vote_policy: {
                    transfer: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    bounty_done: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    add_bounty: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    policy: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    call: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    upgrade_self: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    config: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    set_vote_token: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    upgrade_remote: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    vote: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    add_member_to_role: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    remove_member_from_role: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
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
                  ],
                  vote_policy: {
                    upgrade_remote: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    upgrade_self: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    call: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    bounty_done: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    policy: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    config: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    add_member_to_role: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    set_vote_token: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    vote: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    transfer: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    add_bounty: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    remove_member_from_role: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
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
                    transfer: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    config: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    add_bounty: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    set_vote_token: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    upgrade_remote: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    add_member_to_role: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    upgrade_self: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    call: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    policy: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    remove_member_from_role: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    bounty_done: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    vote: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
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
    await checkForVoteApproveTxn(page);
  });

  test("should delete existing member from DAO", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await mockInventory({ page, account: daoAccount });
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    await updateDaoPolicyMembers({ page });
    await updateLastProposalId(page);
    await page.goto(`/${instanceAccount}/widget/app?page=settings`);
    await page
      .getByRole("row", { name: "not defined Megha megha19.near" })
      .locator("i")
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Edit Member" })
    ).toBeVisible();
    await expect(
      page.getByText("Create Requests", { exact: true })
    ).toBeVisible();
    await page.getByRole("button", { name: " Delete" }).click();
    await expect(
      page.getByRole("heading", { name: "Are you sure?" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Remove" }).click();
    expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: "Remove Member",
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
                  permissions: [
                    "call:AddProposal",
                    "transfer:AddProposal",
                    "config:Finalize",
                  ],
                  vote_policy: {
                    transfer: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    bounty_done: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    add_bounty: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    policy: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    call: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    upgrade_self: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    config: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    set_vote_token: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    upgrade_remote: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    vote: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    add_member_to_role: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    remove_member_from_role: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
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
                  ],
                  vote_policy: {
                    upgrade_remote: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    upgrade_self: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    call: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    bounty_done: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    policy: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    config: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    add_member_to_role: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    set_vote_token: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    vote: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    transfer: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    add_bounty: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
                    remove_member_from_role: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [5, 100],
                    },
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
                    transfer: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    config: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    add_bounty: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    set_vote_token: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    upgrade_remote: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    add_member_to_role: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    upgrade_self: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    call: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    policy: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    remove_member_from_role: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    bounty_done: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
                    vote: {
                      weight_kind: "RoleWeight",
                      quorum: "0",
                      threshold: [6, 100],
                    },
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
    await checkForVoteApproveTxn(page);
  });
});
