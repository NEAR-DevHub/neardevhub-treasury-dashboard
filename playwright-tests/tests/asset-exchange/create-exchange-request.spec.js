import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { getTransactionModalObject } from "../../util/transaction";
import { mockNearBalances, updateDaoPolicyMembers } from "../../util/rpcmock";
import { InsufficientBalance } from "../../util/lib.js";

async function mockSwapResponse({ page, response, daoAccount }) {
  await page.route(
    new RegExp(
      (daoAccount.includes("testing")
        ? `https://ref-sdk-test-cold-haze-1300.fly.dev`
        : `https://ref-sdk-api.fly.dev`) + `/api/swap\\?.*`
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

test.describe("User is not logged in", function () {
  test("should not see 'Create Request' action", async ({
    page,
    instanceAccount,
  }) => {
    await page.goto(`/${instanceAccount}/widget/app?page=asset-exchange`);
    await expect(page.getByText("Pending Requests")).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Create Request",
      })
    ).toBeHidden();
  });
});

test.describe.parallel("User logged in with different roles", () => {
  const roles = [
    {
      name: "Vote role",
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin-with-vote-role.json",
      canCreateRequest: false,
    },
    {
      name: "Settings role",
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin-with-settings-role.json",
      canCreateRequest: false,
    },
    {
      name: "All role",
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin-with-all-role.json",
      canCreateRequest: true,
    },
  ];

  for (const { name, storageState, canCreateRequest } of roles) {
    test.describe(`User with '${name}'`, () => {
      test.use({ storageState });

      test(`should ${
        canCreateRequest ? "see" : "not see"
      } 'Create Request' action`, async ({ page, instanceAccount }) => {
        test.setTimeout(60_000);

        await updateDaoPolicyMembers({
          instanceAccount,
          page,
          hasAllRole: canCreateRequest,
        });

        await page.goto(`/${instanceAccount}/widget/app?page=asset-exchange`);
        await expect(page.getByText("Pending Requests")).toBeVisible({
          timeout: 20_000,
        });

        const createRequestButton = page.getByRole("button", {
          name: "Create Request",
        });

        if (canCreateRequest) {
          await expect(createRequestButton).toBeVisible();
        } else {
          await expect(createRequestButton).toBeHidden();
        }
      });
    });
  }
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
  await page.waitForTimeout(1_000);
  await createRequestButton.click();
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
    ).toBeVisible();
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
    const calculateBtn = page.frameLocator("iframe").getByText("Calculate");
    const submitBtn = page.frameLocator("iframe").getByText("Submit");
    await expect(warningText).toBeVisible();
    await expect(calculateBtn).toBeDisabled();
    await expect(submitBtn).toBeDisabled();
    // reverse the tokens
    await selectSendToken({ page, token: "USDC" });
    await selectReceiveToken({ page, token: "NEAR" });
    await expect(warningText).toBeVisible();
    await expect(calculateBtn).toBeDisabled();
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

    const calculateBtn = page.frameLocator("iframe").getByText("Calculate");
    const submitBtn = page.frameLocator("iframe").getByText("Submit");
    const balanceWarningText = page
      .frameLocator("iframe")
      .getByText(
        "The treasury balance doesn't have enough tokens to swap. You can create the request, but it won’t be approved until the balance is topped up."
      );
    await expect(balanceWarningText).toBeVisible();
    await expect(calculateBtn).toBeEnabled();
    await expect(submitBtn).toBeDisabled();
    await calculateBtn.click();
    const storageWarningText = page
      .frameLocator("iframe")
      .getByText(
        "To collect this token, purchase storage space. After submission, 0.1 NEAR will be charged from your account as an additional transaction."
      );
    await expect(storageWarningText).toBeVisible();
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
  });

  test("create NEAR to wNEAR swap request and display in pending request", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await openCreatePage({ page, instanceAccount });
    await selectSendToken({ page, token: "NEAR" });
    await page.frameLocator("iframe").locator("#send-amount").fill("1");
    await selectReceiveToken({ page, token: "wNEAR" });
    const calculateBtn = page.frameLocator("iframe").getByText("Calculate");
    const submitBtn = page.frameLocator("iframe").getByText("Submit");
    await expect(calculateBtn).toBeEnabled();
    await expect(submitBtn).toBeDisabled();
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
    await calculateBtn.click();
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description:
          "* Proposal Action: asset-exchange <br>* Token In: near <br>* Token Out: wrap.near <br>* Amount In: 1 <br>* Slippage: 1 <br>* Amount Out: 1",
        kind: {
          FunctionCall: {
            actions: [
              {
                args: "eyJyZWdpc3RyYXRpb25fb25seSI6dHJ1ZSwiYWNjb3VudF9pZCI6ImluZmluZXguc3B1dG5pay1kYW8ubmVhciJ9",
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

  test("create FT token swap request and display in pending request", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await openCreatePage({ page, instanceAccount });
    await selectSendToken({ page, token: "USDt" });
    await page.frameLocator("iframe").locator("#send-amount").fill("1");
    await selectReceiveToken({ page, token: "USDC" });
    const calculateBtn = page.frameLocator("iframe").getByText("Calculate");
    const submitBtn = page.frameLocator("iframe").getByText("Submit");
    await expect(calculateBtn).toBeEnabled();
    await expect(submitBtn).toBeDisabled();
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
                msg: '{"force":0,"actions":[{"pool_id":5516,"token_in":"usdt.tether-token.near","token_out":"a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near","amount_in":"1000000","amount_out":"0","min_amount_out":"0"},{"pool_id":4179,"token_in":"a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near","token_out":"17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1","amount_out":"0","min_amount_out":"989412"}]}',
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
    await calculateBtn.click();
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description:
          "* Proposal Action: asset-exchange <br>* Token In: usdt.tether-token.near <br>* Token Out: 17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1 <br>* Amount In: 1 <br>* Slippage: 1 <br>* Amount Out: 0.99940",
        kind: {
          FunctionCall: {
            actions: [
              {
                args: "eyJyZWNlaXZlcl9pZCI6InYyLnJlZi1maW5hbmNlLm5lYXIiLCJhbW91bnQiOiIxMDAwMDAwIiwibXNnIjoie1wiZm9yY2VcIjowLFwiYWN0aW9uc1wiOlt7XCJwb29sX2lkXCI6NTUxNixcInRva2VuX2luXCI6XCJ1c2R0LnRldGhlci10b2tlbi5uZWFyXCIsXCJ0b2tlbl9vdXRcIjpcImEwYjg2OTkxYzYyMThiMzZjMWQxOWQ0YTJlOWViMGNlMzYwNmViNDguZmFjdG9yeS5icmlkZ2UubmVhclwiLFwiYW1vdW50X2luXCI6XCIxMDAwMDAwXCIsXCJhbW91bnRfb3V0XCI6XCIwXCIsXCJtaW5fYW1vdW50X291dFwiOlwiMFwifSx7XCJwb29sX2lkXCI6NDE3OSxcInRva2VuX2luXCI6XCJhMGI4Njk5MWM2MjE4YjM2YzFkMTlkNGEyZTllYjBjZTM2MDZlYjQ4LmZhY3RvcnkuYnJpZGdlLm5lYXJcIixcInRva2VuX291dFwiOlwiMTcyMDg2MjhmODRmNWQ2YWQzM2YwZGEzYmJiZWIyN2ZmY2IzOThlYWM1MDFhMzFiZDZhZDIwMTFlMzYxMzNhMVwiLFwiYW1vdW50X291dFwiOlwiMFwiLFwibWluX2Ftb3VudF9vdXRcIjpcIjk4OTQxMlwifV19In0=",
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
});
