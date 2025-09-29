import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import {
  getColumnIndex,
  checkColumnValues,
  checkColumnImages,
  checkVoteStatusWithImages,
  openFiltersPanel,
  addFilter,
  switchToHistoryTab,
  switchToPendingRequestsTab,
  checkColumnDateRange,
} from "../../util/filter-utils.js";

test.describe("Settings Feed Filters", () => {
  test.beforeEach(async ({ page, instanceAccount }) => {
    await page.goto(`/${instanceAccount}/widget/app?page=settings`);
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
    await expect(
      page.getByRole("button", { name: "Created by" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Approver" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Proposal Type" })
    ).toBeVisible();
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
    await openFiltersPanel(page);
    await page.locator("text=Add Filter").click();

    // Verify all filters are available for History
    await expect(
      page.getByRole("button", { name: "Created Date" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Status" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Created by" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Approver" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Proposal Type" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "My Vote Status" })
    ).not.toBeVisible();
  });

  test("should add and display Created by filter", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Created by",
      isMultiple: true,
    });
    await page
      .getByRole("textbox", { name: "Search by account address" })
      .fill("megha");
    await page.getByText("Megha", { exact: true }).first().click();
    await page.waitForTimeout(1000);

    // Get Created by column index and verify all rows show the selected proposer
    const creatorColumnIndex = await getColumnIndex(page, "Created by");
    await checkColumnValues(page, creatorColumnIndex, "megha19.near", true);

    await page.getByRole("button", { name: "is any" }).click();
    await page.getByRole("button", { name: "is not all" }).click();
    await page.waitForTimeout(1000);

    // Verify no rows show the excluded proposer
    await checkColumnValues(page, creatorColumnIndex, "megha19.near", false);
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

    await page.getByRole("button", { name: "is any" }).click();
    await page.getByRole("button", { name: "is not all" }).click();
    await page.waitForTimeout(1000);

    // Verify no rows show the excluded approver
    await checkColumnImages(page, approversColumnIndex, "frol.near", false);
  });

  test("should filter by Members Permissions proposal type", async ({
    page,
  }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Proposal Type",
      isMultiple: true,
    });

    // Select Members Permissions
    await page
      .locator(".dropdown-item")
      .getByText("Members Permissions")
      .click();
    await page.waitForTimeout(2000);

    // Check that we see member-related proposals
    // Look for proposals with titles containing "Members Permissions", "Add New Members", "Edit Members Permissions", or "Remove Members"
    const memberProposals = page.locator(
      "text=/Members Permissions|Add New Members|Edit Members Permissions|Remove Members/"
    );
    await expect(memberProposals.first()).toBeVisible();
  });

  test("should filter by Voting Thresholds proposal type", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Proposal Type",
      isMultiple: true,
    });

    // Select Voting Thresholds
    await page.locator(".dropdown-item").getByText("Voting Thresholds").click();
    await page.waitForTimeout(2000);

    // Check that we see voting threshold proposals
    const thresholdProposals = page.locator("text=/Voting Thresholds/");
    await expect(thresholdProposals.first()).toBeVisible();
  });

  test("should filter by Voting Duration proposal type", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Proposal Type",
      isMultiple: true,
    });

    // Select Voting Duration
    await page.locator(".dropdown-item").getByText("Voting Duration").click();
    await page.waitForTimeout(2000);

    // Check that we see voting duration proposals
    const durationProposals = page.locator("text=/Voting Duration/");
    await expect(durationProposals.first()).toBeVisible();
  });

  test("should filter by Theme & logo proposal type", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Proposal Type",
      isMultiple: true,
    });

    // Select Theme & logo
    await page.locator(".dropdown-item").getByText("Theme & logo").click();
    await page.waitForTimeout(2000);

    // Check that we see theme-related proposals
    const themeProposals = page.locator("text=/Theme & logo/");
    await expect(themeProposals.first()).toBeVisible();
  });

  test("should filter by multiple proposal types", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Proposal Type",
      isMultiple: true,
    });

    // Select multiple types
    await page
      .locator(".dropdown-item")
      .getByText("Members Permissions")
      .click();
    await page.locator(".dropdown-item").getByText("Voting Thresholds").click();
    await page.waitForTimeout(2000);

    // Check that we see proposals from both types
    const memberProposals = page.locator(
      "text=/Members Permissions|Add New Members|Edit Members Permissions|Remove Members/"
    );
    const thresholdProposals = page.locator("text=/Voting Thresholds/");

    // Should see at least one proposal from either type
    const hasMemberProposals = (await memberProposals.count()) > 0;
    const hasThresholdProposals = (await thresholdProposals.count()) > 0;

    expect(hasMemberProposals || hasThresholdProposals).toBeTruthy();
  });

  test("should add and display status filter", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Status",
      isMultiple: false,
    });
    await page.getByText("Executed").first().click();
    await page.waitForTimeout(1000);

    // Get Status column index and verify all rows show the selected status
    const statusColumnIndex = await getColumnIndex(page, "Status");
    await checkColumnValues(page, statusColumnIndex, "Executed", true);

    await page.getByRole("button", { name: "Status : Executed" }).click();
    await page.getByRole("button", { name: "is" }).click();
    await page.getByRole("button", { name: "is not" }).click();
    await page.waitForTimeout(1000);

    // Verify no rows show the excluded status
    await checkColumnValues(page, statusColumnIndex, "Executed", false);
  });

  test("should remove filter when trash icon is clicked", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Created by",
      isMultiple: true,
    });

    await expect(
      page.getByRole("button", { name: "Created by" })
    ).toBeVisible();
    // Click trash icon to remove filter
    await page.locator(".bi.bi-trash").click();

    // Verify filter is removed
    await expect(
      page.getByRole("button", { name: "Created by" })
    ).not.toBeVisible();
  });

  test("should clear all filters when clear button is clicked", async ({
    page,
  }) => {
    await switchToHistoryTab(page);
    // Add multiple filters
    await addFilter(page, {
      filterName: "Created by",
      isMultiple: true,
    });

    // Click clear all button (X button)
    await page.click("button:has(i.bi-x-lg)");

    // Verify all filters are cleared
    await expect(
      page.getByRole("button", { name: "Created by" })
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Proposal Type" })
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
  });

  test("should switch between tabs and verify filters are cleared", async ({
    page,
  }) => {
    // Start on Pending Requests tab
    await switchToPendingRequestsTab(page);

    // Add a filter
    await addFilter(page, {
      filterName: "Created by",
      isMultiple: true,
    });

    // Switch to History tab
    await switchToHistoryTab(page);

    // Verify filter is cleared (should not be visible)
    await expect(
      page.getByRole("button", { name: "Created by" })
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

    await searchInput.fill("314");
    await page.waitForTimeout(3000);

    // Verify ID search results
    const idSearchRows = page.locator("tbody tr");
    const idSearchCount = await idSearchRows.count();

    // Should have exactly 1 result for specific ID
    expect(idSearchCount).toBe(1);
    expect(page.getByRole("cell", { name: "314" })).toBeVisible();

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
    await page.goto(`/${instanceAccount}/widget/app?page=settings`);
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

    // Rejected
    await page
      .getByRole("button", { name: "My Vote Status : Approved" })
      .click();
    await page.getByText("Rejected", { exact: true }).click();
    await page.waitForTimeout(3000);

    await checkVoteStatusWithImages(page, "theori.near", "rejected", true);

    // Not Voted
    await page
      .getByRole("button", { name: "My Vote Status : Rejected" })
      .click();
    await page.getByText("Not Voted", { exact: true }).click();
    await page.waitForTimeout(3000);

    // no approver or reject votes
    await checkVoteStatusWithImages(page, "theori.near", "rejected", false);
    await checkVoteStatusWithImages(page, "theori.near", "approved", false);
  });
});
