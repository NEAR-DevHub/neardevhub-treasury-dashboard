import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import {
  mockNearBalances,
  mockRpcRequest,
  mockWithFTBalance,
} from "../../util/rpcmock.js";
import { mockNearPrice } from "../../util/nearblocks.js";
import { getInstanceConfig } from "../../util/config.js";

const availableBalance = "1.00";
const stakedBalance = "1.00";
const storageBalance = "0.00";

async function mockStakedPoolBalances({ page, daoAccount }) {
  await page.route(
    `https://api.fastnear.com/v1/account/${daoAccount}/staking`,
    async (route) => {
      const json = {
        account_id: daoAccount,
        pools: [
          {
            last_update_block_height: null,
            pool_id: "here.poolv1.near",
          },
        ],
      };

      await route.fulfill({ json });
    }
  );

  await page.route(
    `https://archival-rpc.mainnet.fastnear.com/`,
    async (route) => {
      const request = await route.request();
      const requestPostData = request.postDataJSON();

      if (
        requestPostData.params &&
        requestPostData.params.request_type === "call_function" &&
        requestPostData.params.method_name === "get_account_staked_balance"
      ) {
        const json = {
          jsonrpc: "2.0",
          result: {
            block_hash: "GXEuJYXvoXoiDhtDJP8EiPXesQbQuwDSWadYzy2JAstV",
            block_height: 132031112,
            logs: [],
            result: [
              49, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48,
              48, 48, 48, 48, 48, 48, 48, 48, 48,
            ],
          },
          id: "dontcare",
        };
        await route.fulfill({ json });
      } else {
        await route.continue();
      }
    }
  );
}

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

const nearPrice = 5;
test.describe("Dashboard Page", function () {
  test.beforeEach(async ({ page, instanceAccount, daoAccount }, testInfo) => {
    if (testInfo.title.includes("Should see 404 modal")) {
      await mockNearPrice({ daoAccount, nearPrice, page, returnError: true });
    } else {
      await mockNearPrice({ daoAccount, nearPrice, page });
    }

    // fetch near balance
    await mockNearBalances({
      page,
      accountId: daoAccount,
      balance: BigInt(1 * 10 ** 24).toString(),
      storage: 0,
    });

    // fetch near pool balance
    await mockStakedPoolBalances({ page, daoAccount });

    await mockWithFTBalance({
      page,
      daoAccount,
      isSufficient: true,
      isDashboard: true,
    });
    await page.goto(`/${instanceAccount}/widget/app`);
    await expect(
      page.locator("div").filter({ hasText: /^Dashboard$/ })
    ).toBeVisible();
  });

  test("should correctly sort tokens by token price and quantity", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.waitForTimeout(5_000);
    await expect(
      page.getByText("BLACKDRAGON < $0.01 743,919,574")
    ).toBeVisible();
    await expect(page.getByText("USDC $1.00 72.00")).toBeVisible();
    await expect(page.getByText("REF $0.12 0.98")).toBeVisible();
    await expect(page.getByText("SLUSH $0.00 7,231,110.99")).toBeVisible();
    await expect(page.getByText("RNC $0.00 710,047.00")).toBeVisible();
    await page.getByRole("button", { name: "Show more tokens " }).click();
    await expect(
      page.getByText("CHAINABSTRACT $0.00 1,000,000.00")
    ).toBeVisible();
  });

  test("should correctly displays NEAR price", async ({ page }) => {
    test.setTimeout(60_000);
    await page.waitForTimeout(5_000);
    const nearPriceElements = await page
      .locator(`text=$${nearPrice}.00`)
      .count();
    expect(nearPriceElements).toBeGreaterThan(0);
  });

  test("should correctly display NEAR tokens segregation ", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.waitForTimeout(5_000);
    await page.locator("div:nth-child(2) > .bi").first().click();
    await expect(
      page.getByText(`Available Balance ${availableBalance} `)
    ).toBeVisible();
    await expect(page.getByText(`Staking ${stakedBalance} `)).toBeVisible();
    await expect(
      page.getByText(`Reserved for storage ${storageBalance} `)
    ).toBeVisible();
  });

  test("should correctly display total balance", async ({
    page,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    // will add new tests for lockup in next PR
    if (daoAccount === "infinex.sputnik-dao.near") {
      return;
    }
    // totalcummulative is $10 (of FTs as per mocked API) and 2N is $10
    await expect(page.getByText("Total Balance $20.00 USD")).toBeVisible();
  });

  test("Should see 404 modal", async ({ page }) => {
    test.setTimeout(60_000);
    await page.waitForTimeout(5_000);
    await expect(page.getByText("Please wait a moment...")).toBeVisible();
  });
});

test.describe("Lockup portfolio", function () {
  const lockedAmount = "10000000000000000000000000";
  const accountBalance = "12030000000000000000000000";
  test.use({ contextOptions: { ignoreHTTPSErrors: true } });
  test.beforeEach(
    async ({ page, instanceAccount, daoAccount, lockupContract }, testInfo) => {
      if (!lockupContract) {
        console.log("no lockup contract found for instance");
        return test.skip();
      }
      // Unroute existing handlers to prevent conflicts
      await page.unroute("**");
      await mockNearPrice({ daoAccount, nearPrice, page });
      await page.goto(`/${instanceAccount}/widget/app`);
      await expect(
        page.locator("div").filter({ hasText: /^Dashboard$/ })
      ).toBeVisible();

      await mockRpcRequest({
        page,
        filterParams: {
          method_name: "get_locked_amount",
        },
        modifyOriginalResultFunction: () => {
          return lockedAmount;
        },
      });

      await page.route(`https://rpc.mainnet.near.org`, async (route) => {
        const request = await route.request();
        const requestPostData = await request.postDataJSON();

        if (
          requestPostData.params &&
          requestPostData.params.account_id === lockupContract
        ) {
          if (requestPostData.params.request_type === "view_account") {
            const json = {
              jsonrpc: "2.0",
              result: {
                amount: "4491167550906771300000003",
                block_hash: "G7qsyJTXXz2ct8AobLT1RtP8cqti7zBojsz134qB3768",
                block_height: 142072264,
                code_hash: "3skHaUtj85RPdUZwx6M4Jp4PfC9qJHqnsyuWLtuq2xBT",
                locked: "0",
                storage_paid_at: 0,
                storage_usage: 345723,
              },
              id: "dontcare",
            };
            await route.fulfill({ json });
          } else if (requestPostData.params.request_type === "view_state") {
            console.log(testInfo.title)
            const json = {
              jsonrpc: "2.0",
              result: {
                block_hash: "2Dc8Jh8mFU8bKe16hAVcZ3waQhhdfUXwvvnsDP9djN95",
                block_height: 140432800,
                values: testInfo.title.includes("cliff")
                  ? [
                      {
                        key: "U1RBVEU=",
                        value:
                          "QAAAAGM4MTc5M2QxMzY0MGU0NzY1NTM4ZTczYjA2YWMwZDdkODYwMWVlNjNhYzAzYzkwMzk2MjkyMzQ1NTU4NGYyZDEAAACqiq4bZFT6AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfKTy6T+hPRYCAB7YubuEHxgAHti5u4QfGADeBiZCDuAZFQAAAGxvY2t1cC13aGl0ZWxpc3QubmVhcgABDwAAAGZvdW5kYXRpb24ubmVhcg==",
                      },
                    ]
                  : [
                      {
                        key: "U1RBVEU=",
                        value:
                          "GAAAAGluZmluZXguc3B1dG5pay1kYW8ubmVhcgAAAESqcqis2Ly35gEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAADyvmdYcAABAMD2T6eb+BcAfKTy6T+hPRYAFQAAAGxvY2t1cC13aGl0ZWxpc3QubmVhcgEQAAAAcWJpdC5wb29sdjEubmVhcgAAAACIbdT4oNMQ9XoBAAAAAA==",
                      },
                    ],
              },
              id: "dontcare",
            };
            await route.fulfill({ json });
          } else {
            await route.continue();
          }
        } else {
          await route.continue();
        }
      });
      await page.route(
        `https://api.fastnear.com/v1/account/${lockupContract}/staking`,
        async (route) => {
          const json = {
            account_id: lockupContract,
            pools: [
              {
                last_update_block_height: null,
                pool_id: "here.poolv1.near",
              },
            ],
          };

          await route.fulfill({ json });
        }
      );
      await page.route(
        `https://archival-rpc.mainnet.fastnear.com/`,
        async (route) => {
          const request = await route.request();
          const requestPostData = request.postDataJSON();

          if (
            requestPostData.params &&
            requestPostData.params.request_type === "call_function" &&
            requestPostData.params.method_name === "get_account_staked_balance"
          ) {
            const json = {
              jsonrpc: "2.0",
              result: {
                block_hash: "GXEuJYXvoXoiDhtDJP8EiPXesQbQuwDSWadYzy2JAstV",
                block_height: 132031112,
                logs: [],
                result: [
                  53, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48,
                  48, 48, 48, 48, 48, 48, 48, 48, 48, 48,
                ],
              },
              id: "dontcare",
            };
            await route.fulfill({ json });
          } else {
            await route.continue();
          }
        }
      );
      await mockNearBalances({
        page,
        accountId: lockupContract,
        balance: accountBalance,
        storage: "345705",
      });
    }
  );

  test("Should show start and end date", async ({ page }) => {
    test.setTimeout(60_000);
    await page.waitForTimeout(5_000);
    await expect(page.getByText("Start Date September 26, 2024")).toBeVisible();
    await expect(page.getByText("End Date September 27, 2025")).toBeVisible();
  });

  test("Should show start, end and cliff date", async ({ page }) => {
    test.setTimeout(60_000);
    await page.waitForTimeout(5_000);
    await expect(page.getByText("Start Date January 30, 2025")).toBeVisible();
    await expect(page.getByText("End Date January 31, 2029")).toBeVisible();
    await expect(page.getByText("Cliff Date January 30, 2025")).toBeVisible();
  });

  test("Should show total allocation, vested, unvested amounts", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.waitForTimeout(5_000);
    const originalAmount = page.getByText(
      "Original allocated amount 150,631.84 NEAR"
    );
    await expect(originalAmount).toBeVisible();
    await originalAmount.click();
    await expect(page.getByText("Vested 150,621.84 NEAR")).toBeVisible();
    await expect(page.getByText("Unvested 10.00 NEAR")).toBeVisible();
  });

  test("Should correctly segreggate NEAR balances", async ({ page }) => {
    test.setTimeout(60_000);
    await page.waitForTimeout(5_000);
    const nearToken = page.getByText("NEAR $5.00 17.03");
    await expect(nearToken).toBeVisible();
    await nearToken.click();
    await expect(page.getByText("Staking 5.00")).toBeVisible();
    await expect(page.getByText("Reserved for storage 3.46")).toBeVisible();
  });
});
