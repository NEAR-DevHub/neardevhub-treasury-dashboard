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

test.describe("Payments Filters", () => {
  test.beforeEach(async ({ page, instanceAccount }) => {
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
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
    await openFiltersPanel(page);
    await page.locator("text=Add Filter").click();
    // Verify only Pending Requests filters are available
    await expect(page.getByRole("button", { name: "Recipient" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Token" })).toBeVisible();
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
    await openFiltersPanel(page);
    await page.locator("text=Add Filter").click();

    // Verify all filters are available for History
    await expect(
      page.getByRole("button", { name: "Created Date" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Status" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Recipient" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Token" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Created by" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Approver" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "My Vote Status" })
    ).not.toBeVisible();
  });

  test("should add and display Recipient filter", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Recipient",
      isMultiple: true,
    });
    await page
      .getByRole("textbox", { name: "Search by account address" })
      .fill("megha");
    await page.getByText("Megha", { exact: true }).first().click();
    await page.waitForTimeout(1000);

    // Get Recipient column index and verify all rows show the selected recipient
    const recipientColumnIndex = await getColumnIndex(page, "Recipient");
    await checkColumnValues(page, recipientColumnIndex, "megha19.near", true);

    // Check export URL contains recipient filter
    await checkExportUrlWithFilters(
      page,
      {
        recipients: "megha19.near",
      },
      "payments"
    );

    // check for not
    await page.getByRole("button", { name: "is any" }).click();
    await page.getByRole("button", { name: "is not all" }).click();
    await page.waitForTimeout(1000);

    // Verify no rows show the excluded recipient
    await checkColumnValues(page, recipientColumnIndex, "megha19.near", false);

    // Check export URL contains recipient_not filter
    await checkExportUrlWithFilters(
      page,
      {
        recipients_not: "megha19.near",
      },
      "payments"
    );
  });

  test("should select token in Token filter, add amount filter and display it", async ({
    page,
  }) => {
    test.setTimeout(120000);
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Token",
      isMultiple: false,
      filterType: "token",
    });
    await page.getByRole("button", { name: "Select Token" }).click();
    await page.waitForSelector(".dropdown-menu.show");
    await page.getByText("USDC").first().click();
    await expect(page.getByText("Amount")).toBeVisible();

    await page.waitForTimeout(1000);

    // Get Token column index and verify all rows show the selected token
    const tokenColumnIndex = await getColumnIndex(page, "Token");
    await checkColumnValues(page, tokenColumnIndex, "USDC", true);
    await expect(
      page.getByRole("button", { name: "Token : not defined USDC" })
    ).toBeVisible();

    // Check export URL contains token filter
    await checkExportUrlWithFilters(
      page,
      {
        tokens:
          "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
      },
      "payments"
    );

    // Amount filter :
    // 1) between
    await expect(page.getByRole("button", { name: "Between" })).toBeVisible();
    await page.getByPlaceholder("0").first().fill("0.01");
    await page.getByPlaceholder("0").nth(1).fill("0.1");
    await expect(
      page.getByRole("button", { name: "Token : not defined 0.01-0.1 USDC" })
    ).toBeVisible();
    await page.waitForTimeout(3000);

    // Get Funding Ask column index and verify all amounts are within range
    const fundingAskColumnIndex = await getColumnIndex(page, "Funding Ask");
    await checkColumnAmounts(page, fundingAskColumnIndex, 0.01, ">");
    await checkColumnAmounts(page, fundingAskColumnIndex, 0.1, "<");

    // Check export URL contains amount range
    await checkExportUrlWithFilters(
      page,
      {
        tokens:
          "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
        amount_min: "0.01",
        amount_max: "0.1",
      },
      "payments"
    );

    // 2) Is
    await page.getByRole("button", { name: "Between" }).click();
    await page.getByText("Is", { exact: true }).click();
    await page.getByPlaceholder("0").fill("0.01");
    await expect(
      page.getByRole("button", { name: "Token : not defined 0.01 USDC" })
    ).toBeVisible();
    await page.waitForTimeout(3000);
    await checkColumnAmounts(page, fundingAskColumnIndex, 0.01, "=");

    // Check export URL contains amount equal
    await checkExportUrlWithFilters(
      page,
      {
        tokens:
          "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
        amount_equal: "0.01",
      },
      "payments"
    );

    // 3) less than
    await page.getByRole("button", { name: "Is", exact: true }).click();
    await page.getByText("Less than").click();
    await page.getByPlaceholder("0").fill("0.2");
    await expect(
      page.getByRole("button", { name: "Token : not defined < 0.2 USDC" })
    ).toBeVisible();
    await page.waitForTimeout(3000);
    await checkColumnAmounts(page, fundingAskColumnIndex, 0.2, "<");

    // Check export URL contains amount max
    await checkExportUrlWithFilters(
      page,
      {
        tokens:
          "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
        amount_max: "0.2",
      },
      "payments"
    );

    // 4) More than
    await page.getByRole("button", { name: "Less than" }).click();
    await page.getByText("More than").click();
    await page.getByPlaceholder("0").fill("100");
    await expect(
      page.getByRole("button", { name: "Token : not defined > 100 USDC" })
    ).toBeVisible();
    await page.waitForTimeout(3000);
    await checkColumnAmounts(page, fundingAskColumnIndex, 100, ">");

    // Check export URL contains amount min
    await checkExportUrlWithFilters(
      page,
      {
        tokens:
          "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
        amount_min: "100",
      },
      "payments"
    );
  });

  test("should add and display Created by filter", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Created by",
      isMultiple: true,
    });
    await page
      .getByRole("textbox", { name: "Search by account address" })
      .fill("pete");
    await page.getByText("Peter Salomonsen", { exact: true }).first().click();
    await page.waitForTimeout(1000);

    // Get Created by column index and verify all rows show the selected proposer
    const creatorColumnIndex = await getColumnIndex(page, "Created by");
    await checkColumnValues(
      page,
      creatorColumnIndex,
      "petersalomonsen.near",
      true
    );

    // Check export URL contains proposer filter
    await checkExportUrlWithFilters(
      page,
      {
        proposers: "petersalomonsen.near",
      },
      "payments"
    );

    await page.getByRole("button", { name: "is any" }).click();
    await page.getByRole("button", { name: "is not all" }).click();
    await page.waitForTimeout(1000);

    // Verify no rows show the excluded proposer
    await checkColumnValues(
      page,
      creatorColumnIndex,
      "petersalomonsen.near",
      false
    );

    // Check export URL contains proposer_not filter
    await checkExportUrlWithFilters(
      page,
      {
        proposers_not: "petersalomonsen.near",
      },
      "payments"
    );
  });

  test("should add and display Approver filter", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Approver",
      isMultiple: true,
    });
    await page
      .getByRole("textbox", { name: "Search by account address" })
      .fill("fro");
    await page.getByText("frol", { exact: true }).first().click();
    await page.waitForTimeout(1000);

    // Get Approvers column index and verify all rows show the selected approver
    const approversColumnIndex = await getColumnIndex(page, "Approver");
    await checkColumnImages(page, approversColumnIndex, "frol.near", true);

    // Check export URL contains approver filter
    await checkExportUrlWithFilters(
      page,
      {
        approvers: "frol.near",
      },
      "payments"
    );

    await page.getByRole("button", { name: "is any" }).click();
    await page.getByRole("button", { name: "is not all" }).click();
    await page.waitForTimeout(1000);

    // Verify no rows show the excluded approver
    await checkColumnImages(page, approversColumnIndex, "frol.near", false);

    // Check export URL contains approver_not filter
    await checkExportUrlWithFilters(
      page,
      {
        approvers_not: "frol.near",
      },
      "payments"
    );
  });

  test("should add and display status filter", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Status",
      isMultiple: false,
    });
    await page.getByText("Funded").first().click();
    await page.waitForTimeout(1000);

    // Get Status column index and verify all rows show the selected status
    const statusColumnIndex = await getColumnIndex(page, "Status");
    await checkColumnValues(page, statusColumnIndex, "Funded", true);

    // Check export URL contains status filter
    await checkExportUrlWithFilters(
      page,
      {
        statuses: "Approved",
      },
      "payments"
    );

    await page.getByRole("button", { name: "Status : Funded" }).click();
    await page.getByRole("button", { name: "is" }).click();
    await page.getByRole("button", { name: "is not" }).click();
    await page.waitForTimeout(1000);

    // Verify no rows show the excluded status
    await checkColumnValues(page, statusColumnIndex, "Funded", false);

    // Check export URL contains status filter (excluding Approved)
    await checkExportUrlWithFilters(
      page,
      {
        statuses: "Rejected,Failed,Expired",
      },
      "payments"
    );
  });

  test("should remove filter when trash icon is clicked", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Recipient",
      isMultiple: true,
    });

    await expect(page.getByRole("button", { name: "Recipient" })).toBeVisible();
    // Click trash icon to remove filter
    await page.locator(".bi.bi-trash").click();

    // Verify filter is removed
    await expect(
      page.getByRole("button", { name: "Recipient" })
    ).not.toBeVisible();
  });

  test("should clear all filters when clear button is clicked", async ({
    page,
  }) => {
    await switchToHistoryTab(page);
    // Add multiple filters
    await addFilter(page, {
      filterName: "Recipient",
      isMultiple: true,
    });

    // Click clear all button (X button)
    await page.click("button:has(i.bi-x-lg)");

    // Verify all filters are cleared
    await expect(
      page.getByRole("button", { name: "Recipient" })
    ).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Token" })).not.toBeVisible();
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
      "payments"
    );
  });

  test("should switch between tabs and verify filters are cleared", async ({
    page,
  }) => {
    // Start on Pending Requests tab
    await switchToPendingRequestsTab(page);

    // Add a filter
    await addFilter(page, {
      filterName: "Recipient",
      isMultiple: true,
    });

    // Switch to History tab
    await switchToHistoryTab(page);

    // Verify filter is cleared (should not be visible)
    await expect(
      page.getByRole("button", { name: "Recipient" })
    ).not.toBeVisible();

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

    await searchInput.fill("124");
    await page.waitForTimeout(3000);

    // Verify ID search results
    const idSearchRows = page.locator("tbody tr");
    const idSearchCount = await idSearchRows.count();

    // Should have exactly 1 result for specific ID
    expect(idSearchCount).toBe(1);
    expect(page.getByRole("cell", { name: "124" })).toBeVisible();

    // Check CSV export URL contains search parameter for ID
    await checkExportUrlWithFilters(
      page,
      {
        search: "124",
      },
      "payments"
    );

    // Step 3: Clear search
    await page.locator(".bi.bi-x-lg").click();
    await expect(searchInput).toBeEmpty();
    await page.waitForTimeout(3000);

    // Verify all results are back
    const allRows = page.locator("tbody tr");
    const allRowCount = await allRows.count();
    console.log("allRowCount", allRowCount);

    // Should have more results than the ID search (which had 1)
    expect(allRowCount).toBe(10);
  });
});

test.describe("Logged in user", () => {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test("should add and display My Vote Status filter", async ({
    page,
    instanceAccount,
  }) => {
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    await page.waitForTimeout(5_000);
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "My Vote Status",
      isMultiple: false,
    });
    // Approved
    await page.getByText("Approved", { exact: true }).click();
    await page.waitForTimeout(3000);
    await checkVoteStatusWithImages(page, "theori.near", "approved", true);

    // Check export URL contains approved vote filter
    await checkExportUrlWithFilters(
      page,
      {
        voter_votes: "theori.near:approved",
      },
      "payments"
    );

    // Rejected
    await page
      .getByRole("button", { name: "My Vote Status : Approved" })
      .click();
    await page.getByText("Rejected", { exact: true }).click();
    await page.waitForTimeout(3000);

    await checkVoteStatusWithImages(page, "theori.near", "rejected", true);

    // Check export URL contains rejected vote filter
    await checkExportUrlWithFilters(
      page,
      {
        voter_votes: "theori.near:rejected",
      },
      "payments"
    );

    // Not Voted
    await page
      .getByRole("button", { name: "My Vote Status : Rejected" })
      .click();
    await page.getByText("Not Voted", { exact: true }).click();
    await page.waitForTimeout(3000);

    // no approver or reject votes
    await checkVoteStatusWithImages(page, "theori.near", "rejected", false);
    await checkVoteStatusWithImages(page, "theori.near", "approved", false);

    // Check export URL contains approvers_not filter for "Not Voted"
    await checkExportUrlWithFilters(
      page,
      {
        approvers_not: "theori.near",
      },
      "payments"
    );
  });
});
