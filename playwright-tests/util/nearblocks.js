/**
 * Mocks the NEAR price on a given page.
 * @param {Object} params - The parameters for the function.
 * @param {number} params.nearPrice - The NEAR price as a floating-point number.
 * @param {import('playwright').Page} params.page - The Playwright Page instance.
 * @returns {Promise<void>} A promise that resolves when the mock is complete.
 */
export async function mockNearPrice({ nearPrice, page }) {
  await page.route(
    "https://api3.nearblocks.io/v1/charts/latest",
    async (route) => {
      let json = {
        charts: [
          {
            date: "2024-10-12T00:00:00.000Z",
            near_price: nearPrice.toString(),
            txns: "6113720",
          },
        ],
      };
      await route.fulfill({ json });
    }
  );
}
