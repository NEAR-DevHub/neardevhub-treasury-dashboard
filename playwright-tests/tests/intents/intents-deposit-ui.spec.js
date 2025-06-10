import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { redirectWeb4, getLocalWidgetContent } from "../../util/web4.js";
import { Jimp } from "jimp";
import jsQR from "jsqr";

test.describe("Intents Deposit UI feature flag", () => {
  // Disable feature flag during tests for all instances, can be removed when generally available
  test("should not display the deposit button if Intents Feature flag is not true", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    const modifiedWidgets = {};
    const configKey = `${instanceAccount}/widget/config.data`;
    modifiedWidgets[configKey] = (
      await getLocalWidgetContent(configKey, {
        treasury: daoAccount,
        account: instanceAccount,
      })
    ).replace("showNearIntents: true", "showNearIntents: false");

    // --------------------------------------------------------
    await redirectWeb4({
      page,
      contractId: instanceAccount,
      treasury: daoAccount,
      modifiedWidgets,
      callWidgetNodeURLForContractWidgets: false,
    });

    await page.goto(`https://${instanceAccount}.page`);

    // Wait for the main dashboard content to load, e.g., the Total Balance card
    const totalBalanceCardLocator = page.locator(".card.card-body", {
      hasText: "Total Balance",
    });
    await expect(totalBalanceCardLocator).toBeVisible({ timeout: 20000 }); // Increased timeout

    // Check for the Deposit button within the Total Balance card
    const depositButton = totalBalanceCardLocator.getByRole("button", {
      name: "Deposit",
    });
    await expect(depositButton).not.toBeVisible();
  });
});

test.describe("Intents Deposit UI", () => {
  test.use({
    contextOptions: {
      permissions: ["clipboard-read", "clipboard-write"],
    },
  });

  test.beforeEach(async ({ page, instanceAccount, daoAccount }) => {
    // Enable feature flag during tests for all instances, can be removed when generally available

    const modifiedWidgets = {};
    const configKey = `${instanceAccount}/widget/config.data`;
    modifiedWidgets[configKey] = (
      await getLocalWidgetContent(configKey, {
        treasury: daoAccount,
        account: instanceAccount,
      })
    ).replace("treasuryDaoID:", "showNearIntents: true, treasuryDaoID:");

    // --------------------------------------------------------
    await redirectWeb4({
      page,
      contractId: instanceAccount,
      treasury: daoAccount,
      modifiedWidgets,
      callWidgetNodeURLForContractWidgets: false,
    });
  });

  test("should display the deposit button in the Total Balance card", async ({
    page,
    instanceAccount,
  }) => {
    await page.goto(`https://${instanceAccount}.page`);

    // Wait for the main dashboard content to load, e.g., the Total Balance card
    const totalBalanceCardLocator = page.locator(".card.card-body", {
      hasText: "Total Balance",
    });
    await expect(totalBalanceCardLocator).toBeVisible({ timeout: 20000 }); // Increased timeout

    // Check for the Deposit button within the Total Balance card
    const depositButton = totalBalanceCardLocator.getByRole("button", {
      name: "Deposit",
    });
    await expect(depositButton).toBeVisible();
    await expect(depositButton).toHaveClass(/btn-success/); // Check for green color
  });

  test("clicking deposit button opens deposit modal with correct initial content", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    await page.goto(`https://${instanceAccount}.page`);
    await page.waitForLoadState("networkidle");

    const totalBalanceCardLocator = page.locator(".card.card-body", {
      hasText: "Total Balance",
    });
    await expect(totalBalanceCardLocator).toBeVisible({ timeout: 20000 });

    const depositButton = totalBalanceCardLocator.getByRole("button", {
      name: "Deposit",
    });
    await depositButton.click();

    const modalLocator = page.locator(
      'div.card[data-component="widgets.treasury-factory.near/widget/lib.modal"]'
    );
    await expect(modalLocator).toBeVisible({ timeout: 10000 });

    // Check Sputnik Tab button is visible and active by default
    const sputnikTabButton = modalLocator.getByRole("button", {
      name: "Sputnik DAO",
    });
    await expect(sputnikTabButton).toBeVisible();
    await expect(sputnikTabButton).toHaveClass(/active/);

    // Check Sputnik tab content is visible
    await expect(modalLocator.locator(`div.form-control`)).toHaveText(
      daoAccount
    );

    // Check Near Intents Tab button is visible but not active
    const intentsTabButton = modalLocator.getByRole("button", {
      name: "NEAR Intents",
    });
    await expect(intentsTabButton).toBeVisible();
    await expect(intentsTabButton).not.toHaveClass(/active/);

    const closeButtonFooter = modalLocator.getByRole("button", {
      name: "Close",
    });
    await expect(closeButtonFooter).toBeVisible();

    await closeButtonFooter.click();
    await expect(modalLocator).not.toBeVisible();
  });

  test("should handle tab switching and display correct content in deposit modal", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    await page.goto(`https://${instanceAccount}.page`);
    await page.waitForLoadState("networkidle");

    const totalBalanceCardLocator = page.locator(".card.card-body", {
      hasText: "Total Balance",
    });
    await expect(totalBalanceCardLocator).toBeVisible({ timeout: 20000 });
    const depositButton = totalBalanceCardLocator.getByRole("button", {
      name: "Deposit",
    });
    await expect(depositButton).toBeVisible();
    await depositButton.click();

    const modalLocator = page.locator(
      'div.card[data-component="widgets.treasury-factory.near/widget/lib.modal"]'
    );
    await expect(modalLocator).toBeVisible({ timeout: 10000 });

    const sputnikTabButton = modalLocator.getByRole("button", {
      name: "Sputnik DAO",
    });
    const intentsTabButton = modalLocator.getByRole("button", {
      name: "NEAR Intents",
    });
    const warningLocator = modalLocator.locator(".alert");

    // Initial state: Sputnik tab should be active
    await expect(sputnikTabButton).toHaveClass(/active/);
    await expect(intentsTabButton).not.toHaveClass(/active/);
    await expect(warningLocator).toBeVisible();
    await expect(warningLocator).toContainText(
      "Only deposit from the NEAR network"
    );

    // Verify Sputnik tab copy button
    const sputnikCopyButton = modalLocator
      .locator(
        '[data-component="widgets.treasury-factory.near/widget/components.Copy"]'
      )
      .first();
    await expect(sputnikCopyButton).toBeVisible();

    await sputnikCopyButton.click();

    let clipboardText = await page.evaluate("navigator.clipboard.readText()");
    expect(clipboardText).toEqual(daoAccount);

    // Switch to Near Intents tab
    await intentsTabButton.click();
    await expect(intentsTabButton).toHaveClass(/active/);
    await expect(sputnikTabButton).not.toHaveClass(/active/);
    await expect(warningLocator).toHaveText(
      "Select an asset and network to see deposit instructions and address."
    );
  });

  test("should display QR code in Sputnik DAO tab", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    await page.goto(`https://${instanceAccount}.page`);
    await page.waitForLoadState("networkidle");

    const totalBalanceCardLocator = page.locator(".card.card-body", {
      hasText: "Total Balance",
    });
    await expect(totalBalanceCardLocator).toBeVisible({ timeout: 20000 });
    const depositButton = totalBalanceCardLocator.getByRole("button", {
      name: "Deposit",
    });
    await expect(depositButton).toBeEnabled();
    await depositButton.click();

    const modalLocator = page.locator(
      'div.card[data-component="widgets.treasury-factory.near/widget/lib.modal"]'
    );
    await expect(modalLocator).toBeVisible({ timeout: 10000 });

    const sputnikTabButton = modalLocator.getByRole("button", {
      name: "Sputnik DAO",
    });

    // Check QR code in Sputnik tab
    await expect(sputnikTabButton).toHaveClass(/active/);

    // Verify the QR code matches the displayed address
    const qrCodeIframe = modalLocator.locator("iframe[title*='QR Code for']");
    await expect(qrCodeIframe).toBeVisible();
    await qrCodeIframe.scrollIntoViewIfNeeded();
    // Take a screenshot of the QR code and decode it
    const qrCodeImageBuffer = await qrCodeIframe.screenshot();
    const image = await Jimp.read(qrCodeImageBuffer);

    const imageData = {
      data: new Uint8ClampedArray(image.bitmap.data),
      width: image.bitmap.width,
      height: image.bitmap.height,
    };

    // Decode the QR code using jsQR
    const decodedQR = jsQR(imageData.data, imageData.width, imageData.height);
    expect(decodedQR?.data).toEqual(daoAccount);

    // Wait for the deposit address to appear
    const depositAddressElement = modalLocator.locator("div.form-control");
    await expect(depositAddressElement).not.toBeEmpty({ timeout: 15000 });
    const uiDepositAddress = await depositAddressElement.innerText();
    expect(uiDepositAddress).toEqual(daoAccount);

    const depositAddressCopyButton = modalLocator.locator(
      '.btn[data-component="widgets.treasury-factory.near/widget/components.Copy"]'
    );
    await expect(depositAddressCopyButton).toBeVisible();
    await depositAddressCopyButton.click();

    const clipboardText = await page.evaluate("navigator.clipboard.readText()");
    expect(clipboardText).toEqual(daoAccount);
  });

  test("verify deposit addresses and QR codes for all assets and networks", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(120_000);
    await page.goto(`https://${instanceAccount}.page`);
    await page.waitForLoadState("networkidle");

    // Open the deposit modal
    const totalBalanceCardLocator = page.locator(".card.card-body", {
      hasText: "Total Balance",
    });
    await expect(totalBalanceCardLocator).toBeVisible({ timeout: 20000 });
    const depositButton = totalBalanceCardLocator.getByRole("button", {
      name: "Deposit",
    });
    await expect(depositButton).toBeEnabled();
    await depositButton.click();

    const modalLocator = page.locator(
      'div.card[data-component="widgets.treasury-factory.near/widget/lib.modal"]'
    );
    await expect(modalLocator).toBeVisible({ timeout: 10000 });

    // Switch to the "NEAR Intents" tab
    const intentsTabButton = modalLocator.getByRole("button", {
      name: "NEAR Intents",
    });
    await expect(intentsTabButton).toBeEnabled();
    await intentsTabButton.click();
    await expect(intentsTabButton).toHaveClass(/active/);

    // Fetch all supported tokens from the API
    const supportedTokensResponse = await fetch(
      "https://bridge.chaindefuser.com/rpc",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: "supportedTokensFetchAllTest",
          jsonrpc: "2.0",
          method: "supported_tokens",
          params: [{}],
        }),
      }
    );
    const supportedTokensData = await supportedTokensResponse.json();
    expect(
      supportedTokensData.result && supportedTokensData.result.tokens
    ).toBeTruthy();
    const allFetchedTokens = supportedTokensData.result.tokens;

    const uniqueAssetNames = Array.from(
      new Set(allFetchedTokens.map((t) => t.asset_name))
    )
      .filter((name) => name)
      .sort();

    // This map is a copy of the same `chainIdToNameMap` defined in `DepositModal.jsx`
    const chainIdToNameMap = {
      "eth:1": "Ethereum",
      "bsc:56": "BNB Smart Chain",
      "polygon:137": "Polygon PoS",
      "arbitrum:42161": "Arbitrum One",
      "optimism:10": "Optimism",
      "avax:43114": "Avalanche C-Chain",
      "btc:mainnet": "Bitcoin",
      // Add more mappings as needed
    };

    for (const assetName of uniqueAssetNames) {
      // Select the asset in the UI
      // For the first asset, look for the default text
      const assetDropdownSelector = await page
        .locator("div.custom-select")
        .nth(0);
      if (assetName === uniqueAssetNames[0]) {
        await expect(assetDropdownSelector).toHaveText("Select an asset");
      }
      await assetDropdownSelector.click();
      // Use a strict locator for the asset dropdown item to avoid partial matches (e.g., BTC vs wBTC)
      await assetDropdownSelector
        .locator("div.dropdown-item", {
          hasText: new RegExp(`\\s+${assetName}\\s+`),
        })
        .click();

      const tokensOfSelectedAsset = allFetchedTokens.filter(
        (token) => token.asset_name === assetName
      );
      const networksForAsset = tokensOfSelectedAsset
        .map((token) => {
          if (!token.defuse_asset_identifier) return null;
          const parts = token.defuse_asset_identifier.split(":");
          let chainId =
            parts.length >= 2 ? parts.slice(0, 2).join(":") : parts[0];
          return {
            id: chainId,
            name: chainId,
            near_token_id: token.near_token_id,
          };
        })
        .filter((network) => network && network.id && network.near_token_id);

      const firstNetworkName =
        chainIdToNameMap[networksForAsset[0].id] || networksForAsset[0].name;
      for (const network of networksForAsset) {
        const networkName = chainIdToNameMap[network.id] || network.name;

        // Select the network in the UI
        if (networkName === firstNetworkName) {
          await page.getByText("Select a network", { exact: true }).click();
        } else {
          const dropdowns = await page.locator("div.custom-select");
          await dropdowns.nth(1).click();
        }
        // Use chainIdToNameMap to resolve the network name

        await page
          .locator("div.dropdown-item", { hasText: networkName })
          .click();

        // Wait for the deposit address to appear
        const depositAddressElement = modalLocator.locator("div.form-control");
        await expect(depositAddressElement).not.toBeEmpty({ timeout: 15000 });
        const uiDepositAddress = await depositAddressElement.innerText();

        // Verify the QR code matches the displayed address
        const qrCodeIframe = modalLocator.locator(
          "iframe[title*='QR Code for']"
        );
        await expect(qrCodeIframe).toBeVisible();
        await qrCodeIframe.scrollIntoViewIfNeeded();
        // Take a screenshot of the QR code and decode it
        const qrCodeImageBuffer = await qrCodeIframe.screenshot();
        const image = await Jimp.read(qrCodeImageBuffer);

        const imageData = {
          data: new Uint8ClampedArray(image.bitmap.data),
          width: image.bitmap.width,
          height: image.bitmap.height,
        };

        // Decode the QR code using jsQR
        const decodedQR = jsQR(
          imageData.data,
          imageData.width,
          imageData.height
        );
        expect(decodedQR?.data).toEqual(uiDepositAddress);

        // Fetch the deposit address directly from the API
        const apiResponse = await fetch("https://bridge.chaindefuser.com/rpc", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "depositAddressFetchTest",
            method: "deposit_address",
            params: [
              {
                account_id: daoAccount,
                chain: network.id,
              },
            ],
          }),
        });
        const apiData = await apiResponse.json();
        expect(apiData.result && apiData.result.address).toBeTruthy();
        const apiDepositAddress = apiData.result.address;

        // Verify the UI address matches the API address
        expect(uiDepositAddress).toEqual(apiDepositAddress);

        const intentsCopyButton = modalLocator.locator(
          '.btn[data-component="widgets.treasury-factory.near/widget/components.Copy"]'
        );
        await expect(intentsCopyButton).toBeVisible();
        await intentsCopyButton.click();

        const clipboardText = await page.evaluate(
          "navigator.clipboard.readText()"
        );
        expect(clipboardText).toEqual(apiDepositAddress);

        const alertLocator = modalLocator.locator(".alert");
        await expect(alertLocator).toContainText(
          `Only deposit ${assetName} from the ${networkName.toLowerCase()} network`
        );

        console.log(
          `Verified: ${assetName} on ${network.name} - Address: ${uiDepositAddress}`
        );
      }
    }
  });

  test("search for an asset, click on it, and it should be selected", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(20_000);
    await page.goto(`https://${instanceAccount}.page`);
    await page.waitForLoadState("networkidle");

    // Open the deposit modal
    const totalBalanceCardLocator = page.locator(".card.card-body", {
      hasText: "Total Balance",
    });
    await expect(totalBalanceCardLocator).toBeVisible({ timeout: 20000 });
    const depositButton = totalBalanceCardLocator.getByRole("button", {
      name: "Deposit",
    });
    await expect(depositButton).toBeEnabled();
    await depositButton.click();

    const modalLocator = page.locator(
      'div.card[data-component="widgets.treasury-factory.near/widget/lib.modal"]'
    );
    await expect(modalLocator).toBeVisible({ timeout: 10000 });

    // Switch to the "NEAR Intents" tab
    const intentsTabButton = modalLocator.getByRole("button", {
      name: "NEAR Intents",
    });
    await expect(intentsTabButton).toBeEnabled();
    await intentsTabButton.click();
    await expect(intentsTabButton).toHaveClass(/active/);

    await page.getByText("Select an asset", { exact: true }).click();
    const assetSearchField = await page.getByPlaceholder("Search assets");
    await assetSearchField.click();
    await assetSearchField.pressSequentially("usdc", { delay: 100 });
    const assetDropDownItem = page
      .locator(
        'div.dropdown-item.cursor-pointer.w-100.text-wrap[data-component="widgets.treasury-factory.near/widget/components.DropDownWithSearchAndManualRequest"]'
      )
      .first();
    await assetSearchField.blur(); // In a real click, the blur event is also sent before the click event
    await assetDropDownItem.click({});

    await expect(page.locator(".dropdown-toggle").first()).toContainText(
      "USDC"
    );
    await page.waitForTimeout(500);
  });

  test("should display human-readable blockchain names in network selection", async ({
    page,
    instanceAccount,
    // daoAccount, // daoAccount is not used in this test
  }) => {
    test.setTimeout(180_000); // Increased timeout for multiple assets and API calls

    await page.goto(`https://${instanceAccount}.page`);
    await page.waitForLoadState("networkidle");

    // Open the deposit modal
    const totalBalanceCardLocator = page.locator(".card.card-body", {
      hasText: "Total Balance",
    });
    await expect(totalBalanceCardLocator).toBeVisible({ timeout: 20000 });
    const depositButton = totalBalanceCardLocator.getByRole("button", {
      name: "Deposit",
    });
    await expect(depositButton).toBeEnabled();
    await depositButton.click();

    const modalLocator = page.locator(
      'div.card[data-component="widgets.treasury-factory.near/widget/lib.modal"]'
    );
    await expect(modalLocator).toBeVisible({ timeout: 10000 });

    // Switch to the "NEAR Intents" tab
    const intentsTabButton = modalLocator.getByRole("button", {
      name: "NEAR Intents",
    });
    await expect(intentsTabButton).toBeEnabled();
    await intentsTabButton.click();
    await expect(intentsTabButton).toHaveClass(/active/);

    // Define all potential test cases for USDC
    // The chainId here is what defuse_asset_identifier.startsWith(chainId) would match
    const usdcNetworkExpectations = [
      { assetSymbol: "USDC", chainId: "eth:1", expectedNetworkName: "Ethereum" },
      { assetSymbol: "USDC", chainId: "arbitrum:42161", expectedNetworkName: "Arbitrum One" },
      { assetSymbol: "USDC", chainId: "optimism:10", expectedNetworkName: "Optimism" },
      { assetSymbol: "USDC", chainId: "polygon:137", expectedNetworkName: "Polygon PoS" },
      { assetSymbol: "USDC", chainId: "bsc:56", expectedNetworkName: "BNB Smart Chain" },
      { assetSymbol: "USDC", chainId: "avax:43114", expectedNetworkName: "Avalanche C-Chain" },
      { assetSymbol: "USDC", chainId: "eth:8453", expectedNetworkName: "Base" }, // Key L2 test
      // Add eth: variants if the backend might provide these for L2s and they need mapping
      // e.g. if arbitrum could be eth:42161 from backend for USDC
      { assetSymbol: "USDC", chainId: "eth:42161", expectedNetworkName: "Arbitrum One" }, 
      { assetSymbol: "USDC", chainId: "eth:10", expectedNetworkName: "Optimism" },
      // { assetSymbol: "USDC", chainId: "solana:mainnet", expectedNetworkName: "Solana" }, // Example if Solana USDC is supported
    ];

    // Fetch all supported tokens from the API to validate test cases
    const supportedTokensResponse = await fetch(
      "https://bridge.chaindefuser.com/rpc",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: "supportedTokensNetworkNameTestUSDC",
          jsonrpc: "2.0",
          method: "supported_tokens",
          params: [{}],
        }),
      }
    );
    const supportedTokensData = await supportedTokensResponse.json();
    expect(
      supportedTokensData.result && supportedTokensData.result.tokens
    ).toBeTruthy();
    const allFetchedTokens = supportedTokensData.result.tokens;

    // Filter to get valid network configurations for USDC that are actually supported
    const validUsdcNetworksToTest = usdcNetworkExpectations.filter(tc => {
      return allFetchedTokens.some(token =>
        token.asset_name === tc.assetSymbol && // Should always be "USDC"
        token.defuse_asset_identifier &&
        // Check if the defuse_asset_identifier starts with the chainId (e.g., "eth:8453" for "eth:8453:0xContract")
        token.defuse_asset_identifier.startsWith(tc.chainId)
      );
    });

    if (validUsdcNetworksToTest.length === 0) {
      console.warn("WARN: No valid USDC network test cases found based on currently supported tokens. Test skipped.");
      return; 
    }
    console.log(`INFO: Running USDC network name verification for ${validUsdcNetworksToTest.length} configurations.`);

    // 1. Select the asset "USDC"
    const assetDropdown = modalLocator.locator("div.custom-select").nth(0);
    await assetDropdown.click();
    const usdcAssetItemLocator = assetDropdown.locator("div.dropdown-item", {
        hasText: new RegExp(`^\\s*USDC(\\s|$)`) 
    });
    await expect(usdcAssetItemLocator.first()).toBeVisible({ timeout: 10000 });
    await usdcAssetItemLocator.first().click();
    await expect(assetDropdown.locator(".dropdown-toggle")).toContainText("USDC", { timeout: 5000 });

    // 2. Click the network dropdown to open it
    const networkDropdownLocator = modalLocator.locator("div.custom-select").nth(1);
    await networkDropdownLocator.click();
    await page.waitForTimeout(500); // Allow dropdown to render

    // 3. Get all visible network item texts from the UI
    const networkItems = networkDropdownLocator.locator('div.dropdown-item.cursor-pointer.w-100.text-wrap');
    const uiNetworkNames = [];
    const count = await networkItems.count();
    for (let i = 0; i < count; i++) {
        uiNetworkNames.push(await networkItems.nth(i).innerText());
    }
    console.log("INFO: UI Network Names for USDC:", uiNetworkNames);

    // 4. Perform assertions for each expected USDC network configuration
    for (const { chainId, expectedNetworkName } of validUsdcNetworksToTest) {
      console.log(`INFO: Verifying: ChainID ${chainId} should display as "${expectedNetworkName}"`);
      
      // Assert that the expected human-readable name is present in the UI dropdown
      expect(uiNetworkNames, 
        `Dropdown should contain "${expectedNetworkName}" for USDC (from chainId "${chainId}"). UI items: ${uiNetworkNames.join(', ')}`
      ).toContain(expectedNetworkName);

      // Assert that the raw chainId is NOT present if it's different from the expectedNetworkName
      if (chainId !== expectedNetworkName) {
        expect(uiNetworkNames, 
          `Dropdown should NOT contain raw chainId "${chainId}" for USDC when "${expectedNetworkName}" is expected. UI items: ${uiNetworkNames.join(', ')}`
        ).not.toContain(chainId);
      }
    }
    
    // As a final check, ensure that we have tested at least one L2 that might have an eth: prefix if not mapped.
    const baseCase = validUsdcNetworksToTest.find(tc => tc.chainId === "eth:8453");
    if (baseCase) {
        console.log("INFO: Specifically verified expectations for Base (eth:8453).");
    }
    const arbitrumCase = validUsdcNetworksToTest.find(tc => tc.chainId === "arbitrum:42161" || tc.chainId === "eth:42161");
    if (arbitrumCase) {
        console.log("INFO: Specifically verified expectations for Arbitrum.");
    }

  });

});
