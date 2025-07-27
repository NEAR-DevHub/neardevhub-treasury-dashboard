import { test, cacheCDN } from "../../util/test.js";
import { expect } from "@playwright/test";
import { redirectWeb4, getLocalWidgetContent } from "../../util/web4.js";
import { parseNEAR, Worker, Account } from "near-workspaces";
import { connect } from "near-api-js";
import { setPageAuthSettings } from "../../util/sandboxrpc.js";
import { mockNearBalances } from "../../util/rpcmock.js";
import { getTransactionModalObject } from "../../util/transaction.js";
import fs from "fs/promises";
import path from "path";

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(process.cwd(), "screenshots", "1click-integration");

// Sandbox setup variables
let worker;
let creatorAccount;
let socialNearAccount;
let intentsContract;
let omftContract;
let usdcContract;

test.beforeAll(async () => {
  test.setTimeout(150000);
  
  try {
    await fs.mkdir(screenshotsDir, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
  
  // Initialize worker and create account for authentication
  worker = await Worker.init();
  
  // social.near setup (required for BOS widgets)
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
  
  // Create account with DAO permissions
  creatorAccount = await worker.rootAccount.createSubAccount("testcreator", {
    initialBalance: parseNEAR("10"),
  });
  
  // Set up intents.near contract
  intentsContract = await worker.rootAccount.importContract({
    mainnetContract: "intents.near",
  });
  await intentsContract.call(intentsContract.accountId, "new", {
    config: {
      wnear_id: "wrap.near",
      fees: {
        fee: 100,
        fee_collector: "intents.near",
      },
      roles: {
        super_admins: ["intents.near"],
        admins: {},
        grantees: {},
      },
    },
  });
  
  // Set up omft contract (parent contract)
  omftContract = await worker.rootAccount.importContract({
    mainnetContract: "omft.near",
  });
  await omftContract.call(omftContract.accountId, "new", {
    super_admins: ["omft.near"],
    admins: {},
    grantees: {
      DAO: ["omft.near"],
      TokenDeployer: ["omft.near"],
      TokenDepositer: ["omft.near"],
    },
  });
  
  // Deploy ETH token on omft contract
  const mainnet = await connect({
    networkId: "mainnet",
    nodeUrl: "https://rpc.mainnet.fastnear.com",
  });
  const ethOmftMainnetAccount = await mainnet.account("eth.omft.near");
  
  await omftContract.call(
    omftContract.accountId,
    "deploy_token",
    {
      token: "eth",
      metadata: await ethOmftMainnetAccount.viewFunction({
        contractId: "eth.omft.near",
        methodName: "ft_metadata",
      }),
    },
    { attachedDeposit: parseNEAR("3"), gas: "300000000000000" }
  );
  
  // Register intents.near for storage on eth.omft.near
  await omftContract.call(
    "eth.omft.near",
    "storage_deposit",
    {
      account_id: intentsContract.accountId,
      registration_only: true,
    },
    {
      attachedDeposit: parseNEAR("0.015"),
    }
  );
});

test.afterAll(async () => {
  await worker.tearDown();
});

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  
  // Capture failure screenshot if test failed
  if (testInfo.status === "failed") {
    await page.screenshot({ 
      path: path.join(screenshotsDir, `${testInfo.title.replace(/\s+/g, '-')}-failure.png`),
      fullPage: true 
    });
  }
  
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

async function openCreatePage({ page, instanceAccount }) {
  await page.goto(`https://${instanceAccount}.page/?page=asset-exchange`);
  await expect(page.getByText("Pending Requests")).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole("button", { name: "Create Request" }).click();
  await page.waitForLoadState("networkidle");
}

// Helper function to intercept 1Click API quote and replace deposit address
// TODO: Implement this to replace the deposit address with our own
async function intercept1ClickQuote({ page, ourDepositAddress }) {
  // We'll intercept the real 1Click API response and only replace the deposit address
  // This allows us to use real quotes while testing with our own address
}

// Helper function to deposit tokens to treasury via intents
async function depositTokensToTreasury({ daoAccount }) {
  console.log("Depositing ETH to treasury...");
  
  // Deposit ETH on Ethereum to treasury (similar to intents-deposit-other-chain.spec.js)
  await omftContract.call(
    omftContract.accountId,
    "ft_deposit",
    {
      owner_id: intentsContract.accountId,
      token: "eth",
      amount: "5000000000000000000", // 5 ETH
      msg: JSON.stringify({ receiver_id: daoAccount }),
      memo: `BRIDGED_FROM:${JSON.stringify({
        networkType: "eth",
        chainId: "1",
        txHash: "0xc6b7ecd5c7517a8f56ac7ec9befed7d26a459fc97c7d5cd7598d4e19b5a806b7",
      })}`,
    },
    { 
      attachedDeposit: parseNEAR("0.00125"), 
      gas: "300000000000000" 
    }
  );
  
  console.log("ETH deposit complete");
  
  // Verify the balance was deposited
  const ethTokenId = "nep141:eth.omft.near";
  const balances = await intentsContract.view("mt_batch_balance_of", {
    account_id: daoAccount,
    token_ids: [ethTokenId],
  });
  console.log(`Treasury ETH balance on NEAR Intents: ${balances[0]}`);
  
  // TODO: Add BTC and USDC deposits once we figure out the storage deposit issues
}

test.describe("1Click API Integration - Asset Exchange", function () {
  test("complete 1Click swap flow with NEAR Intents", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(120_000);
    await cacheCDN(page);
    
    console.log("Setting up contracts...");
    
    // Import required contracts
    await worker.rootAccount.importContract({
      mainnetContract: instanceAccount,
    });
    
    // Create DAO contract
    const daoContract = await worker.rootAccount.importContract({
      mainnetContract: daoAccount,
      initialBalance: parseNEAR("10"),
    });
    
    // Initialize DAO with creatorAccount having permissions
    const daoName = daoAccount.split(".")[0];
    await daoContract.callRaw(daoAccount, "new", {
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
        ],
        default_vote_policy: {
          weight_kind: "RoleWeight",
          quorum: "0",
          threshold: [1, 2],
        },
        proposal_bond: "100000000000000000000000",
        proposal_period: "604800000000000",
        bounty_bond: "100000000000000000000000",
        bounty_forgiveness_period: "604800000000000",
      },
    }, {
      gas: "300000000000000",
    });
    
    console.log("Depositing tokens to treasury...");
    
    // Deposit tokens to treasury BEFORE navigating to page
    await depositTokensToTreasury({ daoAccount });
    
    // Set up proper Web4 redirection and auth
    const modifiedWidgets = {};
    const configKey = `${instanceAccount}/widget/config.data`;
    
    modifiedWidgets[configKey] = (
      await getLocalWidgetContent(configKey, {
        treasury: daoAccount,
        account: instanceAccount,
      })
    ).replace("treasuryDaoID:", "showNearIntents: true, treasuryDaoID:");

    await redirectWeb4({
      page,
      contractId: instanceAccount,
      treasury: daoAccount,
      networkId: "sandbox",
      sandboxNodeUrl: worker.provider.connection.url,
      modifiedWidgets,
      callWidgetNodeURLForContractWidgets: false,
    });
    
    // Mock user balance
    await mockNearBalances({
      page,
      accountId: creatorAccount.accountId,
      balance: (await creatorAccount.availableBalance()).toString(),
      storage: (await creatorAccount.balance()).staked,
    });
    
    console.log("Navigating to asset exchange page...");
    
    // Navigate to asset exchange page
    await page.goto(`https://${instanceAccount}.page/?page=asset-exchange`);
    
    // Set auth with sandbox account
    await setPageAuthSettings(
      page,
      creatorAccount.accountId,
      await creatorAccount.getKey()
    );
    
    // Wait for page to load
    await expect(page.getByText("Pending Requests")).toBeVisible({
      timeout: 15000,
    });
    
    console.log("Opening Create Request form...");
    
    // Click Create Request button
    const createRequestButton = page.getByRole("button", { name: "Create Request" });
    await expect(createRequestButton).toBeVisible();
    await createRequestButton.click();
    
    // Wait for form to load
    await page.waitForTimeout(2000);
    
    console.log("Clicking Near Intents tab...");
    
    // Click on Near Intents tab
    await page.getByRole("button", { name: "Near Intents" }).click();
    await page.waitForTimeout(2000);
    
    // Verify we see the 1Click form
    await expect(page.getByText("Exchange tokens within your NEAR Intents holdings using 1Click API")).toBeVisible();
    
    console.log("Checking Send token dropdown...");
    
    // Wait for tokens to load - check if dropdown is no longer showing "Loading tokens..."
    const sendTokenDropdown = page.locator("select.form-select").first();
    
    // Wait for the loading state to disappear
    await expect(sendTokenDropdown.locator("option").first()).not.toHaveText("Loading tokens...", { timeout: 10000 });
    
    // Click on the Send token dropdown
    await sendTokenDropdown.click();
    await page.waitForTimeout(1000);
    
    // Take screenshot of the dropdown
    await page.screenshot({ 
      path: path.join(screenshotsDir, "07-send-token-dropdown.png"),
      fullPage: true 
    });
    
    // Check if tokens are visible in the dropdown
    const sendTokenOptions = await sendTokenDropdown.locator("option").allTextContents();
    console.log("Send token options:", sendTokenOptions);
    
    // Log the actual balance check to debug
    console.log("Checking intents balance for:", daoAccount);
    const checkBalance = await intentsContract.view("mt_batch_balance_of", {
      account_id: daoAccount,
      token_ids: ["nep141:eth.omft.near"],
    });
    console.log("Direct balance check result:", checkBalance);
    
    // Verify we have tokens (should include ETH, BTC, USDC)
    expect(sendTokenOptions.length).toBeGreaterThan(1); // More than just "Select token"
    
    // TODO: Select a token from the dropdown (e.g., ETH)
    // await sendTokenDropdown.selectOption({ label: /ETH/ });
    
    // TODO: Enter amount to swap
    // await page.getByPlaceholder("0.00").fill("1");
    
    // TODO: Select receive token
    // const receiveTokenDropdown = page.locator("select.form-select").nth(1);
    // await receiveTokenDropdown.selectOption("USDC");
    
    // TODO: Select network for receive token
    // const networkDropdown = page.locator("select.form-select").nth(2);
    // await networkDropdown.selectOption("Ethereum");
    
    // TODO: Click Get Quote button
    // await page.getByRole("button", { name: "Get Quote" }).click();
    
    // TODO: Intercept 1Click API response and replace deposit address
    // const ourKeypair = await generateKeypair();
    // await intercept1ClickQuote({ page, ourDepositAddress: ourKeypair.publicKey });
    
    // TODO: Wait for quote to appear
    // await expect(page.getByText(/Quote:/)).toBeVisible();
    
    // TODO: Click Create Proposal button
    // await page.getByRole("button", { name: "Create Proposal" }).click();
    
    // TODO: Wait for transaction modal
    // const transactionModal = await getTransactionModalObject(page);
    // await expect(transactionModal).toBeAttached();
    
    // TODO: Verify the transaction contains correct mt_transfer to intents.near
    // with our deposit address and signed payload
    
    // TODO: Simulate what 1Click API would do - execute the intent
    // await simulateIntentExecution({ 
    //   intentsContract,
    //   depositAddress: ourKeypair.publicKey,
    //   secretKey: ourKeypair.secretKey 
    // });
    
    console.log("✅ Complete flow test - tokens should be visible in Send dropdown");
    console.log("🔧 Next steps: Implement quote fetching and intent execution");
  });
  
  // Comment out other tests for now
  test.skip("should navigate to asset-exchange page and see Create Request button", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await cacheCDN(page);
    
    // Import required contracts
    await worker.rootAccount.importContract({
      mainnetContract: instanceAccount,
    });
    
    // Create DAO contract
    const daoContract = await worker.rootAccount.importContract({
      mainnetContract: daoAccount,
      initialBalance: parseNEAR("10"),
    });
    
    // Initialize DAO with creatorAccount having permissions
    const daoName = daoAccount.split(".")[0];
    await daoContract.callRaw(daoAccount, "new", {
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
        ],
        default_vote_policy: {
          weight_kind: "RoleWeight",
          quorum: "0",
          threshold: [1, 2],
        },
        proposal_bond: "100000000000000000000000", // 0.1 NEAR
        proposal_period: "604800000000000",
        bounty_bond: "100000000000000000000000",
        bounty_forgiveness_period: "604800000000000",
      },
    }, {
      gas: "300000000000000",
    });
    
    // Set up proper Web4 redirection and auth
    const modifiedWidgets = {};
    const configKey = `${instanceAccount}/widget/config.data`;
    
    modifiedWidgets[configKey] = (
      await getLocalWidgetContent(configKey, {
        treasury: daoAccount,
        account: instanceAccount,
      })
    ).replace("treasuryDaoID:", "showNearIntents: true, treasuryDaoID:");

    await redirectWeb4({
      page,
      contractId: instanceAccount,
      treasury: daoAccount,
      networkId: "sandbox",
      sandboxNodeUrl: worker.provider.connection.url,
      modifiedWidgets,
      callWidgetNodeURLForContractWidgets: false,
    });
    
    // Mock user balance
    await mockNearBalances({
      page,
      accountId: creatorAccount.accountId,
      balance: (await creatorAccount.availableBalance()).toString(),
      storage: (await creatorAccount.balance()).staked,
    });

    // Navigate to asset exchange page
    await page.goto(`https://${instanceAccount}.page/?page=asset-exchange`);
    
    // Set auth with sandbox account
    await setPageAuthSettings(
      page,
      creatorAccount.accountId,
      await creatorAccount.getKey()
    );
    
    // Deposit tokens to treasury for testing
    await depositTokensToTreasury({ daoAccount });
    
    // Capture initial page load
    await page.screenshot({ 
      path: path.join(screenshotsDir, "01-asset-exchange-initial.png"),
      fullPage: true 
    });
    
    // Verify we're on the right page
    await expect(page.getByText("Pending Requests")).toBeVisible({
      timeout: 15000,
    });
    
    // Verify Create Request button is visible (should now appear with auth)
    const createRequestButton = page.getByRole("button", { name: "Create Request" });
    await expect(createRequestButton).toBeVisible();
    
    // Capture screenshot of the button
    await createRequestButton.screenshot({ 
      path: path.join(screenshotsDir, "02-create-request-button.png")
    });
    
    console.log("✅ Navigation and auth test passed - Create Request button is visible");
    console.log("🔧 Next step: Click button and add tab switcher implementation");
  });

  test.skip("should see tab switcher with Sputnik DAO and Near Intents tabs", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await cacheCDN(page);
    
    // Use same setup as first test
    // Import required contracts
    await worker.rootAccount.importContract({
      mainnetContract: instanceAccount,
    });
    
    // Create DAO contract
    const daoContract = await worker.rootAccount.importContract({
      mainnetContract: daoAccount,
      initialBalance: parseNEAR("10"),
    });
    
    // Initialize DAO with creatorAccount having permissions
    const daoName = daoAccount.split(".")[0];
    await daoContract.callRaw(daoAccount, "new", {
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
        ],
        default_vote_policy: {
          weight_kind: "RoleWeight",
          quorum: "0",
          threshold: [1, 2],
        },
        proposal_bond: "100000000000000000000000", // 0.1 NEAR
        proposal_period: "604800000000000",
        bounty_bond: "100000000000000000000000",
        bounty_forgiveness_period: "604800000000000",
      },
    }, {
      gas: "300000000000000",
    });
    
    // Set up proper Web4 redirection and auth
    const modifiedWidgets = {};
    const configKey = `${instanceAccount}/widget/config.data`;
    
    modifiedWidgets[configKey] = (
      await getLocalWidgetContent(configKey, {
        treasury: daoAccount,
        account: instanceAccount,
      })
    ).replace("treasuryDaoID:", "showNearIntents: true, treasuryDaoID:");

    await redirectWeb4({
      page,
      contractId: instanceAccount,
      treasury: daoAccount,
      networkId: "sandbox",
      sandboxNodeUrl: worker.provider.connection.url,
      modifiedWidgets,
      callWidgetNodeURLForContractWidgets: false,
    });
    
    // Mock user balance
    await mockNearBalances({
      page,
      accountId: creatorAccount.accountId,
      balance: (await creatorAccount.availableBalance()).toString(),
      storage: (await creatorAccount.balance()).staked,
    });

    // Navigate to asset exchange page
    await page.goto(`https://${instanceAccount}.page/?page=asset-exchange`);
    
    // Set auth with sandbox account
    await setPageAuthSettings(
      page,
      creatorAccount.accountId,
      await creatorAccount.getKey()
    );
    
    // Click Create Request button
    const createRequestButton = page.getByRole("button", { name: "Create Request" });
    await expect(createRequestButton).toBeVisible();
    await createRequestButton.click();
    
    // Wait for the form to load
    await page.waitForTimeout(2000);
    
    // Capture screenshot after clicking Create Request
    await page.screenshot({ 
      path: path.join(screenshotsDir, "03-create-request-opened.png"),
      fullPage: true 
    });
    
    // Look for tab switcher - it should have both tabs
    await expect(page.getByRole("button", { name: "Sputnik DAO" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "Near Intents" })).toBeVisible({ timeout: 5000 });
    
    // Capture tab switcher
    await page.locator('.tab-switcher').screenshot({ 
      path: path.join(screenshotsDir, "04-tab-switcher.png")
    });
    
    // Click on Near Intents tab
    await page.getByRole("button", { name: "Near Intents" }).click();
    await page.waitForTimeout(1000);
    
    // Verify we see the 1Click form placeholder
    await expect(page.getByText("1Click Cross-Network Swap")).toBeVisible();
    
    // Capture the 1Click form
    await page.screenshot({ 
      path: path.join(screenshotsDir, "05-near-intents-form.png"),
      fullPage: true 
    });
    
    console.log("✅ Tab switcher test passed - Both tabs work correctly");
    console.log("🔧 Next step: Implement actual 1Click form fields");
  });

  test.skip("should switch to Near Intents tab and see 1Click form fields", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await cacheCDN(page);
    
    // Use same setup as previous tests
    await worker.rootAccount.importContract({
      mainnetContract: instanceAccount,
    });
    
    const daoContract = await worker.rootAccount.importContract({
      mainnetContract: daoAccount,
      initialBalance: parseNEAR("10"),
    });
    
    const daoName = daoAccount.split(".")[0];
    await daoContract.callRaw(daoAccount, "new", {
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
        ],
        default_vote_policy: {
          weight_kind: "RoleWeight",
          quorum: "0",
          threshold: [1, 2],
        },
        proposal_bond: "100000000000000000000000",
        proposal_period: "604800000000000",
        bounty_bond: "100000000000000000000000",
        bounty_forgiveness_period: "604800000000000",
      },
    }, {
      gas: "300000000000000",
    });
    
    const modifiedWidgets = {};
    const configKey = `${instanceAccount}/widget/config.data`;
    
    modifiedWidgets[configKey] = (
      await getLocalWidgetContent(configKey, {
        treasury: daoAccount,
        account: instanceAccount,
      })
    ).replace("treasuryDaoID:", "showNearIntents: true, treasuryDaoID:");

    await redirectWeb4({
      page,
      contractId: instanceAccount,
      treasury: daoAccount,
      networkId: "sandbox",
      sandboxNodeUrl: worker.provider.connection.url,
      modifiedWidgets,
      callWidgetNodeURLForContractWidgets: false,
    });
    
    await mockNearBalances({
      page,
      accountId: creatorAccount.accountId,
      balance: (await creatorAccount.availableBalance()).toString(),
      storage: (await creatorAccount.balance()).staked,
    });

    await page.goto(`https://${instanceAccount}.page/?page=asset-exchange`);
    
    await setPageAuthSettings(
      page,
      creatorAccount.accountId,
      await creatorAccount.getKey()
    );
    
    // Click Create Request and then Near Intents tab
    const createRequestButton = page.getByRole("button", { name: "Create Request" });
    await expect(createRequestButton).toBeVisible();
    await createRequestButton.click();
    await page.waitForTimeout(2000);
    
    await page.getByRole("button", { name: "Near Intents" }).click();
    await page.waitForTimeout(1000);
    
    // Verify form fields are present
    await expect(page.getByText("Exchange tokens within your NEAR Intents holdings using 1Click API")).toBeVisible();
    
    // Check Send section
    await expect(page.getByText("Send", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("0.00")).toBeVisible();
    
    // Check token selectors (should now be 3: send token, receive token, network)
    const tokenSelectors = page.locator("select.form-select");
    await expect(tokenSelectors).toHaveCount(3);
    
    // Check Receive section
    await expect(page.getByText("Receive", { exact: true })).toBeVisible();
    await expect(page.getByText("Swapped tokens will remain in the treasury's NEAR Intents account")).toBeVisible();
    
    // Verify NO recipient address field exists
    await expect(page.getByText("Recipient Address")).not.toBeVisible();
    
    // Check buttons
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Get Quote" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Get Quote" })).toBeDisabled(); // Should be disabled initially
    
    // Capture screenshot of the form
    await page.screenshot({ 
      path: path.join(screenshotsDir, "06-oneclick-form-fields.png"),
      fullPage: true 
    });
    
    console.log("✅ Form fields test passed - All form elements are present");
    console.log("🔧 Next step: Implement 1Click API quote fetching");
  });

  test.skip("should fetch 1Click quote when form is filled", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await cacheCDN(page);
    
    // Mock the 1Click API response
    const mockQuoteResponse = {
      quote: {
        amountIn: "1000000",
        amountInFormatted: "1.0",
        amountInUsd: "0.9998",
        amountOut: "999998",
        amountOutFormatted: "0.999998",
        amountOutUsd: "0.9998",
        timeEstimate: 10,
        deadline: "2025-07-27T16:03:03.540Z",
        depositAddress: "3ccf686b516ede32e2936c25798378623c99a5fce5bf56f5433005c8c12ba49c"
      },
      signature: "ed25519:2gwvazipVnPYqYYyBYTAb5M8dcKoJBFmJADuL5VebL2RTMZEQpvZ8iyDq6GAkvudW5aAkRKr7U7LdynhguSy84De"
    };
    
    await mock1ClickApiResponse({ page, response: mockQuoteResponse });
    
    // Open create page
    await openCreatePage({ page, instanceAccount });
    
    // Click on Near Intents tab
    await page.getByRole("button", { name: "Near Intents" }).click();
    
    // Fill in the form
    // Note: These selectors will need to be updated based on actual implementation
    await page.getByLabel("Amount").fill("1");
    await page.getByLabel("Token In").selectOption("USDC");
    await page.getByLabel("Token Out").selectOption("USDC (Ethereum)");
    await page.getByLabel("Recipient").fill(daoAccount);
    
    // Wait for quote to be fetched
    await expect(page.getByText("Quote received")).toBeVisible();
    await expect(page.getByText("1.0 USDC → 0.999998 USDC")).toBeVisible();
  });

  test.skip("should create DAO proposal with 1Click quote data", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await cacheCDN(page);
    
    // Mock DAO balance for USDC
    await mockNearBalances({ page, userAccount: daoAccount, daoAccount });
    
    // Mock the 1Click API response
    const mockQuoteResponse = {
      quote: {
        amountIn: "1000000",
        amountInFormatted: "1.0",
        amountInUsd: "0.9998",
        amountOut: "999998",
        amountOutFormatted: "0.999998",
        amountOutUsd: "0.9998",
        timeEstimate: 10,
        deadline: "2025-07-27T16:03:03.540Z",
        depositAddress: "3ccf686b516ede32e2936c25798378623c99a5fce5bf56f5433005c8c12ba49c"
      },
      signature: "ed25519:2gwvazipVnPYqYYyBYTAb5M8dcKoJBFmJADuL5VebL2RTMZEQpvZ8iyDq6GAkvudW5aAkRKr7U7LdynhguSy84De"
    };
    
    await mock1ClickApiResponse({ page, response: mockQuoteResponse });
    
    // Open create page and switch to Near Intents
    await openCreatePage({ page, instanceAccount });
    await page.getByRole("button", { name: "Near Intents" }).click();
    
    // Fill form and get quote
    await page.getByLabel("Amount").fill("1");
    await page.getByLabel("Token In").selectOption("USDC");
    await page.getByLabel("Token Out").selectOption("USDC (Ethereum)");
    await page.getByLabel("Recipient").fill(daoAccount);
    
    // Wait for quote
    await expect(page.getByText("Quote received")).toBeVisible();
    
    // Click Create Proposal button
    await page.getByRole("button", { name: "Create Proposal" }).click();
    
    // Verify transaction modal appears with correct data
    const transactionModal = await getTransactionModalObject(page);
    await expect(transactionModal).toBeAttached();
    
    // Verify the transaction contains mt_transfer to intents.near
    const transactionData = await page.evaluate(() => {
      const modalData = document.querySelector('[data-testid="transaction-modal-data"]');
      return modalData ? JSON.parse(modalData.textContent) : null;
    });
    
    expect(transactionData).toBeTruthy();
    expect(transactionData.receiver_id).toBe("intents.near");
    expect(transactionData.actions[0].method_name).toBe("mt_transfer");
    
    // Verify args contain deposit address and amount
    const args = JSON.parse(Buffer.from(transactionData.actions[0].args, 'base64').toString());
    expect(args.receiver_id).toBe(mockQuoteResponse.quote.depositAddress);
    expect(args.amount).toBe(mockQuoteResponse.quote.amountIn);
  });
});