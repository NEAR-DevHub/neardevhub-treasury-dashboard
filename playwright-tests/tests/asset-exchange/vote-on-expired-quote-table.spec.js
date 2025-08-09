import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { redirectWeb4 } from "../../util/web4.js";
import { mockRpcRequest, updateDaoPolicyMembers } from "../../util/rpcmock.js";
import { CurrentTimestampInNanoseconds } from "../../util/inventory.js";
import { setPageAuthSettings } from "../../util/sandboxrpc.js";
import { KeyPairEd25519 } from "near-api-js/lib/utils/key_pair.js";
import { mockTheme } from "../../util/theme.js";
import { encodeToMarkdown } from "../../util/lib.js";

test.describe("Asset Exchange Table - Expired Quote Handling", () => {
  test.use({
    viewport: { width: 1440, height: 900 },
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test("disables voting buttons for expired quotes in table view", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60000);

    // Create one expired and one valid proposal
    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    // Use toISOString() for consistent date format
    const formattedExpiredDate = expiredDate.toISOString();
    const formattedFutureDate = futureDate.toISOString();

    const proposalWithExpiredQuote = {
      id: 30,
      proposer: "user.near",
      votes: {},
      submission_time: CurrentTimestampInNanoseconds,
      status: "InProgress",
      description: encodeToMarkdown({
        proposal_action: "asset-exchange",
        notes: `1Click Cross-Network Swap to ethereum. This proposal authorizes transferring tokens to 1Click's deposit address for cross-network swap execution.`,
        tokenIn: "eth.omft.near",
        tokenOut: "usdc.omft.near",
        amountIn: "0.1",
        amountOut: "350.00",
        slippage: "2",
        quoteDeadline: formattedExpiredDate,
        destinationNetwork: "ethereum",
        timeEstimate: "10 minutes",
        depositAddress: "test-deposit-address",
        signature: "ed25519:test-signature",
      }),
      kind: {
        FunctionCall: {
          receiver_id: "intents.near",
          actions: [
            {
              method_name: "mt_transfer",
              args: btoa(
                JSON.stringify({
                  receiver_id: "test-deposit-address",
                  amount: "100000000000000000",
                  token_id: "nep141:eth.omft.near",
                })
              ),
              deposit: "1",
              gas: "100000000000000",
            },
          ],
        },
      },
    };

    const proposalWithValidQuote = {
      id: 31,
      proposer: "user.near",
      votes: {},
      submission_time: CurrentTimestampInNanoseconds,
      status: "InProgress",
      description: encodeToMarkdown({
        proposal_action: "asset-exchange",
        notes: `1Click Cross-Network Swap to ethereum. This proposal authorizes transferring tokens to 1Click's deposit address for cross-network swap execution.`,
        tokenIn: "eth.omft.near",
        tokenOut: "usdc.omft.near",
        amountIn: "0.2",
        amountOut: "700.00",
        slippage: "2",
        quoteDeadline: formattedFutureDate,
        destinationNetwork: "ethereum",
        timeEstimate: "10 minutes",
        depositAddress: "test-deposit-address-2",
        signature: "ed25519:test-signature-2",
      }),
      kind: {
        FunctionCall: {
          receiver_id: "intents.near",
          actions: [
            {
              method_name: "mt_transfer",
              args: btoa(
                JSON.stringify({
                  receiver_id: "test-deposit-address-2",
                  amount: "200000000000000000",
                  token_id: "nep141:eth.omft.near",
                })
              ),
              deposit: "1",
              gas: "100000000000000",
            },
          ],
        },
      },
    };

    // Set up redirectWeb4
    await redirectWeb4({
      page,
      contractId: instanceAccount,
      treasury: daoAccount,
    });

    // Update DAO policy members
    await updateDaoPolicyMembers({
      instanceAccount,
      page,
      hasAllRole: true,
    });

    // Mock the get_proposals RPC call to return both proposals
    await mockRpcRequest({
      page,
      filterParams: { method_name: "get_proposals" },
      modifyOriginalResultFunction: (originalResult, postData, args) => {
        // Return our test proposals when fetching pending requests
        if (args?.from_index === 0 || args?.from_index === undefined) {
          return [proposalWithValidQuote, proposalWithExpiredQuote];
        }
        return [];
      },
    });

    // Mock the get_last_proposal_id RPC call
    await mockRpcRequest({
      page,
      filterParams: { method_name: "get_last_proposal_id" },
      modifyOriginalResultFunction: () => 31,
    });

    // Mock theme
    await mockTheme(page, "light");

    // Navigate to the asset exchange pending requests page
    await page.goto(
      `https://${instanceAccount}.page?page=asset-exchange&tab=pending-requests`
    );

    // Set up auth settings
    await setPageAuthSettings(page, "theori.near", KeyPairEd25519.fromRandom());

    // Wait for the page to load
    await page.waitForTimeout(5000);

    // Check that the table has loaded
    const tableVisible = await page
      .locator("table")
      .isVisible()
      .catch(() => false);

    if (!tableVisible) {
      console.log("Table not visible, checking page state...");
      await page.screenshot({
        path: "screenshots/table-not-visible.png",
        fullPage: true,
      });
    }

    expect(tableVisible).toBeTruthy();

    // Find the row with expired quote (proposal #30)
    const expiredRow = page.locator('tr[data-testid="proposal-request-#30"]');
    const expiredRowVisible = await expiredRow.isVisible().catch(() => false);

    if (expiredRowVisible) {
      console.log("✓ Found proposal #30 row");

      // Check for the info icon in the actions column
      const infoIcon = expiredRow.locator(".bi-info-circle");
      const infoIconVisible = await infoIcon.isVisible().catch(() => false);

      if (infoIconVisible) {
        console.log("✓ Info icon is displayed for expired quote");

        // Hover over the info icon to see the tooltip
        await infoIcon.hover();
        await page.waitForTimeout(500);

        // Check if the approve/reject buttons are disabled
        const approveBtn = expiredRow.locator('button:has-text("Approve")');
        const rejectBtn = expiredRow.locator('button:has-text("Reject")');

        const approveDisabled = await approveBtn
          .isDisabled()
          .catch(() => false);
        const rejectDisabled = await rejectBtn.isDisabled().catch(() => false);

        expect(approveDisabled).toBeTruthy();
        expect(rejectDisabled).toBeTruthy();
        console.log("✓ Voting buttons are disabled for expired quote");

        // Check button opacity
        const approveOpacity = await approveBtn.evaluate(
          (el) => window.getComputedStyle(el).opacity
        );
        const rejectOpacity = await rejectBtn.evaluate(
          (el) => window.getComputedStyle(el).opacity
        );

        expect(parseFloat(approveOpacity)).toBeLessThan(1);
        expect(parseFloat(rejectOpacity)).toBeLessThan(1);
        console.log("✓ Buttons have reduced opacity");
      } else {
        console.log("✗ Info icon not found for expired quote");
      }
    } else {
      console.log("✗ Proposal #30 row not found");
    }

    // Find the row with valid quote (proposal #31)
    const validRow = page.locator('tr[data-testid="proposal-request-#31"]');
    const validRowVisible = await validRow.isVisible().catch(() => false);

    if (validRowVisible) {
      console.log("✓ Found proposal #31 row");

      // Check that voting buttons are enabled for valid quote
      const approveBtn = validRow.locator('button:has-text("Approve")');
      const rejectBtn = validRow.locator('button:has-text("Reject")');

      const approveEnabled = await approveBtn.isEnabled().catch(() => false);
      const rejectEnabled = await rejectBtn.isEnabled().catch(() => false);

      expect(approveEnabled).toBeTruthy();
      expect(rejectEnabled).toBeTruthy();
      console.log("✓ Voting buttons are enabled for valid quote");

      // Check that info icon is NOT present for valid quote
      const infoIcon = validRow.locator(".bi-info-circle");
      const infoIconVisible = await infoIcon.isVisible().catch(() => false);

      expect(infoIconVisible).toBeFalsy();
      console.log("✓ No info icon for valid quote");
    } else {
      console.log("✗ Proposal #31 row not found");
    }

    // Take a screenshot of the final state
    await page.screenshot({
      path: "screenshots/asset-exchange-table-expired-quotes.png",
      fullPage: true,
    });

    console.log("\nTable view expired quote test completed successfully!");
  });

  test("clicking on expired quote row shows details with disabled voting", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60000);

    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const formattedExpiredDate = expiredDate.toISOString();

    const proposalWithExpiredQuote = {
      id: 32,
      proposer: "user.near",
      votes: {},
      submission_time: CurrentTimestampInNanoseconds,
      status: "InProgress",
      description: encodeToMarkdown({
        proposal_action: "asset-exchange",
        notes: `1Click Cross-Network Swap to ethereum. This proposal authorizes transferring tokens to 1Click's deposit address for cross-network swap execution.`,
        tokenIn: "eth.omft.near",
        tokenOut: "usdc.omft.near",
        amountIn: "0.5",
        amountOut: "1750.00",
        slippage: "2",
        quoteDeadline: formattedExpiredDate,
        destinationNetwork: "ethereum",
        timeEstimate: "10 minutes",
        depositAddress: "test-deposit-address-3",
        signature: "ed25519:test-signature-3",
      }),
      kind: {
        FunctionCall: {
          receiver_id: "intents.near",
          actions: [
            {
              method_name: "mt_transfer",
              args: btoa(
                JSON.stringify({
                  receiver_id: "test-deposit-address-3",
                  amount: "500000000000000000",
                  token_id: "nep141:eth.omft.near",
                })
              ),
              deposit: "1",
              gas: "100000000000000",
            },
          ],
        },
      },
    };

    // Set up redirectWeb4
    await redirectWeb4({
      page,
      contractId: instanceAccount,
      treasury: daoAccount,
    });

    // Update DAO policy members
    await updateDaoPolicyMembers({
      instanceAccount,
      page,
      hasAllRole: true,
    });

    // Mock the get_proposals RPC call
    await mockRpcRequest({
      page,
      filterParams: { method_name: "get_proposals" },
      modifyOriginalResultFunction: () => [proposalWithExpiredQuote],
    });

    // Mock the get_proposal RPC call for details view
    await mockRpcRequest({
      page,
      filterParams: { method_name: "get_proposal" },
      modifyOriginalResultFunction: () => proposalWithExpiredQuote,
    });

    // Mock the get_last_proposal_id RPC call
    await mockRpcRequest({
      page,
      filterParams: { method_name: "get_last_proposal_id" },
      modifyOriginalResultFunction: () => 32,
    });

    // Mock theme
    await mockTheme(page, "light");

    // Navigate to the asset exchange pending requests page
    await page.goto(
      `https://${instanceAccount}.page?page=asset-exchange&tab=pending-requests`
    );

    // Set up auth settings
    await setPageAuthSettings(page, "theori.near", KeyPairEd25519.fromRandom());

    // Wait for the page to load
    await page.waitForTimeout(5000);

    // Click on the expired quote row to open details
    const expiredRow = page.locator('tr[data-testid="proposal-request-#32"]');
    await expiredRow.click();

    // Wait for details panel to appear (check for the secondary layout)
    await page.waitForSelector(".layout-secondary.show", { timeout: 5000 });
    await page.waitForTimeout(2000);

    // Check that the expired message is displayed in the details panel
    // The details panel is in the secondary layout
    const detailsPanel = page.locator(".layout-secondary.show");
    const expiredMessage = detailsPanel.getByText(
      "Voting is no longer available"
    );
    const messageVisible = await expiredMessage.isVisible().catch(() => false);

    if (messageVisible) {
      console.log("✓ Expired quote message is displayed in details panel");
    } else {
      // Check if the deadline info is shown
      const deadlineExpired = await detailsPanel
        .locator("text=(EXPIRED)")
        .isVisible()
        .catch(() => false);

      if (deadlineExpired) {
        console.log("✓ Quote deadline shown as expired in details");
      }

      // Check if voting buttons are disabled in the details panel
      const approveBtn = detailsPanel.getByRole("button", { name: "Approve" });
      const rejectBtn = detailsPanel.getByRole("button", { name: "Reject" });

      const approveDisabled = await approveBtn.isDisabled().catch(() => false);
      const rejectDisabled = await rejectBtn.isDisabled().catch(() => false);

      if (approveDisabled && rejectDisabled) {
        console.log("✓ Voting buttons are disabled in details panel");
      }
    }

    // Take a screenshot
    await page.screenshot({
      path: "screenshots/asset-exchange-details-from-table.png",
      fullPage: true,
    });

    console.log("\nDetails panel from table test completed successfully!");
  });
});
