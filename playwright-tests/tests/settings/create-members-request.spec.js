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

async function setupWorker({ daoAccount, instanceAccount, page }) {
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

  const create_args = {
    name: daoName,
    args: Buffer.from(
      JSON.stringify({
        purpose: daoName,
        bond: "100000000000000000000000",
        vote_period: "604800000000000",
        grace_period: "86400000000000",
        policy: {
          roles: daoAccount.includes("infinex")
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
  await page.goto(`https://${instanceAccount}.page/?page=settings&tab=members`);
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
    name: " Add Membe",
  });
  await expect(createMemberRequestButton).toBeVisible();
  await createMemberRequestButton.click();
  await expect(page.getByRole("heading", { name: "Add Members" })).toBeVisible({
    timeout: 10_000,
  });
}

async function submitProposal({ page, isEdit }) {
  await expect(page.getByText("Confirm transaction")).toBeVisible();
  await page
    .getByRole("button", { name: "Confirm" })
    .nth(isEdit ? 1 : 0)
    .click();

  await expect(page.getByText("Awaiting transaction")).not.toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByText("Your request has been submitted.")
  ).toBeVisible();
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
    // 3. Type into the username field
    const iframe = page.locator("iframe").contentFrame();

    const usernameInput = iframe.getByPlaceholder("treasury.near");
    await usernameInput.fill("megha19.near");

    // 4. "+ Add Another Member" button should be disabled
    const addButton = iframe.getByRole("button", {
      name: "+ Add Another Member",
    });

    const submitButton = iframe.getByRole("button", { name: "Submit" });
    const alreadyExists = iframe.getByText("This account is already a member");
    await expect(alreadyExists).toBeVisible();
    await expect(addButton).toBeDisabled();
    await expect(submitButton).toBeDisabled();

    await usernameInput.fill("test.near");

    // 5. Open permission dropdown and select "requestor"
    await iframe.getByText("Select Permission").click();
    await iframe.locator(".dropdown-item").first().click();

    // 6. "+ Add Another Member" should be enabled
    await expect(addButton).toBeEnabled();

    // 7. Click "+ Add Another Member"
    await addButton.click();

    // 8. Fill the second member's username
    const usernameInputs = iframe.getByPlaceholder("treasury.near");
    await usernameInputs.nth(1).fill("test.near");
    const alreadyAdded = iframe.getByText(
      "This account is already added above"
    );
    await expect(alreadyAdded).toBeVisible();
    await expect(addButton).toBeDisabled();
    await expect(submitButton).toBeDisabled();
    await usernameInputs.nth(1).fill("another.near");
    const rolesError = iframe
      .locator("#roleError-1")
      .getByText("You must assign at least one role.");
    await expect(rolesError).toBeVisible();
    await iframe.getByText("Select Permission").nth(1).click();
    await iframe.locator("#dropdownMenu-1 .dropdown-item").nth(0).click();
    await submitButton.click();
    await submitProposal({ page });

    // proposal details page should have the members added
    await expect(
      page.getByRole("heading", { name: "Update policy - Members Permissions" })
    ).toBeVisible();
    await expect(page.getByText("@test.near")).toBeVisible();
    await expect(page.getByText("@another.near")).toBeVisible();
    await expect(page.getByText("Assigned Roles:").count()).to(2);
  });

  test("Edit multiple members with permissions and validate errors", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    test.setTimeout(150_000);
    const {} = await setupWorker({ daoAccount, instanceAccount, page });
    await page.waitForTimeout(5_000);
    await page.getByRole("switch").nth(0).click();
    await expect(page.getByRole("switch").nth(1)).toBeChecked();

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
    // remove all requestor role
    const deleteIcons = iframe
      .locator('[id^="selectedRoles-"] div')
      .filter({ hasText: role })
      .locator("i");

    const count = await deleteIcons.count();

    for (let i = 0; i < count; i++) {
      await deleteIcons.nth(0).click();
    }

    const rolesError = iframe
      .locator("#roleError-1")
      .getByText("You must assign at least one role.");
    await expect(rolesError).toBeVisible();
    await expect(
      iframe.getByText(
        `You must assign at least one member with the ${role} role.`
      )
    ).toBeVisible();
    await expect(submitButton).toBeDisabled({ timeout: 20_000 });

    await iframe.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Yes" }).click();
    await expect(page.locator(".offcanvas-body")).not.toBeVisible();

    // with single role, edit doesn't work
    if (daoAccount.includes("infinex")) {
      await page.getByRole("switch").nth(0).click();
      await page.getByRole("switch").nth(1).click();
      await editBtn.click();
      await expect(account).not.toBeVisible();
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
          name: "Update policy - Members Permissions",
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
        name: "Update policy - Members Permissions",
      })
    ).toBeVisible();
    await expect(page.getByText("@frol.near")).toBeVisible();
    await expect(page.getByText("Revoked Roles").nth(0)).toBeVisible();
    await expect(page.getByText(role).nth(0)).toBeVisible();
  });
});
