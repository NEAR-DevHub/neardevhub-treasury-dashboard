import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { Worker } from "near-workspaces";
import { redirectWeb4 } from "../../util/web4.js";
import { Jimp } from "jimp";
import jsQR from "jsqr";

test.describe("Intents Deposit UI", () => {
  test.use({
    contextOptions: {
      permissions: ["clipboard-read", "clipboard-write"],
    },
  });
  let worker;
  let root;
  let intents;

  test.beforeAll(async ({ daoAccount, instanceAccount }) => {
    worker = await Worker.init();
    root = worker.rootAccount;

    // Import intents contract
    intents = await root.importContract({
      mainnetContract: "intents.near", // Replace with your actual intents contract if different
    });

    // Import treasury contract (dashboard instance)
    await root.importContract({
      mainnetContract: instanceAccount,
    });

    // Initialize intents contract (if necessary, adapt to your contract's init method)
    try {
      await intents.call(intents.accountId, "new", {
        config: {
          wnear_id: "wrap.near", // Adjust if your config is different
          fees: { fee: 100, fee_collector: intents.accountId },
          roles: {
            super_admins: [intents.accountId],
            admins: {},
            grantees: {},
          },
        },
      });
    } catch (e) {
      if (!e.message.includes("Contract already initialized")) {
        throw e;
      }
    }
    // Note: Treasury contract initialization is not included here as it might be complex
    // and depends on the specific setup. Add if needed for your tests.
  });

  test.afterAll(async () => {
    await worker.tearDown();
  });

  test("should display the deposit button in the Total Balance card", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    await redirectWeb4({
      page,
      contractId: instanceAccount,
      treasury: daoAccount,
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
    await expect(depositButton).toBeVisible();
    await expect(depositButton).toHaveClass(/btn-success/); // Check for green color
  });

  test("clicking deposit button opens deposit modal with correct initial content", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    await redirectWeb4({ page, contractId: instanceAccount });
    await page.goto(`https://${instanceAccount}.page`);

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

    await expect(
      modalLocator.locator("h5.modal-title:has-text('Deposit Funds')")
    ).toBeVisible();

    // Check for the introductory text with treasuryDaoID
    await expect(
      modalLocator.getByText(`Deposit options for: ${daoAccount}`)
    ).toBeVisible();

    // Check Sputnik Tab button is visible and active by default
    const sputnikTabButton = modalLocator.getByRole("button", {
      name: "Sputnik DAO",
    });
    await expect(sputnikTabButton).toBeVisible();
    await expect(sputnikTabButton).toHaveClass(/active/);

    // Check Sputnik tab content is visible
    await expect(
      modalLocator.locator(
        "p:has-text('Deposit NEAR to this Sputnik DAO address:')"
      )
    ).toBeVisible();
    const sputnikAddressContainer = modalLocator
      .locator('p:has-text("Deposit NEAR to this Sputnik DAO address:")')
      .locator("xpath=./following-sibling::div[1]");
    await expect(
      sputnikAddressContainer.locator(`strong:has-text("${daoAccount}")`)
    ).toBeVisible();

    // Check Near Intents Tab button is visible but not active
    const intentsTabButton = modalLocator.getByRole("button", {
      name: "Near Intents (Multi-Asset)",
    });
    await expect(intentsTabButton).toBeVisible();
    await expect(intentsTabButton).not.toHaveClass(/active/);

    // Check Near Intents tab content (descriptive paragraph) is NOT visible initially
    await expect(
      modalLocator.locator(
        "p:has-text('Deposit NEAR or other supported tokens to this Near Intents enabled address:')"
      )
    ).not.toBeVisible();

    const closeButtonFooter = modalLocator
      .getByRole("button", {
        name: "Close",
      })
      .nth(1);
    await expect(closeButtonFooter).toBeVisible();

    await closeButtonFooter.click();
    await expect(modalLocator).not.toBeVisible();
  });

  test("should handle tab switching and display correct content in deposit modal", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    await redirectWeb4({
      page,
      contractId: instanceAccount,
      treasury: daoAccount,
    });
    await page.goto(`https://${instanceAccount}.page`);

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
      name: "Sputnik DAO (NEAR Only)",
    });
    const intentsTabButton = modalLocator.getByRole("button", {
      name: "Near Intents (Multi-Asset)",
    });
    const sputnikWarningLocator = modalLocator.locator("div.alert-warning");
    const intentsWarningLocator = modalLocator.locator("div.alert-info");

    // Initial state: Sputnik tab should be active
    await expect(sputnikTabButton).toHaveClass(/active/);
    await expect(intentsTabButton).not.toHaveClass(/active/);
    await expect(sputnikWarningLocator).toBeVisible();
    await expect(sputnikWarningLocator).toContainText(
      "Only deposit NEAR to this address for Sputnik DAO operations."
    );
    await expect(intentsWarningLocator).not.toBeVisible();

    // Verify Sputnik tab copy button
    const sputnikCopyButtonContainer = modalLocator
      .locator('p:has-text("Deposit NEAR to this Sputnik DAO address:")')
      .locator("xpath=./following-sibling::div[1]");
    const sputnikCopyButton = sputnikCopyButtonContainer.locator(
      '.btn[data-component="widgets.treasury-factory.near/widget/components.Copy"]'
    );
    await expect(sputnikCopyButton).toBeVisible();
    await expect(sputnikCopyButton).toContainText("Copy");
    await sputnikCopyButton.click();

    await expect(sputnikCopyButton).toContainText("Copied");

    let clipboardText = await page.evaluate("navigator.clipboard.readText()");
    expect(clipboardText).toEqual(daoAccount);

    // Switch to Near Intents tab
    await intentsTabButton.click();
    await expect(intentsTabButton).toHaveClass(/active/);
    await expect(sputnikTabButton).not.toHaveClass(/active/);
    await expect(sputnikWarningLocator).not.toBeVisible();
    await expect(intentsWarningLocator).toBeVisible();
    await expect(intentsWarningLocator).toContainText(
      "Select an asset and network to see deposit instructions and address."
    );
  });

  test("should display QR code in NEAR tab", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    await redirectWeb4({
      page,
      contractId: instanceAccount,
      treasury: daoAccount,
    });

    await page.goto(`https://${instanceAccount}.page`);

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
      name: "Sputnik DAO (NEAR Only)",
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
  });

  test("verify deposit addresses and QR codes for all assets and networks", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(120_000);
    await redirectWeb4({
      page,
      contractId: instanceAccount,
      treasury: daoAccount,
    });
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

    // Switch to the "Near Intents (Multi-Asset)" tab
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
});
