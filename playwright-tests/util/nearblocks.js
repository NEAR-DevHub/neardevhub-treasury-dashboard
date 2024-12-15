/**
 * Mocks the NEAR price on a given page.
 * @param {Object} params - The parameters for the function.
 * @param {number} params.nearPrice - The NEAR price as a floating-point number.
 * @param {import('playwright').Page} params.page - The Playwright Page instance.
 * @returns {Promise<void>} A promise that resolves when the mock is complete.
 */
export async function mockNearPrice({ nearPrice, page }) {
  await page.route(
    "https://api.coingecko.com/api/v3/simple/price?ids=near&vs_currencies=usd",
    async (route) => {
      let json = { near: { usd: nearPrice } };

      await route.fulfill({ json });
    }
  );
}
