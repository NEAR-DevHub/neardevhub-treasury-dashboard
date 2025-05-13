import { expect } from "@playwright/test";
import { cacheCDN, test } from "../../util/test.js";
import { getTransactionModalObject } from "../../util/transaction";
import { mockNearBalances, updateDaoPolicyMembers } from "../../util/rpcmock";
import { InsufficientBalance, toBase64 } from "../../util/lib.js";

const swapPool =
  '{"force":0,"actions":[{"pool_id":5516,"token_in":"usdt.tether-token.near","token_out":"a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near","amount_in":"1000000","amount_out":"0","min_amount_out":"0"},{"pool_id":4179,"token_in":"a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near","token_out":"17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1","amount_out":"0","min_amount_out":"989412"}]}';

async function mockSwapResponse({ page, response, daoAccount }) {
  await page.route(
    new RegExp(
      (daoAccount.includes("testing")
        ? `https://ref-sdk-test-cold-haze-1300-2.fly.dev`
        : `https://ref-sdk-api-2.fly.dev`) + `/api/swap\\?.*`
    ), // Matches "/swap?..." with query params
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    }
  );
}

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("User is not logged in", function () {
  test("should not see 'Create Request' action", async ({
    page,
    instanceAccount,
  }) => {
    await cacheCDN(page);
    await page.goto(`/${instanceAccount}/widget/app?page=asset-exchange`);
    await expect(page.getByText("Pending Requests")).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Create Request",
      })
    ).toBeHidden();
  });
});

async function openCreatePage({ page, instanceAccount }) {
  await page.goto(`/${instanceAccount}/widget/app?page=asset-exchange`);
  await expect(page.getByText("Pending Requests")).toBeVisible({
    timeout: 20_000,
  });
  const createRequestButton = await page.getByRole("button", {
    name: "Create Request",
  });
  await expect(createRequestButton).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(5_000);
  await createRequestButton.click();
  await page.waitForTimeout(5_000);
}

async function selectSendToken({ page, token }) {
  await page.frameLocator("iframe").locator("#selectedSendToken").click();
  const input = await page
    .frameLocator("iframe")
    .getByRole("textbox", { name: "Search token" });
  await input.fill(token);
  await page
    .frameLocator("iframe")
    .getByRole("heading", { name: token, exact: true })
    .first()
    .click();
  await expect(
    page.frameLocator("iframe").locator("#send-current-balance")
  ).toBeVisible();
}

async function selectReceiveToken({ page, token }) {
  await page.frameLocator("iframe").locator("#selectedReceiveToken").click();
  const input = await page
    .frameLocator("iframe")
    .getByRole("textbox", { name: "Search token" });
  await input.fill(token);
  await page
    .frameLocator("iframe")
    .getByRole("heading", { name: token, exact: true })
    .first()
    .click();
  await expect(
    page.frameLocator("iframe").locator("#receive-current-balance")
  ).toBeVisible();
}

test.describe("User is logged in", function () {
  const signedUser = "theori.near";
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test.beforeEach(async ({ page, instanceAccount, daoAccount }) => {
    await cacheCDN(page);
    await updateDaoPolicyMembers({ instanceAccount, page });
  });

  test("low account balance should show warning modal, and allow action ", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(60_000);
    await mockNearBalances({
      page,
      accountId: signedUser,
      balance: BigInt(0.6 * 10 ** 24).toString(),
      storage: 8,
    });
    await page.goto(`/${instanceAccount}/widget/app?page=asset-exchange`);
    await expect(
      page.getByText(
        "Please add more NEAR to your account soon to avoid any issues completing actions on your treasury"
      )
    ).toBeVisible();
  });

  test("insufficient account balance should show warning modal, disallow action ", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(60_000);
    await mockNearBalances({
      page,
      accountId: signedUser,
      balance: InsufficientBalance,
      storage: 8,
    });
    await page.goto(`/${instanceAccount}/widget/app?page=asset-exchange`);
    await expect(
      page.getByText(
        "Hey Ori, you don't have enough NEAR to complete actions on your treasury."
      )
    ).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1_000);
    await page
      .getByRole("button", {
        name: "Create Request",
      })
      .click();
    await expect(
      page
        .getByText("Please add more funds to your account and try again")
        .nth(1)
    ).toBeVisible();
  });

  test("prevent swapping NEAR directly with other FTs", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(60_000);
    await openCreatePage({ page, instanceAccount });
    await selectSendToken({ page, token: "NEAR" });
    await page.frameLocator("iframe").locator("#send-amount").fill("1");
    await selectReceiveToken({ page, token: "USDC" });
    const warningText = page
      .frameLocator("iframe")
      .getByText(
        "To exchange NEAR for another token, first swap it for wNEAR. You can then exchange wNEAR for your desired token."
      );

    const submitBtn = page.frameLocator("iframe").getByText("Submit");
    await expect(warningText).toBeVisible();
    await expect(submitBtn).toBeDisabled();
    // reverse the tokens
    await selectSendToken({ page, token: "USDC" });
    await selectReceiveToken({ page, token: "NEAR" });
    await expect(warningText).toBeVisible();
    await expect(submitBtn).toBeDisabled();
  });

  test("should display warnings for insufficient treasury balance and storage deposit", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(60_000);
    await openCreatePage({ page, instanceAccount });
    await selectSendToken({ page, token: "wNEAR" });
    await page.frameLocator("iframe").locator("#send-amount").fill("10000");
    await selectReceiveToken({ page, token: "DAI" });
    const submitBtn = page.frameLocator("iframe").getByText("Submit");
    const balanceWarningText = page
      .frameLocator("iframe")
      .getByText(
        "The treasury balance doesn't have enough tokens to swap. You can create the request, but it won’t be approved until the balance is topped up."
      );
    await expect(balanceWarningText).toBeVisible();
    await page.frameLocator("iframe").getByText("Details").click();
    await expect(
      page.frameLocator("iframe").getByText("Price Deference")
    ).toBeVisible();
    await expect(
      page.frameLocator("iframe").getByText("Pool fee")
    ).toBeVisible();
    await expect(
      page.frameLocator("iframe").getByText("Additional Storage Purchase")
    ).toBeVisible();
    await page.frameLocator("iframe").getByText("DAI ($").click();
    await expect(
      page.frameLocator("iframe").getByText("1 wNEAR ($")
    ).toBeVisible();
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    if (await page.getByText("High Fee Warning").isVisible()) {
      await page.getByRole("button", { name: "Yes" }).click();
    }
    await expect(page.getByText("Confirm Transaction").first()).toBeVisible({});
  });

  test("create NEAR to wNEAR swap request and display in pending request", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await openCreatePage({ page, instanceAccount });
    await selectSendToken({ page, token: "NEAR" });
    await selectReceiveToken({ page, token: "wNEAR" });
    const submitBtn = page.frameLocator("iframe").getByText("Submit");
    const response = {
      transactions: [
        {
          receiverId: "wrap.near",
          functionCalls: [
            {
              methodName: "storage_deposit",
              args: {
                registration_only: true,
                account_id: daoAccount,
              },
              gas: "30000000000000",
              amount: "100000000000000000000000",
            },
            {
              methodName: "near_deposit",
              args: {},
              gas: "50000000000000",
              amount: "1000000000000000000000000",
            },
          ],
        },
      ],
      outEstimate: "1",
    };
    await mockSwapResponse({ page, response, daoAccount });
    await page.frameLocator("iframe").locator("#send-amount").fill("1");
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description:
          "* Proposal Action: asset-exchange <br>* Token In: near <br>* Token Out: wrap.near <br>* Amount In: 1 <br>* Slippage: 0.1 <br>* Amount Out: 1",
        kind: {
          FunctionCall: {
            actions: [
              {
                args: toBase64({
                  registration_only: true,
                  account_id: daoAccount,
                }),
                deposit: "100000000000000000000000",
                gas: "30000000000000",
                method_name: "storage_deposit",
              },
              {
                args: "e30=",
                deposit: "1000000000000000000000000",
                gas: "50000000000000",
                method_name: "near_deposit",
              },
            ],
            receiver_id: "wrap.near",
          },
        },
      },
    });
  });

  test("create FT token swap request w/o exchange rate warning", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await openCreatePage({ page, instanceAccount });
    await selectSendToken({ page, token: "USDt" });
    await selectReceiveToken({ page, token: "USDC" });
    const submitBtn = page.frameLocator("iframe").getByText("Submit");
    const response = {
      transactions: [
        {
          receiverId: "usdt.tether-token.near",
          functionCalls: [
            {
              methodName: "ft_transfer_call",
              args: {
                receiver_id: "v2.ref-finance.near",
                amount: "1000000",
                msg: swapPool,
              },
              gas: "180000000000000",
              amount: "1",
            },
          ],
        },
      ],
      outEstimate: "0.99940",
    };
    await mockSwapResponse({ page, response, daoAccount });
    await page.frameLocator("iframe").locator("#send-amount").fill("1");
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description:
          "* Proposal Action: asset-exchange <br>* Token In: usdt.tether-token.near <br>* Token Out: 17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1 <br>* Amount In: 1 <br>* Slippage: 0.1 <br>* Amount Out: 0.99940",
        kind: {
          FunctionCall: {
            actions: [
              {
                args: toBase64({
                  receiver_id: "v2.ref-finance.near",
                  amount: "1000000",
                  msg: swapPool,
                }),
                deposit: "1",
                gas: "180000000000000",
                method_name: "ft_transfer_call",
              },
            ],
            receiver_id: "usdt.tether-token.near",
          },
        },
      },
    });
  });

  test("create FT token swap request w/ exchange rate warning", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await openCreatePage({ page, instanceAccount });
    await selectSendToken({ page, token: "WETH" });
    await selectReceiveToken({ page, token: "USDC" });
    const submitBtn = page.frameLocator("iframe").getByText("Submit");

    const response = {
      transactions: [
        {
          receiverId:
            "c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.factory.bridge.near",
          functionCalls: [
            {
              methodName: "ft_transfer_call",
              args: {
                receiver_id: "v2.ref-finance.near",
                amount: "1000000",
                msg: swapPool,
              },
              gas: "180000000000000",
              amount: "1",
            },
          ],
        },
      ],
      outEstimate: "0.99940",
    };
    await mockSwapResponse({ page, response, daoAccount });
    await page.route(
      (daoAccount.includes("testing")
        ? `https://ref-sdk-test-cold-haze-1300-2.fly.dev`
        : `https://ref-sdk-api-2.fly.dev`) +
        `/api/ft-token-price?account_id=c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.factory.bridge.near`,
      async (route) => {
        const json = {
          price: "2022.67000000",
        };

        await route.fulfill({ json });
      }
    );
    await page.route(
      (daoAccount.includes("testing")
        ? `https://ref-sdk-test-cold-haze-1300-2.fly.dev`
        : `https://ref-sdk-api-2.fly.dev`) +
        `/api/ft-token-price?account_id=17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1`,
      async (route) => {
        const json = {
          price: "0.99980200",
        };

        await route.fulfill({ json });
      }
    );
    await page.frameLocator("iframe").locator("#send-amount").fill("100");
    await expect(
      page.frameLocator("iframe").locator("#exchange-rate-warning")
    ).toBeVisible();
    await page.frameLocator("iframe").getByText("Details").click();
    await expect(
      page.frameLocator("iframe").getByText("-99.9995% / 202,306.0574 USDC")
    ).toBeVisible();
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    await expect(page.getByText("High Fee Warning")).toBeVisible();
    await page.getByRole("button", { name: "Yes" }).click();

    expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description:
          "* Proposal Action: asset-exchange <br>* Token In: c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.factory.bridge.near <br>* Token Out: 17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1 <br>* Amount In: 100 <br>* Slippage: 0.1 <br>* Amount Out: 0.99940",
        kind: {
          FunctionCall: {
            actions: [
              {
                args: toBase64({
                  receiver_id: "v2.ref-finance.near",
                  amount: "1000000",
                  msg: swapPool,
                }),
                deposit: "1",
                gas: "180000000000000",
                method_name: "ft_transfer_call",
              },
            ],
            receiver_id:
              "c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.factory.bridge.near",
          },
        },
      },
    });
  });
});
