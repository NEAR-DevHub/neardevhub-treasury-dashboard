import { expect } from "@playwright/test";
import { mockNearBalances, mockRpcRequest } from "../../util/rpcmock.js";
import { mockNearPrice } from "../../util/nearblocks.js";

export async function mockLockupStateAndNavigateToDashboard({
  page,
  hasCliff,
  instanceAccount,
  lockupContract,
  daoAccount,
}) {
  const nearPrice = 5;

  const lockedAmount = "10000000000000000000000000";
  const accountBalance = "12030000000000000000000000";
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

  await page.route(
    `https://staking-pools-api.neartreasury.com/v1/account/${lockupContract}/staking`,
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
              53, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48,
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
  await mockNearBalances({
    page,
    accountId: lockupContract,
    balance: accountBalance,
    storage: "345705",
  });

  await page.route(`https://free.rpc.fastnear.com`, async (route) => {
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
        const json = {
          jsonrpc: "2.0",
          result: {
            block_hash: "2Dc8Jh8mFU8bKe16hAVcZ3waQhhdfUXwvvnsDP9djN95",
            block_height: 140432800,
            values: hasCliff
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

  await page.goto(`/${instanceAccount}/widget/app`);
  await expect(
    page.locator("div").filter({ hasText: /^Dashboard$/ })
  ).toBeVisible();
}
