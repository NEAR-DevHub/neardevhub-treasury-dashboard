import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { Worker, parseNEAR } from "near-workspaces";
import { redirectWeb4 } from "../../util/web4.js";

// Use the near-workspaces sandbox to deploy omft and intents contracts, make deposits, and test dashboard UI

test("should not display NEAR intents card if there are no assets in NEAR intents", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  // --- UI TEST ---
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
  });

  // Intercept RPC calls to redirect intents.near queries to the sandbox
  // Now this block is after worker initialization and sandboxRpcUrl is available
  await page.route("https://rpc.mainnet.fastnear.com", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      let postData;
      try {
        postData = request.postDataJSON();
      } catch (e) {
        return route.fallback(); // Ensure other handlers can try
      }

      if (
        postData &&
        typeof postData.method === "string" &&
        postData.params !== undefined
      ) {
        if (
          postData.method === "query" &&
          typeof postData.params === "object" &&
          postData.params !== null && // Ensure params is an object
          postData.params.request_type === "call_function" &&
          postData.params.account_id === "intents.near" &&
          postData.params.method_name === "mt_batch_balance_of"
        ) {
          const json = {
            jsonrpc: "2.0",
            result: {
              block_hash: "8XpLrWvFubiBY2hDn9T1jHfqMtvdmPZJPzp7nT9ZAwkZ",
              block_height: 120,
              logs: [],
              result: Array.from(
                Buffer.from(
                  JSON.stringify(
                    // This is how the result would look like if there is a balance
                    // ["342660000000000000000000000","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","128226700000000000000","0","50000000","10000000000","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0"])
                    // Zero balance
                    [
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                      "0",
                    ]
                  )
                )
              ),
            },
            id: 162,
          };
          return await route.fulfill({ json });
        }
      }
    }
    return await route.fallback(); // Crucial: let other handlers (like from redirectWeb4) process if this one doesn't.
  });
  await page.goto(`https://${instanceAccount}.page`);

  await expect(page.getByText("Total Balance")).toBeVisible();
  await expect(page.getByText("NEAR Intents")).not.toBeVisible();
});

test("show intents balance in dashboard (sandbox)", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  test.setTimeout(120_000); // Increased timeout to 120 seconds

  page.on("console", (msg) => {
    console.log("BROWSER CONSOLE:", msg.type(), msg.text());
  });

  // --- SANDBOX SETUP ---
  const worker = await Worker.init();
  const sandboxRpcUrl = worker.provider.connection.url; // Define sandboxRpcUrl here

  // Import omft (ETH) and wNEAR contracts
  const omft = await worker.rootAccount.importContract({
    mainnetContract: "omft.near",
  });
  const wnear = await worker.rootAccount.importContract({
    mainnetContract: "wrap.near",
  });

  // Import intents contract
  const intents = await worker.rootAccount.importContract({
    mainnetContract: "intents.near",
  });

  // Import treasury contract (dashboard instance)
  const treasury = await worker.rootAccount.importContract({
    mainnetContract: instanceAccount,
  });
  const daoTreasuryAccountId = daoAccount; // The actual account holding the funds

  // Initialize omft contract
  await omft.call(omft.accountId, "new", {
    super_admins: ["omft.near"],
    admins: {},
    grantees: {
      DAO: ["omft.near"],
      TokenDeployer: ["omft.near"],
      TokenDepositer: ["omft.near"],
    },
  });

  // Deploy ETH token (Ethereum chain)
  await omft.call(
    omft.accountId,
    "deploy_token",
    {
      token: "eth",
      metadata: {
        spec: "ft-1.0.0",
        name: "Ethereum",
        symbol: "ETH",
        icon: "", // The test will later assert the icon fetched from ft_metadata
        reference: null,
        reference_hash: null,
        decimals: 18,
      },
    },
    { attachedDeposit: parseNEAR("3"), gas: "300000000000000" }
  );

  // Deploy ETH token (Arbitrum chain)
  await omft.call(
    omft.accountId,
    "deploy_token",
    {
      token: "arb",
      metadata: {
        spec: "ft-1.0.0",
        name: "Ethereum",
        symbol: "ETH",
        icon: "",
        reference: null,
        reference_hash: null,
        decimals: 18,
      },
    },
    { attachedDeposit: parseNEAR("3"), gas: "300000000000000" }
  );

  // Deploy ETH token (Base chain)
  await omft.call(
    omft.accountId,
    "deploy_token",
    {
      token: "base",
      metadata: {
        spec: "ft-1.0.0",
        name: "Ethereum",
        symbol: "ETH",
        icon: "",
        reference: null,
        reference_hash: null,
        decimals: 18,
      },
    },
    { attachedDeposit: parseNEAR("3"), gas: "300000000000000" }
  );

  // Deploy BTC token
  await omft.call(
    omft.accountId,
    "deploy_token",
    {
      token: "btc",
      metadata: {
        spec: "ft-1.0.0",
        name: "Bitcoin",
        symbol: "BTC",
        icon: "",
        reference: null,
        reference_hash: null,
        decimals: 8,
      },
    },
    { attachedDeposit: parseNEAR("3"), gas: "300000000000000" }
  );

  // Deploy SOL token
  await omft.call(
    omft.accountId,
    "deploy_token",
    {
      token: "sol",
      metadata: {
        spec: "ft-1.0.0",
        name: "Solana",
        symbol: "SOL",
        icon: "",
        reference: null,
        reference_hash: null,
        decimals: 9,
      },
    },
    { attachedDeposit: parseNEAR("3"), gas: "300000000000000" }
  );

  // Initialize intents contract
  await intents.call(intents.accountId, "new", {
    config: {
      wnear_id: "wrap.near",
      fees: { fee: 100, fee_collector: "intents.near" },
      roles: { super_admins: ["intents.near"], admins: {}, grantees: {} },
    },
  });

  // Initialize wNEAR contract
  await wnear.call(wnear.accountId, "new", {
    owner_id: wnear.accountId,
    total_supply: "1000000000000000000000000000",
    metadata: {
      spec: "ft-1.0.0",
      name: "Wrapped NEAR",
      symbol: "WNEAR",
      decimals: 24,
    },
  });

  // Register storage for treasury and intents (ETH - Ethereum chain)
  await omft.call(
    "eth.omft.near",
    "storage_deposit",
    {
      account_id: daoTreasuryAccountId, // Use DAO's treasury account
      registration_only: true,
    },
    { attachedDeposit: "1250000000000000000000" }
  );

  await omft.call(
    "eth.omft.near",
    "storage_deposit",
    {
      account_id: intents.accountId,
      registration_only: true,
    },
    { attachedDeposit: "1250000000000000000000" }
  );

  // Register storage for treasury and intents (ETH - Arbitrum chain)
  await omft.call(
    "arb.omft.near",
    "storage_deposit",
    {
      account_id: daoTreasuryAccountId,
      registration_only: true,
    },
    { attachedDeposit: "1250000000000000000000" }
  );

  await omft.call(
    "arb.omft.near",
    "storage_deposit",
    {
      account_id: intents.accountId,
      registration_only: true,
    },
    { attachedDeposit: "1250000000000000000000" }
  );

  // Register storage for treasury and intents (ETH - Base chain)
  await omft.call(
    "base.omft.near",
    "storage_deposit",
    {
      account_id: daoTreasuryAccountId,
      registration_only: true,
    },
    { attachedDeposit: "1250000000000000000000" }
  );

  await omft.call(
    "base.omft.near",
    "storage_deposit",
    {
      account_id: intents.accountId,
      registration_only: true,
    },
    { attachedDeposit: "1250000000000000000000" }
  );

  await wnear.call(
    wnear.accountId,
    "storage_deposit",
    {
      account_id: daoTreasuryAccountId, // Use DAO's treasury account
      registration_only: true,
    },
    { attachedDeposit: "1250000000000000000000" }
  );

  await wnear.call(
    wnear.accountId,
    "storage_deposit",
    {
      account_id: intents.accountId,
      registration_only: true,
    },
    { attachedDeposit: "1250000000000000000000" }
  );

  // Register storage for treasury and intents (BTC)
  await omft.call(
    "btc.omft.near", // contract for BTC token
    "storage_deposit",
    {
      account_id: daoTreasuryAccountId,
      registration_only: true,
    },
    { attachedDeposit: "1250000000000000000000" }
  );
  await omft.call(
    "btc.omft.near", // contract for BTC token
    "storage_deposit",
    {
      account_id: intents.accountId,
      registration_only: true,
    },
    { attachedDeposit: "1250000000000000000000" }
  );

  // Register storage for treasury and intents (SOL)
  await omft.call(
    "sol.omft.near", // contract for SOL token
    "storage_deposit",
    {
      account_id: daoTreasuryAccountId,
      registration_only: true,
    },
    { attachedDeposit: "1250000000000000000000" }
  );
  await omft.call(
    "sol.omft.near", // contract for SOL token
    "storage_deposit",
    {
      account_id: intents.accountId,
      registration_only: true,
    },
    { attachedDeposit: "1250000000000000000000" }
  );

  // Register storage for wnear on itself (for ft_transfer_call)
  await wnear.call(
    wnear.accountId,
    "storage_deposit",
    {
      account_id: wnear.accountId,
      registration_only: true,
    },
    { attachedDeposit: "1250000000000000000000" }
  );

  // Register root account on wNEAR to be able to deposit and transfer
  await wnear.call(
    wnear.accountId,
    "storage_deposit",
    {
      account_id: worker.rootAccount.accountId,
      registration_only: true,
    },
    { attachedDeposit: "1250000000000000000000" }
  );

  // Mint wNEAR to root account by depositing NEAR
  await worker.rootAccount.call(
    wnear.accountId,
    "near_deposit",
    {},
    {
      attachedDeposit: parseNEAR("343"), // Deposit 343 NEAR to get >342.66 wNEAR
    }
  );

  // Transfer wNEAR from root account to wnear.accountId so it has balance to send
  await worker.rootAccount.call(
    wnear.accountId,
    "ft_transfer",
    {
      receiver_id: wnear.accountId,
      amount: "342700000000000000000000000", // 342.7 wNEAR (a bit more than needed)
    },
    { attachedDeposit: "1" }
  );

  // Deposit ETH token (Ethereum chain) to treasury via intents
  await omft.call(
    omft.accountId,
    "ft_deposit",
    {
      owner_id: intents.accountId,
      token: "eth",
      amount: "128226700000000000000", // 128.2267 ETH
      msg: JSON.stringify({ receiver_id: daoTreasuryAccountId }),
      memo: `BRIDGED_FROM:${JSON.stringify({
        networkType: "eth",
        chainId: "1",
        txHash: "0xethhash",
      })}`,
    },
    { attachedDeposit: parseNEAR("0.00125"), gas: "300000000000000" }
  );

  // Deposit ETH token (Arbitrum chain) to treasury via intents
  await omft.call(
    omft.accountId,
    "ft_deposit",
    {
      owner_id: intents.accountId,
      token: "arb",
      amount: "50000000000000000000", // 50 ETH on Arbitrum
      msg: JSON.stringify({ receiver_id: daoTreasuryAccountId }),
      memo: `BRIDGED_FROM:${JSON.stringify({
        networkType: "eth",
        chainId: "42161",
        txHash: "0xetharbhash",
      })}`,
    },
    { attachedDeposit: parseNEAR("0.00125"), gas: "300000000000000" }
  );

  // Deposit ETH token (Base chain) to treasury via intents
  await omft.call(
    omft.accountId,
    "ft_deposit",
    {
      owner_id: intents.accountId,
      token: "base",
      amount: "25000000000000000000", // 25 ETH on Base
      msg: JSON.stringify({ receiver_id: daoTreasuryAccountId }),
      memo: `BRIDGED_FROM:${JSON.stringify({
        networkType: "eth",
        chainId: "8453",
        txHash: "0xethbasehash",
      })}`,
    },
    { attachedDeposit: parseNEAR("0.00125"), gas: "300000000000000" }
  );

  // Deposit BTC token to treasury via intents
  await omft.call(
    omft.accountId,
    "ft_deposit",
    {
      owner_id: intents.accountId,
      token: "btc",
      amount: "50000000", // 0.5 BTC (8 decimals)
      msg: JSON.stringify({ receiver_id: daoTreasuryAccountId }),
      memo: `BRIDGED_FROM:${JSON.stringify({
        networkType: "btc",
        chainId: "mainnet",
        txHash: "0xbtchash",
      })}`,
    },
    { attachedDeposit: parseNEAR("0.00125"), gas: "300000000000000" }
  );

  // Deposit SOL token to treasury via intents
  await omft.call(
    omft.accountId,
    "ft_deposit",
    {
      owner_id: intents.accountId,
      token: "sol",
      amount: "10000000000", // 10 SOL (9 decimals)
      msg: JSON.stringify({ receiver_id: daoTreasuryAccountId }),
      memo: `BRIDGED_FROM:${JSON.stringify({
        networkType: "sol",
        chainId: "mainnet-beta",
        txHash: "0xsolhash",
      })}`,
    },
    { attachedDeposit: parseNEAR("0.00125"), gas: "300000000000000" }
  );

  // Deposit NEAR (wNEAR) to treasury via intents using ft_transfer_call
  await wnear.call(
    wnear.accountId,
    "ft_transfer_call",
    {
      receiver_id: intents.accountId,
      amount: "342660000000000000000000000", // 342.66 NEAR (yocto)
      msg: JSON.stringify({ receiver_id: daoTreasuryAccountId }), // Use DAO's treasury account
    },
    { attachedDeposit: "1", gas: "300000000000000" }
  );

  // --- CONTRACT BALANCE CHECKS ---
  const ethTokenId = "nep141:eth.omft.near";
  const ethArbTokenId = "nep141:arb.omft.near";
  const ethBaseTokenId = "nep141:base.omft.near";
  const wnearTokenId = "nep141:wrap.near";
  const btcTokenId = "nep141:btc.omft.near";
  const solTokenId = "nep141:sol.omft.near";

  // Check ETH balance (Ethereum chain)
  const ethBalance = await intents.view("mt_balance_of", {
    account_id: daoTreasuryAccountId,
    token_id: ethTokenId,
  });
  expect(ethBalance).toEqual("128226700000000000000");

  // Check ETH balance (Arbitrum chain)
  const ethArbBalance = await intents.view("mt_balance_of", {
    account_id: daoTreasuryAccountId,
    token_id: ethArbTokenId,
  });
  expect(ethArbBalance).toEqual("50000000000000000000");

  // Check ETH balance (Base chain)
  const ethBaseBalance = await intents.view("mt_balance_of", {
    account_id: daoTreasuryAccountId,
    token_id: ethBaseTokenId,
  });
  expect(ethBaseBalance).toEqual("25000000000000000000");

  // Check wNEAR balance
  const wnearBalance = await intents.view("mt_balance_of", {
    account_id: daoTreasuryAccountId,
    token_id: wnearTokenId,
  });
  expect(wnearBalance).toEqual("342660000000000000000000000");

  // Check BTC balance
  const btcBalance = await intents.view("mt_balance_of", {
    account_id: daoTreasuryAccountId,
    token_id: btcTokenId,
  });
  expect(btcBalance).toEqual("50000000"); // 0.5 BTC

  // Check SOL balance
  const solBalance = await intents.view("mt_balance_of", {
    account_id: daoTreasuryAccountId,
    token_id: solTokenId,
  });
  expect(solBalance).toEqual("10000000000"); // 10 SOL

  // --- UI TEST ---
  await redirectWeb4({ page, contractId: treasury.accountId });

  // Intercept RPC calls to redirect intents.near queries to the sandbox
  // Now this block is after worker initialization and sandboxRpcUrl is available
  const rpcRoute = async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      let postData;
      try {
        postData = request.postDataJSON();
      } catch (e) {
        return route.fallback(); // Ensure other handlers can try
      }

      // At this point, postData is valid JSON if no error was caught.

      // Proceed with detailed logging and matching only if essential parts of postData exist
      if (
        postData &&
        typeof postData.method === "string" &&
        postData.params !== undefined
      ) {
        if (
          postData.method === "query" &&
          typeof postData.params === "object" &&
          postData.params !== null && // Ensure params is an object
          postData.params.request_type === "call_function" &&
          postData.params.account_id === "intents.near" &&
          postData.params.method_name === "mt_batch_balance_of"
        ) {
          const response = await route.fetch({ url: sandboxRpcUrl });
          const json = await response.json();
          return await route.fulfill({ response, json });
        }
      }
    }
    return await route.fallback(); // Crucial: let other handlers (like from redirectWeb4) process if this one doesn't.
  };
  await page.route("https://rpc.mainnet.near.org", rpcRoute);
  await page.route("https://rpc.mainnet.fastnear.com", rpcRoute);

  await page.goto(`https://${treasury.accountId}.page`);

  await expect(page.getByText("Near Intents")).toBeVisible();

  // Scope token symbol assertions to the IntentsPortfolio component
  const intentsPortfolioLocator = page.getByTestId("intents-portfolio");
  await expect(intentsPortfolioLocator.getByText("ETH")).toBeVisible();
  await expect(intentsPortfolioLocator.getByText("WNEAR")).toBeVisible();
  await expect(intentsPortfolioLocator.getByText("BTC")).toBeVisible();
  await expect(intentsPortfolioLocator.getByText("SOL")).toBeVisible();

  // Locate the ETH row and check its aggregated balance
  const ethRowLocator = intentsPortfolioLocator.locator(
    'div.d-flex.flex-column:has(div.h6.mb-0.text-truncate:has-text("ETH"))'
  );
  const ethAmountElement = ethRowLocator.locator(
    "div.d-flex.gap-2.align-items-center.justify-content-end div.d-flex.flex-column.align-items-end div.h6.mb-0"
  );
  // Total ETH should be 128.2267 + 50 + 25 = 203.2267 ETH
  // With intelligent formatting, this may display with varying precision based on ETH price
  const ethText = await ethAmountElement.textContent();
  expect(parseFloat(ethText.replace(/,/g, ""))).toBeCloseTo(203.2267, 2);

  // Check that the ETH row has an expandable dropdown (chevron icon) since it has multiple chains
  const ethChevronLocator = ethRowLocator.locator(
    "i.bi.bi-chevron-down.text-secondary.h6.mb-0"
  );
  await expect(ethChevronLocator).toBeVisible();

  // Click on the ETH row to expand and see individual chain balances
  await ethChevronLocator.click();

  // Check individual chain balances in the expanded view
  const expandedEthSection = ethRowLocator
    .locator("div.d-flex.flex-column")
    .filter({ hasText: "ETH" });

  // Check Ethereum chain balance (128.2267 ETH)
  await expect(expandedEthSection.getByText("ETH")).toBeVisible();
  // With intelligent formatting, check for the value being close to expected
  const ethBalanceElements = await expandedEthSection.locator(".h6.mb-0").all();
  let foundEthBalance = false;
  for (const elem of ethBalanceElements) {
    const text = await elem.textContent();
    const value = parseFloat(text.replace(/,/g, ""));
    if (Math.abs(value - 128.2267) < 0.01) {
      foundEthBalance = true;
      break;
    }
  }
  expect(foundEthBalance).toBe(true);

  // Check Arbitrum chain balance (50 ETH)
  await expect(expandedEthSection.getByText("ARB")).toBeVisible();
  const arbBalanceElements = await expandedEthSection.locator(".h6.mb-0").all();
  let foundArbBalance = false;
  for (const elem of arbBalanceElements) {
    const text = await elem.textContent();
    const value = parseFloat(text.replace(/,/g, ""));
    if (Math.abs(value - 50) < 0.01) {
      foundArbBalance = true;
      break;
    }
  }
  expect(foundArbBalance).toBe(true);

  // Check Base chain balance (25 ETH)
  await expect(expandedEthSection.getByText("BASE")).toBeVisible();
  const baseBalanceElements = await expandedEthSection
    .locator(".h6.mb-0")
    .all();
  let foundBaseBalance = false;
  for (const elem of baseBalanceElements) {
    const text = await elem.textContent();
    const value = parseFloat(text.replace(/,/g, ""));
    if (Math.abs(value - 25) < 0.01) {
      foundBaseBalance = true;
      break;
    }
  }
  expect(foundBaseBalance).toBe(true);

  // Locate the WNEAR row and check its balance
  const wnearRowLocator = intentsPortfolioLocator.locator(
    'div.d-flex.flex-column:has(div.h6.mb-0.text-truncate:has-text("WNEAR"))'
  );
  const wnearAmountElement = wnearRowLocator.locator(
    "div.d-flex.gap-2.align-items-center.justify-content-end div.d-flex.flex-column.align-items-end div.h6.mb-0"
  );
  // With intelligent formatting, check for the value being close to expected
  const wnearText = await wnearAmountElement.textContent();
  expect(parseFloat(wnearText.replace(/,/g, ""))).toBeCloseTo(342.66, 1);

  // Locate the BTC row and check its balance
  const btcRowLocator = intentsPortfolioLocator.locator(
    'div.d-flex.flex-column:has(div.h6.mb-0.text-truncate:has-text("BTC"))'
  );
  const btcAmountElement = btcRowLocator.locator(
    "div.d-flex.gap-2.align-items-center.justify-content-end div.d-flex.flex-column.align-items-end div.h6.mb-0"
  );
  // BTC with high price may show different precision
  const btcText = await btcAmountElement.textContent();
  expect(parseFloat(btcText.replace(/,/g, ""))).toBeCloseTo(0.5, 2);

  // Locate the SOL row and check its balance
  const solRowLocator = intentsPortfolioLocator.locator(
    'div.d-flex.flex-column:has(div.h6.mb-0.text-truncate:has-text("SOL"))'
  );
  const solAmountElement = solRowLocator.locator(
    "div.d-flex.gap-2.align-items-center.justify-content-end div.d-flex.flex-column.align-items-end div.h6.mb-0"
  );
  // SOL may show different precision based on price
  const solText = await solAmountElement.textContent();
  expect(parseFloat(solText.replace(/,/g, ""))).toBeCloseTo(10, 1);

  // ETH icon
  const ethIconLocator = page
    .locator('div.h6.mb-0.text-truncate:has-text("ETH")')
    .locator("../..")
    .locator("img");
  const correctEthIconBase64 =
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDMyIDMyIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjE2IiBjeT0iMTYiIHI9IjE2IiBmaWxsPSIjNjI3RUVBIi8+PGcgZmlsbD0iI0ZGRiIgZmlsbC1ydWxlPSJub256ZXJvIj48cGF0aCBmaWxsLW9wYWNpdHk9Ii42MDIiIGQ9Ik0xNi40OTggNHY4Ljg3bDcuNDk3IDMuMzV6Ii8+PHBhdGggZD0iTTE2LjQ5OCA0TDkgMTYuMjJsNy40OTgtMy4zNXoiLz48cGF0aCBmaWxsLW9wYWNpdHk9Ii42MDIiIGQ9Ik0xNi40OTggMjEuOTY4djYuMDI3TDI0IDE3LjYxNnoiLz48cGF0aCBkPSJNMTYuNDk4IDI3Ljk5NXYtNi4wMjhMOSAxNy42MTZ6Ii8+PHBhdGggZmlsbC1vcGFjaXR5PSIuMiIgZD0iTTE2LjQ5OCAyMC41NzNsNy40OTctNC4zNTMtNy40OTctMy4zNDh6Ii8+PHBhdGggZmlsbC1vcGFjaXR5PSIuNjAyIiBkPSJNOSAxNi4yMmw3LjQ5OCA0LjM1M3YtNy43MDF6Ii8+PC9nPjwvZz48L3N2Zz4="; // This is the one that was observed to be consistently passing.

  await expect(ethIconLocator).toHaveAttribute("src", correctEthIconBase64);

  // wNEAR balance
  const wnearBalanceAfterDeposit = await intents.view("mt_balance_of", {
    account_id: daoTreasuryAccountId,
    token_id: wnearTokenId,
  });
  expect(wnearBalanceAfterDeposit).toEqual("342660000000000000000000000");

  // --- TOTAL BALANCE CHECK ---

  // Define token decimals
  const decimals = {
    ETH: 18,
    WNEAR: 24,
    BTC: 8,
    SOL: 9,
    NEAR: 24, // Native NEAR
  };

  // Fetch actual token prices
  const tokensToPrice = [
    ethTokenId,
    solTokenId,
    btcTokenId,
    wnearTokenId,
    "near",
  ]; // "near" is defuse_asset_id for native NEAR
  let tokenPricesMap = {};

  const tokensResponse = await fetch(
    "https://api-mng-console.chaindefuser.com/api/tokens"
  );
  const actualPricesArray = (await tokensResponse.json()).items;
  if (!Array.isArray(actualPricesArray) || actualPricesArray.length === 0) {
    throw new Error("Token prices API did not return a valid array of prices.");
  }
  tokenPricesMap = actualPricesArray
    .filter(
      (token) =>
        token.defuse_asset_id && tokensToPrice.includes(token.defuse_asset_id)
    )
    .reduce((map, token) => {
      map[token.defuse_asset_id] = token.price;
      return map;
    }, {});

  const getPrice = (assetId) => {
    const price = tokenPricesMap[assetId];
    return price;
  };

  // Calculate expected Intents USD total using on-chain balances
  const ethAmount = Number(BigInt(ethBalance)) / Math.pow(10, decimals.ETH);
  const ethArbAmount =
    Number(BigInt(ethArbBalance)) / Math.pow(10, decimals.ETH);
  const ethBaseAmount =
    Number(BigInt(ethBaseBalance)) / Math.pow(10, decimals.ETH);
  const wnearAmount =
    Number(BigInt(wnearBalance)) / Math.pow(10, decimals.WNEAR); // wnearBalance is from mt_balance_of for wnearTokenId
  const btcAmount = Number(BigInt(btcBalance)) / Math.pow(10, decimals.BTC);
  const solAmount = Number(BigInt(solBalance)) / Math.pow(10, decimals.SOL);

  const ethPrice = getPrice(ethTokenId);
  const wnearPriceForIntents = getPrice(wnearTokenId); // Price for WNEAR in intents
  const btcPrice = getPrice(btcTokenId);
  const solPrice = getPrice(solTokenId);

  const intentsExpectedUsdTotal =
    (ethAmount + ethArbAmount + ethBaseAmount) * ethPrice +
    wnearAmount * wnearPriceForIntents +
    btcAmount * btcPrice +
    solAmount * solPrice;
  console.log(
    `Calculated Intents Expected USD Total: $${intentsExpectedUsdTotal}`
  );

  // Locate and assert the total balance in the UI
  const totalBalanceCardLocator = page
    .locator("div.card-body")
    .filter({ hasText: "Total Balance" });

  await expect(totalBalanceCardLocator).not.toContainText("NaN");

  // Ensure that the total balance is more than the intents balance
  const totalBalanceText = await totalBalanceCardLocator.innerText();

  const displayedTotalBalanceNumeric = parseFloat(
    totalBalanceText.replace(/[^0-9\.]/g, "")
  );

  expect(displayedTotalBalanceNumeric).toBeGreaterThan(intentsExpectedUsdTotal);
  console.log(
    `Asserted: Displayed Total Balance ($${displayedTotalBalanceNumeric}) > Intents Balance ($${intentsExpectedUsdTotal})`
  );

  await worker.tearDown();
});
