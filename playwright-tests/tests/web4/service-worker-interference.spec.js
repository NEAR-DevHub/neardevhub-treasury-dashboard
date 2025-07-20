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

  // Track requests to see where they're coming from
  const requestsFromServiceWorker = [];
  const requestsFromPage = [];

  // Set up context.route to intercept all requests for monitoring
  await context.route("**", async (route) => {
    const request = route.request();
    const url = request.url();

    if (request.serviceWorker()) {
      requestsFromServiceWorker.push({
        url,
        method: request.method(),
        postData: request.method() === "POST" ? request.postDataJSON() : null,
      });
      console.log(`🔧 Request from Service Worker: ${request.method()} ${url}`);
    } else {
      requestsFromPage.push({
        url,
        method: request.method(),
      });
      console.log(`📄 Request from Page: ${request.method()} ${url}`);
    }

    // Don't continue here - let redirectWeb4 handle the routing
    await route.continue();
  });

  // Set up redirectWeb4 with modified widget and service worker enabled
  await redirectWeb4({
    contractId: instanceAccountId,
    page,
    widgetNodeUrl: "https://rpc.mainnet.fastnear.com",
    modifiedWidgets,
    callWidgetNodeURLForContractWidgets: false,
    disableServiceWorker: false, // Allow service worker for this test
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

  // Log request analysis BEFORE the assertion so we always see it
  console.log("\n📊 Request Analysis:");
  console.log(
    `Total requests from Service Worker: ${requestsFromServiceWorker.length}`
  );
  console.log(`Total requests from Page: ${requestsFromPage.length}`);

  // Show some example requests from service worker
  if (requestsFromServiceWorker.length > 0) {
    console.log("\n🔧 Sample Service Worker requests:");
    requestsFromServiceWorker.slice(0, 5).forEach((req) => {
      console.log(`  - ${req.method} ${req.url}`);
      if (
        req.postData &&
        req.postData.params &&
        req.postData.params.account_id
      ) {
        console.log(`    Account: ${req.postData.params.account_id}`);
      }
    });
  }

  // Check if social.near requests are being intercepted by service worker
  const socialNearRequestsFromSW = requestsFromServiceWorker.filter(
    (req) =>
      req.postData &&
      req.postData.params &&
      req.postData.params.account_id === "social.near"
  );

  console.log(
    `\n📱 social.near requests from Service Worker: ${socialNearRequestsFromSW.length}`
  );

  // Check the actual assertion after logging
  expect(stillVisible).toBe(true);

  if (hasServiceWorker) {
    console.log(
      "Service worker is active but redirectWeb4 routes are working correctly"
    );
  }

  // This will help us understand if the service worker is intercepting the requests
  // that should be handled by redirectWeb4's custom routes
});
