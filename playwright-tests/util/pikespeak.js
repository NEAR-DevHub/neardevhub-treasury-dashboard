// since pikespeak has paid api key, we don't want to expose it
export async function mockPikespeakFTTokensResponse({ page, daoAccount }) {
  await page.route(
    `https://api.pikespeak.ai/account/balance/${daoAccount}`,
    async (route) => {
      const mockResponse = {
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify([
          {
            contract: "Near",
            amount: 4.978029151809765,
            symbol: "NEAR",
            isParsed: true,
            icon: "",
          },
          {
            contract: "Near",
            amount: 6.49806,
            symbol: "NEAR [Storage]",
            isParsed: true,
            icon: "",
          },
          {
            amount: "0.689911",
            contract:
              "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
            symbol: "USDC",
            isParsed: true,
            icon: "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png",
          },
          {
            amount: "0.310327",
            contract: "usdt.tether-token.near",
            symbol: "USDt",
            isParsed: true,
            icon: "",
          },
        ]),
      };
      await route.fulfill(mockResponse);
    }
  );
}
