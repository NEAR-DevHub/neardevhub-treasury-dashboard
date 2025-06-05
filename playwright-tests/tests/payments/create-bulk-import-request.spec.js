import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { updateDaoPolicyMembers } from "../../util/rpcmock.js";
import { Worker } from "near-workspaces";
import {
  SPUTNIK_DAO_FACTORY_ID,
  setPageAuthSettings,
} from "../../util/sandboxrpc.js";
import nearApi from "near-api-js";
import { redirectWeb4 } from "../../util/web4.js";

async function pasteAndValidateCorrectData(page, csvText) {
  const textarea = await page.getByTestId("csv-data");
  const validateBtn = page.getByRole("button", { name: "Validate Data" });
  await textarea.fill(csvText);
  await expect(validateBtn).toBeEnabled();
  await validateBtn.click();
  // Show Preview button appears
  const previewBtn = page.getByRole("button", { name: "Show Preview" });
  await expect(previewBtn).toBeVisible();
  await previewBtn.click();
  const table = page.locator('[data-testid="preview-table"]');
  await expect(table).toBeVisible();
}

test.describe("User is logged in", () => {
  test.use({
    contextOptions: {
      permissions: ["clipboard-read", "clipboard-write"],
    },
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test.beforeEach(async ({ page, instanceAccount }) => {
    await updateDaoPolicyMembers({ instanceAccount, page });
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    await page.getByRole("button", { name: "Create Request" }).click();
    await page.getByText("Import Multiple Payment Requests").click();
  });

  test("should open step-by-step instructions in a new tab", async ({
    context,
    page,
  }) => {
    const [newPage] = await Promise.all([
      context.waitForEvent("page"),
      page
        .getByRole("link", { name: "View Step-by-Step Instructions" })
        .click(),
    ]);

    await newPage.waitForLoadState();

    expect(newPage.url()).toContain("docs");
  });

  test("should open payment request template link in a new tab", async ({
    context,
    page,
  }) => {
    const [newPage] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("link", { name: "Get the Template" }).click(),
    ]);

    await newPage.waitForLoadState();

    expect(newPage.url()).toContain("template");
  });

  test("Validate Data shows expected errors after pasting CSV", async ({
    page,
  }) => {
    // Check that Validate Data button is initially disabled
    const validateBtn = page.getByRole("button", { name: "Validate Data" });
    await expect(validateBtn).toBeDisabled();

    const textarea = await page.getByTestId("csv-data");

    const comprehensiveInvalidCsv = `Title\tSummary\tRecipient\tRequested Token\tFunding Ask\tNotes
    \tRequest without title and invalid recipient\tinvalid-user@near\tinvalid.token\tabc123\t
    Test title\tMissing recipient\t\tnear\t100\t
    Test title 2\tInvalid recipient format\tinvalid-user\tinvalid.token\t1000\tNote 1
    Test title 3\tValid recipient but invalid token\tmegha19.near\tnot.a.token\t500\tNote 2
    Test title 4\tMissing token\tmegha19.near\t\t100\tNote 3
    Test title 5\tMissing funding ask\tmegha19.near\tusdt\t\t
    Test title 6\tNegative funding ask\tmegha19.near\tusdt\t-10\tNote 5
    Test title 7\tValid row but recipient does not exist\tnonexistent.near\tusdt\t50\tNote 6
    Test title 8\tValid row with NEAR token\tmegha19.near\tnear\t1000\tNote 7
    Test title 9\tValid row with USDT token\tmegha19.near\tusdt\t500\tNote 8`;

    await textarea.fill(comprehensiveInvalidCsv);
    await expect(validateBtn).toBeEnabled();
    await validateBtn.click();

    const expectedGroupedErrors = [
      "Row #1 - Title is missing. Invalid recipient address. Invalid token address. Funding Ask should be a non-negative number.",
      "Row #2 - Recipient is missing.",
      "Row #3 - Invalid recipient address.",
      "Row #4 - Invalid token address.",
      "Row #5 - Requested Token is missing.",
      "Row #6 - Funding Ask is missing.",
      "Row #7 - Funding Ask should be a non-negative number.",
      "Row #8 - Recipient account does not exist.",
    ];

    for (const errorText of expectedGroupedErrors) {
      await expect(page.getByText(errorText)).toBeVisible();
    }
  });
  test("Valid data shows expected warnings for row count and treasury insufficent balance", async ({
    page,
  }) => {
    const textarea = await page.getByTestId("csv-data");

    const validButWarningCsv = `Title\tSummary\tRecipient\tRequested Token\tFunding Ask\tNotes
  Payment 1\tSummary\ttest.near\tusdt.tkn.near\t1\tNote 1
  Payment 2\tSummary\ttest.near\tusdt.tkn.near\t1\tNote 2
  Payment 3\tSummary\ttest.near\tusdt.tkn.near\t1\tNote 3
  Payment 4\tSummary\ttest.near\tusdt.tkn.near\t1\tNote 4
  Payment 5\tSummary\ttest.near\tusdt.tkn.near\t1\tNote 5
  Payment 6\tSummary\ttest.near\tusdt.tkn.near\t1\tNote 6
  Payment 7\tSummary\ttest.near\tnear\t1\tNote 7
  Payment 8\tSummary\ttest.near\tusdc\t1\tNote 8
  Payment 9\tSummary\ttest.near\tdai\t1\tNote 9
  Payment 10\tSummary\ttest.near\tusdt.tkn.near\t1\tNote 10
  Payment 11\tSummary\ttest.near\tusdt.tkn.near\t1\tNote 11`;

    await textarea.fill(validButWarningCsv);

    const validateBtn = page.getByRole("button", { name: "Validate Data" });
    await expect(validateBtn).toBeEnabled();
    await validateBtn.click();

    // Wait for warnings to appear
    await expect(
      page.getByText(
        "You have added more than 10 requests. You can continue, but only the first 10 will be added to list."
      )
    ).toBeVisible();

    await expect(
      page.getByText(/Treasury balance for .* is too low/)
    ).toBeVisible();

    // Ensure no errors are shown
    const errorContainer = page.locator('[data-testid="csv-errors"]');
    await expect(errorContainer).toBeHidden();
  });

  test("Valid data shows preview table, checkbox selection and cancel modal behavior", async ({
    page,
  }) => {
    const csvText = `Title\tSummary\tRecipient\tRequested Token\tFunding Ask\tNotes
    Test title 1\tSummary 1\tmegha19.near\tnear\t100\tNote1
    Test title 2\tSummary 2\tmegha19.near\tdai\t50\tNote2`;
    await pasteAndValidateCorrectData(page, csvText);
    const table = page.locator('[data-testid="preview-table"]');
    const rowCheckboxes = table.locator('tbody input[type="checkbox"]');
    const topCheckbox = table.locator('thead input[type="checkbox"]');

    await expect(rowCheckboxes).toHaveCount(2);

    // Initially all checked
    for (let i = 0; i < 2; i++) {
      await expect(rowCheckboxes.nth(i)).toBeChecked();
    }
    await expect(topCheckbox).toBeChecked();

    // Submit button shows all selected
    await expect(
      page.getByRole("button", { name: "Submit 2 Requests" })
    ).toBeVisible();

    // Click top checkbox to unselect all
    await topCheckbox.click();

    // All row checkboxes unchecked
    for (let i = 0; i < 2; i++) {
      await expect(rowCheckboxes.nth(i)).not.toBeChecked();
    }
    await expect(topCheckbox).not.toBeChecked();

    // Submit button updates to 0
    await expect(
      page.getByRole("button", { name: "Submit 0 Requests" })
    ).toBeVisible();

    // Click top checkbox again to select all
    await topCheckbox.click();

    // All row checkboxes checked again
    for (let i = 0; i < 2; i++) {
      await expect(rowCheckboxes.nth(i)).toBeChecked();
    }
    await expect(topCheckbox).toBeChecked();

    // Submit button back to 2
    await expect(
      page.getByRole("button", { name: "Submit 2 Requests" })
    ).toBeVisible();

    // Uncheck first row checkbox manually
    await rowCheckboxes.nth(0).uncheck();

    // First unchecked, second checked
    await expect(rowCheckboxes.nth(0)).not.toBeChecked();
    await expect(rowCheckboxes.nth(1)).toBeChecked();

    // Top checkbox unchecked (because not all selected)
    await expect(topCheckbox).not.toBeChecked();

    // Submit button updates to "Submit 1 Request"
    await expect(
      page.getByRole("button", { name: "Submit 1 Request" })
    ).toBeVisible();

    // Re-check first row checkbox manually
    await rowCheckboxes.nth(0).check();

    // All checked again
    for (let i = 0; i < 2; i++) {
      await expect(rowCheckboxes.nth(i)).toBeChecked();
    }
    await expect(topCheckbox).toBeChecked();

    // Submit button back to "Submit 2 Requests"
    await expect(
      page.getByRole("button", { name: "Submit 2 Requests" })
    ).toBeVisible();
    const cancelBtn = page.getByRole("button", { name: "Cancel" });
    await cancelBtn.click();

    const modal = page.getByTestId("preview-cancel");

    const cancelModalText =
      "If you close now, all current progress, including any pasted data, will be discarded";
    await expect(modal.getByText(cancelModalText)).toBeVisible();

    // it should close the table (preview)
    const modalYesBtn = modal.getByRole("button", { name: /^Yes$/ });
    await modalYesBtn.click();

    // Expect preview table to be gone
    await expect(page.locator("table")).not.toBeVisible();
  });
});

test("should create bulk requests using sandbox", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  test.setTimeout(200_000);
  const daoName = daoAccount.split("." + SPUTNIK_DAO_FACTORY_ID)?.[0];
  const web4ContractId = instanceAccount;
  const socialNearContractId = "social.near";
  const DAIContractId =
    "6b175474e89094c44da98b954eedeac495271d0f.factory.bridge.near";

  const worker = await Worker.init();

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
    mainnetContract: "theori.near",
  });

  const userAccount = await worker.rootAccount.importContract({
    mainnetContract: "megha19.near",
  });

  const create_args = {
    name: daoName,
    args: Buffer.from(
      JSON.stringify({
        purpose: "purpose",
        bond: "100000000000000000000000",
        vote_period: "604800000000000",
        grace_period: "86400000000000",
        policy: {
          roles: [
            {
              name: "Create Requests",
              kind: {
                Group: [creatorAccount.accountId, userAccount.accountId],
              },
              permissions: ["transfer:AddProposal", "call:AddProposal"],
              vote_policy: {},
            },
            {
              name: "Manage Members",
              kind: {
                Group: [creatorAccount.accountId, userAccount.accountId],
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
              name: "Vote",
              kind: {
                Group: [creatorAccount.accountId, userAccount.accountId],
              },
              permissions: ["*:VoteApprove", "*:VoteReject", "*:VoteRemove"],
              vote_policy: {},
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
        config: {
          purpose: "purpose",
          name: "infinex",
          metadata: "",
        },
      })
    ).toString("base64"),
  };

  await creatorAccount.call(SPUTNIK_DAO_FACTORY_ID, "create", create_args, {
    gas: 300_000_000_000_000,
    attachedDeposit: nearApi.utils.format.parseNearAmount("6"),
  });

  await worker.rootAccount.importContract({ mainnetContract: web4ContractId });

  const dai = await worker.rootAccount.importContract({
    mainnetContract: DAIContractId,
  });

  const socialNear = await worker.rootAccount.importContract({
    mainnetContract: socialNearContractId,
  });
  await socialNear.call(socialNearContractId, "new", {});
  await socialNear.call(socialNearContractId, "set_status", { status: "Live" });

  await redirectWeb4({
    page,
    contractId: web4ContractId,
    treasury: daoAccount,
    sandboxNodeUrl: worker.provider.connection.url,
  });

  await page.goto(`https://${web4ContractId}.page/?page=payments`);
  await setPageAuthSettings(
    page,
    userAccount.accountId,
    await userAccount.getKey()
  );

  await page.getByRole("button", { name: "Create Request" }).click();
  await page.getByText("Import Multiple Payment Requests").click();
  const csvText = `Title\tSummary\tRecipient\tRequested Token\tFunding Ask\tNotes
  Test title 1\tSummary 1\tmegha19.near\tnear\t100\tNote1
  Test title 2\tSummary 2\tmegha19.near\tnear\t50\tNote2
  Test title 3\tSummary 3\ttheori.near\tnear\t100\tNote3
  Test title 4\tSummary 4\ttheori.near\tnear\t100\tNote4`;

  await pasteAndValidateCorrectData(page, csvText);
  const table = page.locator('[data-testid="preview-table"]');
  const topCheckbox = table.locator('thead input[type="checkbox"]');
  await topCheckbox.click();
  const rowCheckboxes = table.locator('tbody input[type="checkbox"]');
  await rowCheckboxes.nth(0).click();
  const submitBtn = page.getByRole("button", { name: "Submit 1 Requests" });
  await submitBtn.click();
  await expect(page.locator("div.modal-body code")).toHaveCount(1);
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(
    await page.getByRole("button", { name: "Confirm" })
  ).not.toBeVisible();
  await expect(table).toBeHidden();
  await expect(
    page.getByRole("cell", { name: "0", exact: true })
  ).toBeVisible();
  await expect(page.getByText("Test title")).toBeVisible();
});
