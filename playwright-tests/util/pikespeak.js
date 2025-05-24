export async function mockPikespeakFTTokensResponse({ page, daoAccount }) {
  const ftTokensBaseUrl = daoAccount.includes("testing")
    ? `https://ref-sdk-test-cold-haze-1300-2.fly.dev`
    : `https://ref-sdk-api-2.fly.dev`;

  // Regex to handle optional trailing slash before query parameters
  const ftTokensUrlPattern = new RegExp(
    `^${ftTokensBaseUrl}/api/ft-tokens\\/?\\?account_id=${daoAccount}$`
  );

  await page.route(ftTokensUrlPattern, async (route) => {
    const mockResponse = {
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({
        totalCumulativeAmt: 4.69,
        fts: [
          {
            contract: "wrap.near",
            amount: "1000100000000000000000000",
            ft_meta: {
              name: "Wrapped NEAR fungible token",
              symbol: "wNEAR",
              decimals: 24,
              reference: null,
              price: 2.79,
            },
          },
          {
            contract: "blackdragon.tkn.near",
            amount: "70158710654339615937129266881",
            ft_meta: {
              name: "Black Dragon",
              symbol: "BLACKDRAGON",
              decimals: 24,
              reference: null,
              price: 2e-8,
            },
          },
          {
            contract:
              "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
            amount: "1691395",
            ft_meta: {
              name: "USDC",
              symbol: "USDC",
              decimals: 6,
              reference: null,
              price: 0.999888,
            },
          },
          {
            contract: "usdt.tether-token.near",
            amount: "209401",
            ft_meta: {
              name: "Tether USD",
              symbol: "USDt",
              decimals: 6,
              reference: null,
              price: 1,
            },
          },
        ],
      }),
    };
    await route.fulfill(mockResponse);
  });
}
