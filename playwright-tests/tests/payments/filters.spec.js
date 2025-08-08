import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

// Helper function to open filters panel
async function openFiltersPanel(page) {
  await page.click("button:has(i.bi-funnel)");
  await expect(page.locator("text=Add Filter")).toBeVisible();
}

// Helper function to check export URL contains correct filter parameters
async function checkExportUrlWithFilters(page, expectedParams) {
  // Verify export dropdown exists (when filters are active)
  const exportDropdown = page.locator("button:has(i.bi-download)");
  await expect(exportDropdown).toBeVisible();

  // Should be a dropdown when filters are active
  await expect(exportDropdown).toHaveAttribute("data-bs-toggle", "dropdown");

  const filteredLink = page.getByTestId("export-filtered");
  const allLink = page.getByTestId("export-all");

  await expect(filteredLink).toBeAttached();
  await expect(allLink).toBeAttached();

  const href = await filteredLink.getAttribute("href");
  const allHref = await allLink.getAttribute("href");

  // Check that allHref only contains category parameter
  expect(allHref).toContain("?category=payments");

  const allUrl = new URL(allHref);
  const allQueryParams = new URLSearchParams(allUrl.search);

  expect(allQueryParams.size).toBe(1);
  expect(allQueryParams.get("category")).toBe("payments");

  // Check that the URL contains the expected parameters
  for (const [param, value] of Object.entries(expectedParams)) {
    // Parse the href URL to get the actual parameter values
    const url = new URL(href);
    const queryParams = new URLSearchParams(url.search);
    const actualValue = queryParams.get(param);
    expect(actualValue).toBe(value);
  }
}

async function checkAllAmountCells(page, amount, operator) {
  const cells = await page.getByRole("cell", { name: /not defined/ }).all();

  for (const cell of cells) {
    const text = await cell.textContent();
    const num = parseFloat(text.replace(/,/g, "")); // normalize
    if (operator === ">") {
      if (!isNaN(num)) {
        expect(num).toBeGreaterThanOrEqual(amount);
      }
    } else if (operator === "<") {
      if (!isNaN(num)) {
        expect(num).toBeLessThanOrEqual(amount);
      }
    } else if (operator === "=") {
      if (!isNaN(num)) {
        expect(num).toBe(amount);
      }
    }
  }
}

// Helper function to add a specific filter
async function addFilter(page, options) {
  const { filterName, isMultiple = true } = options;

  await openFiltersPanel(page);
  await page.click("text=Add Filter");
  await page.getByRole("button", { name: filterName }).click();
  await page.getByRole("button", { name: filterName }).click();

  if (isMultiple) {
    await expect(page.getByRole("button", { name: "is any" })).toBeVisible();
  } else {
    await expect(
      page.getByRole("button", { name: "is any" })
    ).not.toBeVisible();
  }
}

// Helper function to switch to History tab
async function switchToHistoryTab(page) {
  await page.click("text=History");
  await page.waitForLoadState("networkidle");
}

// Helper function to switch to Pending Requests tab
async function switchToPendingRequestsTab(page) {
  await page.click("text=Pending Requests");
  await page.waitForLoadState("networkidle");
}

test.describe("Payments Filters", () => {
  test.beforeEach(async ({ page, instanceAccount }) => {
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    await page.waitForLoadState("networkidle");
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

    // Open filters panel
    await page.click("button:has(i.bi-funnel)");

    // Click Add Filter dropdown
    await page.click("text=Add Filter");

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
    const recipientCells = page.getByRole("cell", {
      name: "Megha @megha19.near",
    });
    await expect(recipientCells).toHaveCount(10);

    // Check export URL contains recipient filter
    await checkExportUrlWithFilters(page, {
      recipients: "megha19.near",
    });

    // check for not
    await page.getByRole("button", { name: "is any" }).click();
    await page.getByRole("button", { name: "is not all" }).click();
    await page.waitForTimeout(1000);
    const recipientCellsNotAll = page.getByRole("cell", {
      name: "Megha @megha19.near",
    });
    await expect(recipientCellsNotAll).toHaveCount(0);

    // Check export URL contains recipient_not filter
    await checkExportUrlWithFilters(page, {
      recipients_not: "megha19.near",
    });
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
    const tokenCells = page.getByRole("cell", { name: "USDC" });
    await expect(tokenCells).toHaveCount(10);
    await expect(
      page.getByRole("button", { name: "Token : not defined USDC" })
    ).toBeVisible();

    // Check export URL contains token filter
    await checkExportUrlWithFilters(page, {
      tokens:
        "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
    });

    // Amount filter :
    // 1) between
    await expect(page.getByRole("button", { name: "Between" })).toBeVisible();
    await page.getByPlaceholder("0").first().fill("100");
    await page.getByPlaceholder("0").nth(1).fill("200");
    await expect(
      page.getByRole("button", { name: "Token : not defined 100-200" })
    ).toBeVisible();
    await page.waitForTimeout(3000);
    await checkAllAmountCells(page, 100, ">");
    await checkAllAmountCells(page, 200, "<");

    // Check export URL contains amount range
    await checkExportUrlWithFilters(page, {
      tokens:
        "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
      amount_min: "100",
      amount_max: "200",
    });

    // 2) Is
    await page.getByRole("button", { name: "Between" }).click();
    await page.getByText("Is", { exact: true }).click();
    await page.getByPlaceholder("0").fill("100");
    await expect(
      page.getByRole("button", { name: "Token : not defined 100 USDC" })
    ).toBeVisible();
    await page.waitForTimeout(3000);
    await checkAllAmountCells(page, 100, "=");

    // Check export URL contains amount equal
    await checkExportUrlWithFilters(page, {
      tokens:
        "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
      amount_equal: "100",
    });

    // 3) less than
    await page.getByRole("button", { name: "Is", exact: true }).click();
    await page.getByText("Less than").click();
    await page.getByPlaceholder("0").fill("200");
    await expect(
      page.getByRole("button", { name: "Token : not defined < 200 USDC" })
    ).toBeVisible();
    await page.waitForTimeout(3000);
    await checkAllAmountCells(page, 200, "<");

    // Check export URL contains amount max
    await checkExportUrlWithFilters(page, {
      tokens:
        "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
      amount_max: "200",
    });

    // 4) More than
    await page.getByRole("button", { name: "Less than" }).click();
    await page.getByText("More than").click();
    await page.getByPlaceholder("0").fill("100");
    await expect(
      page.getByRole("button", { name: "Token : not defined > 100 USDC" })
    ).toBeVisible();
    await page.waitForTimeout(3000);
    await checkAllAmountCells(page, 100, ">");

    // Check export URL contains amount min
    await checkExportUrlWithFilters(page, {
      tokens:
        "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
      amount_min: "100",
    });
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
    const proposerCells = await page
      .getByText("petersalomonsen.near", {
        exact: true,
      })
      .count();

    expect(proposerCells).toBeGreaterThanOrEqual(6);

    // Check export URL contains proposer filter
    await checkExportUrlWithFilters(page, {
      proposers: "petersalomonsen.near",
    });

    await page.getByRole("button", { name: "is any" }).click();
    await page.getByRole("button", { name: "is not all" }).click();
    await page.waitForTimeout(1000);
    const proposerCellsNotAll = page.getByText("petersalomonsen.near", {
      exact: true,
    });
    await expect(proposerCellsNotAll).toHaveCount(0);

    // Check export URL contains proposer_not filter
    await checkExportUrlWithFilters(page, {
      proposers_not: "petersalomonsen.near",
    });
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
    const approverImageCells = await page
      .locator(
        'div[data-component="test-widgets.treasury-factory.near/widget/components.Approvers"][style*="https://i.near.social/magic/large/https://near.social/magic/img/account/frol.near"]'
      )
      .count();

    expect(approverImageCells).toBeGreaterThanOrEqual(3);

    // Check export URL contains approver filter
    await checkExportUrlWithFilters(page, {
      approvers: "frol.near",
    });

    await page.getByRole("button", { name: "is any" }).click();
    await page.getByRole("button", { name: "is not all" }).click();
    await page.waitForTimeout(1000);
    const approverCellsNotAll = await page
      .locator(
        'div[data-component="test-widgets.treasury-factory.near/widget/components.Approvers"][style*="https://i.near.social/magic/large/https://near.social/magic/img/account/frol.near"]'
      )
      .count();

    expect(approverCellsNotAll).toBe(0);

    // Check export URL contains approver_not filter
    await checkExportUrlWithFilters(page, {
      approvers_not: "frol.near",
    });
  });

  test("should add and display status filter", async ({ page }) => {
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "Status",
      isMultiple: false,
    });
    await page.getByText("Funded").first().click();
    await page.waitForTimeout(1000);
    const statusCells = await page
      .getByRole("cell", { name: "Funded" })
      .count();
    expect(statusCells).toBeGreaterThanOrEqual(10);

    // Check export URL contains status filter
    await checkExportUrlWithFilters(page, {
      statuses: "Approved",
    });

    await page.getByRole("button", { name: "Status : Funded" }).click();
    await page.getByRole("button", { name: "is" }).click();
    await page.getByRole("button", { name: "is not" }).click();
    await page.waitForTimeout(1000);
    const statusCellsNotAll = await page
      .getByRole("cell", { name: "Funded" })
      .count();
    expect(statusCellsNotAll).toBe(0);

    // Check export URL contains status filter (excluding Approved)
    await checkExportUrlWithFilters(page, {
      statuses: "Rejected,Failed,Expired",
    });
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

    const createdDateCells = await page
      .getByRole("cell", { name: /:\d+\s+\d{1,2} \w{3} \d{4}/ })
      .all();

    for (const cell of createdDateCells) {
      const raw = (await cell.textContent()).trim(); // e.g. ":17 18 Jul 2025"

      // Extract the date part (everything after the first space)
      const datePart = raw.split(" ").slice(1).join(" "); // "18 Jul 2025"

      const parsedDate = new Date(datePart);

      expect(parsedDate >= startDate && parsedDate <= endDate).toBeTruthy();
    }

    // Check export URL contains date range
    await checkExportUrlWithFilters(page, {
      created_date_from: "2024-01-01",
      created_date_to: "2024-12-31",
    });
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

    // Step 1: Search by title
    await searchInput.fill("megha");
    await page.waitForTimeout(3000);

    // Verify title search results
    const titleSearchRows = page.locator("tbody tr");
    const titleSearchCount = await titleSearchRows.count();
    expect(titleSearchCount).toBeGreaterThan(0);

    // Verify that results contain "megha"
    const meghaCells = page.getByRole("cell", { name: /megha/i });
    const meghaCellCount = await meghaCells.count();
    expect(meghaCellCount).toBeGreaterThanOrEqual(6);

    // Check CSV export URL contains search parameter
    await checkExportUrlWithFilters(page, {
      search: "megha",
    });

    // Step 2: Search by specific ID

    await searchInput.fill("124");
    await page.waitForTimeout(3000);

    // Verify ID search results
    const idSearchRows = page.locator("tbody tr");
    const idSearchCount = await idSearchRows.count();

    // Should have exactly 1 result for specific ID
    expect(idSearchCount).toBe(1);
    expect(page.getByRole("cell", { name: "124" })).toBeVisible();

    // Check CSV export URL contains search parameter for ID
    await checkExportUrlWithFilters(page, {
      search: "124",
    });

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
    // Constants for this test
    const testConstants = {
      theoriAccountImage:
        "https://i.near.social/magic/large/https://near.social/magic/img/account/theori.near",
      approvedIconPath: "M14 7L8.5 12.5L6 10",
      rejectedIconPath: "M13.5 7L7.5 13",
    };

    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    await page.waitForLoadState("networkidle");
    await switchToHistoryTab(page);
    await addFilter(page, {
      filterName: "My Vote Status",
      isMultiple: false,
    });
    // Approved
    await page.getByText("Approved", { exact: true }).click();
    await page.waitForTimeout(3000);
    const approverImageLocator = await page
      .locator(
        `div:has(img[src="${testConstants.theoriAccountImage}"]):has(path[d="${testConstants.approvedIconPath}"])`
      )
      .count();
    expect(approverImageLocator).toBe(10);

    // Check export URL contains approved vote filter
    await checkExportUrlWithFilters(page, {
      voter_votes: "theori.near:approved",
    });

    // Rejected
    await page
      .getByRole("button", { name: "My Vote Status : Approved" })
      .click();
    await page.getByText("Rejected", { exact: true }).click();
    await page.waitForTimeout(3000);

    const rejectedImageLocator = await page
      .locator(
        `div:has(img[src="${testConstants.theoriAccountImage}"]):has(path[d="${testConstants.rejectedIconPath}"])`
      )
      .count();
    await expect(rejectedImageLocator).toBeGreaterThanOrEqual(2);

    // Check export URL contains rejected vote filter
    await checkExportUrlWithFilters(page, {
      voter_votes: "theori.near:rejected",
    });

    // Awaiting Decision
    await page
      .getByRole("button", { name: "My Vote Status : Rejected" })
      .click();
    await page.getByText("Not Voted", { exact: true }).click();
    await page.waitForTimeout(3000);
    // no approver or reject votes
    await expect(
      page.locator(
        `div:has(img[src="${testConstants.theoriAccountImage}"]):has(path[d="${testConstants.rejectedIconPath}"])`
      )
    ).toHaveCount(0);

    await expect(
      page.locator(
        `div:has(img[src="${testConstants.theoriAccountImage}"]):has(path[d="${testConstants.approvedIconPath}"])`
      )
    ).toHaveCount(0);

    // Check export URL contains approvers_not filter for "Not Voted"
    await checkExportUrlWithFilters(page, {
      approvers_not: "theori.near",
    });
  });
});
