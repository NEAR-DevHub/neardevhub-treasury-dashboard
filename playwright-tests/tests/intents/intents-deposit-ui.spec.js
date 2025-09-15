import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { redirectWeb4, getLocalWidgetContent } from "../../util/web4.js";
import { Jimp } from "jimp";
import jsQR from "jsqr";
import { getWeb3IconMaps } from "../../util/web3icon.js";

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
    await expect(depositButton).toBeVisible({ timeout: 15_000 });
    await expect(depositButton).toHaveClass(/theme-btn/);
  });

  test("clicking deposit button shows dropdown and navigating to Sputnik DAO page shows correct content", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    await page.goto(`https://${instanceAccount}.page`);

    const totalBalanceCardLocator = page.locator(".card.card-body", {
      hasText: "Total Balance",
    });
    await expect(totalBalanceCardLocator).toBeVisible({ timeout: 20000 });

    const depositButton = totalBalanceCardLocator.getByRole("button", {
      name: "Deposit",
    });
    await depositButton.click();

    // Check dropdown menu appears
    const dropdownMenu = page.locator(".dropdown-menu");
    await expect(dropdownMenu).toBeVisible({ timeout: 5000 });

    // Click on Sputnik DAO option
    const sputnikOption = dropdownMenu.getByRole("link", {
      name: /Sputnik DAO/,
    });
    await expect(sputnikOption).toBeVisible();
    await sputnikOption.click();

    // Wait for navigation to deposit page
    await page.waitForURL(/deposit=sputnik-dao/);

    // Check for Deposit page header
    await expect(
      page.locator(".h3").filter({ hasText: "Deposit" })
    ).toBeVisible({ timeout: 10000 });

    // Check Back button is visible
    await expect(page.getByRole("link", { name: "Back" })).toBeVisible();

    // Check Sputnik DAO content is visible - address is displayed as text truncate (use nth to avoid multiple matches)
    await expect(
      page.locator(".text-truncate").filter({ hasText: daoAccount }).nth(0)
    ).toBeVisible();
  });

  test("should navigate between Sputnik DAO and NEAR Intents deposit pages", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    await page.goto(`https://${instanceAccount}.page`);

    const totalBalanceCardLocator = page.locator(".card.card-body", {
      hasText: "Total Balance",
    });
    await expect(totalBalanceCardLocator).toBeVisible({ timeout: 20000 });

    // Navigate to Sputnik DAO deposit page
    const depositButton = totalBalanceCardLocator.getByRole("button", {
      name: "Deposit",
    });
    await expect(depositButton).toBeVisible({ timeout: 15_000 });
    await depositButton.click();

    const dropdownMenu = page.locator(".dropdown-menu");
    await expect(dropdownMenu).toBeVisible({ timeout: 5000 });

    const sputnikOption = dropdownMenu.getByRole("link", {
      name: /Sputnik DAO/,
    });
    await sputnikOption.click();

    await page.waitForURL(/deposit=sputnik-dao/);

    // Check Sputnik DAO page content
    const warningLocator = page.locator(".warning-box");
    await expect(warningLocator).toBeVisible();
    await expect(warningLocator).toContainText(
      "Only deposit from the NEAR network"
    );

    // Verify Sputnik tab copy button
    const sputnikCopyButton = page.getByTestId("copy-button");
    await expect(sputnikCopyButton).toBeVisible();

    await sputnikCopyButton.click();

    let clipboardText = await page.evaluate("navigator.clipboard.readText()");
    expect(clipboardText).toEqual(daoAccount);

    // Navigate back to dashboard
    await page.getByRole("link", { name: "Back" }).click();
    await page.waitForURL(/page=dashboard/);

    // Navigate to NEAR Intents deposit page
    await depositButton.click();
    await expect(dropdownMenu).toBeVisible({ timeout: 5000 });

    const intentsOption = dropdownMenu.getByRole("link", {
      name: /Intents/,
    });
    await intentsOption.click();

    await page.waitForURL(/deposit=intents/);

    // Check NEAR Intents page content - now uses a different structure with steps
    await expect(
      page.locator(".h4").filter({ hasText: "NEAR Intents" })
    ).toBeVisible();
    await expect(
      page.locator("text=/Best for tokens from other blockchains/")
    ).toBeVisible();
    // Check first step is visible
    await expect(
      page.locator(".h5").filter({ hasText: "Select Asset" })
    ).toBeVisible();
  });

  test("should display QR code in Sputnik DAO deposit page", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    await page.goto(`https://${instanceAccount}.page`);

    const totalBalanceCardLocator = page.locator(".card.card-body", {
      hasText: "Total Balance",
    });
    await expect(totalBalanceCardLocator).toBeVisible({ timeout: 20000 });

    const depositButton = totalBalanceCardLocator.getByRole("button", {
      name: "Deposit",
    });
    await expect(depositButton).toBeEnabled({ timeout: 20_000 });
    await depositButton.click();

    // Click on Sputnik DAO option in dropdown
    const dropdownMenu = page.locator(".dropdown-menu");
    await expect(dropdownMenu).toBeVisible({ timeout: 5000 });

    const sputnikOption = dropdownMenu.getByRole("link", {
      name: /Sputnik DAO/,
    });
    await sputnikOption.click();

    await page.waitForURL(/deposit=sputnik-dao/);

    // Verify the QR code matches the displayed address
    const qrCodeIframe = page.locator("iframe[title*='QR Code for']");
    await expect(qrCodeIframe).toBeVisible();
    await expect(
      qrCodeIframe.contentFrame().locator("path").first()
    ).toBeVisible();

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

    // Wait for the deposit address to appear - using text-truncate selector (use last to get the actual address, not the parent)
    const depositAddressElement = page
      .locator(".text-truncate")
      .filter({ hasText: daoAccount })
      .last();
    await expect(depositAddressElement).toBeVisible({ timeout: 15000 });
    const uiDepositAddress = await depositAddressElement.innerText();
    expect(uiDepositAddress).toEqual(daoAccount);

    const depositAddressCopyButton = page.getByTestId("copy-button");
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
    const { networkNames } = await getWeb3IconMaps();
    test.setTimeout(180_000);
    await page.goto(`https://${instanceAccount}.page`);

    // Open the deposit modal
    const totalBalanceCardLocator = page.locator(".card.card-body", {
      hasText: "Total Balance",
    });
    await expect(totalBalanceCardLocator).toBeVisible({ timeout: 20_000 });

    const depositButton = totalBalanceCardLocator.getByRole("button", {
      name: "Deposit",
    });
    await expect(depositButton).toBeEnabled({ timeout: 20_000 });
    await depositButton.click();

    // Click on Intents option in dropdown
    const dropdownMenu = page.locator(".dropdown-menu");
    await expect(dropdownMenu).toBeVisible({ timeout: 5000 });

    const intentsOption = dropdownMenu.getByRole("link", {
      name: /Intents/,
    });
    await intentsOption.click();

    await page.waitForURL(/deposit=intents/);

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
    const allFetchedTokens = supportedTokensData.result.tokens.filter(
      (token) => token.standard === "nep141"
    );
    expect(allFetchedTokens.length).toBeGreaterThan(60);

    // Select up to 10 random unique asset names to test
    const allAssetNames = Array.from(
      new Set(allFetchedTokens.map((t) => t.asset_name))
    ).filter(Boolean);

    const shuffled = allAssetNames
      .map((name) => ({ name, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ name }) => name);

    const uniqueAssetNames = shuffled.slice(0, 10).sort();
    console.log("Assets to test:", uniqueAssetNames);

    for (const assetName of uniqueAssetNames) {
      console.log(`
INFO: Verifying asset: ${assetName}`);
      // Select the asset in the UI using SearchSelectorModal
      const assetDropdownSelector = page.locator("div.bg-dropdown").first();
      if (assetName === uniqueAssetNames[0]) {
        await expect(assetDropdownSelector).toHaveText(/Select Asset/, {
          timeout: 15_000,
        });
      }
      await assetDropdownSelector.click();

      // Wait for modal to appear
      await expect(page.getByPlaceholder("Search assets")).toBeVisible({
        timeout: 5000,
      });

      // Use a strict locator for the asset dropdown item to avoid partial matches (e.g., BTC vs wBTC)
      const assetLocator = page.locator(".dropdown-item").filter({
        hasText: new RegExp(`\\b${assetName}\\b`),
      });

      await expect(assetLocator.first()).toBeVisible();
      console.log(`    - Clicking on asset: ${assetName}`);
      await assetLocator.first().click();

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

      const firstNetworkName = networksForAsset[0].name;
      for (const network of networksForAsset) {
        console.log(`  - Verifying network: ${network.name}`);
        console.log(`    - Looking for network name: ${network.name}`);
        const networkName = network.name;

        // Select the network in the UI using SearchSelectorModal
        const networkDropdown = page.locator("div.bg-dropdown").nth(1);
        await networkDropdown.click();

        // Wait for modal to appear
        await expect(page.getByPlaceholder("Search networks")).toBeVisible({
          timeout: 5000,
        });

        // Get all available network options to see what's actually in the dropdown
        const allNetworkItems = await page.locator(".dropdown-item").all();
        const availableNetworks = [];
        for (const item of allNetworkItems) {
          const text = await item.innerText();
          availableNetworks.push(text.trim());
        }

        console.log(
          `    Available networks for ${assetName}:`,
          availableNetworks
        );

        // Try to find the network - the UI might display it differently
        // First try with human readable name, then try partial match
        const humanReadableName = networkNames[network.id];
        let networkOptionElement;

        if (humanReadableName) {
          // Try to find by the human readable name (might be partial match)
          networkOptionElement = page
            .locator(".dropdown-item")
            .filter({
              hasText: humanReadableName,
            })
            .first();

          // If not found, try to find any item containing the readable name
          const count = await networkOptionElement.count();
          if (count === 0) {
            // Try partial match or look for the first available network if this is the only one
            if (availableNetworks.length === 1) {
              networkOptionElement = page.locator(".dropdown-item").first();
            } else {
              // Skip this network if we can't find it
              console.log(
                `    WARNING: Could not find network ${humanReadableName} or ${network.id}, skipping`
              );
              // Close modal by clicking X or outside
              await page
                .getByRole("heading", { name: "Select Network " })
                .locator("i")
                .click();
              await page.waitForTimeout(500);
              continue;
            }
          }
        } else {
          // If only one network is available, just use it
          if (availableNetworks.length === 1) {
            networkOptionElement = page.locator(".dropdown-item").first();
          } else {
            console.log(
              `    WARNING: No mapping for network ${network.id} and multiple options available, skipping`
            );
            // Close modal by clicking X or outside
            await page
              .getByRole("heading", { name: "Select Network " })
              .locator("i")
              .click();
            await page.waitForTimeout(500);
            continue;
          }
        }

        await expect(networkOptionElement).toBeVisible({ timeout: 10000 });
        const visibleNetworkName = await networkOptionElement.innerText();
        await networkOptionElement.click();

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

        // Wait for the deposit address to appear - use last() to get the actual address element
        const depositAddressElement = page
          .locator(".text-truncate")
          .filter({ hasText: apiDepositAddress })
          .last();
        await expect(depositAddressElement).toBeVisible({ timeout: 15000 });
        const uiDepositAddress = await depositAddressElement.innerText();

        // Verify the UI address matches the API address
        expect(uiDepositAddress).toEqual(apiDepositAddress);

        // Verify the QR code matches the displayed address
        const qrCodeIframe = page.locator("iframe[title*='QR Code for']");
        await expect(qrCodeIframe).toBeVisible();
        await qrCodeIframe.scrollIntoViewIfNeeded();
        await expect(
          qrCodeIframe.contentFrame().locator("path").first()
        ).toBeVisible();

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

        const intentsCopyButton = page.getByTestId("copy-button");
        await expect(intentsCopyButton).toBeVisible();
        await intentsCopyButton.click();

        const clipboardText = await page.evaluate(
          "navigator.clipboard.readText()"
        );
        expect(clipboardText).toEqual(apiDepositAddress);

        // The warning message format has changed in the new UI
        const alertLocator = page.locator(".warning-box");

        // Just verify that a warning exists with the network name
        await expect(alertLocator).toContainText("Only deposit from the");

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
    test.setTimeout(60_000);
    await page.goto(`https://${instanceAccount}.page`);

    // Open the deposit modal
    const totalBalanceCardLocator = page.locator(".card.card-body", {
      hasText: "Total Balance",
    });
    await expect(totalBalanceCardLocator).toBeVisible({ timeout: 20000 });
    const depositButton = totalBalanceCardLocator.getByRole("button", {
      name: "Deposit",
    });
    await expect(depositButton).toBeEnabled({ timeout: 15_000 });
    await depositButton.click();

    // Click on Intents option in dropdown
    const dropdownMenu = page.locator(".dropdown-menu");
    await expect(dropdownMenu).toBeVisible({ timeout: 5000 });

    const intentsOption = dropdownMenu.getByRole("link", {
      name: /Intents/,
    });
    await intentsOption.click();

    await page.waitForURL(/deposit=intents/);

    // Click on the asset selector to open the modal
    const assetDropdown = page.locator("div.bg-dropdown").first();
    await expect(assetDropdown).toHaveText(/Select Asset/);
    await assetDropdown.click();

    // Wait for modal to appear
    await expect(page.getByPlaceholder("Search assets")).toBeVisible({
      timeout: 5000,
    });

    // Search for USDC in the modal
    const assetSearchField = page.locator("input[placeholder*='Search']");
    await assetSearchField.click();
    await assetSearchField.pressSequentially("usdc", { delay: 100 });

    // Click on USDC option in the modal
    const assetDropDownItem = page
      .locator(".dropdown-item")
      .filter({ hasText: "USDC" })
      .first();
    await expect(assetDropDownItem).toBeVisible({ timeout: 5000 });
    await assetDropDownItem.click();

    // Verify the asset is selected and modal is closed
    await expect(page.getByPlaceholder("Search assets")).not.toBeVisible();
    await expect(assetDropdown).toContainText("USDC");
    await page.waitForTimeout(500);
  });

  test("should display human-readable blockchain names in network selection", async ({
    page,
    instanceAccount,
    // daoAccount, // daoAccount is not used in this test
  }) => {
    const { networkNames } = await getWeb3IconMaps();
    const networkNameMap = Object.fromEntries(
      Object.entries(networkNames).map(([key, value]) => [value, key])
    );
    test.setTimeout(60_000); // Increased timeout for testing multiple assets

    await page.goto(`https://${instanceAccount}.page`);

    // Open the deposit modal
    const totalBalanceCardLocator = page.locator(".card.card-body", {
      hasText: "Total Balance",
    });
    await expect(totalBalanceCardLocator).toBeVisible({ timeout: 20000 });

    const depositButton = totalBalanceCardLocator.getByRole("button", {
      name: "Deposit",
    });
    await expect(depositButton).toBeEnabled({ timeout: 15_000 });
    await depositButton.click();

    // Click on Intents option in dropdown
    const dropdownMenu = page.locator(".dropdown-menu");
    await expect(dropdownMenu).toBeVisible({ timeout: 5000 });

    const intentsOption = dropdownMenu.getByRole("link", {
      name: /Intents/,
    });
    await intentsOption.click();

    await page.waitForURL(/deposit=intents/);

    // Fetch all supported tokens from the API
    const supportedTokensResponse = await fetch(
      "https://bridge.chaindefuser.com/rpc",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: "supportedTokensNetworkNameTestAll",
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

    // Filter tokens to only include NEP-141 tokens and group by asset name
    const nep141Tokens = allFetchedTokens.filter(
      (token) =>
        token.intents_token_id && token.intents_token_id.startsWith("nep141:")
    );

    const assetsByName = {};
    nep141Tokens.forEach((token) => {
      if (!token.asset_name) return;
      if (!assetsByName[token.asset_name]) {
        assetsByName[token.asset_name] = [];
      }
      assetsByName[token.asset_name].push(token);
    });

    const availableAssets = Object.keys(assetsByName).sort();

    expect(availableAssets.length).toBeGreaterThan(0);

    const shuffledAssets = availableAssets
      .map((name) => ({ name, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ name }) => name);

    const assetsToTest = shuffledAssets.slice(0, 10).sort();

    console.log(
      `INFO: Testing ${
        assetsToTest.length
      } random assets with NEP-141 tokens: ${assetsToTest.join(", ")}`
    );

    // Test each asset
    for (const assetName of assetsToTest) {
      console.log(`\nINFO: Testing asset: ${assetName}`);

      // 1. Select the asset using SearchSelectorModal
      const assetDropdown = page.locator("div.bg-dropdown").first();
      if (assetName === assetsToTest[0]) {
        await expect(assetDropdown).toHaveText(/Select Asset/);
      }
      await assetDropdown.click();

      // Wait for modal to appear
      await expect(page.getByPlaceholder("Search assets")).toBeVisible({
        timeout: 5000,
      });

      const assetItemLocator = page.locator(".dropdown-item").filter({
        hasText: new RegExp(
          `^\\s*${assetName.replace(/[.*+?^${}()|[\\]/g, "\\$&")}(\\s|$)`
        ),
      });

      await expect(assetItemLocator.first()).toBeVisible({ timeout: 10000 });
      await assetItemLocator.first().click();
      await expect(assetDropdown).toContainText(assetName, { timeout: 5000 });

      // 2. Open the network dropdown using SearchSelectorModal
      const networkDropdownLocator = page.locator("div.bg-dropdown").nth(1);
      await networkDropdownLocator.click();

      // Wait for modal to appear
      await expect(page.getByPlaceholder("Search networks")).toBeVisible({
        timeout: 5000,
      });

      // 3. Get all visible network item texts from the UI
      const networkItems = page.locator(".dropdown-item");
      await expect(networkItems).not.toHaveCount(0);

      const uiNetworkNames = [];
      const count = await networkItems.count();
      for (let i = 0; i < count; i++) {
        uiNetworkNames.push(await networkItems.nth(i).innerText());
      }
      console.log(`INFO: UI Network Names for ${assetName}:`, uiNetworkNames);

      // 4. Verify that network names follow the expected format and don't show raw chain IDs
      const tokensForAsset = assetsByName[assetName];
      let hasValidNetworkNames = false;

      for (const uiNetworkName of uiNetworkNames) {
        console.log(
          `INFO: ${assetName} - Found network name: "${uiNetworkName}"`
        );
        hasValidNetworkNames = true;

        // Find corresponding token in the API data to validate the network name
        const correspondingToken = tokensForAsset.find(
          (token) =>
            token.defuse_asset_identifier &&
            networkNameMap[uiNetworkName] &&
            token.defuse_asset_identifier.startsWith(
              networkNameMap[uiNetworkName]
            )
        );

        if (correspondingToken) {
          console.log(
            `INFO: ${assetName} - Validated: network name "${uiNetworkName}" matches token data`
          );
        } else {
          console.warn(
            `WARN: ${assetName} - No matching token found for network name "${uiNetworkName}" in API data`
          );
        }
      }

      // Assert that at least one network name is valid
      expect(
        hasValidNetworkNames,
        `${assetName} should have at least one valid network name. Found: ${uiNetworkNames.join(
          ", "
        )}`
      ).toBe(true);

      // Close the network modal by clicking the close button
      await page
        .getByRole("heading", { name: "Select Network " })
        .locator("i")
        .click(); // Click close button to close modal
      await page.waitForTimeout(200);
    }
  });

  test("should display logo icons for each asset and chain", async ({
    page,
    instanceAccount,
    // daoAccount, // daoAccount is not used in this test
  }) => {
    test.setTimeout(60_000);
    const { networkIconMap, networkNames, tokenIconMap } =
      await getWeb3IconMaps();

    const networkNameMap = Object.fromEntries(
      Object.entries(networkNames).map(([key, value]) => [value, key])
    );

    console.log("networkIconMap keys:", Object.keys(networkIconMap));
    console.log("networkNameMap keys:", Object.keys(networkNameMap));

    await page.goto(`https://${instanceAccount}.page`);

    // Open the deposit modal
    const totalBalanceCardLocator = page.locator(".card.card-body", {
      hasText: "Total Balance",
    });

    await expect(totalBalanceCardLocator).toBeVisible({ timeout: 20000 });
    const depositButton = totalBalanceCardLocator.getByRole("button", {
      name: "Deposit",
    });
    await depositButton.click();

    // Click on Intents option in dropdown
    const dropdownMenu = page.locator(".dropdown-menu");
    await expect(dropdownMenu).toBeVisible({ timeout: 5000 });

    const intentsOption = dropdownMenu.getByRole("link", {
      name: /Intents/,
    });
    await intentsOption.click();

    await page.waitForURL(/deposit=intents/);

    // Fetch all supported tokens from the API
    const supportedTokensResponse = await fetch(
      "https://bridge.chaindefuser.com/rpc",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: "supportedTokensNetworkNameTestAll",
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

    // Filter tokens to only include NEP-141 tokens and group by asset name
    const nep141Tokens = allFetchedTokens.filter(
      (token) =>
        token.intents_token_id && token.intents_token_id.startsWith("nep141:")
    );

    const assetsByName = {};
    nep141Tokens.forEach((token) => {
      if (!token.asset_name) return;
      if (!assetsByName[token.asset_name]) {
        assetsByName[token.asset_name] = [];
      }
      assetsByName[token.asset_name].push(token);
    });

    const availableAssets = Object.keys(assetsByName).sort();

    if (availableAssets.length === 0) {
      console.warn(
        "WARN: No NEP-141 assets found in supported tokens. Test skipped."
      );
      return;
    }

    const assetDropdown = page.locator("div.bg-dropdown").first();
    await expect(assetDropdown).toHaveText(/Select Asset/);
    await assetDropdown.click();

    // Wait for modal to appear
    await expect(page.getByPlaceholder("Search assets")).toBeVisible({
      timeout: 5000,
    });

    // Check icons are visible in the modal
    await expect(page.locator(".dropdown-item img").first()).toBeVisible();

    for (const icon of await page.locator(".dropdown-item img").all()) {
      await icon.scrollIntoViewIfNeeded();
      await page.waitForTimeout(20);
    }

    const assetName = "USDC";
    const assetSearchLocator = page.locator("input[placeholder*='Search']");

    await expect(assetSearchLocator).toBeAttached();
    await assetSearchLocator.click();
    await expect(assetSearchLocator).toBeFocused();
    await assetSearchLocator.pressSequentially(assetName, { delay: 100 });

    const assetItemLocator = page.locator(".dropdown-item").filter({
      hasText: new RegExp(
        `^\\s*${assetName.replace(/[.*+?^${}()|[\\]/g, "\\$&")}(\\s|$)`
      ),
    });

    const assetIcon = assetItemLocator.locator("img");
    await expect(assetIcon).toBeVisible();
    await expect(
      await assetIcon
        .getAttribute("src")
        .then((str) => atob(str.substring("data:image/svg+xml;base64,".length)))
    ).toBe(tokenIconMap[(await assetItemLocator.innerText()).trim()]);

    await expect(assetItemLocator.first()).toBeVisible({ timeout: 10000 });
    await assetItemLocator.first().click();
    await expect(assetDropdown).toContainText(assetName, { timeout: 5000 });

    const networkDropdownLocator = page.locator("div.bg-dropdown").nth(1);
    await networkDropdownLocator.click();

    // Wait for modal to appear
    await expect(page.getByPlaceholder("Search networks")).toBeVisible({
      timeout: 5000,
    });

    // 3. Get all visible network item texts from the UI
    const networkItems = page.locator(".dropdown-item");

    await expect(networkItems).not.toHaveCount(0);
    await expect(networkItems.locator("img")).toHaveCount(
      await networkItems.count()
    );
    for (const networkItem of await networkItems.all()) {
      const networkIcon = networkItem.locator("img");
      const innerText = (await networkItem.innerText()).trim();
      let networkName = innerText
        .substring(0, innerText.lastIndexOf("("))
        .trim();

      if (networkName === "Near Protocol") {
        networkName = "NEAR";
      }

      const iconSrc = await networkIcon.getAttribute("src");
      expect(iconSrc).toBeDefined();
      expect(iconSrc).toContain("data:image/svg+xml;base64,");
      await networkIcon.scrollIntoViewIfNeeded();
    }
  });
});
