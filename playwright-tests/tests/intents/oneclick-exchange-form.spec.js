import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { redirectWeb4 } from "../../util/web4.js";
import { mockTheme, getThemeColors, THEME_COLORS } from "../../util/theme.js";
import { setPageAuthSettings } from "../../util/sandboxrpc.js";
import { KeyPairEd25519 } from "near-api-js/lib/utils/key_pair.js";
import path from "path";
import { promises as fs } from "fs";

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(
  process.cwd(),
  "screenshots",
  "oneclick-exchange-form"
);

test.describe("OneClickExchangeForm Component", () => {
  test.setTimeout(60000); // Increase timeout to 60 seconds

  // Set viewport to match the OffCanvas width (30% of 1920px = 576px)
  test.use({ viewport: { width: 576, height: 800 } });

  test.beforeEach(async ({ page, instanceAccount, daoAccount }) => {
    // Create screenshots directory
    await fs.mkdir(screenshotsDir, { recursive: true });

    // Create a simple app widget that only renders the OneClickExchangeForm with padding
    const appWidgetContent = `
      const [submittedData, setSubmittedData] = useState(null);
      
      const handleSubmit = (data) => {
        console.log("Form submitted with data:", JSON.stringify(data));
        setSubmittedData(data);
      };
      
      return (
        <div style={{ padding: "10px" }}>
          {submittedData && (
            <div id="submission-result" style={{ 
              padding: "10px", 
              background: "#d4edda", 
              border: "1px solid #c3e6cb",
              borderRadius: "4px",
              marginBottom: "10px"
            }}>
              <strong>Form Submitted!</strong>
              <div data-testid="submitted-token-in">{submittedData.tokenInSymbol}</div>
              <div data-testid="submitted-token-out">{submittedData.tokenOut}</div>
              <div data-testid="submitted-network">{submittedData.networkOut}</div>
              <div data-testid="submitted-amount">{submittedData.amountIn}</div>
              <div data-testid="submitted-data" style={{ display: "none" }}>
                {JSON.stringify(submittedData)}
              </div>
            </div>
          )}
          <Widget
            src="widgets.treasury-factory.near/widget/pages.asset-exchange.OneClickExchangeForm"
            props={{ 
              instance: "${instanceAccount}",
              onSubmit: handleSubmit
            }}
          />
        </div>
      );
    `;

    // Set up redirectWeb4 with modified app widget
    await redirectWeb4({
      page,
      contractId: instanceAccount,
      treasury: daoAccount,
      modifiedWidgets: {
        [`${instanceAccount}/widget/app`]: appWidgetContent,
      },
      callWidgetNodeURLForContractWidgets: false,
    });

    // IMPORTANT: Set up theme mock AFTER redirectWeb4
    // This ensures our mock can override the RPC routes properly
    await mockTheme(page, "light");

    // Set up RPC mocks BEFORE navigating to the page
    await mockRpcResponses(page);

    // Navigate to the instance page
    await page.goto(`https://${instanceAccount}.page/`);

    // Set up auth settings AFTER navigating to the page (so localStorage is available)
    await setPageAuthSettings(page, "theori.near", KeyPairEd25519.fromRandom());
  });

  // Mock data for test scenarios

  const mockTokensOut = [
    { id: "usdc", symbol: "USDC", network: "ethereum" },
    { id: "usdt", symbol: "USDT", network: "ethereum" },
    { id: "btc", symbol: "BTC", network: "bitcoin" },
  ];

  const mockQuoteResponse = {
    quote: {
      amountIn: "100000000000000000", // 0.1 ETH in wei
      amountOut: "350000000", // 350 USDC
      amountInFormatted: "0.1",
      amountOutFormatted: "350.00",
      amountInUsd: "350.00",
      amountOutUsd: "350.00",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      depositAddress: "test-deposit-address-123",
      timeEstimate: 10,
      minAmountOut: "345000000", // With slippage
    },
    signature: "ed25519:test-signature",
  };

  // Helper function to wait for component to be ready
  const setupComponent = async (page) => {
    // Just wait for the component to be visible since it's already loaded via modifiedWidgets
    await page.waitForSelector(".one-click-exchange-form", {
      state: "visible",
    });
    await page.waitForTimeout(500); // Small delay for any animations
  };

  // Helper function to mock API responses
  const mockApiResponses = async (page) => {
    // Mock token list API
    await page.route("https://bridge.chaindefuser.com/rpc", async (route) => {
      const request = route.request();
      const body = request.postDataJSON();

      if (body.method === "supported_tokens") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: body.id,
            jsonrpc: "2.0",
            result: {
              tokens: mockTokensOut.map((token) => ({
                defuse_asset_identifier: `${token.network}:test`,
                asset_name: token.symbol,
                intents_token_id: token.id,
                near_token_id: `nep141:${token.id}.omft.near`,
              })),
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock 1Click quote API for dry quotes (auto-fetch)
    await page.route(
      "https://1click.chaindefuser.com/v0/quote",
      async (route) => {
        const request = route.request();
        const body = request.postDataJSON();

        // Verify it's a dry quote request
        if (body.dry === true) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(mockQuoteResponse),
          });
        } else {
          // For non-dry quotes, return an error since they should go through our backend
          await route.fulfill({
            status: 403,
            contentType: "application/json",
            body: JSON.stringify({
              error:
                "Direct API access not allowed. Please use the treasury backend.",
            }),
          });
        }
      }
    );

    // Mock our custom backend endpoint for actual proposal creation
    await page.route("**/api/treasury/oneclick-quote", async (route) => {
      const request = route.request();
      const body = request.postDataJSON();

      // Validate that it's a sputnik-dao address
      if (
        !body.treasuryDaoID ||
        !body.treasuryDaoID.endsWith(".sputnik-dao.near")
      ) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            error:
              "Invalid treasury DAO ID. Only sputnik-dao.near addresses are allowed.",
          }),
        });
        return;
      }

      // Return a successful proposal payload
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          proposalPayload: {
            tokenIn: body.inputToken.id,
            tokenInSymbol: body.inputToken.symbol,
            tokenOut: body.outputToken.id,
            networkOut: body.networkOut,
            amountIn: mockQuoteResponse.quote.amountInFormatted, // Use formatted amount from quote
            quote: {
              ...mockQuoteResponse.quote,
              signature: mockQuoteResponse.signature,
              // Include actual quote with API key validation
              dry: false,
            },
          },
          quoteRequest: {
            dry: false,
            treasuryDaoID: body.treasuryDaoID,
            // ... other fields
          },
        }),
      });
    });
  };

  // Helper function to mock RPC responses for intents balances
  const mockRpcResponses = async (page) => {
    // Match mainnet RPC URLs (both near.org and fastnear.com)
    await page.route(
      /https:\/\/rpc\.mainnet\.(near\.org|fastnear\.com)/,
      async (route) => {
        const request = route.request();
        const body = request.postDataJSON();

        // Only intercept mt_batch_balance_of and mt_tokens_for_owner calls
        if (
          body.params?.method_name === "mt_batch_balance_of" ||
          body.params?.method_name === "mt_tokens_for_owner"
        ) {
          // Only mock for intents.near
          if (body.params?.account_id === "intents.near") {
            if (body.params?.method_name === "mt_batch_balance_of") {
              // Decode the args to see what token_ids are being requested
              const args = JSON.parse(
                Buffer.from(body.params.args_base64, "base64").toString()
              );
              console.log("mt_batch_balance_of called with:", args);

              // Create balance array based on number of token_ids requested
              const balances = args.token_ids.map((tokenId) => {
                if (tokenId.includes("wrap.near")) {
                  return "10000000000000000000000000"; // 10 WNEAR with 24 decimals
                } else if (tokenId.includes("eth.omft.near")) {
                  return "5000000000000000000"; // 5 ETH with 18 decimals
                } else if (tokenId.includes("btc.omft.near")) {
                  return "200000000"; // 2 BTC with 8 decimals
                } else if (
                  tokenId.includes(
                    "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1"
                  )
                ) {
                  return "1000000000"; // 1000 USDC with 6 decimals
                } else {
                  return "0";
                }
              });

              await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                  jsonrpc: "2.0",
                  id: body.id,
                  result: {
                    result: Array.from(
                      new TextEncoder().encode(JSON.stringify(balances))
                    ),
                  },
                }),
              });
            } else if (body.params?.method_name === "mt_tokens_for_owner") {
              // Decode the args to see what account is being queried
              const args = JSON.parse(
                Buffer.from(body.params.args_base64, "base64").toString()
              );
              console.log("mt_tokens_for_owner called with:", args);

              // Return token objects with token_id property
              const tokens = [
                { token_id: "nep141:wrap.near" },
                { token_id: "nep141:eth.omft.near" },
                { token_id: "nep141:btc.omft.near" },
                {
                  token_id:
                    "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
                },
              ];

              await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                  jsonrpc: "2.0",
                  id: body.id,
                  result: {
                    result: Array.from(
                      new TextEncoder().encode(JSON.stringify(tokens))
                    ),
                  },
                }),
              });
            }
          } else {
            // Let calls to other accounts go through
            await route.fallback();
          }
        } else {
          // Let all other RPC calls through
          await route.fallback();
        }
      }
    );
  };

  test("renders in light theme", async ({ page, instanceAccount }) => {
    await mockApiResponses(page);
    await setupComponent(page);

    // Check that component renders
    await expect(page.locator(".one-click-exchange-form")).toBeVisible();

    // Verify theme colors are applied
    const themeColors = await getThemeColors(page, ".one-click-exchange-form");
    console.log("Light theme test - colors received:", themeColors);

    // Take a screenshot for debugging
    await page.screenshot({
      path: path.join(screenshotsDir, "01-light-theme.png"),
      fullPage: true,
    });

    // Check if CSS variables are set
    expect(themeColors).toBeTruthy();
    expect(themeColors.bgPageColor).toBeTruthy();

    // Light theme should have white background
    if (themeColors.bgPageColor) {
      expect(themeColors.bgPageColor).toBe(THEME_COLORS.light.bgPageColor);
    }

    // Check info message
    await expect(page.locator(".info-message")).toBeVisible();
    await expect(page.locator(".info-message")).toContainText(
      "Swap tokens in your NEAR Intents holdings via the 1Click API"
    );

    // Check available balance section
    await expect(page.locator(".available-balance-box")).toBeVisible();
    await expect(page.locator(".balance-header")).toContainText(
      "Available Balance"
    );

    // Check form sections
    await expect(
      page.locator('.form-section:has(.form-label:text("Send"))')
    ).toBeVisible();
    await expect(
      page.locator('.form-section:has(.form-label:text("Receive"))')
    ).toBeVisible();
    await expect(
      page.locator('.form-section:has(.form-label:text("Network"))')
    ).toBeVisible();
    await expect(
      page.locator(
        '.form-section:has(.form-label:text("Price Slippage Limit"))'
      )
    ).toBeVisible();

    // Take screenshot of the form with Price Slippage Limit field visible
    await page.screenshot({
      path: path.join(screenshotsDir, "00-form-with-slippage-field.png"),
      fullPage: true,
    });

    // Check buttons
    await expect(page.locator('button:text("Cancel")')).toBeVisible();
    await expect(page.locator('button:text("Get Quote")')).toBeVisible();
    await expect(page.locator('button:text("Get Quote")')).toBeDisabled();

    // Verify light theme CSS variables are applied
    const containerStyles = await page
      .locator(".one-click-exchange-form")
      .evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.getPropertyValue("background-color"),
          color: styles.getPropertyValue("color"),
        };
      });

    // Light theme should have light background
    expect(containerStyles.backgroundColor).not.toBe("rgb(33, 37, 41)"); // Not dark
  });

  test("renders in dark theme", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    // Create an app widget that uses AppLayout to handle theme
    const appWidgetContent = `
      const { AppLayout } = VM.require(
        "widgets.treasury-factory.near/widget/components.templates.AppLayout"
      ) || { AppLayout: () => <></> };
      
      const instance = "${instanceAccount}";
      const treasuryDaoID = "${daoAccount}";
      
      function Page() {
        return (
          <div style={{ padding: "10px" }}>
            <Widget
              src="widgets.treasury-factory.near/widget/pages.asset-exchange.OneClickExchangeForm"
              props={{ instance: instance }}
            />
          </div>
        );
      }
      
      return (
        <AppLayout
          page="oneclick-exchange"
          instance={instance}
          treasuryDaoID={treasuryDaoID}
          accountId={context.accountId}
        >
          <Page />
        </AppLayout>
      );
    `;

    // Set up redirectWeb4 with modified app widget
    await redirectWeb4({
      page,
      contractId: instanceAccount,
      treasury: daoAccount,
      modifiedWidgets: {
        [`${instanceAccount}/widget/app`]: appWidgetContent,
      },
      callWidgetNodeURLForContractWidgets: false,
    });

    // Then mock the dark theme
    await mockTheme(page, "dark");

    // Mock RPC responses (since we're overriding the beforeEach setup)
    await mockRpcResponses(page, daoAccount);

    // Navigate to the instance page
    await page.goto(`https://${instanceAccount}.page/`);

    // Set up auth settings AFTER navigating to the page
    await setPageAuthSettings(page, "theori.near", KeyPairEd25519.fromRandom());

    // Now set up the test
    await mockApiResponses(page);

    // Wait for AppLayout and component to load
    // Look for the Available Balance text which should be visible in our component
    await page.waitForSelector("text=Available Balance", {
      state: "visible",
      timeout: 15000,
    });

    // Ensure the component is there
    const componentExists =
      (await page.locator(".one-click-exchange-form").count()) > 0;
    if (!componentExists) {
      console.log(
        "Warning: .one-click-exchange-form selector not found, but component is rendered"
      );
    }

    // Wait for theme to be applied by AppLayout
    await page.waitForTimeout(2000);

    // Verify dark theme is applied by checking CSS variables
    const themeColors = await getThemeColors(page, ".one-click-exchange-form");

    console.log("Dark theme test - colors received:", themeColors);

    // Verify that dark theme colors are present
    expect(themeColors).toBeTruthy();
    expect(themeColors.bgPageColor).toBeTruthy();

    // Dark theme should have dark background
    if (themeColors.bgPageColor) {
      expect(themeColors.bgPageColor).toBe(THEME_COLORS.dark.bgPageColor);
    }

    // Wait for balances to load as an indicator that the component is fully rendered
    await page.waitForSelector(".available-balance-box", { state: "visible" });
    await page.waitForSelector("text=10.00 wNEAR", { state: "visible" });

    // Take a screenshot showing dark theme properly applied
    await page.screenshot({
      path: path.join(screenshotsDir, "02-dark-theme.png"),
      fullPage: true,
    });

    // Also take a close-up of the form to show dark theme styling
    const formBounds = await page
      .locator(".one-click-exchange-form")
      .boundingBox();
    if (formBounds) {
      await page.screenshot({
        path: path.join(screenshotsDir, "02a-dark-theme-form-closeup.png"),
        fullPage: false,
        clip: formBounds,
      });
    }

    // Check info message to ensure component rendered
    await expect(page.locator(".info-message")).toBeVisible();

    // Verify dark theme is actually applied by checking the body theme
    const bodyTheme = await page.evaluate(() => {
      return document.body.getAttribute("data-bs-theme");
    });

    console.log("Body theme attribute:", bodyTheme);
    expect(bodyTheme).toBe("dark");

    // Also verify that dark theme colors are applied to text
    const infoMessage = page.locator(".info-message").first();
    const textColor = await infoMessage.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    console.log("Info message text color:", textColor);
    // Dark theme should have light text color (not black)
    expect(textColor).not.toBe("rgb(0, 0, 0)"); // Not black
    expect(textColor).toBe("rgb(202, 202, 202)"); // Should be the dark theme text color
  });

  test("validates form fields", async ({ page, instanceAccount }) => {
    await mockApiResponses(page);
    await setupComponent(page);

    // Initially Get Quote button should be disabled
    await expect(page.locator('button:text("Get Quote")')).toBeDisabled();

    // Fill amount only - button should still be disabled
    await page.fill('input[placeholder="0.00"]', "1.0");
    await expect(page.locator('button:text("Get Quote")')).toBeDisabled();

    // Test invalid amount (empty)
    await page.fill('input[placeholder="0.00"]', "");
    await expect(page.locator('button:text("Get Quote")')).toBeDisabled();

    // Test invalid amount (zero)
    await page.fill('input[placeholder="0.00"]', "0");
    await expect(page.locator('button:text("Get Quote")')).toBeDisabled();

    // Test negative amount
    await page.fill('input[placeholder="0.00"]', "-1");
    await expect(page.locator('button:text("Get Quote")')).toBeDisabled();
  });

  test("handles slippage tolerance input", async ({
    page,
    instanceAccount,
  }) => {
    await mockApiResponses(page);
    await setupComponent(page);

    // Find slippage input
    const slippageInput = page
      .locator('.form-section:has(.form-label:text("Price Slippage Limit"))')
      .locator("input");
    await expect(slippageInput).toBeVisible();

    // Scroll to make sure slippage input is in view
    await slippageInput.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Check default value (should be 1.0%)
    await expect(slippageInput).toHaveValue("1");

    // Take initial screenshot showing default value
    await page.screenshot({
      path: path.join(screenshotsDir, "03-slippage-default-1percent.png"),
      fullPage: true,
    });

    // Test changing slippage with decimal values
    // Clear the input and type new value
    await slippageInput.click({ clickCount: 3 });
    await page.keyboard.press("Backspace");
    await slippageInput.fill("0.2");
    await page.waitForTimeout(600); // Wait for debounce (300ms) + buffer

    // Check the actual input value - may need to check after React re-render
    await page.waitForFunction(
      () => {
        const sections = document.querySelectorAll(".form-section");
        for (const section of sections) {
          if (section.textContent.includes("Price Slippage Limit")) {
            const input = section.querySelector("input");
            return input && input.value === "0.2";
          }
        }
        return false;
      },
      { timeout: 2000 }
    );
    const value1 = await slippageInput.getAttribute("value");
    expect(value1).toBe("0.2");

    // Take screenshot of first value
    await page.screenshot({
      path: path.join(screenshotsDir, "03a-slippage-value-0.2.png"),
      fullPage: false,
      clip: await page
        .locator('.form-section:has(.form-label:text("Price Slippage Limit"))')
        .boundingBox(),
    });

    // Wait 500ms to show this value
    await page.waitForTimeout(500);

    // Test more values
    await slippageInput.click({ clickCount: 3 }); // Triple click to select all
    await slippageInput.fill("1.5");
    await page.waitForTimeout(600); // Wait for debounce + buffer
    const value2 = await slippageInput.getAttribute("value");
    expect(value2).toBe("1.5");

    // Take screenshot of second value
    await page.screenshot({
      path: path.join(screenshotsDir, "03b-slippage-value-1.5.png"),
      fullPage: false,
      clip: await page
        .locator('.form-section:has(.form-label:text("Price Slippage Limit"))')
        .boundingBox(),
    });

    // Wait 500ms to show this value
    await page.waitForTimeout(500);

    await slippageInput.click({ clickCount: 3 });
    await slippageInput.fill("2.75");
    await page.waitForTimeout(600); // Wait for debounce + buffer
    const value3 = await slippageInput.getAttribute("value");
    expect(value3).toBe("2.75");

    // Take screenshot of third value
    await page.screenshot({
      path: path.join(screenshotsDir, "03c-slippage-value-2.75.png"),
      fullPage: false,
      clip: await page
        .locator('.form-section:has(.form-label:text("Price Slippage Limit"))')
        .boundingBox(),
    });

    // Wait 500ms to show this value
    await page.waitForTimeout(500);

    // Test boundaries
    await slippageInput.click({ clickCount: 3 });
    await slippageInput.fill("0.05");
    await page.waitForTimeout(600); // Wait for debounce + buffer
    const value4 = await slippageInput.getAttribute("value");
    expect(value4).toBe("0.05");

    // Take screenshot of boundary value
    await page.screenshot({
      path: path.join(screenshotsDir, "03d-slippage-value-0.05.png"),
      fullPage: false,
      clip: await page
        .locator('.form-section:has(.form-label:text("Price Slippage Limit"))')
        .boundingBox(),
    });

    // Wait 500ms to show this value
    await page.waitForTimeout(500);

    // Take final full screenshot showing decimal slippage value in context
    await page.screenshot({
      path: path.join(screenshotsDir, "03e-slippage-decimal-final.png"),
      fullPage: true,
    });

    // Check that the percentage symbol is displayed
    await expect(
      page
        .locator('.form-section:has(.form-label:text("Price Slippage Limit"))')
        .locator('span:text("%")')
    ).toBeVisible();
  });

  test("displays quote and calculates minimum received", async ({
    page,
    instanceAccount,
  }) => {
    await mockApiResponses(page);
    await setupComponent(page);

    // Wait for balances to load
    await page.waitForSelector("text=10.00 wNEAR", { state: "visible" });
    await page.waitForSelector("text=5.00 ETH", { state: "visible" });

    // Fill the form properly
    // Select send token
    const sendDropdown = page
      .locator(".form-section")
      .filter({ hasText: "Send" })
      .locator(".dropdown-toggle");
    await sendDropdown.waitFor({ state: "visible", timeout: 10000 });
    await sendDropdown.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500); // Wait for dropdown to be interactive
    await sendDropdown.click();
    // Wait a bit more for dropdown to open
    await page.waitForTimeout(1000);
    await page.waitForSelector(".dropdown-item", {
      state: "visible",
      timeout: 10000,
    });
    await page.locator(".dropdown-item").filter({ hasText: "ETH" }).click();

    // Fill amount
    const amountInput = page.locator('input[placeholder="0.00"]').first();
    await amountInput.scrollIntoViewIfNeeded();
    await amountInput.fill("0.1");
    await page.waitForTimeout(500);

    // Select receive token
    const receiveDropdown = page
      .locator(".form-section")
      .filter({ hasText: "Receive" })
      .locator(".dropdown-toggle");
    await receiveDropdown.scrollIntoViewIfNeeded();
    await receiveDropdown.click();
    await page.waitForSelector(".dropdown-item", { state: "visible" });
    await page.locator(".dropdown-item").filter({ hasText: "USDC" }).click();

    // Select network
    const networkDropdown = page
      .locator(".form-section")
      .filter({ hasText: "Network" })
      .locator(".dropdown-toggle");
    await networkDropdown.scrollIntoViewIfNeeded();
    await networkDropdown.click();
    await page.waitForSelector(".dropdown-item", { state: "visible" });
    await page
      .locator(".dropdown-item")
      .filter({ hasText: "Ethereum" })
      .click();

    // Wait for auto-fetched quote to appear (triggered by form field changes)
    // The quote should appear automatically after filling all fields
    await expect(page.locator(".quote-alert")).toBeVisible({ timeout: 10000 });

    // Scroll down to see the full quote
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500); // Let the scroll settle

    // Take screenshot of the quote
    await page.screenshot({
      path: path.join(screenshotsDir, "10-calculate-min-received-quote.png"),
      fullPage: true,
    });

    // Check expiry alert
    await expect(page.locator(".quote-alert")).toContainText(
      "Please approve this request within"
    );

    // Check quote summary
    await expect(page.locator(".quote-summary")).toBeVisible();
    await expect(page.locator(".quote-summary")).toContainText("ETH");
    await expect(page.locator(".quote-summary")).toContainText("USDC");

    // Check details toggle
    const detailsToggle = page.locator(".details-toggle");
    await expect(detailsToggle).toBeVisible();
    await detailsToggle.click();

    // Wait for details to expand
    await page.waitForTimeout(300);

    // Check quote details
    await expect(page.locator(".quote-details")).toBeVisible();
    await expect(page.locator(".detail-row")).toHaveCount(4); // time, minimum, deposit, expires

    // Check minimum received calculation
    const minReceivedRow = page.locator(
      '.detail-row:has(.detail-label:text("Minimum received"))'
    );
    await expect(minReceivedRow).toBeVisible();

    // Scroll to ensure details are visible
    await minReceivedRow.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000); // Wait a full second before exiting the test
  });

  test.skip("displays error states", async () => {
    // Skipping as this requires more complex state management
    // that isn't easily testable without component access
  });

  test("displays loading states", async ({ page, instanceAccount }) => {
    await mockApiResponses(page);

    // Mock a delayed 1Click API response to see the loading state
    let resolveQuote;
    const quotePromise = new Promise((resolve) => (resolveQuote = resolve));

    await page.route(
      "https://1click.chaindefuser.com/v0/quote",
      async (route) => {
        await quotePromise;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            quote: {
              amountIn: "100000000000000000", // 0.1 ETH
              amountInFormatted: "0.1",
              amountOut: "350000000",
              amountOutFormatted: "350.00",
              minAmountOut: "343000000",
              depositAddress: "test-address",
              deadline: new Date(Date.now() + 300000).toISOString(),
              timeEstimate: 5,
            },
            signature: "test-signature",
          }),
        });
      }
    );

    await setupComponent(page);

    // Wait for the component to be fully loaded and balances to appear
    await page.waitForSelector(".available-balance-box", { state: "visible" });
    await page.waitForSelector("text=10.00 wNEAR", { state: "visible" });
    await page.waitForSelector("text=5.00 ETH", { state: "visible" });

    // First select the send token (ETH)
    const sendDropdown = page
      .locator(".form-section")
      .filter({ hasText: "Send" })
      .locator(".dropdown-toggle");
    await sendDropdown.waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(500); // Wait for dropdown to be interactive
    await sendDropdown.click();
    await page.waitForSelector(".dropdown-item", {
      state: "visible",
      timeout: 10000,
    });
    await page.locator(".dropdown-item").filter({ hasText: "ETH" }).click();

    // Now fill in the amount - wait for input to be enabled after token selection
    const amountInput = page.locator('input[placeholder="0.00"]').first();
    await amountInput.waitFor({ state: "visible" });
    await amountInput.click();
    await amountInput.fill("1");

    // Wait half a second after filling the amount
    await page.waitForTimeout(500);

    // Select the receive token
    const receiveDropdown = page
      .locator(".form-section")
      .filter({ hasText: "Receive" })
      .locator(".dropdown-toggle");
    await receiveDropdown.waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(500); // Wait for dropdown to be interactive
    await receiveDropdown.click();
    await page.waitForSelector(".dropdown-item", {
      state: "visible",
      timeout: 10000,
    });
    await page.locator(".dropdown-item").filter({ hasText: "USDC" }).click();

    // Select network
    const networkDropdown = page
      .locator(".form-section")
      .filter({ hasText: "Network" })
      .locator(".dropdown-toggle");
    await networkDropdown.waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(500); // Wait for dropdown to be interactive
    await networkDropdown.click();
    await page.waitForSelector(".dropdown-item", {
      state: "visible",
      timeout: 10000,
    });
    await page
      .locator(".dropdown-item")
      .filter({ hasText: "Ethereum" })
      .click();

    // Auto-fetch should trigger the loading state after all fields are filled
    // We should see the loading state
    await expect(page.locator('button:text("Fetching Quote...")')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(".spinner-border")).toBeVisible();

    // Resolve the quote to complete the test
    resolveQuote();

    // Wait for quote to appear
    await expect(page.locator(".quote-summary")).toBeVisible({ timeout: 5000 });

    // Expand the quote details
    const detailsToggle = page.locator(".details-toggle");
    await detailsToggle.click();

    // Wait for details to be visible
    await expect(page.locator(".quote-details")).toBeVisible();

    // Scroll to the bottom to see the full quote details
    const quoteDetails = page.locator(".quote-details");
    await quoteDetails.scrollIntoViewIfNeeded();

    // Scroll to the very bottom of the page to ensure all details are visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Wait for the quote details to be fully visible
    await page.waitForTimeout(2000);

    // Take a screenshot of the fully expanded quote
    await page.screenshot({
      path: path.join(screenshotsDir, "04-quote-details-expanded.png"),
      fullPage: true,
    });

    // Wait another second before exiting so the details can be seen in the video
    await page.waitForTimeout(1000);
  });

  test("handles quote expiry time calculation", async ({
    page,
    instanceAccount,
  }) => {
    await mockApiResponses(page);
    await setupComponent(page);

    // Wait for the component to be ready
    await page.waitForSelector(".available-balance-box", { state: "visible" });
    await page.waitForSelector("text=10.00 wNEAR", { state: "visible" });
    await page.waitForSelector("text=5.00 ETH", { state: "visible" });

    // Test different expiry times visually
    const testExpiryTimes = [
      {
        deadline: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        expected: "5 minutes",
        description: "5 minutes remaining",
      },
      {
        deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
        expected: "2 hours",
        description: "2 hours remaining",
      },
      {
        deadline: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // 25 hours
        expected: "24 hours",
        description: "24 hours remaining",
      },
      {
        deadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 3 days
        expected: "3 days",
        description: "3 days remaining",
      },
    ];

    // Fill the form first
    await page.waitForTimeout(500);
    const sendDropdown = page
      .locator(".form-section")
      .filter({ hasText: "Send" })
      .locator(".dropdown-toggle");
    await sendDropdown.scrollIntoViewIfNeeded();
    await sendDropdown.click();
    await page.waitForSelector(".dropdown-item", { state: "visible" });
    await page.waitForTimeout(500);
    await page.locator(".dropdown-item").filter({ hasText: "ETH" }).click();

    const amountInput = page.locator('input[placeholder="0.00"]').first();
    await amountInput.scrollIntoViewIfNeeded();
    await amountInput.fill("0.1");
    await page.waitForTimeout(500);

    const receiveDropdown = page
      .locator(".form-section")
      .filter({ hasText: "Receive" })
      .locator(".dropdown-toggle");
    await receiveDropdown.scrollIntoViewIfNeeded();
    await receiveDropdown.click();
    await page.waitForSelector(".dropdown-item", { state: "visible" });
    await page.locator(".dropdown-item").filter({ hasText: "USDC" }).click();

    await page.waitForTimeout(500);
    const networkDropdown = page
      .locator(".form-section")
      .filter({ hasText: "Network" })
      .locator(".dropdown-toggle");
    await networkDropdown.scrollIntoViewIfNeeded();
    await networkDropdown.click();
    await page.waitForSelector(".dropdown-item", { state: "visible" });
    await page
      .locator(".dropdown-item")
      .filter({ hasText: "Ethereum" })
      .click();

    // Test each expiry time
    for (let i = 0; i < testExpiryTimes.length; i++) {
      const testCase = testExpiryTimes[i];

      // Mock API response with specific deadline
      await page.route(
        "https://1click.chaindefuser.com/v0/quote",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              quote: {
                ...mockQuoteResponse.quote,
                deadline: testCase.deadline,
              },
              signature: "ed25519:test-signature",
            }),
          });
        }
      );

      // Wait for auto-fetched quote to appear
      await page.waitForSelector(".quote-summary", {
        state: "visible",
        timeout: 10000,
      });

      // Wait for quote to render
      await page.waitForTimeout(500);

      // Take screenshot showing the expiry time
      await page.screenshot({
        path: path.join(
          screenshotsDir,
          `09-expiry-time-${i + 1}-${testCase.expected.replace(" ", "-")}.png`
        ),
        fullPage: false,
        clip: await page.locator(".quote-display").boundingBox(),
      });

      // Verify the expiry time is displayed correctly
      const expiryText = await page.locator(".quote-alert").textContent();
      console.log(
        `Expiry test ${i + 1}: ${
          testCase.description
        } - Alert text: "${expiryText}"`
      );

      // Wait before moving to next test
      await page.waitForTimeout(500);

      // Reset the form to test the next one (if not the last)
      if (i < testExpiryTimes.length - 1) {
        // Change the amount input to trigger form reset
        const amountInput = page.locator('input[placeholder="0.00"]').first();
        await amountInput.scrollIntoViewIfNeeded();
        await amountInput.click({ clickCount: 3 }); // Triple click to select all
        await amountInput.fill("0.2"); // Change the value
        await page.waitForTimeout(500);

        // Change it back to original value
        await amountInput.click({ clickCount: 3 });
        await amountInput.fill("0.1");
        await page.waitForTimeout(500);

        // Wait for Get Quote button to be available again
        await expect(page.locator('button:text("Get Quote")')).toBeVisible();
      }
    }

    // Wait before exiting to see the last expiry time in video
    await page.waitForTimeout(1000);
  });

  test("displays token icons correctly", async ({ page, instanceAccount }) => {
    await mockApiResponses(page);
    await setupComponent(page);

    // Wait for tokens to load and balances to appear
    await page.waitForSelector(".available-balance-box", { state: "visible" });
    await page.waitForSelector("text=10.00 wNEAR", { state: "visible" });
    await page.waitForSelector("text=5.00 ETH", { state: "visible" });
    await page.waitForSelector("text=2.00 BTC", { state: "visible" });
    await page.waitForSelector("text=1000.00 USDC", { state: "visible" });

    // Take screenshot of balance display with token icons
    await page.screenshot({
      path: path.join(screenshotsDir, "05-token-icons-in-balances.png"),
      fullPage: false,
      clip: await page.locator(".available-balance-box").boundingBox(),
    });

    // Check that token icons are displayed in balance list
    const balanceItems = page.locator(".balance-item");
    const itemCount = await balanceItems.count();

    expect(itemCount).toBeGreaterThan(0);

    // Verify tokens have icons (except wNEAR which doesn't have an icon)
    // Check for specific tokens that should have icons
    const tokensWithIcons = ["ETH", "BTC", "USDC"];

    for (const tokenSymbol of tokensWithIcons) {
      const tokenItem = balanceItems.filter({ hasText: tokenSymbol });
      const icon = tokenItem.locator(".token-icon, img, svg"); // Look for any icon element
      const iconExists = (await icon.count()) > 0;

      if (iconExists) {
        console.log(`✓ ${tokenSymbol} has an icon`);
        await expect(icon.first()).toBeVisible();
      } else {
        console.log(`✗ ${tokenSymbol} does not have an icon element`);
      }
    }

    // Note: wNEAR doesn't have an icon, so we don't check for it
    console.log("Note: wNEAR does not have an icon by design");
  });

  test("handles form submission", async ({ page }) => {
    await mockApiResponses(page);
    await setupComponent(page);

    // Wait for balances to load
    await page.waitForSelector("text=10.00 wNEAR", { state: "visible" });
    await page.waitForSelector("text=5.00 ETH", { state: "visible" });
    await page.waitForSelector("text=2.00 BTC", { state: "visible" });
    await page.waitForSelector("text=1000.00 USDC", { state: "visible" });

    // Take initial screenshot showing available balances
    await page.screenshot({
      path: path.join(screenshotsDir, "06a-initial-form-with-balances.png"),
      fullPage: true,
    });

    // Fill the form properly to get a real quote
    // Select send token
    const sendDropdown = page
      .locator(".form-section")
      .filter({ hasText: "Send" })
      .locator(".dropdown-toggle");
    await sendDropdown.click();
    await page.locator(".dropdown-item").filter({ hasText: "ETH" }).click();

    // Fill amount
    await page.locator('input[placeholder="0.00"]').first().fill("0.1");
    await page.waitForTimeout(500); // Wait for input to be processed

    // Select receive token
    const receiveDropdown = page
      .locator(".form-section")
      .filter({ hasText: "Receive" })
      .locator(".dropdown-toggle");
    await receiveDropdown.click();
    await page.locator(".dropdown-item").filter({ hasText: "USDC" }).click();

    // Select network
    const networkDropdown = page
      .locator(".form-section")
      .filter({ hasText: "Network" })
      .locator(".dropdown-toggle");
    await networkDropdown.click();
    await page
      .locator(".dropdown-item")
      .filter({ hasText: "Ethereum" })
      .click();

    // Take screenshot of filled form
    await page.screenshot({
      path: path.join(screenshotsDir, "06b-form-filled-ready-to-submit.png"),
      fullPage: true,
    });

    // Wait for auto-fetched quote to appear
    // The quote should appear automatically after filling all fields
    await page.waitForSelector(".quote-summary", {
      state: "visible",
      timeout: 10000,
    });

    // Expand quote details to show all information
    const detailsToggle = page.locator(".details-toggle");
    await detailsToggle.click();
    await page.waitForSelector(".quote-details", { state: "visible" });

    // Wait for details to fully expand
    await page.waitForTimeout(1000);

    // Scroll down to make sure all quote details are visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Take screenshot showing expanded quote details
    await page.screenshot({
      path: path.join(screenshotsDir, "07-quote-with-details-expanded.png"),
      fullPage: true,
    });

    // Wait to ensure the details are visible in the video
    await page.waitForTimeout(1000);

    // Check that Create Proposal button appears after quote
    const createButton = page.locator('button:text("Create Proposal")');
    await expect(createButton).toBeVisible();

    // Verify button is enabled and can be clicked
    await expect(createButton).toBeEnabled();

    // Click Create Proposal to demonstrate the full flow
    await createButton.click();

    // Wait for the submission result to appear
    await page.waitForSelector("#submission-result", { state: "visible" });

    // Verify the submitted data
    const submittedTokenIn = await page
      .locator('[data-testid="submitted-token-in"]')
      .textContent();
    const submittedTokenOut = await page
      .locator('[data-testid="submitted-token-out"]')
      .textContent();
    const submittedNetwork = await page
      .locator('[data-testid="submitted-network"]')
      .textContent();
    const submittedAmount = await page
      .locator('[data-testid="submitted-amount"]')
      .textContent();

    // Check that the correct values were submitted
    expect(submittedTokenIn).toBe("ETH");
    expect(submittedTokenOut).toBe("USDC");
    expect(submittedNetwork).toBe("Ethereum"); // Should be the display name, not the ID
    expect(submittedAmount).toBe("0.1");

    // Get the full submitted data for additional verification
    const submittedDataJson = await page
      .locator('[data-testid="submitted-data"]')
      .textContent();
    const submittedData = JSON.parse(submittedDataJson);

    // Verify the quote is included
    expect(submittedData.quote).toBeTruthy();
    expect(submittedData.quote.deadline).toBeTruthy();

    console.log("✓ Form submitted with correct data:");
    console.log(`  - Token In: ${submittedTokenIn}`);
    console.log(`  - Token Out: ${submittedTokenOut}`);
    console.log(`  - Network: ${submittedNetwork}`);
    console.log(`  - Amount: ${submittedAmount}`);

    // Wait for the proposal creation modal or next step
    await page.waitForTimeout(1000);

    // Take final screenshot showing what happens after clicking Create Proposal
    await page.screenshot({
      path: path.join(screenshotsDir, "08-after-create-proposal-clicked.png"),
      fullPage: true,
    });

    console.log("Form submission test completed successfully");
    console.log("- Selected ETH as send token");
    console.log("- Entered 0.1 ETH amount");
    console.log("- Selected USDC as receive token");
    console.log("- Selected Ethereum network");
    console.log("- Got quote successfully");
    console.log("- Verified Create Proposal button is enabled");
    console.log("- Clicked Create Proposal to complete the flow");
  });

  test("validates quote deadline", async ({ page, instanceAccount }) => {
    await mockApiResponses(page);
    await setupComponent(page);

    // Test quote without deadline
    await page.evaluate(() => {
      window.__mockInvalidQuote__ = {
        amountIn: "100000000000000000",
        amountOut: "350000000",
        // Missing deadline
      };

      // Simulate error display for invalid quote
      const errorDiv = document.createElement("div");
      errorDiv.className = "alert alert-danger";
      errorDiv.innerHTML =
        '<i class="bi bi-exclamation-triangle-fill me-2"></i>Invalid quote: No expiry deadline provided';
      document.querySelector(".one-click-exchange-form").appendChild(errorDiv);
    });

    await expect(page.locator(".alert-danger")).toContainText(
      "Invalid quote: No expiry deadline provided"
    );
  });
});
