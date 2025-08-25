/**
 * Utility functions for mocking themes in tests
 */

/**
 * Sets up theme mocking for treasury dashboard instances
 *
 * IMPORTANT: This function must be called AFTER redirectWeb4() to ensure
 * the mock routes can override the RPC routes set by redirectWeb4.
 *
 * @param {Page} page - Playwright page object
 * @param {string} theme - Theme to mock ("light" or "dark")
 * @param {string} primaryColor - Primary color for the theme (default: "#01BF7A")
 */
export async function mockTheme(
  page,
  theme = "light",
  primaryColor = "#01BF7A"
) {
  // Define the RPC handler for theme mocking
  const handleThemeRpc = async (route, request) => {
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      // Check if this is a get_config call to a DAO account
      if (
        body.params?.method_name === "get_config" &&
        body.params?.account_id?.includes(".sputnik-dao.near")
      ) {
        console.log(
          `Mocking theme for DAO: ${body.params.account_id} with theme: ${theme}`
        );

        // Mock the entire config response
        const mockConfig = {
          name: body.params.account_id,
          purpose: "Treasury DAO",
          metadata: btoa(
            JSON.stringify({
              theme,
              primaryColor,
            })
          ),
        };

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: {
              result: Array.from(
                new TextEncoder().encode(JSON.stringify(mockConfig))
              ),
            },
          }),
        });
        return;
      }
    }
    // Use fallback to let redirectWeb4 handle other requests
    await route.fallback();
  };

  // Mock the specific RPC endpoints that are used
  // IMPORTANT: These must be set up BEFORE redirectWeb4
  await page.route("https://rpc.mainnet.near.org", handleThemeRpc);
  await page.route("https://rpc.mainnet.fastnear.com", handleThemeRpc);

  // Also mock on context level to catch service worker requests
  const context = page.context();
  await context.route("https://rpc.mainnet.near.org", handleThemeRpc);
  await context.route("https://rpc.mainnet.fastnear.com", handleThemeRpc);
}

/**
 * Removes theme mocking routes
 * @param {Page} page - Playwright page object
 */
export async function unmockTheme(page) {
  await page.unroute("https://rpc.mainnet.near.org");
  await page.unroute("https://rpc.mainnet.fastnear.com");

  const context = page.context();
  await context.unroute("https://rpc.mainnet.near.org");
  await context.unroute("https://rpc.mainnet.fastnear.com");
}

/**
 * Helper to verify theme colors are applied
 * @param {Page} page - Playwright page object
 * @param {string} selector - CSS selector for the element to check
 * @returns {Object} Theme color values
 */
export async function getThemeColors(page, selector) {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return null;

    const styles = window.getComputedStyle(element);
    return {
      bgPageColor: styles.getPropertyValue("--bg-page-color"),
      bgSystemColor: styles.getPropertyValue("--bg-system-color"),
      textColor: styles.getPropertyValue("--text-color"),
      textSecondaryColor: styles.getPropertyValue("--text-secondary-color"),
      borderColor: styles.getPropertyValue("--border-color"),
      themeColor: styles.getPropertyValue("--theme-color"),
      // Computed styles
      backgroundColor: styles.backgroundColor,
      color: styles.color,
    };
  }, selector);
}

/**
 * Expected theme colors for validation
 */
export const THEME_COLORS = {
  light: {
    bgPageColor: "#FFFFFF",
    bgSystemColor: "#f4f4f4",
    textColor: "#1B1B18",
    textSecondaryColor: "#999999",
    borderColor: "rgba(226, 230, 236, 1)",
  },
  dark: {
    bgPageColor: "#222222",
    bgSystemColor: "#131313",
    textColor: "#CACACA",
    textSecondaryColor: "#878787",
    borderColor: "#3B3B3B",
  },
};
