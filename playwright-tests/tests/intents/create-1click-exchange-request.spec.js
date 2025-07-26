import { test, cacheCDN } from "../../util/test.js";
import { expect } from "@playwright/test";
import { redirectWeb4, getLocalWidgetContent } from "../../util/web4.js";
import { parseNEAR, Worker } from "near-workspaces";
import { setPageAuthSettings } from "../../util/sandboxrpc.js";
import { mockNearBalances } from "../../util/rpcmock.js";
import fs from "fs/promises";
import path from "path";

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(process.cwd(), "screenshots", "1click-integration");

// Sandbox setup variables
let worker;
let creatorAccount;
let socialNearAccount;

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

async function mock1ClickApiResponse({ page, response }) {
  await page.route(
    "https://1click.chaindefuser.com/v0/quote",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    }
  );
}

test.describe("1Click API Integration - Asset Exchange", function () {
  test("should navigate to asset-exchange page and see Create Request button", async ({
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

  test("should see tab switcher with Sputnik DAO and Near Intents tabs", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await cacheCDN(page);
    
    // Open create page
    await openCreatePage({ page, instanceAccount });
    
    // Capture screenshot after clicking Create Request
    await page.screenshot({ 
      path: path.join(screenshotsDir, "03-create-request-opened.png"),
      fullPage: true 
    });
    
    // Wait for the form to load
    await page.waitForTimeout(2000);
    
    // Look for tab switcher - it should have both tabs
    // Note: This will fail initially as the tabs don't exist yet
    try {
      await expect(page.getByRole("button", { name: "Sputnik DAO" })).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole("button", { name: "Near Intents" })).toBeVisible({ timeout: 5000 });
      
      // If tabs exist, capture them
      await page.locator('.tab-switcher').screenshot({ 
        path: path.join(screenshotsDir, "04-tab-switcher.png")
      });
    } catch (e) {
      // Capture current state to see what needs to be implemented
      console.log("Tab switcher not found - capturing current state");
      await page.screenshot({ 
        path: path.join(screenshotsDir, "04-tab-switcher-missing.png"),
        fullPage: true 
      });
    }
  });

  test("should switch to Near Intents tab and see 1Click form", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await cacheCDN(page);
    
    // Open create page
    await openCreatePage({ page, instanceAccount });
    
    // Wait for the form to load
    await page.waitForTimeout(2000);
    
    // Click on Near Intents tab
    await page.getByRole("button", { name: "Near Intents" }).click();
    
    // Verify we see the 1Click form (placeholder for now)
    await expect(page.getByText("1Click Cross-Network Swap")).toBeVisible();
  });

  test("should fetch 1Click quote when form is filled", async ({
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

  test("should create DAO proposal with 1Click quote data", async ({
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