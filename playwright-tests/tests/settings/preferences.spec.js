import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { redirectWeb4 } from "../../util/web4.js";
import { PROPOSAL_BOND } from "../../util/sandboxrpc.js";
import { Worker, parseNEAR } from "near-workspaces";

async function navigateToPreferencesPage({ page, instanceAccount }) {
  await page.goto(
    `https://${instanceAccount}.page/?page=settings&tab=preferences`
  );
  await page.waitForTimeout(3000);

  // Wait for preferences page to load
  await expect(
    page.locator(".card-title").getByText("Preferences")
  ).toBeVisible();
}

async function setupDaoAccount({
  daoAccount,
  instanceAccount,
  worker,
  creatorAccount,
}) {
  const daoName = daoAccount.split(".")[0];
  const create_testdao_args = {
    config: {
      name: daoName,
      purpose: "treasury",
      metadata: "",
    },
    policy: {
      roles: [
        {
          kind: {
            Group: [creatorAccount.accountId],
          },
          name: "Create Requests",
          permissions: [
            "call:AddProposal",
            "transfer:AddProposal",
            "config:Finalize",
          ],
          vote_policy: {},
        },
        {
          kind: {
            Group: [creatorAccount.accountId],
          },
          name: "Manage Members",
          permissions: [
            "config:*",
            "policy:*",
            "add_member_to_role:*",
            "remove_member_from_role:*",
          ],
          vote_policy: {},
        },
        {
          kind: {
            Group: [creatorAccount.accountId],
          },
          name: "Vote",
          permissions: ["*:VoteReject", "*:VoteApprove", "*:VoteRemove"],
          vote_policy: {},
        },
      ],
      default_vote_policy: {
        weight_kind: "RoleWeight",
        quorum: "0",
        threshold: [1, 2],
      },
      proposal_bond: PROPOSAL_BOND,
      proposal_period: "604800000000000",
      bounty_bond: "100000000000000000000000",
      bounty_forgiveness_period: "604800000000000",
    },
  };

  const daoContract = await worker.rootAccount.importContract({
    mainnetContract: daoAccount,
    initialBalance: parseNEAR("24"),
  });
  await daoContract.callRaw(daoAccount, "new", create_testdao_args, {
    gas: "300000000000000",
  });
  await worker.rootAccount.importContract({
    mainnetContract: instanceAccount,
  });

  // Social.near setup
  const socialNearAccount = await worker.rootAccount.importContract({
    mainnetContract: "social.near",
  });

  await socialNearAccount.call(
    socialNearAccount.accountId,
    "new",
    {},
    { gas: "300000000000000" }
  );

  await socialNearAccount.call(
    socialNearAccount.accountId,
    "set_status",
    { status: "Live" },
    { gas: "300000000000000" }
  );
}

let worker;
let creatorAccount;

test.beforeAll(async () => {
  test.setTimeout(200_000);

  worker = await Worker.init();

  creatorAccount = await worker.rootAccount.importContract({
    mainnetContract: "theori.near",
  });
  await worker.rootAccount.transfer(creatorAccount.accountId, parseNEAR("100"));
});

test.afterAll(async () => {
  await worker.tearDown();
});

async function setupTest({ page, instanceAccount, daoAccount }) {
  await setupDaoAccount({
    daoAccount,
    instanceAccount,
    worker,
    creatorAccount,
  });

  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    networkId: "sandbox",
    sandboxNodeUrl: worker.provider.connection.url,
    callWidgetNodeURLForContractWidgets: false,
  });

  await navigateToPreferencesPage({ page, instanceAccount });
}

test.describe("Preferences Settings", () => {
  test("should save preferences with toast and persist on reload", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(120_000);
    await setupTest({ page, instanceAccount, daoAccount });

    // Change time format
    await page.getByText("12-hour (1:00 PM)").first().click();
    await page.getByText("24-hour (13:00)").click();

    // Save and verify toast
    const saveButton = page.getByRole("button", { name: "Save Changes" });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(
      page.getByText("Preferences saved successfully!")
    ).toBeVisible();
    await expect(saveButton).toBeDisabled();

    // Test persistence
    await page.reload();
    await page.waitForTimeout(7000);

    await expect(page.getByText("24-hour (13:00)").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save Changes" })
    ).toBeDisabled();
    // Change format - should enable
    await page.getByText("24-hour (13:00)").first().click();
    await page.getByText("12-hour (1:00 PM)").click();
    await expect(saveButton).toBeEnabled();

    // Change back - should disable
    await page.getByText("12-hour (1:00 PM)").first().click();
    await page.getByText("24-hour (13:00)").click();
    await expect(saveButton).toBeDisabled();
  });

  test("should handle timezone selection and location toggle", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(120_000);
    await setupTest({ page, instanceAccount, daoAccount });

    // Select timezone
    await page.getByText("Select Timezone").click();
    await page.waitForTimeout(2000);
    await page.getByPlaceholder("Search timezones").pressSequentially("Tokyo");
    await page.getByText("(UTC+09:00) Osaka, Sapporo, Tokyo").click();
    await expect(
      page.getByText("(UTC+09:00) Osaka, Sapporo, Tokyo")
    ).toBeVisible();

    // Test location toggle
    const locationToggle = page.locator(
      "i[data-testid='use-location-checkbox']"
    );
    const timezoneDropdown = page.locator(
      "div[data-testid='select-timezone-dropdown']"
    );

    // Wait for the checkbox to be visible and enabled
    await expect(timezoneDropdown).toHaveClass(/cursor-pointer/);

    await locationToggle.click();
    await expect(timezoneDropdown).toHaveClass(/cursor-not-allowed/);

    await locationToggle.click();
    await expect(timezoneDropdown).toHaveClass(/cursor-pointer/);

    // Save and verify persistence
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(
      page.getByText("Preferences saved successfully!")
    ).toBeVisible();
  });

  test("should reset changes on cancel", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(120_000);
    await setupTest({ page, instanceAccount, daoAccount });

    // Make changes
    await page.getByText("12-hour (1:00 PM)").first().click();
    await page.getByText("24-hour (13:00)").click();
    await page.locator("div[data-testid='select-timezone-dropdown']").click();
    await page.waitForTimeout(2000);
    await page.getByPlaceholder("Search timezones").pressSequentially("Tokyo");
    await page.getByText("(UTC+09:00) Osaka, Sapporo, Tokyo").click();

    // Verify button enabled, then cancel
    await expect(
      page.getByRole("button", { name: "Save Changes" })
    ).toBeEnabled();
    await page.getByRole("button", { name: "Cancel" }).click();

    // Verify reset
    await expect(page.getByText("12-hour (1:00 PM)").first()).toBeVisible();
    await expect(
      page.locator("div[data-testid='select-timezone-dropdown']")
    ).toHaveClass(/cursor-pointer/);
    await expect(
      page.getByRole("button", { name: "Save Changes" })
    ).toBeDisabled();
  });
});
