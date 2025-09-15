import { test as base } from "@playwright/test";
import fs from "fs";
import path from "path";
import os from "os";

// Global fix for route timing issues with es-module-shims
// This automatically converts page.route() to context.route() for better timing
function enhancePageWithBetterRouting(page) {
  const originalRoute = page.route.bind(page);

  page.route = function (url, handler, options) {
    // This fixes the race condition with es-module-shims in older code
    return page.context().route(url, handler, options);
  };

  page._originalRoute = originalRoute;

  return page;
}

// Enhanced cleanup function to handle route cleanup more robustly
export async function cleanupRoutes(page) {
  try {
    // First, try to unroute all routes with ignoreErrors behavior
    await page.unrouteAll({ behavior: "ignoreErrors" });

    // Also clean up context routes (since we're using context.route in the enhancement)
    const context = page.context();
    if (context && !context.isClosed()) {
      await context.unrouteAll({ behavior: "ignoreErrors" });
    }

    // Give a small delay to let any in-flight requests complete
    await new Promise((resolve) => setTimeout(resolve, 100));
  } catch (error) {
    // Ignore cleanup errors - the page/context might already be closed
    console.warn("Route cleanup warning:", error.message);
  }
}

export const test = base.extend({
  page: async ({ page }, use) => {
    const enhancedPage = enhancePageWithBetterRouting(page);
    await use(enhancedPage);
  },
  instanceAccount: ["treasury-devdao.near", { option: true }],
  daoAccount: ["devdao.sputnik-dao.near", { option: true }],
  lockupContract: [null, { option: true }],
  factoryAccount: ["treasury-factory.near", { option: true }],
});

test.beforeEach(async ({ page }) => {
  await cacheCDN(page);
});
test.afterEach(async ({ page }, testInfo) => {
  // Enhanced route cleanup
  await cleanupRoutes(page);

  const video = await page.video();
  if (video) {
    const titleFile = testInfo.outputPath("test-title.txt");
    await fs.promises.writeFile(titleFile, testInfo.title);
  }
});

/**
 * @param {import('playwright').Page} page - Playwright page object
 */
export async function overlayMessage(page, message) {
  await page.evaluate((message) => {
    const overlay = document.createElement("div");
    overlay.textContent = message;
    overlay.style.position = "fixed";
    overlay.style.top = "50%";
    overlay.style.left = "50%";
    overlay.style.transform = "translate(-50%, -50%)";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    overlay.style.color = "white";
    overlay.style.padding = "20px";
    overlay.style.fontSize = "20px";
    overlay.style.borderRadius = "10px";
    overlay.style.zIndex = "10000";
    overlay.style.animation = "blink 1s infinite";

    const style = document.createElement("style");
    style.textContent = `
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `;
    document.head.appendChild(style);
    document.body.appendChild(overlay);

    window.removeOverlay = () => {
      overlay.remove();
      style.remove();
    };
  }, message);
}

/**
 * @param {import('playwright').Page} page - Playwright page object
 */
export async function removeOverlayMessage(page) {
  await page.evaluate(() => window.removeOverlay());
}

/**
 * Call this to ensure that static cdn data is cached and not re-fetched on page reloads
 * Without this you may run into that the CDN will not serve files because of too many requests
 * @param {import('playwright').Page} page - Playwright page object
 */
export async function cacheCDN(page) {
  const cacheDir = path.join(os.tmpdir(), "cdn-cache");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const cacheRoute = async (url) => {
    await page.route(url, async (route, request) => {
      const urlHash = Buffer.from(request.url()).toString("base64");
      const cacheFilePath = path.join(cacheDir, urlHash);

      if (
        fs.existsSync(cacheFilePath) &&
        fs.existsSync(`${cacheFilePath}.type`)
      ) {
        const cachedContent = await fs.promises.readFile(cacheFilePath);
        const contentType = await fs.promises.readFile(
          `${cacheFilePath}.type`,
          "utf-8"
        );
        try {
          await route.fulfill({
            body: cachedContent,
            headers: { "Content-Type": contentType },
          });
        } catch (e) {
          console.error(e);
        }
      } else {
        const response = await route.fetch();
        const body = await response.body();
        const contentType =
          response.headers()["content-type"] || "application/octet-stream";

        try {
          await fs.promises.writeFile(cacheFilePath, body);
          await fs.promises.writeFile(`${cacheFilePath}.type`, contentType);
        } catch (e) {
          console.warn(e);
        }

        try {
          await route.fulfill({
            body,
            headers: response.headers(),
          });
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  await cacheRoute("https://cdn.jsdelivr.net/**");
  await cacheRoute("https://ga.jspm.io/**");
}
