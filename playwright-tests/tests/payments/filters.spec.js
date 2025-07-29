import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

// Helper function to open filters panel
async function openFiltersPanel(page) {
  await page.click("button:has(i.bi-funnel)");
  await expect(page.locator("text=Add Filter")).toBeVisible();
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
    // check for not
    await page.getByRole("button", { name: "is any" }).click();
    await page.getByRole("button", { name: "is not all" }).click();
    await page.waitForTimeout(1000);
    const recipientCellsNotAll = page.getByRole("cell", {
      name: "Megha @megha19.near",
    });
    await expect(recipientCellsNotAll).toHaveCount(0);
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

    // 2) Is
    await page.getByRole("button", { name: "Between" }).click();
    await page.getByText("Is", { exact: true }).click();
    await page.getByPlaceholder("0").fill("100");
    await expect(
      page.getByRole("button", { name: "Token : not defined 100 USDC" })
    ).toBeVisible();
    await page.waitForTimeout(3000);
    await checkAllAmountCells(page, 100, "=");

    // 3) less than
    await page.getByRole("button", { name: "Is", exact: true }).click();
    await page.getByText("Less than").click();
    await page.getByPlaceholder("0").fill("200");
    await expect(
      page.getByRole("button", { name: "Token : not defined < 200 USDC" })
    ).toBeVisible();
    await page.waitForTimeout(3000);
    await checkAllAmountCells(page, 200, "<");

    // 4) More than
    await page.getByRole("button", { name: "Less than" }).click();
    await page.getByText("More than").click();
    await page.getByPlaceholder("0").fill("100");
    await expect(
      page.getByRole("button", { name: "Token : not defined > 100 USDC" })
    ).toBeVisible();
    await page.waitForTimeout(3000);
    await checkAllAmountCells(page, 100, ">");
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
    await page.getByRole("button", { name: "is any" }).click();
    await page.getByRole("button", { name: "is not all" }).click();
    await page.waitForTimeout(1000);
    const proposerCellsNotAll = page.getByText("petersalomonsen.near", {
      exact: true,
    });
    await expect(proposerCellsNotAll).toHaveCount(0);
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
    await page.getByRole("button", { name: "is any" }).click();
    await page.getByRole("button", { name: "is not all" }).click();
    await page.waitForTimeout(1000);
    const approverCellsNotAll = await page
      .locator(
        'div[data-component="test-widgets.treasury-factory.near/widget/components.Approvers"][style*="https://i.near.social/magic/large/https://near.social/magic/img/account/frol.near"]'
      )
      .count();

    expect(approverCellsNotAll).toBe(0);
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
    await page.getByRole("button", { name: "Status : Approved" }).click();
    await page.getByRole("button", { name: "is" }).click();
    await page.getByRole("button", { name: "is not" }).click();
    await page.waitForTimeout(1000);
    const statusCellsNotAll = await page
      .getByRole("cell", { name: "Funded" })
      .count();
    expect(statusCellsNotAll).toBe(0);
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
    await expect(approverImageLocator).toBe(11);

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

    // Awaiting Decision
    await page
      .getByRole("button", { name: "My Vote Status : Rejected" })
      .click();
    await page.getByText("Awaiting Decision", { exact: true }).click();
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
  });
});
