import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

import {
  mockNearBalances,
  mockRpcRequest,
  mockWithFTBalance,
} from "../../util/rpcmock.js";
import {
  CurrentTimestampInNanoseconds,
  TransferProposalData,
} from "../../util/inventory.js";
import { mockNearPrice } from "../../util/nearblocks.js";
import { getInstanceConfig } from "../../util/config.js";

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

    await mockWithFTBalance({ page, daoAccount, isSufficient: true });
    await page.goto(`/${instanceAccount}/widget/app`);
    await expect(
      page.locator("div").filter({ hasText: /^Dashboard$/ })
    ).toBeVisible();
  });
  test("Portfolio should correctly displays FT tokens", async ({ page }) => {
    test.setTimeout(60_000);
    await expect(page.getByText("USDt").first()).toBeVisible();
    await expect(page.getByText("USDC").first()).toBeVisible();
  });

  test("Portfolio should correctly displays NEAR price", async ({ page }) => {
    test.setTimeout(60_000);
    await page.waitForTimeout(5_000);
    const nearPriceElements = await page
      .locator(`text=$${nearPrice}.00`)
      .count();
    expect(nearPriceElements).toBeGreaterThan(0);
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

  test.beforeEach(
    async ({ page, instanceAccount, daoAccount, lockupContract }, testInfo) => {
      const instanceConfig = await getInstanceConfig({ page, instanceAccount });

      if (!instanceConfig.lockupContract) {
        console.log("no lockup contract found for instance");
        return test.skip();
      }
      await mockNearPrice({ daoAccount, nearPrice, page });
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
        const requestPostData = request.postDataJSON();

        if (
          requestPostData.params &&
          requestPostData.params.request_type === "view_state" &&
          requestPostData.params.account_id === lockupContract
        ) {
          const json = {
            jsonrpc: "2.0",
            result: {
              block_hash: "2Dc8Jh8mFU8bKe16hAVcZ3waQhhdfUXwvvnsDP9djN95",
              block_height: 140432800,
              values: [
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
      await page.goto(`/${instanceAccount}/widget/app`);
      await expect(
        page.locator("div").filter({ hasText: /^Dashboard$/ })
      ).toBeVisible();
    }
  );

  test("Should show start and end date", async ({ page }) => {
    test.setTimeout(60_000);
    await page.waitForTimeout(5_000);
    await expect(page.getByText("Started September 26, 2024")).toBeVisible();
    await expect(page.getByText("End September 27, 2025")).toBeVisible();
  });

  test("Should show total allocation, vested, unvested amounts", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.waitForTimeout(5_000);
    const originalAmount = page.getByText(
      "Original allocated amount 17.03 NEAR"
    );
    await expect(originalAmount).toBeVisible();
    await originalAmount.click();
    await expect(page.getByText("Vested 7.03 NEAR")).toBeVisible();
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
