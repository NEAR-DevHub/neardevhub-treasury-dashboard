import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { redirectWeb4 } from "../../util/web4.js";

test("service worker should not interfere with redirectWeb4 page routes", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);

  const instanceAccountId = "treasury-testing.near";

  // Create a simple test widget that shows "Hello World"
  const modifiedWidgets = {};
  const appKey = `${instanceAccountId}/widget/app`;
  modifiedWidgets[appKey] = `
    return (
      <div style={{ padding: '20px', fontSize: '24px', color: 'green' }}>
        Hello World from Modified Widget
      </div>
    );
  `;

  // Set up redirectWeb4 with modified widget
  await redirectWeb4({
    contractId: instanceAccountId,
    page,
    widgetNodeUrl: "https://rpc.mainnet.fastnear.com",
    modifiedWidgets,
    callWidgetNodeURLForContractWidgets: false,
  });

  // Navigate to the instance page
  await page.goto(`https://${instanceAccountId}.page`);

  // Wait for content to load
  await page.waitForTimeout(3000);

  // Check if service worker is registered
  const hasServiceWorker = await page.evaluate(() => {
    return (
      navigator.serviceWorker && navigator.serviceWorker.controller !== null
    );
  });

  console.log(`Service worker active: ${hasServiceWorker}`);

  // Check if our modified widget content is displayed
  const modifiedContentVisible = await page
    .getByText("Hello World from Modified Widget")
    .isVisible()
    .catch(() => false);

  console.log(`Modified widget content visible: ${modifiedContentVisible}`);

  // If service worker is not interfering, we should see our modified widget
  expect(modifiedContentVisible).toBe(true);

  // Additional check - ensure the page doesn't show cached/default content
  const pageContent = await page.content();
  expect(pageContent).toContain("Hello World from Modified Widget");

  // Reload to double-check service worker isn't serving cached content
  await page.reload();
  await page.waitForTimeout(2000);

  const stillVisible = await page
    .getByText("Hello World from Modified Widget")
    .isVisible()
    .catch(() => false);
  expect(stillVisible).toBe(true);

  if (hasServiceWorker) {
    console.log(
      "Service worker is active but redirectWeb4 routes are working correctly"
    );
  }
});
