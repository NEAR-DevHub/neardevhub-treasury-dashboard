/**
 * Mocks the NEAR price on a given page.
 * @param {Object} params - The parameters for the function.
 * @param {number} params.nearPrice - The NEAR price as a floating-point number.
 * @param {import('playwright').Page} params.page - The Playwright Page instance.
 * @returns {Promise<void>} A promise that resolves when the mock is complete.
 */
export async function mockNearPrice({
  daoAccount,
  nearPrice,
  page,
  returnError,
}) {
  await page.route(
    (daoAccount.includes("testing")
      ? `https://ref-sdk-test-cold-haze-1300-2.fly.dev`
      : `https://ref-sdk-api-2.fly.dev`) + `/api/near-price`,
    async (route) => {
      if (returnError) {
        // Simulate an error response
        await route.fulfill({
          status: 500, // HTTP status code for server error
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal Server Error" }),
        });
      } else {
        // Simulate a successful response
        let json = nearPrice;
        await route.fulfill({ json });
      }
    }
  );
}
