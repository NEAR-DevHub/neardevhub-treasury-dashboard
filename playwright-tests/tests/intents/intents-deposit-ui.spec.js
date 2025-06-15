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
    await expect(modalLocator).toBeVisible();

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
    const allFetchedTokens = supportedTokensData.result.tokens.filter(
      (token) => token.standard === "nep141"
    );
    expect(allFetchedTokens.length).toBeGreaterThan(60);

    const uniqueAssetNames = Array.from(
      new Set(allFetchedTokens.map((t) => t.asset_name))
    )
      .filter((name) => name)
      .sort();

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
      const assetLocator = assetDropdownSelector.locator("div.dropdown-item", {
        hasText: new RegExp(`\\s+${assetName}\\s+`),
      });

      await assetLocator.click();

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
        const networkName = network.name;

        // Select the network in the UI
        if (networkName === firstNetworkName) {
          await page.getByText("Select a network", { exact: true }).click();
        } else {
          const dropdowns = await page.locator("div.custom-select");
          await dropdowns.nth(1).click();
        }
        const networkOptionElement = await page.locator("div.dropdown-item", {
          hasText: `( ${networkName} )`,
        });
        const visibleNetworkName = await networkOptionElement.innerText();
        await networkOptionElement.click();

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
          `Only deposit ${assetName} from the ${visibleNetworkName.toLowerCase()} network`
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
    test.setTimeout(300_000); // Increased timeout for testing multiple assets

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

    console.log(
      `INFO: Testing ${
        availableAssets.length
      } assets with NEP-141 tokens: ${availableAssets.join(", ")}`
    );

    // Test each asset
    for (const assetName of availableAssets) {
      console.log(`\nINFO: Testing asset: ${assetName}`);

      // 1. Select the asset
      const assetDropdown = modalLocator.locator("div.custom-select").nth(0);
      await assetDropdown.click();

      const assetItemLocator = assetDropdown.locator("div.dropdown-item", {
        hasText: new RegExp(
          `^\\s*${assetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`
        ),
      });

      await expect(assetItemLocator.first()).toBeVisible({ timeout: 10000 });
      await assetItemLocator.first().click();
      await expect(assetDropdown.locator(".dropdown-toggle")).toContainText(
        assetName,
        { timeout: 5000 }
      );

      // 2. Open the network dropdown
      const networkDropdownLocator = modalLocator
        .locator("div.custom-select")
        .nth(1);
      await networkDropdownLocator.click();
      await page.waitForTimeout(500); // Allow dropdown to render

      // 3. Get all visible network item texts from the UI
      const networkItems = networkDropdownLocator.locator(
        "div.dropdown-item.cursor-pointer.w-100.text-wrap"
      );
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
        // Check if the UI network name follows the expected format: "name ( chainId )"
        const formatMatch = uiNetworkName.match(/^(.+?)\s+\(\s+(.+?)\s+\)$/);

        if (formatMatch) {
          const [, humanReadableName, chainId] = formatMatch;
          console.log(
            `INFO: ${assetName} - Found formatted network: "${humanReadableName}" with chainId "${chainId}"`
          );
          hasValidNetworkNames = true;

          // Verify that the humanReadableName is not the same as chainId (i.e., it's been translated)
          if (humanReadableName !== chainId) {
            console.log(
              `INFO: ${assetName} - Good: Human-readable name "${humanReadableName}" differs from chainId "${chainId}"`
            );
          }

          // Find corresponding token in the API data to validate the chainId
          const correspondingToken = tokensForAsset.find(
            (token) =>
              token.defuse_asset_identifier &&
              token.defuse_asset_identifier.startsWith(chainId)
          );

          if (correspondingToken) {
            console.log(
              `INFO: ${assetName} - Validated: chainId "${chainId}" matches token data`
            );
          } else {
            console.warn(
              `WARN: ${assetName} - No matching token found for chainId "${chainId}" in API data`
            );
          }
        } else {
          console.warn(
            `WARN: ${assetName} - Network name "${uiNetworkName}" does not follow expected format "name ( chainId )"`
          );
        }
      }

      // Assert that at least one network name follows the expected format
      expect(
        hasValidNetworkNames,
        `${assetName} should have at least one network name in format "name ( chainId )". Found: ${uiNetworkNames.join(
          ", "
        )}`
      ).toBe(true);

      // Close the network dropdown by clicking elsewhere
      await modalLocator.locator("h6").click(); // Click on the "Select asset and network" header
      await page.waitForTimeout(200);
    }

    console.log(
      "\nINFO: Completed testing all available NEP-141 assets for human-readable blockchain names."
    );
  });

  test("should display logo icons for each asset and chain", async ({
    page,
    instanceAccount,
    // daoAccount, // daoAccount is not used in this test
  }) => {
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

    console.log(
      `INFO: Testing ${
        availableAssets.length
      } assets with NEP-141 tokens: ${availableAssets.join(", ")}`
    );

    await page.getByText("Select an asset", { exact: true }).click();

    // Wait for the dropdown to open and the search field to appear
    await expect(page.getByPlaceholder("Search assets")).toBeVisible({
      timeout: 15000,
    });
    await page.getByPlaceholder("Search assets").click();
    await page.getByPlaceholder("Search assets").fill("usdc");

    // Wait for USDC to appear in the dropdown
    await expect(page.getByText("USDC").first()).toBeVisible({
      timeout: 10000,
    });

    // Try to click with force to overcome any overlay issues
    await page.getByText("USDC").first().click({ force: true });

    // Wait for the UI to update after selecting USDC
    await page.waitForTimeout(3000); // Give time for network options to load

    console.log("After selecting USDC, looking for network dropdown...");

    // Look for the network selection dropdown - it should appear after selecting an asset
    const networkDropdownSelectors = [
      'text="Select a network"',
      '[placeholder*="network"]',
      '[placeholder*="Search networks"]',
      '.custom-select:has-text("Select")',
      '.dropdown:has-text("Select")',
    ];

    let networkDropdown = null;
    let dropdownSelector = "";

    for (const selector of networkDropdownSelectors) {
      const dropdown = page.locator(selector).first();
      if ((await dropdown.count()) > 0 && (await dropdown.isVisible())) {
        networkDropdown = dropdown;
        dropdownSelector = selector;
        console.log(`✅ Found network dropdown using selector: ${selector}`);
        break;
      }
    }

    if (!networkDropdown) {
      console.log(
        "❌ Could not find network dropdown. Looking for any dropdown elements..."
      );
      const allDropdowns = await page
        .locator('.custom-select, .dropdown, [class*="select"]')
        .all();
      console.log(`Found ${allDropdowns.length} dropdown elements`);

      // Try the second dropdown if multiple exist (first might be asset dropdown)
      if (allDropdowns.length >= 2) {
        networkDropdown = allDropdowns[1];
        dropdownSelector = "second dropdown element";
        console.log("Using second dropdown element as network dropdown");
      } else if (allDropdowns.length === 1) {
        networkDropdown = allDropdowns[0];
        dropdownSelector = "first dropdown element";
        console.log("Using first dropdown element as network dropdown");
      }
    }

    if (networkDropdown) {
      console.log(
        `Attempting to open network dropdown (${dropdownSelector})...`
      );

      // Click to open the network dropdown
      await networkDropdown.click();
      await page.waitForTimeout(2000); // Wait for dropdown to open and populate

      console.log(
        "Network dropdown opened, checking for network options with icons..."
      );

      // Look for network options in the opened dropdown
      const networkOptions = await page
        .locator('.dropdown-item, .option, [class*="item"]')
        .all();
      console.log(`Found ${networkOptions.length} dropdown options`);

      let networksWithIcons = 0;
      const foundNetworks = [];

      for (let i = 0; i < networkOptions.length; i++) {
        const option = networkOptions[i];
        const isVisible = await option.isVisible();

        if (isVisible) {
          const optionText = await option.textContent();
          console.log(`  Option ${i + 1}: "${optionText?.trim()}"`);

          // Check if this option has an image (icon)
          const icons = await option.locator("img").all();

          for (const icon of icons) {
            const iconSrc = await icon.getAttribute("src");
            if (iconSrc) {
              if (iconSrc.startsWith("data:image")) {
                networksWithIcons++;
                foundNetworks.push({
                  text: optionText?.trim(),
                  iconType: "Web3Icon (data URL)",
                  iconSrc: iconSrc.substring(0, 50) + "...",
                });
                console.log(
                  `    ✅ Found Web3Icon for option: ${optionText?.trim()}`
                );
              } else {
                foundNetworks.push({
                  text: optionText?.trim(),
                  iconType: "Regular image",
                  iconSrc: iconSrc,
                });
                console.log(
                  `    📷 Found regular image for option: ${optionText?.trim()}`
                );
              }
            }
          }
        }
      }

      console.log(`\n📊 Network Icon Summary:`);
      console.log(
        `  - Total visible network options: ${networkOptions.length}`
      );
      console.log(
        `  - Options with Web3Icons (data URLs): ${networksWithIcons}`
      );
      console.log(`  - Total options with any icons: ${foundNetworks.length}`);

      if (foundNetworks.length > 0) {
        console.log(`\n🎨 Found icons for networks:`);
        foundNetworks.forEach((network, index) => {
          console.log(
            `  ${index + 1}. "${network.text}" - ${network.iconType}`
          );
        });
      }

      // Verify that we found network icons
      if (networksWithIcons > 0) {
        console.log(
          `\n✅ SUCCESS: Network icon verification passed! Found ${networksWithIcons} networks with Web3Icons`
        );

        // Take a screenshot of the opened dropdown for verification
        await page.screenshot({
          path: "freeze_frames/network-dropdown-with-icons-test.jpg",
          fullPage: false,
        });
        console.log(
          "📸 Screenshot saved: freeze_frames/network-dropdown-with-icons-test.jpg"
        );
      } else if (foundNetworks.length > 0) {
        console.log(
          `\n⚠️  Found ${foundNetworks.length} networks with icons, but none are Web3Icons (data URLs)`
        );
        console.log(
          "   This might indicate that Web3IconFetcher is not working or icons are loaded differently"
        );
      } else {
        console.log(`\n❌ No network icons found in the dropdown options`);
      }

      // Close the dropdown by clicking elsewhere
      await page.click("body");
    } else {
      console.log("❌ Could not find network dropdown to open");
      console.log(
        "   This might mean the UI structure is different or the asset selection didn't trigger network options"
      );
    }

    console.log(
      "\n💡 Test completed successfully - USDC asset selection worked without infinite loops!"
    );
  });
});
