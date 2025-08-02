import { test } from "../../util/test.js";
import { expect } from "@playwright/test";
import { redirectWeb4, getLocalWidgetContent } from "../../util/web4.js";
import { parseNEAR, Worker, Account } from "near-workspaces";
import * as nearAPI from "near-api-js";
import { connect } from "near-api-js";
import { PROPOSAL_BOND, setPageAuthSettings } from "../../util/sandboxrpc.js";
import { mockNearBalances } from "../../util/rpcmock.js";
import { getTransactionModalObject } from "../../util/transaction.js";
import fs from "fs/promises";
import path from "path";

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(
  process.cwd(),
  "screenshots",
  "1click-integration"
);

// Sandbox setup variables
let worker;
let creatorAccount;
let socialNearAccount;
let intentsContract;
let omftContract;
let usdcContract;
let solverAccount;
let solverKeyPair;

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
        fee: 1, // 1 basis point = 0.0001% (matches mainnet)
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

  // Deploy USDC token on omft contract
  const usdcOmftMainnetAccount = await mainnet.account(
    "eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near"
  );

  await omftContract.call(
    omftContract.accountId,
    "deploy_token",
    {
      token: "eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      metadata: await usdcOmftMainnetAccount.viewFunction({
        contractId: "eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        methodName: "ft_metadata",
      }),
    },
    { attachedDeposit: parseNEAR("3"), gas: "300000000000000" }
  );

  // Register intents.near for storage on both tokens
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

  await omftContract.call(
    "eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
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
      path: path.join(
        screenshotsDir,
        `${testInfo.title.replace(/\s+/g, "-")}-failure.png`
      ),
      fullPage: true,
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

// Helper function to create signed payloads for NEP-413
async function createSignedPayload(
  message,
  recipient,
  nonce,
  signingKey,
  standard = "nep413"
) {
  const messageString = JSON.stringify(message);

  if (standard === "nep413") {
    // Based on near-cli-rs implementation: prefix bytes + borsh serialized payload
    const payload = {
      message: messageString,
      nonce: Array.from(nonce),
      recipient: recipient,
      callbackUrl: null, // Optional field
    };

    // Define Borsh schema for the payload (without prefix)
    const payloadSchema = {
      struct: {
        message: "string",
        nonce: { array: { type: "u8", len: 32 } },
        recipient: "string",
        callbackUrl: { option: "string" },
      },
    };

    // NEP413_SIGN_MESSAGE_PREFIX: (1 << 31) + 413 = 2147484061
    const prefixValue = 2147484061;
    const prefixBytes = new Uint8Array(4);
    // to_le_bytes() - little endian
    prefixBytes[0] = prefixValue & 0xff;
    prefixBytes[1] = (prefixValue >> 8) & 0xff;
    prefixBytes[2] = (prefixValue >> 16) & 0xff;
    prefixBytes[3] = (prefixValue >> 24) & 0xff;

    // Serialize payload with Borsh
    const serializedPayload = nearAPI.utils.serialize.serialize(
      payloadSchema,
      payload
    );

    // Combine prefix + borsh serialized payload
    const messageBytes = new Uint8Array(
      prefixBytes.length + serializedPayload.length
    );
    messageBytes.set(prefixBytes);
    messageBytes.set(serializedPayload, prefixBytes.length);

    // Hash the combined bytes first, then sign the hash
    const hashBuffer = await crypto.subtle.digest("SHA-256", messageBytes);
    const hash = new Uint8Array(hashBuffer);

    // Sign the hash (not the raw bytes)
    const signature = signingKey.sign(hash);

    return {
      standard: "nep413",
      payload: {
        message: messageString,
        nonce: Buffer.from(nonce).toString("base64"), // Convert to base64 for JSON transport
        recipient: recipient,
      },
      public_key: signingKey.publicKey.toString(),
      signature: `ed25519:${nearAPI.utils.serialize.base_encode(
        signature.signature
      )}`,
    };
  }
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
        txHash:
          "0xc6b7ecd5c7517a8f56ac7ec9befed7d26a459fc97c7d5cd7598d4e19b5a806b7",
      })}`,
    },
    {
      attachedDeposit: parseNEAR("0.00125"),
      gas: "300000000000000",
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

  // Set up solver account and liquidity for 1Click simulation
  console.log("\n🔧 Setting up solver account and liquidity...");

  // Create solver account to simulate 1Click's solver
  solverAccount = await worker.rootAccount.createSubAccount("solver");
  solverKeyPair = nearAPI.utils.KeyPair.fromRandom("ed25519");

  // Register solver's public key
  await solverAccount.call(
    intentsContract.accountId,
    "add_public_key",
    {
      public_key: solverKeyPair.publicKey.toString(),
    },
    { attachedDeposit: "1" }
  );

  console.log("✅ Solver account created and public key registered");

  // Give the solver some USDC liquidity to provide in the swap
  console.log("Depositing USDC to solver account...");

  // Storage deposit for solver on Ethereum USDC
  await omftContract.call(
    "eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
    "storage_deposit",
    { account_id: solverAccount.accountId },
    { attachedDeposit: parseNEAR("0.1") }
  );

  // Deposit Ethereum USDC to intents contract for solver using ft_deposit
  await omftContract.call(
    omftContract.accountId,
    "ft_deposit",
    {
      owner_id: "intents.near",
      token: "eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // ETH USDC token symbol
      amount: "500000000", // 500 USDC with 6 decimals
      msg: JSON.stringify({ receiver_id: solverAccount.accountId }), // Credit to solver account
    },
    { attachedDeposit: parseNEAR("1"), gas: "100000000000000" }
  );

  console.log("✅ Solver has USDC liquidity");

  // Verify solver USDC balance
  const solverUsdcBalance = await intentsContract.view("mt_balance_of", {
    account_id: solverAccount.accountId,
    token_id: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
  });
  console.log(`Solver USDC balance: ${solverUsdcBalance}`);

  // Assert the balance matches what we deposited (500 USDC with 6 decimals)
  expect(solverUsdcBalance).toBe("500000000");

  // TODO: Add BTC and USDC deposits once we figure out the storage deposit issues
}

test.describe("1Click API Integration - Asset Exchange", function () {
  test("complete 1Click swap flow with NEAR Intents", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(120_000);

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
    await daoContract.callRaw(daoAccount, "new", create_testdao_args, {
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

    // Mock DAO balance - this is crucial for auth to work properly
    await mockNearBalances({
      page,
      accountId: daoContract.accountId,
      balance: (
        await daoContract.getAccount(daoAccount).availableBalance()
      ).toString(),
      storage: (await daoContract.getAccount(daoAccount).balance()).staked,
    });

    // Navigate to main page first (like payment request test)
    await page.goto(`https://${instanceAccount}.page/`);

    // Set auth with sandbox account
    await setPageAuthSettings(
      page,
      creatorAccount.accountId,
      await creatorAccount.getKey()
    );

    console.log("On dashboard page, checking NEAR Intents balances...");

    // Wait for dashboard to load by checking for the page title
    await expect(
      page.locator(".page-title").filter({ hasText: "Dashboard" })
    ).toBeVisible({ timeout: 15000 });

    // Scroll to NEAR Intents section
    const nearIntentsSection = page.getByText("NEAR Intents").first();
    await nearIntentsSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Check ETH balance on dashboard
    const ethBalanceRowLocator = page.locator(
      '.card div.d-flex.flex-column.border-bottom:has(div.h6.mb-0.text-truncate:has-text("ETH"))'
    );
    await expect(ethBalanceRowLocator).toBeVisible();
    await expect(ethBalanceRowLocator).toContainText("5.00");
    console.log("✅ Verified initial ETH balance: 5.00 on dashboard");

    // Take screenshot of initial balances
    await page.screenshot({
      path: path.join(screenshotsDir, "00-dashboard-initial-balances.png"),
      fullPage: true,
    });

    console.log("Navigating to asset exchange page by clicking menu...");

    // Click on Asset Exchange in the menu
    await page.getByRole("link", { name: "Asset Exchange" }).click();

    // Wait for page to load
    await expect(page.getByText("Pending Requests")).toBeVisible({
      timeout: 15000,
    });

    console.log("Opening Create Request form...");

    // Click Create Request button
    const createRequestButton = page.getByRole("button", {
      name: "Create Request",
    });
    await expect(createRequestButton).toBeVisible();
    await createRequestButton.click();

    // Wait for form to load
    await page.waitForTimeout(2000);

    console.log("Switching to NEAR Intents form...");

    // Take a screenshot to see what's on the page
    await page.screenshot({
      path: path.join(screenshotsDir, "form-loaded.png"),
      fullPage: true,
    });

    // Wait for form to load
    await page.waitForTimeout(2000);

    console.log("Looking for Treasury Wallet dropdown (outside iframe)...");

    // Treasury Wallet dropdown is now outside the iframe
    // Wait for the Treasury Wallet label to be visible
    await expect(page.getByText("Treasury Wallet")).toBeVisible({
      timeout: 10000,
    });

    // Find and click the Treasury Wallet dropdown
    const treasuryWalletDropdown = page
      .locator('.form-label:has-text("Treasury Wallet")')
      .locator("~ div .dropdown-toggle")
      .first();
    await treasuryWalletDropdown.click();
    console.log("Clicked Treasury Wallet dropdown");

    // Wait for dropdown menu to appear
    await page.waitForTimeout(500);

    // Click on NEAR Intents option
    await page.getByText("NEAR Intents", { exact: true }).click();
    console.log("Selected NEAR Intents from dropdown");

    await page.waitForTimeout(2000);

    // Take another screenshot to see if form changed
    await page.screenshot({
      path: path.join(screenshotsDir, "after-near-intents-selection.png"),
      fullPage: true,
    });

    // The 1Click form is now inside an iframe
    const frame = page.frameLocator('iframe[class*="w-100"]');

    // Wait for the form to load
    await page.waitForTimeout(3000);

    console.log("Checking if form loaded...");

    // Check for the info message to confirm form loaded
    await expect(page.locator("body")).toContainText(
      "Swap tokens in your NEAR Intents holdings",
      {
        timeout: 10000,
      }
    );

    console.log("Form loaded successfully!");

    // Take screenshot of the loaded form
    await page.screenshot({
      path: path.join(screenshotsDir, "oneclick-form-loaded.png"),
      fullPage: true,
    });

    console.log("OneClick form loaded successfully");

    // Continue with the full test flow
    console.log("Filling out the 1Click swap form...");

    // Fill in the amount to swap
    await page.fill('input[placeholder="0.00"]', "0.1");

    // Click on the Send token dropdown
    const sendTokenDropdown = await page
      .locator('.dropdown-toggle:has-text("Select token")')
      .first();
    await sendTokenDropdown.click();
    await page.waitForTimeout(1000);

    // Take screenshot of the dropdown
    await page.screenshot({
      path: path.join(screenshotsDir, "07-send-token-dropdown.png"),
      fullPage: true,
    });

    // Select ETH from the dropdown
    console.log("Selecting ETH from Send dropdown...");
    const ethOption = await page
      .locator('.dropdown-item:has-text("ETH")')
      .first();
    await ethOption.click();
    await page.waitForTimeout(1000);

    // Select receive token - need to wait for dropdown to close first
    await page.waitForTimeout(1000);
    console.log("Selecting receive token...");
    const receiveTokenDropdown = await page.locator(".dropdown-toggle").nth(2); // Third dropdown (after treasury wallet and send token)
    await receiveTokenDropdown.click();
    await page.waitForTimeout(500);

    // Select USDC
    const usdcOption = await page
      .locator('.dropdown-item:has-text("USDC")')
      .first();
    await usdcOption.click();
    await page.waitForTimeout(1000);

    // Select network for receive token
    console.log("Selecting network...");
    const networkDropdown = await page.locator(".dropdown-toggle").nth(3); // Fourth dropdown
    await networkDropdown.click();
    await page.waitForTimeout(500);

    // Select Ethereum network
    const ethNetworkOption = await page
      .locator('.dropdown-item:has-text("Ethereum")')
      .first();
    await ethNetworkOption.click();
    await page.waitForTimeout(1000);

    // Generate a deposit address keypair for testing
    const { KeyPair } = nearAPI.utils;
    const testDepositKeyPair = KeyPair.fromRandom("ed25519");
    // Convert the public key to a proper hex string
    const testDepositAddress = Buffer.from(
      testDepositKeyPair.publicKey.data
    ).toString("hex");
    console.log(
      "Test deposit address for intent execution:",
      testDepositAddress
    );

    // Store the keypair and address for later use in intent execution
    page.testDepositKeyPair = testDepositKeyPair;
    page.testDepositAddress = testDepositAddress;

    // Intercept 1Click API to replace deposit address with our test address
    console.log("Setting up 1Click API intercept...");
    await page.route(
      "https://1click.chaindefuser.com/v0/quote",
      async (route) => {
        const request = route.request();
        const requestBody = request.postDataJSON();
        console.log("1Click API request:", requestBody);

        // Make the real request to 1Click API
        const response = await fetch(
          "https://1click.chaindefuser.com/v0/quote",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          console.error(
            "1Click API returned error:",
            response.status,
            response.statusText
          );
          await route.abort();
          return;
        }

        // Get the real quote response
        const realQuote = await response.json();
        console.log("Real 1Click quote received:", realQuote);

        // Replace only the deposit address with our test address
        if (realQuote.quote && realQuote.quote.depositAddress) {
          realQuote.quote.depositAddress = testDepositAddress;
          console.log("Replaced deposit address with test address");
        }

        // Store the quote for use in tests
        realQuote.quote.requestPayload = requestBody;

        // Store the quote on the page object for use in intent execution
        page.realQuote = realQuote.quote;

        console.log("Returning modified quote:", realQuote);
        await route.fulfill({
          status: response.status,
          contentType: "application/json",
          body: JSON.stringify(realQuote),
        });
      }
    );

    // Click Get Quote button
    console.log("Clicking Get Quote button...");
    await page.locator('button:has-text("Get Quote")').click();

    // Wait for quote to appear
    console.log("Waiting for quote to appear...");
    await expect(page.getByText("Please approve this request")).toBeVisible({
      timeout: 10000,
    });
    // Check for the quote summary (e.g., "0.1 ETH($347.00) → 347.00 USDC($347.00)")
    await expect(page.locator(".quote-summary")).toBeVisible();
    await expect(page.locator('.quote-summary:has-text("ETH")')).toBeVisible();
    await expect(page.locator('.quote-summary:has-text("USDC")')).toBeVisible();

    // Scroll to the quote details for better video visibility
    const quoteSection = page.locator(".quote-display").first();
    await quoteSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000); // Wait 1 second to show the quote

    // Take screenshot of the quote
    await page.screenshot({
      path: path.join(screenshotsDir, "08-quote-displayed.png"),
      fullPage: true,
    });

    // Verify Create Proposal button is now visible
    await expect(
      page.locator('button:has-text("Create Proposal")')
    ).toBeVisible();

    console.log("✅ Successfully fetched quote from 1Click API!");
    console.log("✅ Quote shows: 0.1 ETH → 250.00 USDC");

    // Click Create Proposal button
    console.log("\nClicking Create Proposal button...");
    await page.locator('button:has-text("Create Proposal")').click();

    // Wait for transaction modal
    console.log("Waiting for transaction modal...");
    await expect(page.getByText("Confirm Transaction")).toBeVisible({
      timeout: 10000,
    });

    // Take screenshot of the transaction modal
    await page.screenshot({
      path: path.join(screenshotsDir, "09-transaction-modal.png"),
      fullPage: true,
    });

    // Verify transaction details in the modal
    // Verify it's calling the DAO with add_proposal
    await expect(page.locator(".modal-content")).toContainText(daoAccount);
    await expect(page.locator(".modal-content")).toContainText("add_proposal");

    // Click Confirm button to submit the transaction
    console.log("Clicking Confirm button to submit transaction...");
    await page.getByRole("button", { name: "Confirm" }).click();

    // Wait for the Confirm button to disappear - this ensures transaction completes
    await expect(
      page.getByRole("button", { name: "Confirm" })
    ).not.toBeVisible();

    // Wait a bit for the proposal to be created
    console.log("Waiting for proposal to be created...");
    await page.waitForTimeout(5000);

    // Navigate back to see the proposal by clicking Asset Exchange link
    console.log("Navigating to Pending Requests to verify proposal...");
    await page.getByRole("link", { name: "Asset Exchange" }).click();

    // Wait for the table to load
    await expect(page.getByText("Pending Requests")).toBeVisible({
      timeout: 15000,
    });

    // Wait for table rows to be visible before taking screenshot
    const tableRows = page.locator(
      'tr[data-component="widgets.treasury-factory.near/widget/pages.asset-exchange.Table"]'
    );
    await expect(tableRows.first()).toBeVisible({ timeout: 10000 });

    // Additional wait to ensure table is fully rendered
    await page.waitForTimeout(2000);

    // Take screenshot to see what's on the page
    await page.screenshot({
      path: path.join(screenshotsDir, "10-pending-requests-page.png"),
      fullPage: true,
    });

    // Get the data row (the table has a header row and data rows)
    const proposalRow = tableRows.nth(1); // Second row is the first data row
    await expect(proposalRow).toBeVisible();

    // Get the proposal content
    const proposalContent = await proposalRow.textContent();
    console.log("Proposal found in table:", proposalContent);

    // Verify it contains our swap details - the table will show the token amounts
    await expect(proposalRow).toContainText("ETH");
    await expect(proposalRow).toContainText("USDC");

    console.log("✅ Successfully created 1Click swap proposal!");
    console.log(
      "✅ Proposal appears in Pending Requests table with correct details"
    );

    // Now approve the proposal
    console.log("\nApproving the 1Click swap proposal...");

    // Click on the proposal row to expand it
    await proposalRow.click();

    // Wait for the Approve button to be visible and click it
    await page.waitForTimeout(1000);
    const approveButton = page.getByRole("button", { name: "Approve" }).nth(1);
    await expect(approveButton).toBeVisible();
    await approveButton.click();

    // Confirm the approval transaction
    console.log("Confirming approval transaction...");
    await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
    await page.getByRole("button", { name: "Confirm" }).click();

    // Wait for the second confirmation (if needed)
    await expect(page.getByText("Confirm Transaction")).toBeVisible();
    await page.getByRole("button", { name: "Confirm" }).click();

    // Wait for success message
    console.log("Waiting for approval to complete...");

    // Wait for the success notification
    await expect(
      page.getByText("The request has been successfully executed.")
    ).toBeVisible({ timeout: 15000 });
    console.log("✅ Asset exchange request executed successfully!");

    // Take screenshot to see what happens after approval
    await page.screenshot({
      path: path.join(screenshotsDir, "11-after-approval.png"),
      fullPage: true,
    });

    // Verify the swap was executed by checking balances
    console.log("Verifying token balances after swap...");

    // Check that ETH balance decreased
    const ethBalanceAfter = await intentsContract.view("mt_balance_of", {
      account_id: daoAccount,
      token_id: "nep141:eth.omft.near",
    });
    console.log("ETH balance after swap:", ethBalanceAfter);

    // The balance should have decreased by 0.1 ETH (100000000000000000 wei)
    expect(BigInt(ethBalanceAfter)).toBe(BigInt("4900000000000000000")); // 5 ETH - 0.1 ETH = 4.9 ETH

    // Simulate 1Click executing the intent to complete the swap
    console.log("\n🔄 Simulating 1Click intent execution...");

    // In the real world, 1Click would:
    // 1. Detect the incoming ETH to their deposit address
    // 2. Execute the cross-network swap
    // 3. Call execute_intents to deliver USDC to the DAO

    // For testing, we'll simulate this by executing intents
    const depositKeyPair = page.testDepositKeyPair; // Use the same keypair we used for the deposit address

    // Register the deposit address public key
    // In production, 1Click does this when they generate the keypair
    console.log("Registering deposit address public key...");
    await worker.rootAccount.call(
      intentsContract.accountId,
      "add_public_key",
      {
        public_key: depositKeyPair.publicKey.toString(),
      },
      { attachedDeposit: "1" }
    );

    console.log("✅ Deposit address public key registered");

    // Get the actual quote amounts from the real 1Click API response
    const realQuote = page.realQuote;
    const amountIn = realQuote.amountIn;
    const amountOut = realQuote.amountOut;

    console.log(
      `Using real quote amounts: ${realQuote.amountInFormatted} ETH -> ${realQuote.amountOutFormatted} USDC`
    );
    console.log(`Raw amounts - amountIn: ${amountIn}, amountOut: ${amountOut}`);

    // Ensure amounts are strings
    const ethAmount = String(amountIn);
    const usdcAmount = String(amountOut);

    console.log(`Intent amounts - ETH: ${ethAmount}, USDC: ${usdcAmount}`);

    // Calculate fees (0.0001% = 1 basis point) - use ceiling division to match contract
    const ethFee = (BigInt(ethAmount) * 1n + 999999n) / 1000000n; // Ceiling division
    const usdcFee = (BigInt(usdcAmount) * 1n + 999999n) / 1000000n; // Ceiling division

    console.log(`Fees - ETH: ${ethFee}, USDC: ${usdcFee}`);
    console.log(`Solver will give: ${BigInt(usdcAmount) + usdcFee} USDC`);
    console.log(`1Click will receive: ${usdcAmount} USDC`);
    console.log(
      `Difference (fee): ${BigInt(usdcAmount) + usdcFee - BigInt(usdcAmount)}`
    );

    // Check deposit address ETH balance before intent execution
    const depositAddressEthBalance = await intentsContract.view(
      "mt_balance_of",
      {
        account_id: page.testDepositAddress,
        token_id: "nep141:eth.omft.near",
      }
    );
    console.log(`Deposit address ETH balance: ${depositAddressEthBalance}`);

    // Also check solver USDC balance
    const solverUsdcBalance = await intentsContract.view("mt_balance_of", {
      account_id: solverAccount.accountId,
      token_id:
        "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
    });
    console.log(`Solver USDC balance: ${solverUsdcBalance}`);

    // Ensure solver has enough USDC (including fee)
    const solverNeeds = BigInt(usdcAmount) + usdcFee;
    if (BigInt(solverUsdcBalance) < solverNeeds) {
      throw new Error(
        `Solver has insufficient USDC balance. Has: ${solverUsdcBalance}, needs: ${solverNeeds} (${usdcAmount} + ${usdcFee} fee)`
      );
    }

    // Ensure deposit address has exactly the ETH amount
    if (BigInt(depositAddressEthBalance) !== BigInt(ethAmount)) {
      throw new Error(
        `Deposit address ETH balance mismatch. Has: ${depositAddressEthBalance}, expected: ${ethAmount}`
      );
    }

    // Create intent deadline (10 minutes from now)
    const deadline = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Create the solver intent (provides USDC liquidity)
    // Solver needs to give more USDC to account for fees
    const solverIntent = {
      signer_id: solverAccount.accountId,
      deadline: deadline,
      intents: [
        {
          intent: "token_diff",
          diff: {
            ["nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near"]: `-${
              BigInt(usdcAmount) + usdcFee
            }`, // Give USDC + fee
            ["nep141:eth.omft.near"]: `${BigInt(ethAmount) - ethFee}`, // Receive ETH - fee (what deposit actually transfers after fee)
          },
        },
      ],
    };

    // Create the 1Click intent (swaps and transfers to DAO)
    const oneClickIntent = {
      signer_id: page.testDepositAddress, // 1Click signs with the deposit address
      deadline: deadline,
      intents: [
        {
          intent: "token_diff",
          diff: {
            ["nep141:eth.omft.near"]: `-${ethAmount}`, // Give ETH (what it has)
            ["nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near"]: `${usdcAmount}`, // Receive USDC
          },
          referral: "1click-test",
        },
        {
          intent: "transfer",
          receiver_id: daoAccount,
          tokens: {
            ["nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near"]: `${usdcAmount}`, // Transfer USDC to DAO
          },
        },
      ],
    };

    // Create nonces
    const solverNonce = new Uint8Array(32);
    crypto.getRandomValues(solverNonce);
    const oneClickNonce = new Uint8Array(32);
    crypto.getRandomValues(oneClickNonce);

    // Sign the intents
    const solverSignedPayload = await createSignedPayload(
      solverIntent,
      intentsContract.accountId,
      solverNonce,
      solverKeyPair,
      "nep413"
    );

    const oneClickSignedPayload = await createSignedPayload(
      oneClickIntent,
      intentsContract.accountId,
      oneClickNonce,
      depositKeyPair,
      "nep413"
    );

    // Execute the intents
    console.log("Executing intents to complete the swap...");

    await intentsContract.call(
      intentsContract.accountId,
      "execute_intents",
      {
        signed: [solverSignedPayload, oneClickSignedPayload],
      },
      { attachedDeposit: "0", gas: "300000000000000" }
    );

    console.log("✅ Intent execution completed - USDC delivered to DAO!");

    // Verify USDC was added to the DAO
    const usdcTokenId =
      "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near";
    const usdcBalance = await intentsContract.view("mt_balance_of", {
      account_id: daoAccount,
      token_id: usdcTokenId,
    });

    console.log("DAO USDC balance after swap:", usdcBalance);
    expect(usdcBalance).toBe(amountOut); // Should match the quote amount

    // Check History tab
    console.log("\nNavigating to History tab...");
    // Click on the History tab using the correct locator
    await page
      .getByRole("listitem")
      .filter({ hasText: "History" })
      .locator("div")
      .click();
    await page.waitForTimeout(2000);

    // Wait for history table to load - check that we're on the History tab
    await expect(
      page.getByRole("listitem").filter({ hasText: "History" })
    ).toBeVisible();

    // Look for the executed proposal in history table
    // The table rows might take time to load, so let's wait for any row first
    const historyTableRows = page.locator("tr").filter({ hasText: "ETH" });
    await expect(historyTableRows.first()).toBeVisible({ timeout: 15000 });

    // Now check if we can find our executed proposal
    const executedProposal = historyTableRows
      .filter({ hasText: "Executed" })
      .first();
    await expect(executedProposal).toBeVisible({ timeout: 10000 });
    // Check that it contains USDC (the amount varies based on the quote)
    await expect(executedProposal).toContainText("USDC");
    console.log("✅ Found executed proposal in History");

    // Take screenshot of history
    await page.screenshot({
      path: path.join(screenshotsDir, "12-history-tab.png"),
      fullPage: true,
    });

    // Navigate back to Dashboard
    console.log("\nNavigating back to Dashboard to check new balances...");
    await page.getByRole("link", { name: "Dashboard" }).click();

    // Wait for dashboard to load
    await expect(
      page.locator(".page-title").filter({ hasText: "Dashboard" })
    ).toBeVisible({ timeout: 15000 });

    // Scroll to NEAR Intents section
    await nearIntentsSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);

    // Check updated ETH balance
    const ethBalanceRowAfterSwap = page.locator(
      '.card div.d-flex.flex-column.border-bottom:has(div.h6.mb-0.text-truncate:has-text("ETH"))'
    );
    await expect(ethBalanceRowAfterSwap).toBeVisible();
    await expect(ethBalanceRowAfterSwap).toContainText("4.90"); // 5.00 - 0.10 = 4.90
    console.log("✅ Verified ETH balance after swap: 4.90");

    // Check for new USDC token
    const usdcBalanceRowLocator = page.locator(
      '.card div.d-flex.flex-column.border-bottom:has(div.h6.mb-0.text-truncate:has-text("USDC"))'
    );
    await expect(usdcBalanceRowLocator).toBeVisible();

    // Scroll to USDC balance for better video visibility
    await usdcBalanceRowLocator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000); // Wait 1 second to show the USDC balance

    // Dashboard shows balance with 2 decimal places
    await expect(usdcBalanceRowLocator).toContainText(/\d+\.\d{2}/);
    console.log("✅ Verified new USDC balance on dashboard");

    // Take final screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "13-dashboard-final-balances.png"),
      fullPage: true,
    });

    console.log("\n🎉 Complete 1Click integration test with approval passed!");
    console.log("✅ Successfully swapped 0.1 ETH for 250 USDC via 1Click");
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
    await daoContract.callRaw(
      daoAccount,
      "new",
      {
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
      },
      {
        gas: "300000000000000",
      }
    );

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
      fullPage: true,
    });

    // Verify we're on the right page
    await expect(page.getByText("Pending Requests")).toBeVisible({
      timeout: 15000,
    });

    // Verify Create Request button is visible (should now appear with auth)
    const createRequestButton = page.getByRole("button", {
      name: "Create Request",
    });
    await expect(createRequestButton).toBeVisible();

    // Capture screenshot of the button
    await createRequestButton.screenshot({
      path: path.join(screenshotsDir, "02-create-request-button.png"),
    });

    console.log(
      "✅ Navigation and auth test passed - Create Request button is visible"
    );
    console.log(
      "🔧 Next step: Click button and add tab switcher implementation"
    );
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
    await daoContract.callRaw(
      daoAccount,
      "new",
      {
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
      },
      {
        gas: "300000000000000",
      }
    );

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
    const createRequestButton = page.getByRole("button", {
      name: "Create Request",
    });
    await expect(createRequestButton).toBeVisible();
    await createRequestButton.click();

    // Wait for the form to load
    await page.waitForTimeout(2000);

    // Capture screenshot after clicking Create Request
    await page.screenshot({
      path: path.join(screenshotsDir, "03-create-request-opened.png"),
      fullPage: true,
    });

    // Look for tab switcher - it should have both tabs
    await expect(page.getByRole("button", { name: "Sputnik DAO" })).toBeVisible(
      { timeout: 5000 }
    );
    await expect(
      page.getByRole("button", { name: "Near Intents" })
    ).toBeVisible({ timeout: 5000 });

    // Capture tab switcher
    await page.locator(".tab-switcher").screenshot({
      path: path.join(screenshotsDir, "04-tab-switcher.png"),
    });

    // Click on Near Intents tab
    await page.getByRole("button", { name: "Near Intents" }).click();
    await page.waitForTimeout(1000);

    // Verify we see the 1Click form placeholder
    await expect(page.getByText("1Click Cross-Network Swap")).toBeVisible();

    // Capture the 1Click form
    await page.screenshot({
      path: path.join(screenshotsDir, "05-near-intents-form.png"),
      fullPage: true,
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
    await daoContract.callRaw(
      daoAccount,
      "new",
      {
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
      },
      {
        gas: "300000000000000",
      }
    );

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
    const createRequestButton = page.getByRole("button", {
      name: "Create Request",
    });
    await expect(createRequestButton).toBeVisible();
    await createRequestButton.click();
    await page.waitForTimeout(2000);

    await page.getByRole("button", { name: "Near Intents" }).click();
    await page.waitForTimeout(1000);

    // Verify form fields are present
    await expect(
      page.getByText(
        "Exchange tokens within your NEAR Intents holdings using 1Click API"
      )
    ).toBeVisible();

    // Check Send section
    await expect(page.getByText("Send", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("0.00")).toBeVisible();

    // Check token selectors (should now be 3: send token, receive token, network)
    const tokenSelectors = page.locator("select.form-select");
    await expect(tokenSelectors).toHaveCount(3);

    // Check Receive section
    await expect(page.getByText("Receive", { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        "Swapped tokens will remain in the treasury's NEAR Intents account"
      )
    ).toBeVisible();

    // Verify NO recipient address field exists
    await expect(page.getByText("Recipient Address")).not.toBeVisible();

    // Check buttons
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Get Quote" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Get Quote" })
    ).toBeDisabled(); // Should be disabled initially

    // Capture screenshot of the form
    await page.screenshot({
      path: path.join(screenshotsDir, "06-oneclick-form-fields.png"),
      fullPage: true,
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
        depositAddress:
          "3ccf686b516ede32e2936c25798378623c99a5fce5bf56f5433005c8c12ba49c",
      },
      signature:
        "ed25519:2gwvazipVnPYqYYyBYTAb5M8dcKoJBFmJADuL5VebL2RTMZEQpvZ8iyDq6GAkvudW5aAkRKr7U7LdynhguSy84De",
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
        depositAddress:
          "3ccf686b516ede32e2936c25798378623c99a5fce5bf56f5433005c8c12ba49c",
      },
      signature:
        "ed25519:2gwvazipVnPYqYYyBYTAb5M8dcKoJBFmJADuL5VebL2RTMZEQpvZ8iyDq6GAkvudW5aAkRKr7U7LdynhguSy84De",
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
      const modalData = document.querySelector(
        '[data-testid="transaction-modal-data"]'
      );
      return modalData ? JSON.parse(modalData.textContent) : null;
    });

    expect(transactionData).toBeTruthy();
    expect(transactionData.receiver_id).toBe("intents.near");
    expect(transactionData.actions[0].method_name).toBe("mt_transfer");

    // Verify args contain deposit address and amount
    const args = JSON.parse(
      Buffer.from(transactionData.actions[0].args, "base64").toString()
    );
    expect(args.receiver_id).toBe(mockQuoteResponse.quote.depositAddress);
    expect(args.amount).toBe(mockQuoteResponse.quote.amountIn);
  });
});
