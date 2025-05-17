import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { Worker, parseNEAR } from "near-workspaces";
import { redirectWeb4 } from "../../util/web4.js";

// Use the near-workspaces sandbox to deploy omft and intents contracts, make deposits, and test dashboard UI

test("show intents balance in dashboard (sandbox)", async ({ page }) => {
  test.setTimeout(120_000); // Increased timeout to 120 seconds

  page.on("console", (msg) => {
    console.log("BROWSER CONSOLE:", msg.type(), msg.text());
  });

  // --- SANDBOX SETUP ---
  const worker = await Worker.init();
  const root = worker.rootAccount;
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
    mainnetContract: "treasury-testing.near",
  });
  const daoTreasuryAccountId = "testing-astradao.sputnik-dao.near"; // The actual account holding the funds

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

  // Deploy ETH token
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

  // Register storage for treasury and intents (ETH)
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

  // Deposit ETH token to treasury via intents
  await omft.call(
    omft.accountId,
    "ft_deposit",
    {
      owner_id: intents.accountId,
      token: "eth",
      amount: "128226700000000000000", // 128.2267 ETH
      msg: JSON.stringify({ receiver_id: daoTreasuryAccountId }),
      memo: `BRIDGED_FROM:${JSON.stringify({ networkType: "eth", chainId: "1", txHash: "0xethhash" })}`,
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
      memo: `BRIDGED_FROM:${JSON.stringify({ networkType: "btc", chainId: "mainnet", txHash: "0xbtchash" })}`,
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
      memo: `BRIDGED_FROM:${JSON.stringify({ networkType: "sol", chainId: "mainnet-beta", txHash: "0xsolhash" })}`,
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
  const wnearTokenId = "nep141:wrap.near";
  const btcTokenId = "nep141:btc.omft.near";
  const solTokenId = "nep141:sol.omft.near";

  // Check ETH balance
  const ethBalance = await intents.view("mt_balance_of", {
    account_id: daoTreasuryAccountId,
    token_id: ethTokenId,
  });
  expect(ethBalance).toEqual("128226700000000000000");

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
  await page.route("https://rpc.mainnet.near.org", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      let postData;
      try {
        postData = request.postDataJSON();
      } catch (e) {
        console.log(
          `\n---> Intercepted POST to rpc.mainnet.near.org (could not parse JSON body) <---`
        );
        console.error(`  Error parsing postData: ${e.message}\n`);
        return route.fallback(); // Ensure other handlers can try
      }

      // At this point, postData is valid JSON if no error was caught.
      console.log(`\n---> Intercepted POST to rpc.mainnet.near.org <---`);
      // Safely log method and params
      console.log(
        `  RPC Method: ${
          postData
            ? postData.method
            : "N/A (postData was null/undefined after parsing)"
        }`
      );
      console.log(
        `  RPC Params: ${
          postData
            ? JSON.stringify(postData.params, null, 2)
            : "N/A (postData was null/undefined after parsing)"
        }`
      );

      // Proceed with detailed logging and matching only if essential parts of postData exist
      if (
        postData &&
        typeof postData.method === "string" &&
        postData.params !== undefined
      ) {
        console.log(`  Attempting to match for redirection:`);
        console.log(
          `    postData.method === "query" : ${postData.method === "query"}`
        );
        // Ensure params is an object before accessing its properties for logging
        if (typeof postData.params === "object" && postData.params !== null) {
          console.log(
            `    postData.params.request_type === "call_function" : ${
              postData.params.request_type === "call_function"
            } (actual: ${postData.params.request_type})`
          );
          console.log(
            `    postData.params.account_id === "intents.near" : ${
              postData.params.account_id === "intents.near"
            } (actual: ${postData.params.account_id})`
          );
          console.log(
            `    postData.params.method_name === "mt_batch_balance_of" : ${
              postData.params.method_name === "mt_batch_balance_of"
            } (actual: ${postData.params.method_name})`
          );
        } else {
          console.log(`    postData.params is not an object or is null.`);
        }

        if (
          postData.method === "query" &&
          typeof postData.params === "object" &&
          postData.params !== null && // Ensure params is an object
          postData.params.request_type === "call_function" &&
          postData.params.account_id === "intents.near" &&
          postData.params.method_name === "mt_batch_balance_of"
        ) {
          console.log(`  ✅ MATCHED: intents.near/mt_batch_balance_of call`);
          if (postData.params.args_base64) {
            try {
              const decodedArgs = JSON.parse(
                Buffer.from(postData.params.args_base64, "base64").toString(
                  "utf-8"
                )
              );
              console.log(
                `  Decoded Args: ${JSON.stringify(decodedArgs, null, 2)}`
              );
              if (decodedArgs.account_id === daoTreasuryAccountId) {
                console.log(
                  `  ✅ Args check: account_id in args ('${decodedArgs.account_id}') matches daoTreasuryAccountId ('${daoTreasuryAccountId}').`
                );
              } else {
                console.log(
                  `  ⚠️ ARGS MISMATCH: account_id in args is '${decodedArgs.account_id}', but expected '${daoTreasuryAccountId}'.`
                );
              }
            } catch (e) {
              console.log(`  Error decoding args_base64: ${e.message}`);
            }
          }
          console.log(`  Redirecting to sandbox RPC: ${sandboxRpcUrl}\n`);
          const response = await route.fetch({ url: sandboxRpcUrl });
          const json = await response.json();
          return await route.fulfill({ response, json });
        } else {
          console.log(
            `  🚫 NO MATCH: This call will NOT be redirected to sandbox.\n`
          );
        }
      } else {
        // This case handles if postData, postData.method, or postData.params is not in the expected basic shape
        // It might have been logged as N/A above if postData itself was problematic after parsing.
        console.log(
          `  🚫 NO MATCH (postData, method, or params missing/invalid for detailed check). This call will NOT be redirected to sandbox.\n`
        );
      }
    }
    return await route.fallback(); // Crucial: let other handlers (like from redirectWeb4) process if this one doesn't.
  });

  await page.goto(`https://${treasury.accountId}.page`);

  await expect(page.getByText("Near Intents")).toBeVisible();

  // Scope token symbol assertions to the IntentsPortfolio component
  const intentsPortfolioLocator = page.locator('[data-component="widgets.treasury-factory.near/widget/pages.dashboard.IntentsPortfolio"]');
  await expect(intentsPortfolioLocator.getByText("ETH")).toBeVisible();
  await expect(intentsPortfolioLocator.getByText("WNEAR")).toBeVisible();
  await expect(intentsPortfolioLocator.getByText("BTC")).toBeVisible();
  await expect(intentsPortfolioLocator.getByText("SOL")).toBeVisible();
  
  // Locate the ETH row and check its balance
  const ethRowLocator = page.locator('.card-body div.d-flex.flex-column.border-bottom:has(div.h6.mb-0.text-truncate:has-text("ETH"))');
  const ethAmountElement = ethRowLocator.locator('div.d-flex.gap-2.align-items-center.justify-content-end div.d-flex.flex-column.align-items-end div.h6.mb-0');
  await expect(ethAmountElement).toHaveText("128.23", { timeout: 10000 }); // Rounded for display

  // Locate the WNEAR row and check its balance
  const wnearRowLocator = page.locator('.card-body div.d-flex.flex-column.border-bottom:has(div.h6.mb-0.text-truncate:has-text("WNEAR"))');
  const wnearAmountElement = wnearRowLocator.locator('div.d-flex.gap-2.align-items-center.justify-content-end div.d-flex.flex-column.align-items-end div.h6.mb-0');
  await expect(wnearAmountElement).toHaveText("342.66");

  // Locate the BTC row and check its balance
  const btcRowLocator = page.locator('.card-body div.d-flex.flex-column.border-bottom:has(div.h6.mb-0.text-truncate:has-text("BTC"))');
  const btcAmountElement = btcRowLocator.locator('div.d-flex.gap-2.align-items-center.justify-content-end div.d-flex.flex-column.align-items-end div.h6.mb-0');
  await expect(btcAmountElement).toHaveText("0.50");

  // Locate the SOL row and check its balance
  const solRowLocator = page.locator('.card-body div.d-flex.flex-column.border-bottom:has(div.h6.mb-0.text-truncate:has-text("SOL"))');
  const solAmountElement = solRowLocator.locator('div.d-flex.gap-2.align-items-center.justify-content-end div.d-flex.flex-column.align-items-end div.h6.mb-0');
  await expect(solAmountElement).toHaveText("10.00");

  // ETH icon
  const ethIconLocator = page.locator('div.h6.mb-0.text-truncate:has-text("ETH")').locator('../..').locator('img');
  const expectedEthIconBase64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDMyIDMyIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjE2IiBjeT0iMTYiIHI9IjE2IiBmaWxsPSIjNjI3RUVBIi8+PGcgZmlsbD0iI0ZGRiIgZmlsbC1ydWxlPSJub256ZXJvIj48cGF0aCBmaWxsLW9wYWNpdHk9Ii42MDIiIGQ9Ik0xNi40OTggNHY4Ljg3bDcuNDk3IDMuMzV6Ii8+PHBhdGggZD0iTTE2LjQ5OCA0TDkgMTYuMjJsNy40OTgtMy4zNVoiLz48cGF0aCBmaWxsLW9wYWNpdHk9Ii42MDIiIGQ9Ik0xNi40OTggMjEuOTY4djYuMDI3TDI0IDE3LjYxNnoiLz48cGF0aCBkPSJNMTYuNDk4IDI3Ljk5NXYtNi4wMjhMOSAxNy42MTZ6Ii8+PHBhdGggZmlsbC1vcGFjaXR5PSIuMiIgZD0iTTE2LjQ5OCAyMC41NzNsNy40OTctNC4zNTMtNy40OTctMy4zNDh6Ii8+PHBhdGggZmlsbC1vcGFjaXR5PSIuNjAyIiBkPSJNOSAxNi4yMmw3LjQ5OCA0LjM1M3YtNy43MDF6Ii8+PC9nPjwvZz48L3N2Zz4=";
  const alternativeEthIconBase64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDMyIDMyIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjE2IiBjeT0iMTYiIHI9IjE2IiBmaWxsPSIjNjI3RUVBIi8+PGcgZmlsbD0iI0ZGRiIgZmlsbC1ydWxlPSJub256ZXJvIj48cGF0aCBmaWxsLW9wYWNpdHk9Ii42MDIiIGQ9Ik0xNi40OTggNHY4Ljg3bDcuNDk3IDMuMzV6Ii8+PHBhdGggZD0iTTE2LjQ5OCA0TDkgMTYuMjJsNy40OTgtMy4zNXoiLz48cGF0aCBmaWxsLW9wYWNpdHk9Ii42MDIiIGQ9Ik0xNi40OTggMjEuOTY4djYuMDI3TDI0IDE3LjYxNnoiLz48cGF0aCBkPSJNMTYuNDk4IDI3Ljk5NXYtNi4wMjhMOSAxNy42MTZ6Ii8+PHBhdGggZmlsbC1vcGFjaXR5PSIuMiIgZD0iTTE2LjQ5OCAyMC41NzNsNy40OTctNC4zNTMtNy40OTctMy4zNDh6Ii8+PHBhdGggZmlsbC1vcGFjaXR5PSIuNjAyIiBkPSJNOSAxNi4yMmw3LjQ5OCA0LjM1M3YtNy43MDF6Ii8+PC9nPjwvZz48L3N2Zz4="; // Note: This is the "received" one from the error, which has 'X' instead of 'V' in one spot.
  
  const ethIconSrc = await ethIconLocator.getAttribute('src');
  expect(ethIconSrc === expectedEthIconBase64 || ethIconSrc === alternativeEthIconBase64).toBeTruthy();

  // wNEAR balance
  const wnearBalanceAfterDeposit = await intents.view("mt_balance_of", {
    account_id: daoTreasuryAccountId,
    token_id: wnearTokenId,
  });
  expect(wnearBalanceAfterDeposit).toEqual("342660000000000000000000000");

  await worker.tearDown();
});
