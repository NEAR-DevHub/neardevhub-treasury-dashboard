import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

import {
  mockNearBalances,
  updateDaoPolicyMembers,
} from "../../util/rpcmock.js";
import { InsufficientBalance, encodeToMarkdown } from "../../util/lib.js";
import { Worker } from "near-workspaces";
import nearApi from "near-api-js";
import { redirectWeb4 } from "../../util/web4";
import {
  setPageAuthSettings,
  SPUTNIK_DAO_FACTORY_ID,
} from "../../util/sandboxrpc";

async function setupWorker({ daoAccount, instanceAccount, page, isNearnCall }) {
  const daoName = daoAccount.split("." + SPUTNIK_DAO_FACTORY_ID)?.[0];
  const socialNearContractId = "social.near";

  const worker = await Worker.init();

  // Import factory at the time infinex was created
  const factoryContract = await worker.rootAccount.importContract({
    mainnetContract: SPUTNIK_DAO_FACTORY_ID,
  });

  await factoryContract.call(
    SPUTNIK_DAO_FACTORY_ID,
    "new",
    {},
    { gas: 300_000_000_000_000 }
  );

  const creatorAccount = await worker.rootAccount.importContract({
    mainnetContract: "megha19.near",
  });

  const userAccount = await worker.rootAccount.importContract({
    mainnetContract: "theori.near",
  });

  const userAccount2 = await worker.rootAccount.importContract({
    mainnetContract: "peter.near",
  });

  const userAccount3 = await worker.rootAccount.importContract({
    mainnetContract: "frol.near",
  });

  const isInfinex = daoAccount.includes("infinex");
  const create_args = {
    name: daoName,
    args: Buffer.from(
      JSON.stringify({
        purpose: daoName,
        bond: "100000000000000000000000",
        vote_period: "604800000000000",
        grace_period: "86400000000000",
        policy: {
          roles: isInfinex
            ? [
                {
                  name: "Requestor",
                  kind: {
                    Group: [
                      creatorAccount.accountId,
                      userAccount.accountId,
                      userAccount2.accountId,
                      userAccount3.accountId,
                    ],
                  },
                  permissions: ["transfer:AddProposal", "call:AddProposal"],
                  vote_policy: {},
                },
                {
                  name: "Admin",
                  kind: {
                    Group: [
                      userAccount.accountId,
                      userAccount2.accountId,
                      userAccount3.accountId,
                    ],
                  },
                  permissions: [
                    "remove_member_from_role:*",
                    "add_member_to_role:*",
                    "config:*",
                    "policy:*",
                  ],
                  vote_policy: {},
                },
                {
                  name: "Approver",
                  kind: {
                    Group: [userAccount.accountId, userAccount3.accountId],
                  },
                  permissions: [
                    "*:VoteApprove",
                    "*:VoteReject",
                    "*:VoteRemove",
                  ],
                  vote_policy: {},
                },
              ]
            : [
                {
                  name: "council",
                  kind: {
                    Group: [
                      creatorAccount.accountId,
                      userAccount.accountId,
                      userAccount2.accountId,
                      userAccount3.accountId,
                    ],
                  },
                  permissions: ["*:*"],
                  vote_policy: {},
                },
              ],
          default_vote_policy: {
            weight_kind: "RoleWeight",
            quorum: "0",
            threshold: [1, 3],
          },
          proposal_bond: "0",
          proposal_period: "604800000000000",
          bounty_bond: "100000000000000000000000",
          bounty_forgiveness_period: "604800000000000",
        },
        config: {
          purpose: "",
          name: daoName,
          metadata:
            "eyJzb3VsQm91bmRUb2tlbklzc3VlciI6IiIsImxpbmtzIjpbImh0dHBzOi8vaW5maW5leC54eXovIl0sImZsYWdDb3ZlciI6Imh0dHBzOi8vaXBmcy5uZWFyLnNvY2lhbC9pcGZzL2JhZnliZWlhd3c0am9zcDdzcWh0dGVjdGJnMzZmczJpcGp3Y25kMmpzeXNkcnh4N3NqeTRkdjNnd3BxIiwiZmxhZ0xvZ28iOiJodHRwczovL2lwZnMubmVhci5zb2NpYWwvaXBmcy9iYWZrcmVpaHB6Znk3am9lc3N1dGVsZnZ0MjZxcXJkeng3M3NoaHZvZGVoMnkyN3N2dmlqbGVtZGd5bSIsImRpc3BsYXlOYW1lIjoiSW5maW5leCIsImxlZ2FsIjp7ImxlZ2FsU3RhdHVzIjoiIiwibGVnYWxMaW5rIjoiIn19",
        },
      })
    ).toString("base64"),
  };
  await creatorAccount.call(SPUTNIK_DAO_FACTORY_ID, "create", create_args, {
    gas: 300_000_000_000_000,
    attachedDeposit: nearApi.utils.format.parseNearAmount("6"),
  });
  await worker.rootAccount.importContract({ mainnetContract: instanceAccount });

  const socialNear = await worker.rootAccount.importContract({
    mainnetContract: socialNearContractId,
  });
  await socialNear.call(socialNearContractId, "new", {});
  await socialNear.call(socialNearContractId, "set_status", { status: "Live" });
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    sandboxNodeUrl: worker.provider.connection.url,
  });
  await page.goto(
    `https://${instanceAccount}.page/?page=settings&tab=members` +
      (isNearnCall
        ? `&member=nearn-io.near&permissions=${
            isInfinex ? "requestor" : "council"
          }`
        : "")
  );
  await setPageAuthSettings(
    page,
    userAccount.accountId,
    await userAccount.getKey()
  );
  return {};
}

async function navigateToMembersPage({ page, instanceAccount }) {
  await page.goto(`/${instanceAccount}/widget/app?page=settings&tab=members`);
  await expect(page.getByText("All Members")).toBeVisible({ timeout: 20_000 });
}

async function openAddMemberForm({ page }) {
  await page.waitForTimeout(6_000);
  const createMemberRequestButton = page.getByRole("button", {
    name: " Add Members",
  });
  await expect(createMemberRequestButton).toBeVisible();
  await createMemberRequestButton.click();
  await expect(page.getByRole("heading", { name: "Add Members" })).toBeVisible({
    timeout: 10_000,
  });
}

async function submitProposal({ page, isEdit }) {
  await expect(page.getByText("Confirm transaction")).toBeVisible();
  await page.waitForTimeout(2_000);
  await page
    .getByRole("button", { name: "Confirm" })
    .nth(isEdit ? 1 : 0)
    .click();

  await expect(page.getByText("Awaiting transaction")).not.toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Your request has been submitted.")).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("link", { name: "View it" }).click();
  await page.waitForTimeout(10_000);
}

test.describe("User is logged in", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test("insufficient account balance should show warning modal, disallow action ", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(100_000);
    await updateDaoPolicyMembers({ instanceAccount, page });
    await mockNearBalances({
      page,
      accountId: "theori.near",
      balance: InsufficientBalance,
      storage: 8,
    });
    await navigateToMembersPage({ page, instanceAccount });
    await expect(
      page.getByText(
        "Hey Ori, you don't have enough NEAR to complete actions on your treasury."
      )
    ).toBeVisible();
    await page.getByRole("button", { name: " Add Members" }).click();
    await expect(
      page
        .getByText("Please add more funds to your account and try again")
        .nth(1)
    ).toBeVisible();
    await page
      .getByRole("heading", { name: " Insufficient Funds " })
      .locator("i")
      .nth(1)
      .click();
    await page.getByRole("switch").nth(0).click();
    await expect(page.getByRole("switch").nth(1)).toBeChecked();
    const editBtn = page.getByRole("button", { name: "Edit" });
    await editBtn.click();
    await expect(
      page
        .getByText("Please add more funds to your account and try again")
        .nth(1)
    ).toBeVisible();
  });

  test("Add multiple members with permissions and validate errors", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    test.setTimeout(150_000);
    const {} = await setupWorker({ daoAccount, instanceAccount, page });
    await openAddMemberForm({ page });

    const iframe = page.locator("iframe").contentFrame();

    await expect(iframe.getByText("Member #5")).toBeVisible();
    await expect(iframe.locator("#member-0")).toBeVisible();

    const usernameInput = iframe.getByPlaceholder("treasury.near");
    await usernameInput.fill("megha19.near");

    const addButton = iframe.getByRole("button", {
      name: "+ Add Another Member",
    });
    const submitButton = iframe.getByRole("button", { name: "Submit" });

    const accountError = iframe.locator("#accountError-0");
    await expect(accountError).toHaveClass(/d-none/);

    await expect(addButton).toBeEnabled();
    await expect(submitButton).toBeEnabled();

    if (daoAccount.includes("infinex")) {
      await iframe.getByText("Add Permission").click();

      await expect(
        iframe.locator("#dropdownMenu-0 .dropdown-item")
      ).toHaveCount(3);
      await expect(
        iframe.locator("#dropdownMenu-0").getByText("Requestor")
      ).toBeVisible();
      await expect(
        iframe.locator("#dropdownMenu-0").getByText("Approver")
      ).toBeVisible();
      await expect(
        iframe.locator("#dropdownMenu-0").getByText("Admin")
      ).toBeVisible();

      await iframe.locator("#dropdownMenu-0 .dropdown-item").first().click();

      await expect(
        iframe.locator("#selectedRoles-0").getByText("Requestor")
      ).toBeVisible();

      await iframe.getByText("Add Permission").click();
      await expect(
        iframe.locator("#dropdownMenu-0 .dropdown-item")
      ).toHaveCount(2);
      await expect(
        iframe.locator("#dropdownMenu-0").getByText("Requestor")
      ).not.toBeVisible();

      await iframe.locator("#dropdownMenu-0 .dropdown-item").first().click();

      await expect(
        iframe.locator("#selectedRoles-0").getByText("Requestor")
      ).toBeVisible();
      await expect(
        iframe.locator("#selectedRoles-0").getByText("Approver")
      ).toBeVisible();

      await iframe.getByText("Add Permission").click();
      await expect(
        iframe.locator("#dropdownMenu-0 .dropdown-item")
      ).toHaveCount(1);
      await expect(
        iframe.locator("#dropdownMenu-0").getByText("Requestor")
      ).not.toBeVisible();
      await expect(
        iframe.locator("#dropdownMenu-0").getByText("Approver")
      ).not.toBeVisible();

      await iframe.locator("#dropdownMenu-0 .dropdown-item").first().click();

      await expect(
        iframe.locator("#selectedRoles-0").getByText("Requestor")
      ).toBeVisible();
      await expect(
        iframe.locator("#selectedRoles-0").getByText("Approver")
      ).toBeVisible();
      await expect(
        iframe.locator("#selectedRoles-0").getByText("Admin")
      ).toBeVisible();

      await expect(iframe.getByText("Add Permission")).toHaveClass(/d-none/);

      await iframe
        .locator("#selectedRoles-0")
        .getByText("Requestor")
        .locator("i")
        .click();
      await expect(iframe.getByText("Add Permission")).not.toHaveClass(
        /d-none/
      );
    } else {
      await iframe.getByText("Add Permission").click();
      await iframe.locator(".dropdown-item").first().click();
      await expect(
        iframe.locator("#selectedRoles-0").getByText("council")
      ).toBeVisible();
      await expect(iframe.getByText("Add Permission")).toHaveClass(/d-none/);
    }

    await addButton.click();
    await expect(iframe.getByText("Member #6")).toBeVisible();

    const usernameInputs = iframe.getByPlaceholder("treasury.near");
    await usernameInputs.nth(1).fill("member1.near");

    await iframe.getByText("Add Permission").nth(1).click();
    await iframe.locator("#dropdownMenu-1 .dropdown-item").nth(0).click();

    await addButton.click();
    await expect(iframe.getByText("Member #7")).toBeVisible();
    await expect(iframe.locator("#member-2")).toBeVisible();
    await iframe.locator("#accountInput-2").scrollIntoViewIfNeeded();
    await iframe.locator("#accountInput-2").fill("member3.near");
    await iframe.getByText("Add Permission").nth(2).click();
    await iframe.locator("#dropdownMenu-2 .dropdown-item").nth(0).click();

    // Remove member and verify renumbering
    await iframe.locator("#member-1 i").first().click();
    await expect(iframe.locator("#member-1")).toHaveCSS("display", "none");
    await expect(iframe.locator("#memberLabel-2")).toHaveText("Member #6");
    await expect(iframe.locator("#member-2")).toBeVisible();

    await expect(iframe.locator("#memberLabel-0")).toHaveText("Member #5");
    await expect(iframe.locator("#memberLabel-2")).toHaveText("Member #6");
    await expect(iframe.locator("#member-0")).toBeVisible();
    await expect(iframe.locator("#member-2")).toBeVisible();

    // Add another member after removal
    await addButton.click();
    await expect(iframe.locator("#memberLabel-3")).toHaveText("Member #7");
    await expect(iframe.locator("#member-3")).toBeVisible();
    await iframe.locator("#accountInput-3").fill("member3.near");
    await iframe.locator("#selectTag-3").click();
    await iframe.locator("#dropdownMenu-3 .dropdown-item").nth(0).click();

    await addButton.click();
    // Submit and verify errors appear only on submit
    await submitButton.click();

    await expect(
      iframe.getByText("This account is already a member.")
    ).toHaveCount(2);
    await expect(
      iframe.getByText("This account is already added above.")
    ).toHaveCount(2);
    await expect(
      iframe.getByText("Username and Permissions are missing.")
    ).toBeVisible();
    const bottomError = iframe.locator("#rolesError");
    await expect(bottomError).toBeVisible();
    await expect(
      bottomError.getByText(
        "Please complete all member details before proceeding"
      )
    ).toBeVisible();

    // Fix the errors
    await iframe.locator("#accountInput-0").fill("testmember1.near");
    await iframe.locator("#accountInput-2").fill("testmember2.near");
    await iframe.locator("#member-3 i").first().click();
    await iframe.locator("#member-4 i").first().click();

    await submitButton.click();

    await submitProposal({ page });

    await expect(
      page.getByRole("heading", { name: "Update Policy - Add New Members" })
    ).toBeVisible();
    await expect(page.getByText("@testmember1.near")).toBeVisible();
    await expect(page.getByText("@testmember2.near")).toBeVisible();
    await expect(page.getByText("Assigned Roles")).toHaveCount(2);
  });

  test("Edit multiple members with permissions and validate errors", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    test.setTimeout(150_000);
    const {} = await setupWorker({ daoAccount, instanceAccount, page });
    await page.waitForTimeout(5_000);
    const topCheckbox = page.getByRole("switch").first();
    await expect(topCheckbox).not.toBeChecked();

    // select all by clicking top checkbox
    await topCheckbox.click();
    await expect(topCheckbox).toBeChecked();

    // Verify all individual checkboxes are checked
    const memberCheckboxes = page.locator('.member-row [role="switch"]');
    const checkboxCount = await memberCheckboxes.count();
    for (let i = 0; i < checkboxCount; i++) {
      await expect(memberCheckboxes.nth(i)).toBeChecked();
    }

    // Deselect all by clicking top checkbox again
    await topCheckbox.click();
    await expect(topCheckbox).not.toBeChecked();

    for (let i = 0; i < checkboxCount; i++) {
      await expect(memberCheckboxes.nth(i)).not.toBeChecked();
    }

    await topCheckbox.click();

    // Partial selection - deselect first 2 members
    await memberCheckboxes.nth(0).click();
    await memberCheckboxes.nth(1).click();

    // Top checkbox should be indeterminate (not checked, not unchecked)
    await expect(topCheckbox).not.toBeChecked();

    // Select all remaining members to make top checkbox checked
    await topCheckbox.click();
    await topCheckbox.click();

    const editBtn = page.getByRole("button", { name: "Edit" });
    const deleteBtn = page.getByRole("button", { name: "Delete" });
    await expect(editBtn).toBeVisible();
    await expect(deleteBtn).toBeVisible();
    await editBtn.click();
    await expect(
      page.getByRole("heading", { name: "Edit Members" })
    ).toBeVisible({
      timeout: 10_000,
    });
    const iframe = page.locator("iframe").contentFrame();
    const submitButton = iframe.getByRole("button", { name: "Submit" });
    await submitButton.scrollIntoViewIfNeeded();
    await expect(submitButton).toBeEnabled({ timeout: 20_000 });
    const account = iframe.getByText("@theori.near");
    await expect(account).toBeVisible();
    const role = daoAccount.includes("infinex") ? "Requestor" : "council";

    // Remove all roles and verify submit button remains enabled
    const deleteIcons = iframe
      .locator('[id^="selectedRoles-"] div')
      .filter({ hasText: role })
      .locator("i");

    const count = await deleteIcons.count();

    for (let i = 0; i < count; i++) {
      await deleteIcons.nth(0).click();
    }

    // Verify errors do NOT appear until submit
    const rolesError = iframe.locator("#roleError-1");
    await expect(rolesError).toHaveClass(/d-none/);

    const bottomError = iframe.locator("#rolesError");
    await expect(bottomError).toHaveClass(/d-none/);

    //  Submit and verify errors appear
    await submitButton.click();

    await expect(
      rolesError.getByText("You must assign at least one role.")
    ).toBeVisible();
    await expect(bottomError).toBeVisible();
    await expect(
      iframe.getByText(
        `You must assign at least one member with the ${role} role.`
      )
    ).toBeVisible();

    if (daoAccount.includes("infinex")) {
      // Add role back using "Add Permission" and verify errors disappear
      await iframe.locator("#selectTag-1").click();
      await iframe.locator("#dropdownMenu-1 .dropdown-item").first().click();
      await submitButton.click();
      await page.getByRole("button", { name: "Cancel" }).click();
      await page.getByRole("button", { name: "Yes" }).click();
      await expect(page.locator(".offcanvas-body")).not.toBeVisible();

      // Test edit using hover for individual member
      const memberRow = page.locator(".member-row").first();
      await memberRow.hover();
      const editIcon = memberRow.locator(".action-btn.edit i.bi-pencil");
      await editIcon.click();
      await iframe.getByText(role).locator("i").nth(0).click();
      await submitButton.click();
      await expect(
        page.getByRole("cell", { name: "Current Roles" })
      ).toBeVisible();
      await expect(page.getByRole("cell", { name: "New Roles" })).toBeVisible();
      await expect(
        page.getByRole("cell", { name: "Requestor, Approver, Admin" })
      ).toBeVisible();
      await expect(
        page.getByRole("cell", { name: "Approver, Admin", exact: true })
      ).toBeVisible();
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(
        page.getByText(
          "This action will clear all the information you have entered in the form and cannot be undone"
        )
      ).toBeVisible();
      await page.getByRole("button", { name: "Cancel" }).nth(1).click();
      await page.getByRole("button", { name: "Confirm" }).click();
      await submitProposal({ page, isEdit: true });
      // proposal details page should have the edited members
      await expect(
        page.getByRole("heading", {
          name: "Update Policy - Edit Members Permissions",
        })
      ).toBeVisible();
      await expect(page.getByText("@frol.near")).toBeVisible();
      await expect(page.getByText("New Roles:")).toBeVisible();
      await expect(page.getByText("Old Roles:")).toBeVisible();
    }
  });

  test("Delete multiple members with permissions and validate errors", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    test.setTimeout(150_000);
    const {} = await setupWorker({ daoAccount, instanceAccount, page });
    await page.waitForTimeout(5_000);
    await page.getByRole("switch").nth(0).click();
    await expect(page.getByRole("switch").nth(1)).toBeChecked();

    const editBtn = await page.getByRole("button", { name: "Edit" });
    const deleteBtn = await page.getByRole("button", { name: "Delete" });
    await expect(editBtn).toBeVisible();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();
    await page.waitForTimeout(2_000);
    await expect(
      page.getByRole("heading", { name: " Invalid Role Change" }).first()
    ).toBeVisible({
      timeout: 10_000,
    });
    const role = daoAccount.includes("infinex") ? "Requestor" : "council";
    await expect(page.getByRole("list").getByText(role)).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await page.getByRole("switch").nth(0).click();
    await page.getByRole("switch").nth(1).click();
    await deleteBtn.click();
    await expect(
      page.getByText(
        "will lose their permissions to this treasury once the request is created and approved"
      )
    ).toBeVisible();
    await page.getByRole("button", { name: "Remove" }).click();
    await submitProposal({ page });
    // proposal details page should have the removed member with roles
    await expect(
      page.getByRole("heading", {
        name: "Update policy - Remove Members",
      })
    ).toBeVisible();
    await expect(page.getByText("@frol.near")).toBeVisible();
    await expect(page.getByText("Revoked Roles").nth(0)).toBeVisible();
    await expect(page.getByText(role).nth(0)).toBeVisible();
  });

  test("Read from query params, display nearn account", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    test.setTimeout(150_000);
    const {} = await setupWorker({
      daoAccount,
      instanceAccount,
      page,
      isNearnCall: true,
    });
    const role = daoAccount.includes("infinex") ? "Requestor" : "council";
    await expect(
      page.getByRole("heading", { name: "Add Members" })
    ).toBeVisible({ timeout: 20_000 });
    const iframe = page.locator("iframe").contentFrame();
    await expect(iframe.getByText("Username")).toBeVisible();
    await expect(iframe.getByText(role, { exact: true })).toBeVisible();
    await expect(
      iframe.getByText(
        "Only the Requestor role can be assigned to this member, enabling them to create requests in NEARN"
      )
    ).toBeVisible();
    const submitButton = iframe.getByRole("button", { name: "Submit" });
    await expect(submitButton).toBeEnabled();

    const addPermission = iframe.getByText("Add Permission", {
      exact: true,
    });
    await expect(addPermission).toHaveClass(/disabled/);

    const input = iframe.getByPlaceholder("treasury.near");
    await expect(input).toHaveValue("nearn-io.near");
    await submitButton.click();
    await submitProposal({ page });

    await expect(
      page.getByRole("heading", { name: "Update Policy - Add New Members" })
    ).toBeVisible();
    await expect(page.getByText("@nearn-io.near")).toBeVisible();
    await expect(page.getByText("Assigned Roles")).toBeVisible();
    await expect(page.getByText(role, { exact: true })).toBeVisible();
  });
});
