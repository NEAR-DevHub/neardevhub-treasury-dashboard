import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { updateDaoPolicyMembers } from "../../util/rpcmock.js";

async function pasteAndValidateCorrectData(page) {
  const csvText = `Title\tSummary\tRecipient\tRequested Token\tFunding Ask\tNotes
  Test title 1\tSummary 1\tmegha19.near\tnear\t100\tNote1
  Test title 2\tSummary 2\tmegha19.near\tdai\t50\tNote2`;
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
    await pasteAndValidateCorrectData(page);
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

  test("Submit button opens confirmation modal", async ({ page }) => {
    await pasteAndValidateCorrectData(page);
    const submitBtn = page.getByRole("button", { name: "Submit 2 Requests" });
    await submitBtn.click();
    await page.waitForTimeout(5_000);
    const proposal1 = await page
      .locator("div.modal-body code")
      .nth(0)
      .innerText();
    await expect(await JSON.parse(proposal1)).toEqual({
      proposal: {
        description:
          "* Title: Test title 1 <br>* Summary: Summary 1 <br>* Notes: Note1",
        kind: {
          Transfer: {
            token_id: "",
            receiver_id: "megha19.near",
            amount: "100000000000000000000000000",
          },
        },
      },
    });
    const storageDeposit = await page
      .locator("div.modal-body code")
      .nth(1)
      .innerText();
    expect(await JSON.parse(storageDeposit)).toEqual({
      account_id: "megha19.near",
      registration_only: true,
    });

    const proposal2 = await page
      .locator("div.modal-body code")
      .nth(2)
      .innerText();
    expect(await JSON.parse(proposal2)).toEqual({
      proposal: {
        description:
          "* Title: Test title 2 <br>* Summary: Summary 2 <br>* Notes: Note2",
        kind: {
          Transfer: {
            token_id:
              "6b175474e89094c44da98b954eedeac495271d0f.factory.bridge.near",
            receiver_id: "megha19.near",
            amount: "50000000000000000000",
          },
        },
      },
    });
  });
});
