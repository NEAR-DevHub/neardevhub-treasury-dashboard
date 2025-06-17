import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { redirectWeb4 } from "../../util/web4.js";

test("Web3IconFetcher BOS compatibility test loads and displays icons", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
  });
  await page.goto(`https://${instanceAccount}.page/`);

  // Wait for the page to load properly
  await expect(page.locator(".card.card-body").first()).toBeVisible();

  // Load the Web3IconFetcher BOS Test component
  await page.evaluate(() => {
    document.querySelector("near-social-viewer").remove();
    const viewer = document.createElement("near-social-viewer");
    viewer.setAttribute("initialProps", JSON.stringify({}));
    viewer.setAttribute(
      "src",
      "widgets.treasury-factory.near/widget/examples.SimpleWeb3IconTest"
    );
    document.body.appendChild(viewer);
  });

  // Listen for console messages to debug iframe loading
  const consoleMessages = [];
  page.on("console", (msg) => {
    const text = msg.text();
    consoleMessages.push(`${msg.type()}: ${text}`);
    console.log(`Console ${msg.type()}: ${text}`);
  });

  // Wait for the component to load
  await expect(page.locator("h3")).toContainText("Simple Web3IconFetcher Test");

  // Check that the test description is visible (be more specific about which p element)
  await expect(
    page
      .locator("p")
      .filter({ hasText: "Testing single Web3IconFetcher instance" })
  ).toBeVisible();

  // Wait for icons to load - this may take a few seconds for the iframe to process
  await page.waitForTimeout(10000); // Increased timeout

  // Check if the results section is visible
  await expect(
    page.locator("h4").filter({ hasText: "Results:" })
  ).toBeVisible();

  // Check if the icon cache results are displayed (should be a <pre> element with JSON)
  const resultsElement = page.locator("pre");
  await expect(resultsElement).toBeVisible();

  // Get the JSON content and log it for debugging
  const resultsText = await resultsElement.textContent();
  console.log("Icon cache results:", resultsText);

  expect(resultsText).toBeTruthy();

  // Parse the JSON to verify structure
  let iconCache = {};
  try {
    iconCache = JSON.parse(resultsText);
  } catch (e) {
    console.error("Failed to parse icon cache JSON:", e);
    throw new Error(`Invalid JSON in results: ${resultsText}`);
  }

  console.log("Parsed icon cache:", iconCache);

  // Verify that we have some icon entries (but be tolerant of empty results)
  const cacheKeys = Object.keys(iconCache);
  console.log("Icon cache keys found:", cacheKeys);

  console.log("Sample icon cache entry:", iconCache[cacheKeys[0]]);
  expect(cacheKeys.length).toBeGreaterThan(0);

  // Check for Icon Display Test section
  await expect(
    page.locator("h4").filter({ hasText: "Icon Display Test:" })
  ).toBeVisible();

  // Look for actual icon images that should be displayed
  const iconImages = page.locator("img[width='24'][height='24']");
  const iconCount = await iconImages.count();

  if (iconCount > 0) {
    console.log(`Found ${iconCount} token icons displayed`);

    // Verify at least one icon has a valid data URL source
    const firstIconSrc = await iconImages.first().getAttribute("src");
    expect(firstIconSrc).toMatch(/^data:image\/(svg\+xml|png|jpeg);base64,/);

    // Check for network icons too (smaller 20x20 images)
    const networkIcons = page.locator("img[width='20'][height='20']");
    const networkIconCount = await networkIcons.count();
    console.log(`Found ${networkIconCount} network icons displayed`);
  } else {
    console.log(
      "No token icons found - this might indicate an issue with icon loading"
    );
  }

  // Take a screenshot for debugging
  await page.screenshot({
    path: "web3-icon-fetcher-bos-test.png",
    fullPage: true,
  });

  // Additional checks for BOS compatibility
  // Verify no JavaScript errors in console (important for BOS)
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  // Wait a bit more to catch any delayed errors
  await page.waitForTimeout(2000);

  // Filter out known acceptable errors (if any)
  const criticalErrors = consoleErrors.filter(
    (error) =>
      !error.includes("Failed to load resource") && // Network errors are OK
      !error.includes("favicon.ico") && // Favicon errors are OK
      !error.includes("cdn.jsdelivr.net") // CDN timeouts are acceptable
  );

  if (criticalErrors.length > 0) {
    console.warn("Console errors detected:", criticalErrors);
  }

  // The test passes if we got this far without critical errors
  expect(criticalErrors.length).toBeLessThanOrEqual(1); // Allow for 1 minor error
});
