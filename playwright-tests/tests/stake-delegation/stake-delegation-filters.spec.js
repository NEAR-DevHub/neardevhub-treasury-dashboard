import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import {
  getColumnIndex,
  checkColumnValues,
  checkColumnImages,
  checkVoteStatusWithImages,
  openFiltersPanel,
  checkExportUrlWithFilters,
  checkColumnAmounts,
  addFilter,
  switchToHistoryTab,
  switchToPendingRequestsTab,
  checkColumnDateRange,
} from "../../util/filter-utils.js";

test.describe("Stake Delegation Filters", () => {
  test.beforeEach(async ({ page, instanceAccount }) => {
    await page.goto(`/${instanceAccount}/widget/app?page=stake-delegation`);
    await page.waitForTimeout(5_000);
  });

  test("should open filters panel when filter button is clicked", async ({
    page,
  }) => {
    await openFiltersPanel(page);
  });

  test("should show correct available filters for Pending Requests tab", async ({
    page,
  }) => {
    await switchToPendingRequestsTab(page);

    // Open filters panel
    await page.click("button:has(i.bi-funnel)");

    // Click Add Filter dropdown
    await page.click("text=Add Filter");

    // Verify only Pending Requests filters are available
    await expect(page.getByRole("button", { name: "Type" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Amount" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Validator" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Created by" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Approver" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "My Vote Status" })
    ).not.toBeVisible();

    // Verify History-specific filters are NOT available
    await expect(
      page.getByRole("button", { name: "Created Date" })
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Status" })
    ).not.toBeVisible();
  });

  test("should show correct available filters for History tab", async ({
    page,
  }) => {
    await switchToHistoryTab(page);

    // check export button is visible
    const exportButton = page.getByRole("button", { name: "Export as CSV" });
    await expect(exportButton).toBeVisible();

    // Should NOT be a dropdown
    await expect(exportButton).not.toHaveAttribute(
      "data-bs-toggle",
      "dropdown"
    );

    // Open filters panel
    await page.click("button:has(i.bi-funnel)");

    // Click Add Filter dropdown
    await page.click("text=Add Filter");

    // Verify all filters are available for History
    await expect(
      page.getByRole("button", { name: "Created Date" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Status" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Type" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Amount" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Validator" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Created by" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Approver" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "My Vote Status" })
    ).not.toBeVisible();
  });

  test("should add and display Type filter", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Type",
      isMultiple: false,
    });
    await page
      .locator(".dropdown-item")
      .getByText("Stake", { exact: true })
      .click();
    await page.waitForTimeout(1000);

    // Verify stake type is selected
    await expect(
      page.getByRole("button", { name: "Type : Stake" })
    ).toBeVisible();

    // Get Type column index and verify all rows show "Stake"
    const typeColumnIndex = await getColumnIndex(page, "Type");
    await checkColumnValues(page, typeColumnIndex, "Stake", true);

    // Check export URL contains type filter
    await checkExportUrlWithFilters(
      page,
      {
        stake_type: "stake",
      },
      "stake-delegation"
    );

    // Test "is not" functionality
    await page.getByRole("button", { name: "Type : Stake" }).click();
    await page.getByRole("button", { name: "is" }).click();
    await page.getByRole("button", { name: "is not" }).click();
    await page.waitForTimeout(1000);

    // Verify no rows show "Stake" type when excluded
    await checkColumnValues(page, typeColumnIndex, "Stake", false);

    // Check export URL contains type_not filter
    await checkExportUrlWithFilters(
      page,
      {
        stake_type_not: "stake",
      },
      "stake-delegation"
    );
  });

  test("should add and display Amount filter", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Amount",
      isMultiple: false,
    });

    // Test between range
    await expect(page.getByRole("button", { name: "Between" })).toBeVisible();
    await page.getByPlaceholder("0").first().fill("0.01");
    await page.getByPlaceholder("0").nth(1).fill("0.1");
    await expect(
      page.getByRole("button", { name: "Amount : 0.01-0.1 NEAR" })
    ).toBeVisible();
    await page.waitForTimeout(3000);

    // Get Amount column index and verify all amounts are within range
    const amountColumnIndex = await getColumnIndex(page, "Amount");
    await checkColumnAmounts(page, amountColumnIndex, 0.01, ">");
    await checkColumnAmounts(page, amountColumnIndex, 0.1, "<");

    // Check export URL contains amount range
    await checkExportUrlWithFilters(
      page,
      {
        amount_min: "0.01",
        amount_max: "0.1",
      },
      "stake-delegation"
    );

    // Test "Is" (equal)
    await page.getByRole("button", { name: "Between" }).click();
    await page.getByText("Is", { exact: true }).click();
    await page.getByPlaceholder("0").fill("0.01");
    await expect(
      page.getByRole("button", { name: "Amount : 0.01 NEAR" })
    ).toBeVisible();
    await page.waitForTimeout(3000);

    // Verify all amount cells equal 0.01
    await checkColumnAmounts(page, amountColumnIndex, 0.01, "=");

    // Check export URL contains amount equal
    await checkExportUrlWithFilters(
      page,
      {
        amount_equal: "0.01",
      },
      "stake-delegation"
    );

    // Test "Less than"
    await page.getByRole("button", { name: "Is", exact: true }).click();
    await page.getByText("Less than").click();
    await page.getByPlaceholder("0").fill("0.2");
    await expect(
      page.getByRole("button", { name: "Amount : < 0.2 NEAR" })
    ).toBeVisible();
    await page.waitForTimeout(3000);

    // Verify all amount cells are less than 0.2
    await checkColumnAmounts(page, amountColumnIndex, 0.2, "<");

    // Check export URL contains amount max
    await checkExportUrlWithFilters(
      page,
      {
        amount_max: "0.2",
      },
      "stake-delegation"
    );

    // Test "More than"
    await page.getByRole("button", { name: "Less than" }).click();
    await page.getByText("More than").click();
    await page.getByPlaceholder("0").fill("0.1");
    await expect(
      page.getByRole("button", { name: "Amount : > 0.1 NEAR" })
    ).toBeVisible();
    await page.waitForTimeout(3000);

    // Verify all amount cells are greater than 0.1
    await checkColumnAmounts(page, amountColumnIndex, 0.1, ">");

    // Check export URL contains amount min
    await checkExportUrlWithFilters(
      page,
      {
        amount_min: "0.1",
      },
      "stake-delegation"
    );
  });

  test("should add and display Validator filter", async ({ page }) => {
    test.setTimeout(100_000);
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Validator",
      isMultiple: true,
    });
    await page.waitForTimeout(2000);
    await page.getByRole("textbox", { name: "Search by name" }).fill("astro");
    await page
      .getByText("astro-stakers.poolv1.near", { exact: true })
      .first()
      .click();
    await page.waitForTimeout(1000);

    // Verify validator is selected
    await expect(
      page.getByRole("button", {
        name: "Validator : astro-stakers.poolv1.near",
      })
    ).toBeVisible();

    // Get Validator column index and verify all rows show the selected validator
    const validatorColumnIndex = await getColumnIndex(page, "Validator");
    await checkColumnValues(
      page,
      validatorColumnIndex,
      "astro-stakers.poolv1.near",
      true
    );

    // Check export URL contains validator filter
    await checkExportUrlWithFilters(
      page,
      {
        validators: "astro-stakers.poolv1.near",
      },
      "stake-delegation"
    );

    // Test "is not" functionality
    await page.getByRole("button", { name: "is any" }).click();
    await page.getByRole("button", { name: "is not all" }).click();
    await page.waitForTimeout(1000);

    // Verify no rows show the excluded validator
    await checkColumnValues(
      page,
      validatorColumnIndex,
      "astro-stakers.poolv1.near",
      false
    );

    // Check export URL contains validator_not filter
    await checkExportUrlWithFilters(
      page,
      {
        validators_not: "astro-stakers.poolv1.near",
      },
      "stake-delegation"
    );
  });

  test("should add and display Created by filter", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Created by",
      isMultiple: true,
    });
    await page.waitForTimeout(2000);
    await page
      .getByRole("textbox", { name: "Search by account address" })
      .fill("meg");
    await page.locator(".dropdown-item").getByText("megha19.near").click();
    await page.waitForTimeout(1000);

    // Get Created by column index and verify all rows show the selected proposer
    const creatorColumnIndex = await getColumnIndex(page, "Created by");
    await checkColumnValues(page, creatorColumnIndex, "megha19.near", true);

    // Check export URL contains proposer filter
    await checkExportUrlWithFilters(
      page,
      {
        proposers: "megha19.near",
      },
      "stake-delegation"
    );

    // Test "is not" functionality
    await page.getByRole("button", { name: "is any" }).click();
    await page.getByRole("button", { name: "is not all" }).click();
    await page.waitForTimeout(1000);

    // Verify no rows show the excluded proposer
    await checkColumnValues(page, creatorColumnIndex, "megha19.near", false);

    // Check export URL contains proposer_not filter
    await checkExportUrlWithFilters(
      page,
      {
        proposers_not: "megha19.near",
      },
      "stake-delegation"
    );
  });

  test("should add and display Approver filter", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Approver",
      isMultiple: true,
    });
    await page.waitForTimeout(2000);
    await page
      .getByRole("textbox", { name: "Search by account address" })
      .fill("meg");
    await page.locator(".dropdown-item").getByText("megha19.near").click();
    await page.waitForTimeout(1000);

    // Get Approvers column index and verify all rows show the selected approver
    const approversColumnIndex = await getColumnIndex(page, "Approvers");
    await checkColumnImages(page, approversColumnIndex, "megha19.near", true);

    // Check export URL contains approver filter
    await checkExportUrlWithFilters(
      page,
      {
        approvers: "megha19.near",
      },
      "stake-delegation"
    );

    // Test "is not" functionality
    await page.getByRole("button", { name: "is any" }).click();
    await page.getByRole("button", { name: "is not all" }).click();
    await page.waitForTimeout(1000);

    // Verify no rows show the excluded approver
    await checkColumnImages(page, approversColumnIndex, "megha19.near", false);

    // Check export URL contains approver_not filter
    await checkExportUrlWithFilters(
      page,
      {
        approvers_not: "megha19.near",
      },
      "stake-delegation"
    );
  });

  test("should add and display status filter", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Status",
      isMultiple: false,
    });
    await page.getByText("Executed").first().click();
    await page.waitForTimeout(1000);

    // Verify status is selected
    await expect(
      page.getByRole("button", { name: "Status : Executed" })
    ).toBeVisible();

    // Get Status column index and verify all rows show "Approved" status
    const statusColumnIndex = await getColumnIndex(page, "Status");
    await checkColumnValues(page, statusColumnIndex, "Executed", true);

    // Check export URL contains status filter
    await checkExportUrlWithFilters(
      page,
      {
        statuses: "Approved",
      },
      "stake-delegation"
    );

    // Test "is not" functionality
    await page.getByRole("button", { name: "Status : Executed" }).click();
    await page.getByRole("button", { name: "is" }).click();
    await page.getByRole("button", { name: "is not" }).click();
    await page.waitForTimeout(1000);

    // Verify no rows show "Approved" status when excluded
    await checkColumnValues(page, statusColumnIndex, "Executed", false);

    // Check export URL contains status filter (excluding Approved)
    await checkExportUrlWithFilters(
      page,
      {
        statuses: "Rejected,Failed,Expired",
      },
      "stake-delegation"
    );
  });

  test("should remove filter when trash icon is clicked", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Type",
      isMultiple: false,
    });

    await expect(page.getByRole("button", { name: "Type" })).toBeVisible();
    // Click trash icon to remove filter
    await page.locator(".bi.bi-trash").click();

    // Verify filter is removed
    await expect(page.getByRole("button", { name: "Type" })).not.toBeVisible();
  });

  test("should clear all filters when clear button is clicked", async ({
    page,
  }) => {
    await switchToHistoryTab(page);
    // Add multiple filters
    await addFilter(page, {
      filterName: "Type",
      isMultiple: false,
    });

    // Click clear all button (X button)
    await page.click("button:has(i.bi-x-lg)");

    // Verify all filters are cleared
    await expect(page.getByRole("button", { name: "Type" })).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Amount" })
    ).not.toBeVisible();
  });

  test("should set date range in Created Date filter", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Created Date",
      isMultiple: false,
    });

    await expect(page.getByText("From Date")).toBeVisible();
    await expect(page.getByText("To Date")).toBeVisible();

    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-12-31");

    await page
      .getByRole("textbox")
      .nth(1)
      .fill(startDate.toISOString().split("T")[0]);
    await page
      .getByRole("textbox")
      .nth(2)
      .fill(endDate.toISOString().split("T")[0]);

    await page.waitForTimeout(3000);
    // Get Created Date column index and verify all rows show dates within the range
    const createdDateColumnIndex = await getColumnIndex(page, "Created Date");
    await checkColumnDateRange(
      page,
      createdDateColumnIndex,
      startDate,
      endDate,
      true
    );

    // Check export URL contains date range
    await checkExportUrlWithFilters(
      page,
      {
        created_date_from: "2024-01-01",
        created_date_to: "2024-12-31",
      },
      "stake-delegation"
    );
  });

  test("should switch between tabs and verify filters are cleared", async ({
    page,
  }) => {
    // Start on Pending Requests tab
    await switchToPendingRequestsTab(page);

    // Add a filter
    await addFilter(page, {
      filterName: "Type",
      isMultiple: false,
    });

    // Switch to History tab
    await switchToHistoryTab(page);

    // Verify filter is cleared (should not be visible)
    await expect(page.getByRole("button", { name: "Type" })).not.toBeVisible();

    // Verify filters panel is closed
    await expect(
      page.getByRole("button", { name: "Add Filter" })
    ).not.toBeVisible();
  });

  test("should search by search input", async ({ page }) => {
    await switchToHistoryTab(page);

    // Get the search input
    const searchInput = page.getByPlaceholder("Search");
    await expect(searchInput).toBeVisible();

    // Step 1: Search by title
    await searchInput.fill("stake");
    await page.waitForTimeout(3000);

    // Verify search results
    const searchRows = page.locator("tbody tr");
    const searchCount = await searchRows.count();
    expect(searchCount).toBeGreaterThan(0);

    // Check CSV export URL contains search parameter
    await checkExportUrlWithFilters(
      page,
      {
        search: "stake",
      },
      "stake-delegation"
    );

    // Step 2: Search by specific ID
    await searchInput.fill("305");
    await page.waitForTimeout(3000);

    // Verify ID search results
    const idSearchRows = page.locator("tbody tr");
    const idSearchCount = await idSearchRows.count();

    // Should have exactly 1 result for specific ID
    expect(idSearchCount).toBe(1);
    expect(page.getByRole("cell", { name: "305" })).toBeVisible();

    // Check CSV export URL contains search parameter for ID
    await checkExportUrlWithFilters(
      page,
      {
        search: "305",
      },
      "stake-delegation"
    );

    // Step 3: Clear search
    await page.locator(".bi.bi-x-lg").click();
    await expect(searchInput).toBeEmpty();
    await page.waitForTimeout(3000);

    // Verify all results are back
    const allRows = page.locator("tbody tr");
    const allRowCount = await allRows.count();

    // Should have more results than the ID search (which had 1)
    expect(allRowCount).toBe(10);
  });
});

test.describe("Logged in user - Stake Delegation", () => {
  test.use({
    storageState:
      "playwright-tests/storage-states/wallet-connected-admin-with-settings-role.json",
  });

  test("should add and display My Vote Status filter", async ({
    page,
    instanceAccount,
  }) => {
    await page.goto(`/${instanceAccount}/widget/app?page=stake-delegation`);
    await page.waitForTimeout(5_000);
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "My Vote Status",
      isMultiple: false,
    });

    // Approved
    await page.getByText("Approved", { exact: true }).click();
    await page.waitForTimeout(3000);
    await checkVoteStatusWithImages(page, "megha19.near", "approved", true);

    // Check export URL contains approved vote filter
    await checkExportUrlWithFilters(
      page,
      {
        voter_votes: "megha19.near:approved",
      },
      "stake-delegation"
    );

    // Rejected
    await page
      .getByRole("button", { name: "My Vote Status : Approved" })
      .click();
    await page.getByText("Rejected", { exact: true }).click();
    await page.waitForTimeout(3000);

    await checkVoteStatusWithImages(page, "megha19.near", "rejected", true);

    // Check export URL contains rejected vote filter
    await checkExportUrlWithFilters(
      page,
      {
        voter_votes: "megha19.near:rejected",
      },
      "stake-delegation"
    );

    // Not Voted
    await page
      .getByRole("button", { name: "My Vote Status : Rejected" })
      .click();
    await page.getByText("Not Voted", { exact: true }).click();
    await page.waitForTimeout(3000);

    // no approver or reject votes
    await checkVoteStatusWithImages(page, "megha19.near", "rejected", false);
    await checkVoteStatusWithImages(page, "megha19.near", "approved", false);

    // Check export URL contains approvers_not filter for "Not Voted"
    await checkExportUrlWithFilters(
      page,
      {
        approvers_not: "megha19.near",
      },
      "stake-delegation"
    );
  });
});
