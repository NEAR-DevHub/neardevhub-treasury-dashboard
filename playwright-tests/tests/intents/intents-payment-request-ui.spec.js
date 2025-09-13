import { test } from "../../util/test.js";
import { expect } from "@playwright/test";
import { redirectWeb4, getLocalWidgetContent } from "../../util/web4.js";
import { parseNEAR, Worker } from "near-workspaces";
import { connect } from "near-api-js";
import { PROPOSAL_BOND, setPageAuthSettings } from "../../util/sandboxrpc.js";
import { mockNearBalances } from "../../util/rpcmock.js";
import { mockInventory } from "../../util/inventory.js";
import { Indexer } from "../../util/indexer.js";

let worker;
let availableTokensList;
let tokenId;
let supportedTokensInfo;
let nativeToken;
let socialNearAccount;
let mainnet;
let omftContract;
let omftMainnetAccount;
/**
 * @type {import("near-workspaces").NearAccount}
 */
let intentsContract;
let creatorAccount;

test.beforeAll(async () => {
  test.setTimeout(150000); // Set timeout for the whole beforeAll block

  // Fetch token info
  availableTokensList = (
    await fetch("https://api-mng-console.chaindefuser.com/api/tokens").then(
      (r) => r.json()
    )
  ).items;
  tokenId = availableTokensList.find(
    (token) => token.defuse_asset_id === "nep141:btc.omft.near"
  ).defuse_asset_id;

  supportedTokensInfo = await fetch("https://bridge.chaindefuser.com/rpc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: "dontcare",
      jsonrpc: "2.0",
      method: "supported_tokens",
      params: [{ chains: ["btc:mainnet"] }],
    }),
  }).then((r) => r.json());

  nativeToken = supportedTokensInfo.result.tokens[0];
  expect(nativeToken.near_token_id).toEqual("btc.omft.near");
  expect(tokenId).toEqual("nep141:btc.omft.near");

  // Worker setup
  worker = await Worker.init();

  // social.near setup
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

  // Mainnet connection for metadata
  mainnet = await connect({
    networkId: "mainnet",
    nodeUrl: "https://rpc.mainnet.fastnear.com",
  });

  // omft.near contract setup
  omftContract = await worker.rootAccount.importContract({
    mainnetContract: "omft.near",
  });
  omftMainnetAccount = await mainnet.account(omftContract.accountId); // omftContract.accountId is "omft.near"

  await omftContract.call(omftContract.accountId, "new", {
    super_admins: ["omft.near"],
    admins: {},
    grantees: {
      DAO: ["omft.near"],
      TokenDeployer: ["omft.near"],
      TokenDepositer: ["omft.near"],
    },
  });

  await omftContract.call(
    omftContract.accountId,
    "deploy_token",
    {
      token: "btc",
      metadata: await omftMainnetAccount.viewFunction({
        contractId: nativeToken.near_token_id, // btc.omft.near on mainnet
        methodName: "ft_metadata",
      }),
    },
    { attachedDeposit: parseNEAR("3"), gas: 300_000_000_000_000n.toString() }
  );

  // --- USDC (BASE) token setup ---
  const usdcBaseTokenId =
    "base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near";
  const usdcBaseMetadata = await (
    await mainnet.account(usdcBaseTokenId)
  ).viewFunction({
    contractId: usdcBaseTokenId,
    methodName: "ft_metadata",
  });
  await omftContract.call(
    omftContract.accountId,
    "deploy_token",
    {
      token: "base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      metadata: usdcBaseMetadata,
    },
    { attachedDeposit: parseNEAR("3"), gas: 300_000_000_000_000n.toString() }
  );

  // intents.near contract setup
  intentsContract = await worker.rootAccount.importContract({
    mainnetContract: "intents.near",
  });
  await intentsContract.call(intentsContract.accountId, "new", {
    config: {
      wnear_id: "wrap.near",
      fees: { fee: 100, fee_collector: "intents.near" },
      roles: {
        super_admins: ["intents.near"],
        admins: {},
        grantees: {},
      },
    },
  });

  // Storage deposit for intents.near on the btc.omft.near token contract
  await omftContract.call(
    // The omftContract Account object (representing omft.near) makes the call
    nativeToken.near_token_id, // to the btc.omft.near contract (nativeToken.near_token_id)
    "storage_deposit",
    {
      account_id: intentsContract.accountId,
      registration_only: true,
    },
    {
      attachedDeposit: "1500000000000000000000000", // 1.5 NEAR
      gas: "300000000000000",
    }
  );

  // Register intents.near for storage on USDC (BASE)
  await omftContract.call(
    usdcBaseTokenId,
    "storage_deposit",
    {
      account_id: intentsContract.accountId,
      registration_only: true,
    },
    {
      attachedDeposit: "1500000000000000000000000", // 1.5 NEAR
      gas: "300000000000000",
    }
  );

  // Creator account
  creatorAccount = await worker.rootAccount.createSubAccount("testcreator", {
    initialBalance: parseNEAR("2000"),
  });
});

test.afterAll(async () => {
  await worker.tearDown();
});

async function setupIndexer(page, worker) {
  const indexer = new Indexer(worker.provider.connection.url);
  await indexer.init();
  await indexer.attachIndexerRoutes(page);
}

// Helper function to find column index by header name
async function getColumnIndex(page, headerName) {
  const headerRow = page
    .locator(
      'tr[data-component="widgets.treasury-factory.near/widget/pages.payments.Table"]'
    )
    .nth(0)
    .locator("td");
  await expect(headerRow).not.toHaveCount(0);

  const headerCount = await headerRow.count();
  for (let i = 0; i < headerCount; i++) {
    const headerText = await headerRow.nth(i).textContent();
    if (headerText && headerText.trim() === headerName) {
      return i;
    }
  }
  throw new Error(`Column header "${headerName}" not found`);
}

async function selectIntentsWallet(page) {
  const canvasLocator = page.locator(".offcanvas-body");
  await expect(canvasLocator.getByText("Treasury Wallet")).toBeVisible();
  await canvasLocator.getByRole("button", { name: "Select Wallet" }).click();
  await expect(canvasLocator.getByText("NEAR Intents")).toBeVisible();
  await canvasLocator.getByText("NEAR Intents").click();
  await expect(
    canvasLocator.getByRole("button", { name: "Submit" })
  ).toBeVisible({
    timeout: 14_000,
  });
  await page.waitForTimeout(2_000);
}

test("payment request to BTC address", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  test.setTimeout(150000);
  // Import contract for the specific instance being tested
  // instanceAccount is an Account object provided by the test fixture
  await worker.rootAccount.importContract({
    mainnetContract: instanceAccount,
  });

  // DAO setup (specific to this test's daoAccount)
  // daoAccount is an Account object provided by the test fixture
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
            Group: [creatorAccount.accountId], // creatorAccount from beforeAll
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

  // Fund the DAO with btc.omft.near tokens via ft_deposit on omft.near
  await omftContract.call(
    // omftContract is from beforeAll (represents omft.near)
    omftContract.accountId, // Calling the main omft.near contract itself
    "ft_deposit",
    {
      owner_id: "intents.near", // Tokens are "owned" by intents.near initially for this flow
      token: "btc", // The token symbol registered in omft.near
      amount: "32000000000", // 320 BTC (assuming 8 decimals for btc.omft.near)
      msg: JSON.stringify({ receiver_id: daoAccount }), // Message for intents.near to credit the DAO
      memo: `BRIDGED_FROM:${JSON.stringify({
        networkType: "btc",
        chainId: "1",
        txHash:
          "0xc6b7ecd5c7517a8f56ac7ec9befed7d26a459fc97c7d5cd7598d4e19b5a806b7",
      })}`,
    },
    {
      attachedDeposit: parseNEAR("0.00125"), // Deposit for the call
      gas: "300000000000000",
    }
  );
  await setupIndexer(page, worker);
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    networkId: "sandbox",
    sandboxNodeUrl: worker.provider.connection.url,
    modifiedWidgets: {},
    callWidgetNodeURLForContractWidgets: false,
  });

  await mockNearBalances({
    page,
    accountId: creatorAccount.accountId,
    balance: (await creatorAccount.availableBalance()).toString(),
    storage: (await creatorAccount.balance()).staked,
  });

  await mockNearBalances({
    page,
    accountId: daoContract.accountId,
    balance: (
      await daoContract.getAccount(daoAccount).availableBalance()
    ).toString(),
    storage: (await daoContract.getAccount(daoAccount).balance()).staked,
  });

  await page.goto(`https://${instanceAccount}.page/`);
  await setPageAuthSettings(
    page,
    creatorAccount.accountId,
    await creatorAccount.getKey()
  );

  const btcRowLocator = page
    .getByTestId("intents-portfolio")
    .locator(
      'div.d-flex.flex-column:has(div.h6.mb-0.text-truncate:has-text("BTC"))'
    );
  const btcAmountElement = btcRowLocator.locator(
    "div.d-flex.gap-2.align-items-center.justify-content-end div.d-flex.flex-column.align-items-end div.h6.mb-0"
  );
  await expect(btcAmountElement).toBeAttached();
  await btcAmountElement.scrollIntoViewIfNeeded();
  // With intelligent formatting, 320 BTC displays as "320" (no trailing zeros)
  await expect(btcAmountElement).toHaveText("320");

  await page.waitForTimeout(500);

  await page.getByRole("link", { name: "Payments" }).click();

  const createRequestButton = await page.getByText("Create Request");
  await createRequestButton.click();

  await expect(page.getByText("Create Payment Request")).toBeVisible();
  await selectIntentsWallet(page);

  await page.getByTestId("tokens-dropdown").locator("div").first().click();

  await expect(
    page
      .getByTestId("tokens-dropdown")
      .locator("div.d-flex.flex-column.gap-1.w-100.text-wrap")
      .filter({ hasText: "BTC" })
  ).toBeVisible();

  if (!(await page.getByTestId("proposal-title").isVisible())) {
    await page.getByTestId("proposal-dropdown-btn").click();
    await page.getByText("Add manual request").click();
  }
  await page.getByTestId("proposal-title").click();
  await page.getByTestId("proposal-title").fill("btc proposal title");
  await page.getByTestId("proposal-summary").click();
  await page
    .getByTestId("proposal-summary")
    .fill("describing the btc payment request proposal");
  await page.getByTestId("tokens-dropdown").getByText("Select").click();
  await expect(page.getByText("through BTC")).toBeVisible();
  await page
    .getByTestId("tokens-dropdown")
    .getByText("BTC", { exact: true })
    .click();
  await page.getByTestId("total-amount").click();
  await page.getByTestId("total-amount").fill("2");
  await page.getByTestId("btc-recipient").click();
  await page
    .getByTestId("btc-recipient")
    .fill("bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh");

  await expect(
    page.getByText("Please enter valid account ID")
  ).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Submit" })).toBeEnabled();
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText("Confirm Transaction")).toBeVisible();

  const transactionContent = JSON.stringify(
    JSON.parse(await page.locator("pre div").innerText())
  );
  expect(transactionContent).toBe(
    JSON.stringify({
      proposal: {
        description:
          "* Title: btc proposal title <br>* Summary: describing the btc payment request proposal",
        kind: {
          FunctionCall: {
            receiver_id: intentsContract.accountId,
            actions: [
              {
                method_name: "ft_withdraw",
                args: Buffer.from(
                  JSON.stringify({
                    token: "btc.omft.near",
                    receiver_id: "btc.omft.near", // For ft_withdraw, receiver_id is the token contract itself
                    amount: "200000000", // 2 BTC (8 decimals)
                    memo: "WITHDRAW_TO:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
                  })
                ).toString("base64"),
                deposit: 1n.toString(),
                gas: 30_000_000_000_000n.toString(),
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
  const proposalColumns = page
    .locator(
      'tr[data-component="widgets.treasury-factory.near/widget/pages.payments.Table"]'
    )
    .nth(1)
    .locator("td");

  // Get column indexes dynamically
  const recipientColumnIndex = await getColumnIndex(page, "Recipient");
  const tokenColumnIndex = await getColumnIndex(page, "Requested Token");
  const fundingColumnIndex = await getColumnIndex(page, "Funding Ask");

  await expect(proposalColumns.nth(recipientColumnIndex)).toHaveText(
    "@bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
  );
  await expect(proposalColumns.nth(tokenColumnIndex)).toHaveText("BTC");
  await expect(proposalColumns.nth(fundingColumnIndex)).toHaveText("2.00");

  await proposalColumns.nth(fundingColumnIndex).click();
  await page.waitForTimeout(2_000);
  await page.getByRole("button", { name: "Approve" }).nth(1).click();

  expect(
    await intentsContract.view("mt_batch_balance_of", {
      account_id: daoAccount,
      token_ids: [tokenId],
    })
  ).toEqual([320_00_000_000n.toString()]);

  await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Confirm Transaction")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(
    page.getByText("The payment request has been successfully executed.")
  ).toBeVisible({ timeout: 15_000 });

  await page.waitForTimeout(1000);
  expect(
    await intentsContract.view("mt_batch_balance_of", {
      account_id: daoAccount,
      token_ids: [tokenId],
    })
  ).toEqual([318_00_000_000n.toString()]);

  await page.getByRole("link", { name: "Dashboard" }).click();
  await btcAmountElement.scrollIntoViewIfNeeded();
  // With intelligent formatting, 318 BTC displays as "318" (no trailing zeros)
  await expect(btcAmountElement).toHaveText("318");
  await page.waitForTimeout(500);
});

test("payment request to USDC address on BASE", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  test.setTimeout(150000);
  // Import contract for the specific instance being tested
  await worker.rootAccount.importContract({
    mainnetContract: instanceAccount,
  });

  // DAO setup (specific to this test's daoAccount)
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

  // Fund the DAO with USDC tokens via ft_deposit on omft.near
  const usdcBaseTokenId =
    "base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near";
  const usdcBaseDefuseAssetId =
    "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near";
  await omftContract.call(
    omftContract.accountId,
    "ft_deposit",
    {
      owner_id: "intents.near",
      token: "base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      amount: "100000000000", // 100,000 USDC (6 decimals)
      msg: JSON.stringify({ receiver_id: daoAccount }),
      memo: `BRIDGED_FROM:${JSON.stringify({
        networkType: "base",
        chainId: "8453",
        txHash: "0xusdcbaseplaceholdertxhash",
      })}`,
    },
    {
      attachedDeposit: parseNEAR("0.00125"),
      gas: "300000000000000",
    }
  );

  await setupIndexer(page, worker);
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    networkId: "sandbox",
    sandboxNodeUrl: worker.provider.connection.url,
    modifiedWidgets: {},
    callWidgetNodeURLForContractWidgets: false,
  });

  await mockNearBalances({
    page,
    accountId: creatorAccount.accountId,
    balance: (await creatorAccount.availableBalance()).toString(),
    storage: (await creatorAccount.balance()).staked,
  });

  await mockNearBalances({
    page,
    accountId: daoContract.accountId,
    balance: (
      await daoContract.getAccount(daoAccount).availableBalance()
    ).toString(),
    storage: (await daoContract.getAccount(daoAccount).balance()).staked,
  });

  await page.goto(`https://${instanceAccount}.page/`);
  await setPageAuthSettings(
    page,
    creatorAccount.accountId,
    await creatorAccount.getKey()
  );

  const usdcRowLocator = page
    .getByTestId("intents-portfolio")
    .locator(
      'div.d-flex.flex-column:has(div.h6.mb-0.text-truncate:has-text("USDC"))'
    );
  await expect(usdcRowLocator).toBeAttached();
  const usdcAmountElement = usdcRowLocator.locator(
    "div.d-flex.gap-2.align-items-center.justify-content-end div.d-flex.flex-column.align-items-end div.h6.mb-0"
  );
  await expect(usdcAmountElement).toBeAttached();
  await usdcAmountElement.scrollIntoViewIfNeeded();
  // With intelligent formatting, 100000 USDC displays as "100,000" (with comma, no decimals)
  await expect(usdcAmountElement).toHaveText("100,000");

  await page.waitForTimeout(500);

  await page.getByRole("link", { name: "Payments" }).click();

  const createRequestButton = await page.getByText("Create Request");
  await createRequestButton.click();
  await expect(page.getByText("Create Payment Request")).toBeVisible();
  await selectIntentsWallet(page);

  await page.getByTestId("tokens-dropdown").locator("div").first().click();

  await expect(
    await page
      .getByTestId("tokens-dropdown")
      .locator("div.d-flex.flex-column.gap-1.w-100.text-wrap")
      .filter({ hasText: "USDC" })
  ).toBeVisible();

  if (!(await page.getByTestId("proposal-title").isVisible())) {
    await page.getByTestId("proposal-dropdown-btn").click();
    await page.getByText("Add manual request").click();
  }
  await page.getByTestId("proposal-title").click();
  await page.getByTestId("proposal-title").fill("usdc proposal title");
  await page.getByTestId("proposal-summary").click();
  await page
    .getByTestId("proposal-summary")
    .fill("describing the usdc payment request proposal");
  await page.getByTestId("tokens-dropdown").getByText("Select").click();
  await expect(page.getByText("through BASE")).toBeVisible();
  await page
    .getByTestId("tokens-dropdown")
    .getByText("USDC", { exact: true })
    .click();
  await page.getByTestId("total-amount").click();
  await page.getByTestId("total-amount").fill("2500");
  await page.getByPlaceholder("Enter BASE Address (0x...)").click();
  await page
    .getByPlaceholder("Enter BASE Address (0x...)")
    .fill("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");

  await expect(
    page.getByText("Please enter valid account ID")
  ).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Submit" })).toBeEnabled();
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText("Confirm Transaction")).toBeVisible();

  const transactionContent = JSON.stringify(
    JSON.parse(await page.locator("pre div").innerText())
  );
  expect(transactionContent).toBe(
    JSON.stringify({
      proposal: {
        description:
          "* Title: usdc proposal title <br>* Summary: describing the usdc payment request proposal",
        kind: {
          FunctionCall: {
            receiver_id: intentsContract.accountId,
            actions: [
              {
                method_name: "ft_withdraw",
                args: Buffer.from(
                  JSON.stringify({
                    token: usdcBaseTokenId,
                    receiver_id: usdcBaseTokenId,
                    amount: "2500000000", // 2,500 USDC (6 decimals)
                    memo: "WITHDRAW_TO:0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                  })
                ).toString("base64"),
                deposit: 1n.toString(),
                gas: 30_000_000_000_000n.toString(),
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
  const proposalColumns = page
    .locator(
      'tr[data-component="widgets.treasury-factory.near/widget/pages.payments.Table"]'
    )
    .nth(1)
    .locator("td");

  // Get column indexes dynamically
  const recipientColumnIndex = await getColumnIndex(page, "Recipient");
  const tokenColumnIndex = await getColumnIndex(page, "Requested Token");
  const fundingColumnIndex = await getColumnIndex(page, "Funding Ask");

  await expect(proposalColumns.nth(recipientColumnIndex)).toHaveText(
    "@0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
  );
  await expect(proposalColumns.nth(tokenColumnIndex)).toHaveText("USDC");
  await expect(proposalColumns.nth(fundingColumnIndex)).toHaveText("2,500.00");

  await proposalColumns.nth(fundingColumnIndex).click();

  await page.waitForTimeout(2_000);
  await page.getByRole("button", { name: "Approve" }).nth(1).click();

  expect(
    await intentsContract.view("mt_batch_balance_of", {
      account_id: daoAccount,
      token_ids: [usdcBaseDefuseAssetId],
    })
  ).toEqual(["100000000000"]);

  await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Confirm Transaction")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();

  await page.waitForTimeout(1000);
  await expect(
    page.getByText("The payment request has been successfully executed.")
  ).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1_000);
  expect(
    await intentsContract.view("mt_batch_balance_of", {
      account_id: daoAccount,
      token_ids: [usdcBaseDefuseAssetId],
    })
  ).toEqual(["97500000000"]); // 100,000,000,000 - 2,500,000,000

  await page.getByRole("link", { name: "Dashboard" }).click();
  await usdcAmountElement.scrollIntoViewIfNeeded();
  // With intelligent formatting, 97500 USDC displays as "97,500" (with comma, no decimals)
  await expect(usdcAmountElement).toHaveText("97,500");
  await page.waitForTimeout(500);
});

test("payment request for wNEAR token on NEAR intents", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  test.setTimeout(150000);
  // Import contract for the specific instance being tested
  await worker.rootAccount.importContract({
    mainnetContract: instanceAccount,
  });

  // Set up wNEAR contract for NEAR intents
  const wrapNearContract = await worker.rootAccount.importContract({
    mainnetContract: "wrap.near",
  });

  await wrapNearContract.call(wrapNearContract.accountId, "new", {
    owner_id: wrapNearContract.accountId,
    total_supply: parseNEAR("1000000000"),
    metadata: {
      spec: "ft-1.0.0",
      name: "Wrapped NEAR fungible token",
      symbol: "wNEAR",
      decimals: 24,
    },
  });

  // DAO setup (specific to this test's daoAccount)
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

  // Register storage for intents contract on wNEAR
  await intentsContract.call(
    wrapNearContract.accountId,
    "storage_deposit",
    {
      account_id: intentsContract.accountId,
      registration_only: true,
    },
    {
      attachedDeposit: parseNEAR("0.01"),
    }
  );

  // Deposit NEAR into wNEAR contract to get wNEAR tokens for DAO
  await creatorAccount.call(
    wrapNearContract.accountId,
    "near_deposit",
    {},
    { attachedDeposit: parseNEAR("100") }
  );

  // Transfer wNEAR to intents contract for the DAO using ft_transfer_call
  await creatorAccount.call(
    wrapNearContract.accountId,
    "ft_transfer_call",
    {
      receiver_id: intentsContract.accountId,
      amount: parseNEAR("91.3"), // 100 NEAR worth of wNEAR
      msg: JSON.stringify({ receiver_id: daoAccount }),
    },
    { attachedDeposit: "1", gas: "50000000000000" }
  );

  // Verify that the DAO has NEAR balance in intents contract
  const nearIntentsBalance = await intentsContract.view("mt_balance_of", {
    account_id: daoAccount,
    token_id: "nep141:wrap.near",
  });
  expect(nearIntentsBalance).toBe(parseNEAR("91.3"));

  // Get initial wNEAR balance of creatorAccount (who will be the recipient)
  const recipientInitialBalance = await wrapNearContract.view("ft_balance_of", {
    account_id: creatorAccount.accountId,
  });

  await setupIndexer(page, worker);
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    networkId: "sandbox",
    sandboxNodeUrl: worker.provider.connection.url,
    modifiedWidgets: {},
    callWidgetNodeURLForContractWidgets: false,
  });

  await mockNearBalances({
    page,
    accountId: creatorAccount.accountId,
    balance: (await creatorAccount.availableBalance()).toString(),
    storage: (await creatorAccount.balance()).staked,
  });

  await mockNearBalances({
    page,
    accountId: daoContract.accountId,
    balance: (
      await daoContract.getAccount(daoAccount).availableBalance()
    ).toString(),
    storage: (await daoContract.getAccount(daoAccount).balance()).staked,
  });

  await page.goto(`https://${instanceAccount}.page/`);
  await setPageAuthSettings(
    page,
    creatorAccount.accountId,
    await creatorAccount.getKey()
  );

  // Check that NEAR (NEAR Intents) balance shows up in the dashboard
  const nearBalanceRowLocator = page
    .getByTestId("intents-portfolio")
    .locator(
      'div.d-flex.flex-column:has(div.h6.mb-0.text-truncate:has-text("wNEAR"))'
    );

  const nearBalanceLocator = nearBalanceRowLocator.locator(
    "div.d-flex.gap-2.align-items-center.justify-content-end div.d-flex.flex-column.align-items-end div.h6.mb-0"
  );
  await expect(nearBalanceRowLocator).toBeAttached();

  await nearBalanceLocator.scrollIntoViewIfNeeded();
  // With intelligent formatting, 91.3 wNEAR displays as "91.3" (no trailing zero)
  await expect(nearBalanceLocator).toHaveText("91.3");

  await page.waitForTimeout(500);

  await page.getByRole("link", { name: "Payments" }).click();

  const createRequestButton = await page.getByText("Create Request");
  await expect(createRequestButton).toBeEnabled();
  await createRequestButton.click();
  await expect(page.getByText("Create Payment Request")).toBeVisible();
  await selectIntentsWallet(page);

  if (!(await page.getByTestId("proposal-title").isVisible())) {
    await page.getByTestId("proposal-dropdown-btn").click();
    await page.getByText("Add manual request").click();
  }
  await page.getByTestId("proposal-title").click();
  await page
    .getByTestId("proposal-title")
    .fill("NEAR intents withdrawal proposal");
  await page.getByTestId("proposal-summary").click();
  await page
    .getByTestId("proposal-summary")
    .fill("Withdrawal of wNEAR tokens from intents contract");
  await page.getByTestId("tokens-dropdown").getByText("Select").click();
  await expect(page.getByText("through NEAR")).toBeVisible();
  await page
    .getByTestId("tokens-dropdown")
    .getByText("wNEAR", { exact: true })
    .click();
  await page.getByTestId("total-amount").click();
  await page.getByTestId("total-amount").fill("50");
  await page.getByPlaceholder("treasury.near").click();
  await page.getByPlaceholder("treasury.near").fill(creatorAccount.accountId);

  await expect(
    page.getByText("Please enter valid account ID")
  ).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Submit" })).toBeEnabled();
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText("Confirm Transaction")).toBeVisible();

  // The transaction should be creating an intents-based payment request
  const transactionContent = JSON.stringify(
    JSON.parse(await page.locator("pre div").innerText())
  );
  expect(transactionContent).toBe(
    JSON.stringify({
      proposal: {
        description:
          "* Title: NEAR intents withdrawal proposal <br>* Summary: Withdrawal of wNEAR tokens from intents contract",
        kind: {
          FunctionCall: {
            receiver_id: "intents.near",
            actions: [
              {
                method_name: "ft_withdraw",
                args: Buffer.from(
                  JSON.stringify({
                    token: "wrap.near",
                    receiver_id: creatorAccount.accountId,
                    amount: parseNEAR("50"),
                  })
                ).toString("base64"),
                deposit: "1",
                gas: "30000000000000",
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

  // Helper function to find column index by header name
  const proposalColumns = page
    .locator(
      'tr[data-component="widgets.treasury-factory.near/widget/pages.payments.Table"]'
    )
    .nth(1)
    .locator("td");

  // Get column indexes dynamically
  const creatorColumnIndex = await getColumnIndex(page, "Created by");
  const tokenColumnIndex = await getColumnIndex(page, "Requested Token");
  const fundingColumnIndex = await getColumnIndex(page, "Funding Ask");

  await expect(proposalColumns.nth(creatorColumnIndex)).toHaveText(
    `${creatorAccount.accountId}`
  );
  await expect(proposalColumns.nth(tokenColumnIndex)).toHaveText("wNEAR");
  await expect(proposalColumns.nth(fundingColumnIndex)).toHaveText("50");

  await proposalColumns.nth(fundingColumnIndex).click();

  await page.waitForTimeout(2_000);
  await page.getByRole("button", { name: "Approve" }).nth(1).click();

  // Check intents balance before execution
  const intentsBalanceBefore = await intentsContract.view("mt_balance_of", {
    account_id: daoAccount,
    token_id: "nep141:wrap.near",
  });
  expect(intentsBalanceBefore).toBe(parseNEAR("91.3"));

  await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Confirm Transaction")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(
    page.getByText("The payment request has been successfully executed.")
  ).toBeVisible({ timeout: 15_000 });

  await page.waitForTimeout(1000);

  // Check that recipient (creatorAccount) received the wNEAR tokens
  const recipientFinalBalance = await wrapNearContract.view("ft_balance_of", {
    account_id: creatorAccount.accountId,
  });
  console.log(
    "initial and final wNEAR balance",
    recipientInitialBalance,
    recipientFinalBalance
  );
  const balanceIncrease =
    BigInt(recipientFinalBalance) - BigInt(recipientInitialBalance);
  // Should have received exactly 50 wNEAR tokens
  expect(balanceIncrease.toString()).toBe(parseNEAR("50"));

  await page.getByRole("link", { name: "Dashboard" }).click();
  await nearBalanceLocator.scrollIntoViewIfNeeded();
  // Balance should be reduced to approximately 41.3 NEAR
  // With intelligent formatting, displays as "41.3" (no trailing zero)
  await expect(nearBalanceLocator).toHaveText("41.3");
  await page.waitForTimeout(500);
});

test("insufficient balance alert for BTC payment request exceeding available balance", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  test.setTimeout(150000);
  // Import contract for the specific instance being tested
  await worker.rootAccount.importContract({
    mainnetContract: instanceAccount,
  });

  // DAO setup (specific to this test's daoAccount)
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

  // Fund the DAO with a smaller amount of BTC (only 100 BTC instead of 320)
  await omftContract.call(
    omftContract.accountId,
    "ft_deposit",
    {
      owner_id: "intents.near",
      token: "btc",
      amount: "10000000000", // 100 BTC (8 decimals)
      msg: JSON.stringify({ receiver_id: daoAccount }),
      memo: `BRIDGED_FROM:${JSON.stringify({
        networkType: "btc",
        chainId: "1",
        txHash:
          "0xc6b7ecd5c7517a8f56ac7ec9befed7d26a459fc97c7d5cd7598d4e19b5a806b7",
      })}`,
    },
    {
      attachedDeposit: parseNEAR("0.00125"),
      gas: "300000000000000",
    }
  );

  await setupIndexer(page, worker);
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    networkId: "sandbox",
    sandboxNodeUrl: worker.provider.connection.url,
    modifiedWidgets: {},
    callWidgetNodeURLForContractWidgets: false,
  });

  await mockNearBalances({
    page,
    accountId: creatorAccount.accountId,
    balance: (await creatorAccount.availableBalance()).toString(),
    storage: (await creatorAccount.balance()).staked,
  });

  await mockNearBalances({
    page,
    accountId: daoContract.accountId,
    balance: (
      await daoContract.getAccount(daoAccount).availableBalance()
    ).toString(),
    storage: (await daoContract.getAccount(daoAccount).balance()).staked,
  });

  await page.goto(`https://${instanceAccount}.page/`);
  await setPageAuthSettings(
    page,
    creatorAccount.accountId,
    await creatorAccount.getKey()
  );

  // Verify the DAO has 100 BTC available
  const btcRowLocator = page
    .getByTestId("intents-portfolio")
    .locator(
      'div.d-flex.flex-column:has(div.h6.mb-0.text-truncate:has-text("BTC"))'
    );
  const btcAmountElement = btcRowLocator.locator(
    "div.d-flex.gap-2.align-items-center.justify-content-end div.d-flex.flex-column.align-items-end div.h6.mb-0"
  );
  await expect(btcAmountElement).toBeAttached();
  await btcAmountElement.scrollIntoViewIfNeeded();
  // With intelligent formatting, 100 BTC displays as "100" (no trailing zeros)
  await expect(btcAmountElement).toHaveText("100");

  await page.waitForTimeout(500);

  await page.getByRole("link", { name: "Payments" }).click();

  const createRequestButton = await page.getByText("Create Request");
  await createRequestButton.click();
  await expect(page.getByText("Create Payment Request")).toBeVisible();
  await selectIntentsWallet(page);

  if (!(await page.getByTestId("proposal-title").isVisible())) {
    await page.getByTestId("proposal-dropdown-btn").click();
    await page.getByText("Add manual request").click();
  }
  await page.getByTestId("proposal-title").click();
  await page.getByTestId("proposal-title").fill("excessive btc proposal");
  await page.getByTestId("proposal-summary").click();
  await page
    .getByTestId("proposal-summary")
    .fill("requesting more BTC than available");
  await page.getByTestId("tokens-dropdown").getByText("Select").click();
  await page
    .getByTestId("tokens-dropdown")
    .getByText("BTC", { exact: true })
    .click();
  // Request 500 BTC when only 100 BTC is available
  await page.getByTestId("total-amount").click();
  await page.getByTestId("total-amount").fill("500");
  await page.getByTestId("btc-recipient").click();
  await page
    .getByTestId("btc-recipient")
    .fill("bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh");

  // Verify that the insufficient balance warning appears in the create request form
  await expect(
    page.getByText("The treasury balance is insufficient to cover the payment.")
  ).toBeVisible();

  await expect(page.getByRole("button", { name: "Submit" })).toBeEnabled();
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText("Confirm Transaction")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByRole("button", { name: "Confirm" })).not.toBeVisible();

  // Wait for the proposal to be created and navigate to the proposal
  const proposalColumns = page
    .locator(
      'tr[data-component="widgets.treasury-factory.near/widget/pages.payments.Table"]'
    )
    .nth(1)
    .locator("td");

  const fundingColumnIndex = await getColumnIndex(page, "Funding Ask");
  await expect(proposalColumns.nth(fundingColumnIndex)).toHaveText("500.00");

  // Click on the proposal to view details
  await proposalColumns.nth(fundingColumnIndex).click();
  await page.waitForTimeout(2_000);

  // Try to approve the request - this should trigger the insufficient balance warning
  await page.getByRole("button", { name: "Approve" }).nth(1).click();

  // Verify the insufficient balance warning modal appears
  await expect(page.getByText("Insufficient Balance")).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.getByText(
      "Your current balance is not enough to complete this transaction."
    )
  ).toBeVisible();

  // Verify the transaction amount and current balance are displayed
  await expect(page.getByText("Transaction amount:")).toBeVisible();
  await expect(page.getByText("Your current balance:")).toBeVisible();

  // Verify both Cancel and Proceed Anyway buttons are available
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Proceed Anyway" })
  ).toBeVisible();

  // Cancel the transaction to verify the modal closes and we're back to the proposal
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Insufficient Balance")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve" }).nth(1)
  ).toBeVisible();
});

test("insufficient balance alert for wNEAR payment request exceeding available balance", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  test.setTimeout(150000);
  // Import contract for the specific instance being tested
  await worker.rootAccount.importContract({
    mainnetContract: instanceAccount,
  });

  // Set up wNEAR contract for NEAR intents
  const wrapNearContract = await worker.rootAccount.importContract({
    mainnetContract: "wrap.near",
  });

  await wrapNearContract.call(wrapNearContract.accountId, "new", {
    owner_id: wrapNearContract.accountId,
    total_supply: parseNEAR("1000000000"),
    metadata: {
      spec: "ft-1.0.0",
      name: "Wrapped NEAR fungible token",
      symbol: "wNEAR",
      decimals: 24,
    },
  });

  // DAO setup (specific to this test's daoAccount)
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

  // Register storage for intents contract on wNEAR
  await intentsContract.call(
    wrapNearContract.accountId,
    "storage_deposit",
    {
      account_id: intentsContract.accountId,
      registration_only: true,
    },
    {
      attachedDeposit: parseNEAR("0.01"),
    }
  );

  // Deposit NEAR into wNEAR contract and transfer a smaller amount to intents (only 25 wNEAR)
  await creatorAccount.call(
    wrapNearContract.accountId,
    "near_deposit",
    {},
    { attachedDeposit: parseNEAR("30") }
  );

  // Transfer only 25 wNEAR to intents contract for the DAO
  await creatorAccount.call(
    wrapNearContract.accountId,
    "ft_transfer_call",
    {
      receiver_id: intentsContract.accountId,
      amount: parseNEAR("25"), // Only 25 wNEAR available
      msg: JSON.stringify({ receiver_id: daoAccount }),
    },
    { attachedDeposit: "1", gas: "50000000000000" }
  );

  await setupIndexer(page, worker);
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    networkId: "sandbox",
    sandboxNodeUrl: worker.provider.connection.url,
    modifiedWidgets: {},
    callWidgetNodeURLForContractWidgets: false,
  });

  await mockNearBalances({
    page,
    accountId: creatorAccount.accountId,
    balance: (await creatorAccount.availableBalance()).toString(),
    storage: (await creatorAccount.balance()).staked,
  });

  await mockNearBalances({
    page,
    accountId: daoContract.accountId,
    balance: (
      await daoContract.getAccount(daoAccount).availableBalance()
    ).toString(),
    storage: (await daoContract.getAccount(daoAccount).balance()).staked,
  });

  await page.goto(`https://${instanceAccount}.page/`);
  await setPageAuthSettings(
    page,
    creatorAccount.accountId,
    await creatorAccount.getKey()
  );

  // Verify the DAO has 25 wNEAR available in intents
  const nearBalanceRowLocator = page
    .getByTestId("intents-portfolio")
    .locator(
      'div.d-flex.flex-column:has(div.h6.mb-0.text-truncate:has-text("wNEAR"))'
    );
  const nearBalanceLocator = nearBalanceRowLocator.locator(
    "div.d-flex.gap-2.align-items-center.justify-content-end div.d-flex.flex-column.align-items-end div.h6.mb-0"
  );
  await expect(nearBalanceRowLocator).toBeAttached();
  await nearBalanceLocator.scrollIntoViewIfNeeded();
  // With intelligent formatting, 25 wNEAR displays as "25" (no trailing zeros)
  await expect(nearBalanceLocator).toHaveText("25");

  await page.waitForTimeout(500);

  await page.getByRole("link", { name: "Payments" }).click();

  const createRequestButton = await page.getByText("Create Request");
  await createRequestButton.click();
  await expect(page.getByText("Create Payment Request")).toBeVisible();
  await selectIntentsWallet(page);

  if (!(await page.getByTestId("proposal-title").isVisible())) {
    await page.getByTestId("proposal-dropdown-btn").click();
    await page.getByText("Add manual request").click();
  }
  await page.getByTestId("proposal-title").click();
  await page.getByTestId("proposal-title").fill("excessive wNEAR proposal");
  await page.getByTestId("proposal-summary").click();
  await page
    .getByTestId("proposal-summary")
    .fill("requesting more wNEAR than available");
  await page.getByTestId("tokens-dropdown").getByText("Select").click();
  await page
    .getByTestId("tokens-dropdown")
    .getByText("wNEAR", { exact: true })
    .click();
  // Request 100 wNEAR when only 25 wNEAR is available
  await page.getByTestId("total-amount").click();
  await page.getByTestId("total-amount").fill("100");
  await page.getByPlaceholder("treasury.near").click();
  await page.getByPlaceholder("treasury.near").fill(creatorAccount.accountId);

  // Verify that the insufficient balance warning appears in the create request form
  await expect(
    page.getByText("The treasury balance is insufficient to cover the payment.")
  ).toBeVisible();

  await expect(page.getByRole("button", { name: "Submit" })).toBeEnabled();
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText("Confirm Transaction")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByRole("button", { name: "Confirm" })).not.toBeVisible();

  // Wait for the proposal to be created and navigate to the proposal
  const proposalColumns = page
    .locator(
      'tr[data-component="widgets.treasury-factory.near/widget/pages.payments.Table"]'
    )
    .nth(1)
    .locator("td");

  const fundingColumnIndex = await getColumnIndex(page, "Funding Ask");
  await expect(proposalColumns.nth(fundingColumnIndex)).toHaveText("100");

  // Click on the proposal to view details
  await proposalColumns.nth(fundingColumnIndex).click();
  await page.waitForTimeout(2_000);

  // Try to approve the request - this should trigger the insufficient balance warning
  await page.getByRole("button", { name: "Approve" }).nth(1).click();

  // Verify the insufficient balance warning modal appears
  await expect(page.getByText("Insufficient Balance")).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.getByText(
      "Your current balance is not enough to complete this transaction."
    )
  ).toBeVisible();

  // Verify the transaction amount and current balance are displayed

  const transactionAmountLocator = page.getByText("Transaction amount:");
  await expect(transactionAmountLocator).toBeVisible();
  await expect(transactionAmountLocator).toContainText("100");

  const currentBalanceLocator = page.getByText("Your current balance:");
  await expect(currentBalanceLocator).toBeVisible();
  await expect(currentBalanceLocator).toContainText("25");

  // Verify both Cancel and Proceed Anyway buttons are available
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Proceed Anyway" })
  ).toBeVisible();

  await page.waitForTimeout(1_000);

  // Cancel the transaction to verify the modal closes and we're back to the proposal
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Insufficient Balance")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve" }).nth(1)
  ).toBeVisible();
});
