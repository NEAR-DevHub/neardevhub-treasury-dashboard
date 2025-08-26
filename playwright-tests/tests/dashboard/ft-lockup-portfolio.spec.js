import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { Worker, parseNEAR } from "near-workspaces";
import { redirectWeb4, getLocalWidgetContent } from "../../util/web4.js";
import { PROPOSAL_BOND, setPageAuthSettings } from "../../util/sandboxrpc.js";
import { Indexer } from "../../util/indexer.js";

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
    mainnetContract: "ft-lockup.megha19.near",
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
      amount: "100000000", // 10 USDT (10 * 10^6)
      msg: daoAccount,
    },
    { attachedDeposit: "1", gas: "300000000000000" }
  );

  const modifiedWidgets = {};
  const configKey = `${instanceAccount}/widget/config.data`;

  // Enable feature flag - add ftLockups to the config
  const configContent = await getLocalWidgetContent(configKey, {
    treasury: daoAccount,
    account: instanceAccount,
  });

  // Add ftLockups to the config
  modifiedWidgets[configKey] = configContent.replace(
    `allowLockupCancellation: true,`,
    `allowLockupCancellation: true,
  ftLockups: ["${lockupContract.accountId}"],`
  );
  const indexer = new Indexer(worker.provider.connection.url);
  await indexer.init();
  await indexer.attachIndexerRoutes(page);
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

  await page.waitForLoadState("networkidle");

  await expect(page.getByText("FT Lockup")).toBeVisible();

  await expect(page.getByText(lockupContract.accountId)).toBeVisible();

  await expect(
    page.getByText("No tokens are ready to be claimed")
  ).toBeVisible();

  // Verify Original Allocated Amount
  await expect(page.getByText("Original Allocated Amount")).toBeVisible();
  await expect(page.getByText("$100.00")).toBeVisible(); // 100 USDT with 2 decimals

  // Expand the details
  await page.getByText("Original Allocated Amount").click();

  // Verify expanded details
  await expect(page.getByText("Unreleased")).toBeVisible();
  await expect(page.getByText("100 USDt")).toBeVisible();

  await expect(page.getByText("Unclaimed")).toBeVisible();
  await expect(page.getByText("Claimed", { exact: true })).toBeVisible();
  expect(await page.getByText("0 USDt").count()).toBeGreaterThanOrEqual(2);

  // Verify lockup details
  await expect(page.getByText("Start Date")).toBeVisible();

  // Convert startTimestamp to readable date format
  const startDate = new Date(parseInt(startTimestamp) * 1000);
  const formattedDate = startDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  await expect(page.getByText(formattedDate)).toBeVisible();
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

  // Transfer FT tokens to lockup account
  await ftContract.call(
    ftContract.accountId,
    "ft_transfer_call",
    {
      receiver_id: lockupContract.accountId,
      amount: "100000000", // 10 USDT (10 * 10^6)
      msg: daoAccount,
    },
    { attachedDeposit: "1", gas: "300000000000000" }
  );

  const modifiedWidgets = {};
  const configKey = `${instanceAccount}/widget/config.data`;

  // Enable feature flag - add ftLockups to the config
  const configContent = await getLocalWidgetContent(configKey, {
    treasury: daoAccount,
    account: instanceAccount,
  });

  // Add ftLockups to the config
  modifiedWidgets[configKey] = configContent.replace(
    `allowLockupCancellation: true,`,
    `allowLockupCancellation: true,
  ftLockups: ["${lockupContract.accountId}"],`
  );
  const indexer = new Indexer(worker.provider.connection.url);
  await indexer.init();
  await indexer.attachIndexerRoutes(page);
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

  await page.waitForLoadState("networkidle");

  await expect(page.getByText("FT Lockup")).toBeVisible();

  await expect(page.getByText(lockupContract.accountId)).toBeVisible();

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
  await expect(page.getByText("Unreleased")).toBeVisible();
  await expect(page.getByText("90 USDt")).toBeVisible();

  await expect(page.getByText("Unclaimed")).toBeVisible();
  await expect(page.getByText("10 USDt", { exact: true })).toBeVisible();
  await expect(page.getByText("Claimed", { exact: true })).toBeVisible();
  expect(await page.getByText("0 USDt").count()).toBeGreaterThanOrEqual(1);

  // Verify lockup details
  await expect(page.getByText("Start Date")).toBeVisible();

  // Convert startTimestamp to readable date format
  const startDate = new Date(parseInt(startTimestamp) * 1000);
  const formattedDate = startDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  await expect(page.getByText(formattedDate)).toBeVisible();
  await expect(page.getByText("Rounds")).toBeVisible();
  await expect(page.getByText("0 / 10")).toBeVisible();

  await expect(page.getByText("Release Interval")).toBeVisible();
  await expect(page.getByText("Every quarter")).toBeVisible();

  await expect(page.getByText("Next Claim Date")).toBeVisible();
  await expect(page.getByRole("button", { name: "Claim" })).toBeVisible();
  await page.getByRole("button", { name: "Claim" }).click();
  await expect(page.getByText("Confirm Transaction")).toBeVisible();
  const transactionContent = JSON.stringify(
    JSON.parse(await page.locator("pre div").innerText())
  );
  expect(transactionContent).toBe(
    JSON.stringify({
      proposal: {
        description:
          "* Title: Claim FT Unlocked tokens <br>* Token Id: usdt.tether-token.near <br>* Amount: 10000000",
        kind: {
          FunctionCall: {
            receiver_id: lockupContract.accountId,
            actions: [
              {
                method_name: "claim",
                args: "",
                deposit: "0",
                gas: "200000000000000",
              },
            ],
          },
        },
      },
    })
  );
  await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByRole("button", { name: "Confirm" })).not.toBeVisible();

  await page.waitForTimeout(10_000);
});
