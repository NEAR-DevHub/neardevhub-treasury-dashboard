import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { mockNearBalances, mockWithFTBalance } from "../../util/rpcmock.js";
import { mockNearPrice } from "../../util/nearblocks.js";
import { mockLockupStateAndNavigateToDashboard } from "./util.js";

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
    ).toBeVisible({ timeout: 15_000 });
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
  test.beforeEach(async ({ page, lockupContract }) => {
    if (!lockupContract) {
      console.log("no lockup contract found for instance");
      return test.skip();
    }
    // Unroute existing handlers to prevent conflicts
    await page.unroute("**");
  });

  test("Should show start and end date", async ({
    page,
    lockupContract,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await mockLockupStateAndNavigateToDashboard({
      page,
      instanceAccount,
      lockupContract,
      daoAccount,
    });
    await page.waitForTimeout(5_000);
    await expect(page.getByText("Start Date September 25, 2024")).toBeVisible();
    await expect(page.getByText("End Date September 26, 2025")).toBeVisible();
  });

  test("Should show total allocation, vested, unvested amounts", async ({
    page,
    lockupContract,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await mockLockupStateAndNavigateToDashboard({
      page,
      lockupContract,
      instanceAccount,
      daoAccount,
    });
    await page.waitForTimeout(5_000);
    const originalAmount = page.getByText(
      "Original allocated amount 150,631.84 NEAR"
    );
    await expect(originalAmount).toBeVisible();
    await originalAmount.click();
    await expect(page.getByText("Vested 150,621.84 NEAR")).toBeVisible();
    await expect(page.getByText("Unvested 10.00 NEAR")).toBeVisible();
  });

  test("Should correctly segreggate NEAR balances", async ({
    page,
    lockupContract,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await mockLockupStateAndNavigateToDashboard({
      page,
      lockupContract,
      instanceAccount,
      daoAccount,
    });
    await page.waitForTimeout(5_000);
    const nearToken = page.getByText("NEAR $5.00 17.03");
    await expect(nearToken).toBeVisible();
    await nearToken.click();
    await expect(page.getByText("Staking 5.00")).toBeVisible();
    await expect(page.getByText("Reserved for storage 3.46")).toBeVisible();
  });
});
