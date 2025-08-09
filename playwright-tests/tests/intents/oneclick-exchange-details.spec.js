import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { redirectWeb4 } from "../../util/web4.js";
import { mockRpcRequest, updateDaoPolicyMembers } from "../../util/rpcmock.js";
import { CurrentTimestampInNanoseconds } from "../../util/inventory.js";
import { setPageAuthSettings } from "../../util/sandboxrpc.js";
import { KeyPairEd25519 } from "near-api-js/lib/utils/key_pair.js";
import { mockTheme } from "../../util/theme.js";
import path from "path";
import { promises as fs } from "fs";

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(
  process.cwd(),
  "screenshots",
  "oneclick-exchange-details"
);

test.describe("OneClick Exchange Proposal Details", () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test.beforeEach(async ({ page }) => {
    // Create screenshots directory
    await fs.mkdir(screenshotsDir, { recursive: true });
  });

  test("disables voting when 1Click API quote is expired", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60000);

    // Create expired date (1 day ago)
    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Create proposal with expired quote deadline in the notes
    const proposalWithExpiredQuote = {
      id: 28,
      proposer: "user.near",
      votes: { "frol.near": "VoteApprove" },
      submission_time: CurrentTimestampInNanoseconds,
      status: "InProgress",
      description: JSON.stringify({
        proposal_action: "asset-exchange",
        notes: `1Click Cross-Network Swap

Swap Details:
- Amount In: 0.1 ETH
- Amount Out: 350.00 USDC
- Destination Network: ethereum
- Time Estimate: 10 minutes
- Quote Deadline: ${expiredDate.toLocaleString()}

Deposit Address: test-deposit-address

1Click Service Signature: ed25519:test-signature

This proposal authorizes transferring tokens to 1Click's deposit address.
1Click will execute the cross-network swap and deliver the swapped tokens back to the treasury's NEAR Intents account.`,
        tokenIn: "eth.omft.near",
        tokenOut: "usdc.omft.near",
        amountIn: "0.1",
        amountOut: "350.00",
        slippage: "2",
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

    // Set up redirectWeb4 to load widgets from local filesystem
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

    // Mock the get_proposal RPC call
    await mockRpcRequest({
      page,
      filterParams: { method_name: "get_proposal" },
      modifyOriginalResultFunction: () => proposalWithExpiredQuote,
    });

    // Mock theme AFTER redirectWeb4
    await mockTheme(page, "dark");

    // Navigate directly to the proposal details page
    await page.goto(
      `https://${instanceAccount}.page?page=asset-exchange&id=28`
    );

    // Set up auth settings AFTER navigating to the page (so localStorage is available)
    await setPageAuthSettings(page, "theori.near", KeyPairEd25519.fromRandom());

    // Wait for the page to load
    await page.waitForTimeout(5000);

    // Check for proposal ID
    const proposalIdVisible = await page
      .locator("text=#28")
      .isVisible()
      .catch(() => false);
    console.log(`Proposal #28 visible: ${proposalIdVisible}`);

    // Check that the expired quote message is displayed
    const expiredMessage = page.locator(
      "text=/Voting is no longer available.*1Click API quote.*expired/"
    );
    const messageVisible = await expiredMessage.isVisible().catch(() => false);

    if (messageVisible) {
      console.log("✓ Expired quote message is displayed");

      // Check for the Learn more link
      const learnMore = await page
        .locator("text=Learn more")
        .isVisible()
        .catch(() => false);
      if (learnMore) {
        console.log("✓ Learn more link is visible");
      }

      // Verify that vote buttons are disabled
      const approveButton = page.getByRole("button", { name: "Approve" });
      const rejectButton = page.getByRole("button", { name: "Reject" });

      const approveDisabled = await approveButton
        .isDisabled()
        .catch(() => false);
      const rejectDisabled = await rejectButton.isDisabled().catch(() => false);

      if (approveDisabled && rejectDisabled) {
        console.log("✓ Vote buttons are disabled");
      } else {
        console.log("✗ Vote buttons are not disabled as expected");
      }

      // Check opacity if buttons exist
      if ((await approveButton.count()) > 0) {
        const approveOpacity = await approveButton.evaluate(
          (el) => window.getComputedStyle(el).opacity
        );
        const rejectOpacity = await rejectButton.evaluate(
          (el) => window.getComputedStyle(el).opacity
        );

        if (parseFloat(approveOpacity) < 1 && parseFloat(rejectOpacity) < 1) {
          console.log("✓ Buttons have reduced opacity");
        }
      }

      // Check that the quote deadline info is shown in the proposal content
      const deadlineLabel = await page
        .locator("text=1Click Quote Deadline")
        .isVisible()
        .catch(() => false);
      const expiredText = await page
        .locator("text=(EXPIRED)")
        .isVisible()
        .catch(() => false);

      if (deadlineLabel && expiredText) {
        console.log("✓ Quote deadline is shown as expired in proposal content");
      }

      // All checks passed
      expect(messageVisible).toBeTruthy();
      expect(approveDisabled).toBeTruthy();
      expect(rejectDisabled).toBeTruthy();
    } else {
      // If the new implementation isn't working, log what we see
      console.log(
        "Expected expired quote message not found. Checking page state..."
      );

      // Check if buttons are present at all
      const approveExists = await page
        .locator('button:text("Approve")')
        .count();
      const rejectExists = await page.locator('button:text("Reject")').count();
      console.log(`Approve button count: ${approveExists}`);
      console.log(`Reject button count: ${rejectExists}`);

      // Check if the proposal content is visible
      const proposalVisible = await page
        .locator("text=0.1 ETH")
        .isVisible()
        .catch(() => false);
      console.log(`Proposal content visible: ${proposalVisible}`);

      // Take a debug screenshot
      await page.screenshot({
        path: path.join(screenshotsDir, "expired-quote-debug.png"),
        fullPage: true,
      });

      throw new Error(
        "Expired quote functionality not working as expected. Check debug screenshot."
      );
    }

    // Take a screenshot showing the final state
    await page.screenshot({
      path: path.join(screenshotsDir, "expired-quote-voting-disabled.png"),
      fullPage: true,
    });

    console.log("\nExpired quote test completed successfully!");
  });

  test("allows voting when 1Click API quote is NOT expired", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60000);

    // Create future date (7 days from now)
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Create proposal with valid quote deadline in the notes
    const proposalWithValidQuote = {
      id: 29,
      proposer: "user.near",
      votes: {},
      submission_time: CurrentTimestampInNanoseconds,
      status: "InProgress",
      description: JSON.stringify({
        proposal_action: "asset-exchange",
        notes: `1Click Cross-Network Swap

Swap Details:
- Amount In: 0.1 ETH
- Amount Out: 350.00 USDC
- Destination Network: ethereum
- Time Estimate: 10 minutes
- Quote Deadline: ${futureDate.toLocaleString()}

Deposit Address: test-deposit-address

1Click Service Signature: ed25519:test-signature

This proposal authorizes transferring tokens to 1Click's deposit address.
1Click will execute the cross-network swap and deliver the swapped tokens back to the treasury's NEAR Intents account.`,
        tokenIn: "eth.omft.near",
        tokenOut: "usdc.omft.near",
        amountIn: "0.1",
        amountOut: "350.00",
        slippage: "2",
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

    // Set up redirectWeb4 to load widgets from local filesystem
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

    // Mock the get_proposal RPC call
    await mockRpcRequest({
      page,
      filterParams: { method_name: "get_proposal" },
      modifyOriginalResultFunction: () => proposalWithValidQuote,
    });

    // Mock theme AFTER redirectWeb4
    await mockTheme(page, "light");

    // Navigate directly to the proposal details page
    await page.goto(
      `https://${instanceAccount}.page?page=asset-exchange&id=29`
    );

    // Set up auth settings AFTER navigating to the page (so localStorage is available)
    await setPageAuthSettings(page, "theori.near", KeyPairEd25519.fromRandom());

    // Wait for the page to load
    await page.waitForTimeout(5000);

    // Check that the expired quote message is NOT displayed
    const expiredMessage = page.locator(
      "text=/Voting is no longer available.*1Click API quote.*expired/"
    );
    const messageVisible = await expiredMessage.isVisible().catch(() => false);

    expect(messageVisible).toBeFalsy();
    console.log("✓ No expired quote message (as expected for valid quote)");

    // Verify that vote buttons are ENABLED
    const approveButton = page.getByRole("button", { name: "Approve" });
    const rejectButton = page.getByRole("button", { name: "Reject" });

    const approveEnabled = await approveButton.isEnabled().catch(() => false);
    const rejectEnabled = await rejectButton.isEnabled().catch(() => false);

    expect(approveEnabled).toBeTruthy();
    expect(rejectEnabled).toBeTruthy();
    console.log("✓ Vote buttons are enabled");

    // Check that the quote deadline info is shown but NOT expired
    const deadlineLabel = await page
      .locator("text=1Click Quote Deadline")
      .isVisible()
      .catch(() => false);
    const expiredText = await page
      .locator("text=(EXPIRED)")
      .isVisible()
      .catch(() => false);

    expect(deadlineLabel).toBeTruthy();
    expect(expiredText).toBeFalsy();
    console.log("✓ Quote deadline is shown as valid");

    // Take a screenshot showing the valid state
    await page.screenshot({
      path: path.join(screenshotsDir, "valid-quote-voting-enabled.png"),
      fullPage: true,
    });

    console.log("\nValid quote test completed successfully!");
  });
});
