import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { Worker, parseNEAR } from "near-workspaces";
import { redirectWeb4, getLocalWidgetContent } from "../../util/web4.js";
import { PROPOSAL_BOND, setPageAuthSettings } from "../../util/sandboxrpc.js";
import Big from "big.js";

let worker;
let creatorAccount;
let ftContract;
let lockupContract;
let socialNearAccount;

test.beforeAll(async () => {
  test.setTimeout(200_000);

  worker = await Worker.init();

  creatorAccount = await worker.rootAccount.importContract({
    mainnetContract: "theori.near",
  });
  await worker.rootAccount.transfer(creatorAccount.accountId, parseNEAR("100"));

  // FT contract setup
  ftContract = await worker.rootAccount.importContract({
    mainnetContract: "usdt.tether-token.near",
  });

  // Initialize FT contract
  await ftContract.call(ftContract.accountId, "new", {
    owner_id: ftContract.accountId,
    total_supply: "1000000000000000000000000000",
    metadata: {
      spec: "ft-1.0.0",
      name: "USDT",
      symbol: "USDT",
      decimals: 6,
      icon: "https://example.com/usdt-icon.png",
    },
  });

  // Register storage for FT contract (for creator account)
  await creatorAccount.call(
    ftContract.accountId,
    "storage_deposit",
    {
      account_id: creatorAccount.accountId,
      registration_only: true,
    },
    { attachedDeposit: parseNEAR("0.01"), gas: "300000000000000" }
  );

  // Lockup contract setup
  lockupContract = await worker.rootAccount.importContract({
    mainnetContract: "ft-lockup-testing.near",
  });

  // Initialize lockup contract
  await lockupContract.call(lockupContract.accountId, "new", {
    owner_id: creatorAccount.accountId,
    token_id: ftContract.accountId,
  });

  // Social.near setup
  socialNearAccount = await worker.rootAccount.importContract({
    mainnetContract: "social.near",
  });

  await socialNearAccount.call(
    socialNearAccount.accountId,
    "new",
    {},
    { gas: "300000000000000" }
  );

  await socialNearAccount.call(
    socialNearAccount.accountId,
    "set_status",
    { status: "Live" },
    { gas: "300000000000000" }
  );

  // Register storage for FT contract (for lockup contract)
  await creatorAccount.call(
    ftContract.accountId,
    "storage_deposit",
    {
      account_id: lockupContract.accountId,
      registration_only: true,
    },
    { attachedDeposit: parseNEAR("0.01"), gas: "300000000000000" }
  );
});

test.afterAll(async () => {
  await worker.tearDown();
});

async function mockFtMetadata({ page }) {
  await page.route(/.*ft-token-metadata.*/, async (route) => {
    await route.fulfill({
      json: {
        contract: "usdt.tether-token.near",
        name: "Tether USD",
        symbol: "USDt",
        decimals: 6,
        icon: "",
        price: "1",
      },
    });
  });
}

// mock FT balance using FT balance from sandbox RPC
async function mockFTBalance({ page, daoAccount }) {
  await page.route(/.*ft-tokens.*/, async (route) => {
    const response = await route.fetch();
    const responseBody = await response.json();

    const ftBalanceFromRPC = await ftContract.view("ft_balance_of", {
      account_id: daoAccount,
    });
    const ftInResponse = responseBody.fts.find(
      (ft) => ft.contract === ftContract.accountId
    );
    if (ftInResponse) {
      ftInResponse.amount = Big(ftBalanceFromRPC)
        .plus(ftInResponse.amount)
        .toFixed();
    }
    responseBody.totalCumulativeAmt = parseFloat(
      Big(responseBody.totalCumulativeAmt)
        .plus(
          Big(ftBalanceFromRPC)
            .div(Big(10).pow(ftInResponse.ft_meta.decimals))
            .mul(ftInResponse.ft_meta.price)
        )
        .toFixed()
    );
    const updatedResponse = {
      totalCumulativeAmt: responseBody.totalCumulativeAmt,
      fts: [...responseBody.fts],
    };
    await route.fulfill({
      json: updatedResponse,
    });
  });
}
async function setupDaoAccount({ page, daoAccount, instanceAccount }) {
  const daoName = daoAccount.split(".")[0];
  const create_testdao_args = {
    config: {
      name: daoName,
      purpose: "treasury",
      metadata: "",
    },
    policy: {
      roles: [
        {
          kind: {
            Group: [creatorAccount.accountId],
          },
          name: "Create Requests",
          permissions: [
            "call:AddProposal",
            "transfer:AddProposal",
            "config:Finalize",
          ],
          vote_policy: {},
        },
        {
          kind: {
            Group: [creatorAccount.accountId],
          },
          name: "Manage Members",
          permissions: [
            "config:*",
            "policy:*",
            "add_member_to_role:*",
            "remove_member_from_role:*",
          ],
          vote_policy: {},
        },
        {
          kind: {
            Group: [creatorAccount.accountId],
          },
          name: "Vote",
          permissions: ["*:VoteReject", "*:VoteApprove", "*:VoteRemove"],
          vote_policy: {},
        },
      ],
      default_vote_policy: {
        weight_kind: "RoleWeight",
        quorum: "0",
        threshold: [1, 2],
      },
      proposal_bond: PROPOSAL_BOND,
      proposal_period: "604800000000000",
      bounty_bond: "100000000000000000000000",
      bounty_forgiveness_period: "604800000000000",
    },
  };

  const daoContract = await worker.rootAccount.importContract({
    mainnetContract: daoAccount,
    initialBalance: parseNEAR("24"),
  });
  await daoContract.callRaw(daoAccount, "new", create_testdao_args, {
    gas: "300000000000000",
  });
  await worker.rootAccount.importContract({
    mainnetContract: instanceAccount,
  });
}

test("should display FT lockup portfolio with no claim available", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  test.setTimeout(200_000);
  await setupDaoAccount({ page, daoAccount, instanceAccount });
  const startTimestamp = Math.floor(Date.now() / 1000).toString();

  await creatorAccount.call(lockupContract.accountId, "add_account", {
    account_id: daoAccount,
    start_timestamp: startTimestamp,
    session_interval: "86400",
    session_num: 10,
    release_per_session: "10000000", // 10 USDT
  });

  // Transfer FT tokens to lockup account
  await ftContract.call(
    ftContract.accountId,
    "ft_transfer_call",
    {
      receiver_id: lockupContract.accountId,
      amount: "100000000", // 100 USDT
      msg: daoAccount,
    },
    { attachedDeposit: "1", gas: "300000000000000" }
  );

  const modifiedWidgets = {};
  const configKey = `${instanceAccount}/widget/config.data`;

  // Enable feature flag - add ftLockups to the config
  const configContent = getLocalWidgetContent(configKey, {
    treasury: daoAccount,
    account: instanceAccount,
  });

  // Add ftLockups to the config
  modifiedWidgets[configKey] = configContent.replace(
    `allowLockupCancellation: true,`,
    `allowLockupCancellation: true,
  ftLockups: ["${lockupContract.accountId}"],`
  );
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    networkId: "sandbox",
    sandboxNodeUrl: worker.provider.connection.url,
    modifiedWidgets,
    callWidgetNodeURLForContractWidgets: false,
  });
  await mockFtMetadata({ page });
  await page.goto(`https://${instanceAccount}.page/`);
  await setPageAuthSettings(
    page,
    creatorAccount.accountId,
    await creatorAccount.getKey()
  );

  await page.waitForTimeout(5_000);

  await expect(
    page.getByText("Wallet: " + lockupContract.accountId)
  ).toBeVisible();
  await expect(
    page.getByText("No tokens are ready to be claimed")
  ).toBeVisible();

  // Verify Original Allocated Amount
  await expect(page.getByText("Original Allocated Amount")).toBeVisible();
  await expect(page.getByText("$100.00")).toBeVisible(); // 100 USDT with 2 decimals

  // Expand the details
  await page.getByText("Original Allocated Amount").click();

  // Verify expanded details
  await expect(page.getByText("Unreleased 100 USDt")).toBeVisible();
  await expect(page.getByText("Unclaimed 0 USDt")).toBeVisible();
  await expect(page.getByText("Claimed 0 USDt", { exact: true })).toBeVisible();

  // Verify lockup details
  await expect(page.getByText("Start Date")).toBeVisible();

  // Convert startTimestamp to readable date format
  const startDate = new Date(parseInt(startTimestamp) * 1000);
  const formattedDate = startDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  await expect(page.getByText(formattedDate, { exact: true })).toBeVisible();
  await expect(page.getByText("Rounds")).toBeVisible();
  await expect(page.getByText("0 / 10")).toBeVisible();

  await expect(page.getByText("Release Interval")).toBeVisible();
  await expect(page.getByText("Every day")).toBeVisible();

  await expect(page.getByText("Next Claim Date")).toBeVisible();

  // Verify no claim funds section (since unclaimed is 0)
  await expect(
    page.getByText("🎉 You have funds available to claim")
  ).not.toBeVisible();
});

test("should display FT lockup portfolio with claim available", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  test.setTimeout(200_000);
  await setupDaoAccount({ page, daoAccount, instanceAccount });
  const startTimestamp = Math.floor(Date.now() / 1000 - 7776000).toString();

  await creatorAccount.call(lockupContract.accountId, "add_account", {
    account_id: daoAccount,
    start_timestamp: startTimestamp,
    session_interval: "7776000",
    session_num: 10,
    release_per_session: "10000000", // 10 USDT
  });

  // register dao account to ft contract
  await ftContract.call(
    ftContract.accountId,
    "storage_deposit",
    { account_id: daoAccount, registration_only: true },
    { attachedDeposit: parseNEAR("0.01"), gas: "300000000000000" }
  );

  // Transfer FT tokens to lockup account
  await ftContract.call(
    ftContract.accountId,
    "ft_transfer_call",
    {
      receiver_id: lockupContract.accountId,
      amount: "100000000", // 100 USDT
      msg: daoAccount,
    },
    { attachedDeposit: "1", gas: "300000000000000" }
  );

  const modifiedWidgets = {};
  const configKey = `${instanceAccount}/widget/config.data`;

  // Enable feature flag - add ftLockups to the config
  const configContent = getLocalWidgetContent(configKey, {
    treasury: daoAccount,
    account: instanceAccount,
  });

  // Add ftLockups to the config
  modifiedWidgets[configKey] = configContent.replace(
    `allowLockupCancellation: true,`,
    `allowLockupCancellation: true,
  ftLockups: ["${lockupContract.accountId}"],`
  );
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    networkId: "sandbox",
    sandboxNodeUrl: worker.provider.connection.url,
    modifiedWidgets,
    callWidgetNodeURLForContractWidgets: false,
  });
  await mockFtMetadata({ page });
  await page.goto(`https://${instanceAccount}.page/`);
  await expect(
    page.getByText("Login with your NEAR account to claim tokens")
  ).toBeVisible({ timeout: 15_000 });
  await setPageAuthSettings(
    page,
    creatorAccount.accountId,
    await creatorAccount.getKey()
  );

  await page.waitForTimeout(5_000);

  await expect(
    page.getByText("Wallet: " + lockupContract.accountId)
  ).toBeVisible();

  await expect(
    page.getByText("No tokens are ready to be claimed")
  ).not.toBeVisible();
  await expect(
    page.getByText("🎉 You have funds available to claim")
  ).toBeVisible();
  // Verify Original Allocated Amount
  await expect(page.getByText("Original Allocated Amount")).toBeVisible();
  await expect(page.getByText("$100.00")).toBeVisible(); // 100 USDT with 2 decimals

  // Expand the details
  await page.getByText("Original Allocated Amount").click();

  // Verify expanded details
  await expect(page.getByText("Unreleased 90 USDt")).toBeVisible();
  await expect(page.getByText("Unclaimed 10 USDt")).toBeVisible();
  await expect(page.getByText("Claimed 0 USDt", { exact: true })).toBeVisible();

  // Verify lockup details
  await expect(page.getByText("Start Date")).toBeVisible();

  // Convert startTimestamp to readable date format
  const startDate = new Date(parseInt(startTimestamp) * 1000);
  const formattedDate = startDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  await expect(page.getByText(formattedDate, { exact: true })).toBeVisible();
  await expect(page.getByText("Rounds")).toBeVisible();
  await expect(page.getByText("1 / 10")).toBeVisible();

  await expect(page.getByText("Release Interval")).toBeVisible();
  await expect(page.getByText("Every quarter")).toBeVisible();

  await expect(page.getByText("Next Claim Date")).toBeVisible();
  await expect(page.getByRole("button", { name: "Claim" })).toBeVisible();
  await page.getByRole("button", { name: "Claim" }).click();
  await expect(page.getByText("Confirm Transaction")).toBeVisible();
  await mockFTBalance({ page, daoAccount });
  await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByRole("button", { name: "Confirm" })).not.toBeVisible();

  await expect(
    page.getByText("Tokens are successfully claimed.")
  ).toBeVisible();
  await expect(
    page.getByText(
      "No tokens are ready to be claimed. Please wait for the next round."
    )
  ).toBeVisible();
  await expect(
    page.getByText("🎉 You have funds available to claim")
  ).not.toBeVisible();
  await expect(page.getByText("Unreleased 90 USDt")).toBeVisible();
  await expect(page.getByText("Unclaimed 0 USDt")).toBeVisible();
  await expect(
    page.getByText("Claimed 10 USDt", { exact: true })
  ).toBeVisible();

  await page
    .getByText("Total Balance", { exact: true })
    .scrollIntoViewIfNeeded();
  // total and FT balance should be >= claimed amount i.e 10 USDT
  const usdtText = await page.getByTestId("USDt-token").innerText();
  const parts = usdtText
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
  const usdtAmount = parseFloat(parts[2]);
  expect(usdtAmount).toBeGreaterThanOrEqual(10);

  const totalBalanceText = await page
    .getByTestId("total-balance")
    .textContent();
  const totalBalanceAmount = Number(
    totalBalanceText
      ?.replace("$", "") // remove dollar sign
      .replace("USD", "") // remove USD
      .trim() // remove spaces
  );
  expect(totalBalanceAmount).toBeGreaterThanOrEqual(10);
});

test("should hide FT lockup portfolio with all amount is claimed", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  test.setTimeout(200_000);
  await setupDaoAccount({ page, daoAccount, instanceAccount });
  const startTimestamp = Math.floor(
    Date.now() / 1000 - 12 * 30 * 24 * 60 * 60
  ).toString();

  await creatorAccount.call(lockupContract.accountId, "add_account", {
    account_id: daoAccount,
    start_timestamp: startTimestamp,
    session_interval: "2592000",
    session_num: 10,
    release_per_session: "10000000", // 10 USDT
  });

  // register dao account to ft contract
  await ftContract.call(
    ftContract.accountId,
    "storage_deposit",
    { account_id: daoAccount, registration_only: true },
    { attachedDeposit: parseNEAR("0.01"), gas: "300000000000000" }
  );

  // Transfer FT tokens to lockup account
  await ftContract.call(
    ftContract.accountId,
    "ft_transfer_call",
    {
      receiver_id: lockupContract.accountId,
      amount: "100000000", // 100 USDT
      msg: daoAccount,
    },
    { attachedDeposit: "1", gas: "300000000000000" }
  );

  await creatorAccount.call(
    lockupContract.accountId,
    "claim",
    { account_id: daoAccount },
    { attachedDeposit: "0", gas: "300000000000000" }
  );

  const modifiedWidgets = {};
  const configKey = `${instanceAccount}/widget/config.data`;

  // Enable feature flag - add ftLockups to the config
  const configContent = getLocalWidgetContent(configKey, {
    treasury: daoAccount,
    account: instanceAccount,
  });

  // Add ftLockups to the config
  modifiedWidgets[configKey] = configContent.replace(
    `allowLockupCancellation: true,`,
    `allowLockupCancellation: true,
  ftLockups: ["${lockupContract.accountId}"],`
  );
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    networkId: "sandbox",
    sandboxNodeUrl: worker.provider.connection.url,
    modifiedWidgets,
    callWidgetNodeURLForContractWidgets: false,
  });
  await mockFtMetadata({ page });
  await page.goto(`https://${instanceAccount}.page/`);
  await expect(page.getByText("Show History")).toBeVisible();
  await page.getByText("Show History").click();
  await expect(
    page.getByText("Wallet: " + lockupContract.accountId)
  ).toBeVisible();
  await expect(
    page.getByText("All tokens have already been claimed")
  ).toBeVisible();
  await expect(page.getByText("Original Allocated Amount")).toBeVisible();
  await page.getByText("Original Allocated Amount").click();
  await expect(page.getByText("Unreleased 0 USDt")).toBeVisible();
  await expect(page.getByText("Unclaimed 0 USDt")).toBeVisible();
  await expect(
    page.getByText("Claimed 100 USDt", { exact: true })
  ).toBeVisible();
  await page.getByText("Show less").click();
  await expect(
    page.getByText("Wallet: " + lockupContract.accountId)
  ).not.toBeVisible();
});
