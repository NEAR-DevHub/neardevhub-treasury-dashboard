import { expect } from "@playwright/test";

// Helper function to get column index by header text
export async function getColumnIndex(page, columnName) {
  const headers = page.locator("thead tr td");
  const count = await headers.count();

  for (let i = 0; i < count; i++) {
    const headerText = await headers.nth(i).textContent();
    if (headerText.includes(columnName)) {
      return i;
    }
  }
  return -1;
}

// Helper function to check all rows in a specific column contain expected value
export async function checkColumnValues(
  page,
  columnIndex,
  expectedValue,
  shouldContain = true
) {
  const rows = page.locator("tbody tr");
  const rowCount = await rows.count();

  for (let i = 0; i < rowCount; i++) {
    const cell = rows.nth(i).locator("td").nth(columnIndex);
    const cellText = await cell.textContent();

    if (shouldContain) {
      expect(cellText).toContain(expectedValue);
    } else {
      expect(cellText).not.toContain(expectedValue);
    }
  }
}

// Helper function to check all rows in a specific column contain background images with expected account ID
export async function checkColumnImages(
  page,
  columnIndex,
  accountId,
  shouldContain = true
) {
  const rows = page.locator("tbody tr");
  const rowCount = await rows.count();

  for (let i = 0; i < rowCount; i++) {
    const cell = rows.nth(i).locator("td").nth(columnIndex);
    // Look for elements with background images (like ApprovalImage components)
    const elementsWithBg = cell.locator("[style*='background-image']");
    const elementCount = await elementsWithBg.count();

    if (shouldContain) {
      // Check that at least one element contains the account ID in its background-image style
      let foundElement = false;
      for (let j = 0; j < elementCount; j++) {
        const style = await elementsWithBg.nth(j).getAttribute("style");
        if (style && style.includes(accountId)) {
          foundElement = true;
          break;
        }
      }
      expect(foundElement).toBe(true);
    } else {
      // Check that no element contains the account ID in its background-image style
      let foundElement = false;
      for (let j = 0; j < elementCount; j++) {
        const style = await elementsWithBg.nth(j).getAttribute("style");
        if (style && style.includes(accountId)) {
          foundElement = true;
          break;
        }
      }
      expect(foundElement).toBe(false);
    }
  }
}

// Helper function to check vote status with background images and icon paths in approvers column
export async function checkVoteStatusWithImages(
  page,
  accountId,
  voteStatus,
  shouldContain = true
) {
  const testConstants = {
    approvedIconPath: "M14 7L8.5 12.5L6 10",
    rejectedIconPath: "M13.5 7L7.5 13",
  };

  let iconPath;
  if (voteStatus === "approved") {
    iconPath = testConstants.approvedIconPath;
  } else if (voteStatus === "rejected") {
    iconPath = testConstants.rejectedIconPath;
  } else {
    throw new Error("voteStatus must be 'approved' or 'rejected'");
  }

  // Get the Approvers column index
  const approversColumnIndex = await getColumnIndex(page, "Approvers");

  // Look for elements with background image containing account ID and specific icon path in the approvers column
  const rows = page.locator("tbody tr");
  const rowCount = await rows.count();

  let foundElement = false;
  for (let i = 0; i < rowCount; i++) {
    const cell = rows.nth(i).locator("td").nth(approversColumnIndex);
    const elements = cell.locator(
      `[style*='background-image'][style*='${accountId}']:has(path[d="${iconPath}"])`
    );
    const count = await elements.count();
    if (count > 0) {
      foundElement = true;
      break;
    }
  }

  if (shouldContain) {
    expect(foundElement).toBe(true);
  } else {
    expect(foundElement).toBe(false);
  }
}

// Helper function to open filters panel
export async function openFiltersPanel(page) {
  await page.click("button:has(i.bi-funnel)");
  await expect(page.locator("text=Add Filter")).toBeVisible();
}

// Helper function to check export URL contains correct filter parameters
export async function checkExportUrlWithFilters(
  page,
  expectedParams,
  category
) {
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
  expect(allHref).toContain(`?category=${category}`);

  const allUrl = new URL(allHref);
  const allQueryParams = new URLSearchParams(allUrl.search);

  expect(allQueryParams.size).toBe(1);
  expect(allQueryParams.get("category")).toBe(category);

  // Check that the URL contains the expected parameters
  for (const [param, value] of Object.entries(expectedParams)) {
    // Parse the href URL to get the actual parameter values
    const url = new URL(href);
    const queryParams = new URLSearchParams(url.search);
    const actualValue = queryParams.get(param);
    expect(actualValue).toBe(value);
  }
}

// Helper function to check all rows in a specific column contain amounts with expected operator
export async function checkColumnAmounts(page, columnIndex, amount, operator) {
  const rows = page.locator("tbody tr");
  const rowCount = await rows.count();

  for (let i = 0; i < rowCount; i++) {
    const cell = rows.nth(i).locator("td").nth(columnIndex);
    const cellText = await cell.textContent();
    const num = parseFloat(cellText.replace(/,/g, "")); // normalize

    if (!isNaN(num)) {
      if (operator === ">") {
        expect(num).toBeGreaterThanOrEqual(amount);
      } else if (operator === "<") {
        expect(num).toBeLessThanOrEqual(amount);
      } else if (operator === "=") {
        expect(num).toBe(amount);
      }
    }
  }
}

// Helper function to add a specific filter
export async function addFilter(page, options) {
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
export async function switchToHistoryTab(page) {
  await page.click("text=History");
  await page.waitForTimeout(5_000);
}

// Helper function to switch to Pending Requests tab
export async function switchToPendingRequestsTab(page) {
  await page.click("text=Pending Requests");
  await page.waitForTimeout(5_000);
}

// Helper function to check all rows in a specific column contain dates within a range
export async function checkColumnDateRange(
  page,
  columnIndex,
  startDate,
  endDate,
  shouldContain = true
) {
  const rows = page.locator("tbody tr");
  const rowCount = await rows.count();

  for (let i = 0; i < rowCount; i++) {
    const cell = rows.nth(i).locator("td").nth(columnIndex);
    const cellText = await cell.textContent();

    // Extract date from cell text (format: ":17 18 Jul 2025" -> "18 Jul 2025")
    const raw = cellText.trim();
    const datePart = raw.split(" ").slice(1).join(" ");
    const parsedDate = new Date(datePart);

    if (shouldContain) {
      expect(parsedDate >= startDate && parsedDate <= endDate).toBeTruthy();
    } else {
      expect(parsedDate < startDate || parsedDate > endDate).toBeTruthy();
    }
  }
}
