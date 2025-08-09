import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { redirectWeb4 } from "../../util/web4.js";
import { mockRpcRequest, updateDaoPolicyMembers } from "../../util/rpcmock.js";
import { CurrentTimestampInNanoseconds } from "../../util/inventory.js";
import { setPageAuthSettings } from "../../util/sandboxrpc.js";
import { KeyPairEd25519 } from "near-api-js/lib/utils/key_pair.js";
import { mockTheme } from "../../util/theme.js";
import { encodeToMarkdown } from "../../util/lib.js";

test.describe("Asset Exchange - Expired Quote Voting Prevention", () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test("prevents voting on proposals with expired 1Click API quotes", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60000);

    // Create expired date (2 days ago)
    const expiredDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const formattedExpiredDate = expiredDate.toISOString();

    // Create proposal with expired quote deadline using encodeToMarkdown
    const proposalWithExpiredQuote = {
      id: 7,
      proposer: "user.near",
      votes: {},
      submission_time: CurrentTimestampInNanoseconds,
      status: "InProgress",
      description: encodeToMarkdown({
        proposal_action: "asset-exchange",
        notes: `1Click Cross-Network Swap: 1.5 ETH → 5,250.00 USDC (ethereum). This proposal authorizes transferring tokens to 1Click's deposit address for cross-network swap execution.`,
        tokenIn: "eth.omft.near",
        tokenOut: "usdc.omft.near",
        amountIn: "1.5",
        amountOut: "5250.00",
        slippage: "2",
        quoteDeadline: formattedExpiredDate,
        destinationNetwork: "ethereum",
        timeEstimate: "10 minutes",
        depositAddress: "test-deposit-address.near",
        signature: "ed25519:test-signature-100",
      }),
      kind: {
        FunctionCall: {
          receiver_id: "intents.near",
          actions: [
            {
              method_name: "mt_transfer",
              args: btoa(
                JSON.stringify({
                  receiver_id: "test-deposit-address.near",
                  amount: "1500000000000000000",
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

    // Mock the get_proposal RPC call
    await mockRpcRequest({
      page,
      filterParams: { method_name: "get_proposal" },
      modifyOriginalResultFunction: () => proposalWithExpiredQuote,
    });

    // Mock theme
    await mockTheme(page, "dark");

    // Navigate to the proposal details page
    await page.goto(
      `https://${instanceAccount}.page?page=asset-exchange&id=7`
    );

    // Set up auth settings
    await setPageAuthSettings(page, "theori.near", KeyPairEd25519.fromRandom());

    // Wait for the page to load
    await page.waitForTimeout(5000);

    // Verify the expired quote message is displayed
    const expiredMessage = page.getByText("Voting is no longer available");
    await expect(expiredMessage).toBeVisible();

    // Verify vote buttons are disabled
    const approveButton = page.getByRole("button", { name: "Approve" });
    const rejectButton = page.getByRole("button", { name: "Reject" });

    await expect(approveButton).toBeDisabled();
    await expect(rejectButton).toBeDisabled();

    // Verify the quote deadline shows as expired in the proposal content
    await expect(page.locator("text=Quote Deadline")).toBeVisible();
    await expect(page.locator("text=(EXPIRED)")).toBeVisible();

    console.log("✓ Expired quote voting prevention test passed");
  });

  test("allows voting on proposals with valid 1Click API quotes", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60000);

    // Create future date (5 days from now)
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const formattedFutureDate = futureDate.toISOString();

    // Create proposal with valid quote deadline using encodeToMarkdown
    const proposalWithValidQuote = {
      id: 8,
      proposer: "user.near",
      votes: {},
      submission_time: CurrentTimestampInNanoseconds,
      status: "InProgress",
      description: encodeToMarkdown({
        proposal_action: "asset-exchange",
        notes: `1Click Cross-Network Swap: 2.0 ETH → 7,000.00 MATIC (polygon). This proposal authorizes transferring tokens to 1Click's deposit address for cross-network swap execution.`,
        tokenIn: "eth.omft.near",
        tokenOut: "matic.omft.near",
        amountIn: "2.0",
        amountOut: "7000.00",
        slippage: "3",
        quoteDeadline: formattedFutureDate,
        destinationNetwork: "polygon",
        timeEstimate: "15 minutes",
        depositAddress: "valid-deposit-address.near",
        signature: "ed25519:test-signature-101",
      }),
      kind: {
        FunctionCall: {
          receiver_id: "intents.near",
          actions: [
            {
              method_name: "mt_transfer",
              args: btoa(
                JSON.stringify({
                  receiver_id: "valid-deposit-address.near",
                  amount: "2000000000000000000",
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

    // Mock the get_proposal RPC call
    await mockRpcRequest({
      page,
      filterParams: { method_name: "get_proposal" },
      modifyOriginalResultFunction: () => proposalWithValidQuote,
    });

    // Mock theme
    await mockTheme(page, "light");

    // Navigate to the proposal details page
    await page.goto(
      `https://${instanceAccount}.page?page=asset-exchange&id=8`
    );

    // Set up auth settings
    await setPageAuthSettings(page, "theori.near", KeyPairEd25519.fromRandom());

    // Wait for the page to load
    await page.waitForTimeout(5000);

    // Verify the expired quote message is NOT displayed
    const expiredMessage = page.getByText("Voting is no longer available");
    await expect(expiredMessage).not.toBeVisible();

    // Verify vote buttons are ENABLED
    const approveButton = page.getByRole("button", { name: "Approve" });
    const rejectButton = page.getByRole("button", { name: "Reject" });

    await expect(approveButton).toBeEnabled();
    await expect(rejectButton).toBeEnabled();

    // Verify the quote deadline is shown but NOT expired
    await expect(page.locator("text=Quote Deadline")).toBeVisible();
    await expect(page.locator("text=(EXPIRED)")).not.toBeVisible();

    console.log("✓ Valid quote voting enabled test passed");
  });
});
