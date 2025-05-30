# NEAR Intents Developer Documentation

## Overview

NEAR Intents provide a flexible mechanism for handling deposits and transfers across both NEAR-native tokens and tokens from other chains. In the NEAR treasury app the intents is used to have a single mechanism for handling payment requests for any token on any chain. By depositing tokens to NEAR intents, tokens can be transferred to any other NEAR account by executing only a NEAR transaction. No transaction on the target network/blockchain is needed, since the `intents.near` contract will just change ownership of the tokens it manages. This enables the NEAR treasury app to handle payment proposals for any token on any chain.

## How Intents Work for deposits

- The **Intents contract** ( `intents.near` ) act as an intermediary that receive tokens (either from NEAR or bridged from other chains) and process them according to a specified message (e.g., which account or DAO should receive the deposit).
- For cross-chain deposits, the process typically involves a bridge contract on the source chain (e.g., Ethereum) and a corresponding deposit on NEAR, with metadata (such as the original transaction hash) included in the deposit call.

## Reference Test Cases

The best way to understand how to use NEAR intents is to review and run the provided Playwright test cases. These tests demonstrate real-world deposit flows, including both NEAR-native and cross-chain scenarios, and serve as executable documentation for developers.

### Test Files

- **NEAR-native token deposits:**
  - [`playwright-tests/tests/intents/intents-deposit-near.spec.js`](../../playwright-tests/tests/intents/intents-deposit-near.spec.js)
    - Shows how to deposit NEAR-native tokens to the intents contract, including DAO integration and balance checks.
- **Cross-chain (Ethereum) deposits:**
  - [`playwright-tests/tests/intents/intents-deposit-other-chain.spec.js`](../../playwright-tests/tests/intents/intents-deposit-other-chain.spec.js)
    - Demonstrates how to deposit tokens bridged from Ethereum, including using real transaction hashes and verifying the resulting NEAR-side deposit.
    - Includes a test that reproduces a real deposit transaction, with links to both the Ethereum and NEAR transactions for reference.

### What the Tests Demonstrate

- How to initialize and configure intents, FT, and DAO contracts for deposit scenarios.
- How to fetch and use deposit addresses for both user accounts and DAOs.
- How to simulate and verify deposits from both NEAR and other chains, including message formatting and balance validation.
- How to reference and reproduce real-world cross-chain deposit flows for robust integration and UI development.

## Why Use These Tests?

- **Executable documentation:** The tests are not just for QA—they are a living reference for how to implement deposit flows using NEAR intents.
- **UI/Backend guidance:** If you are building a user interface or backend integration for NEAR intents, these tests show the required contract calls, message formats, and expected outcomes.
- **Cross-chain clarity:** The tests clarify how to handle cross-chain deposits, including how to track and verify transactions across both Ethereum ( and other chains ) and NEAR.

## Next Steps

- Review the test files listed above to understand the deposit process and integration points.
- Use the test code as a reference when implementing your own UI or backend logic for NEAR intents.
- For more details on the intents contract and message formats, see the [NEAR Intents documentation](https://docs.near.org/tutorials/intents/deposit) and the comments within the test files.

## How Intents-Based Payment Requests Work

The `intents.near` contract can be used to facilitate payment requests, allowing DAOs to manage and disburse assets, particularly tokens bridged from other chains. A DAO can authorize withdrawals directly to an address on the token\'s native chain using a single proposal.

The `intents-payment-request.spec.js` test case (`playwright-tests/tests/intents/intents-payment-request.spec.js`) provides a practical example of this direct withdrawal flow.

### Process Flow for Direct Cross-Chain Withdrawals

This method allows for sending funds directly from the DAO (via `intents.near`) to an external address on another blockchain (e.g., Bitcoin, Ethereum).

1.  **DAO Proposal for Direct Withdrawal:**
    *   A DAO member creates a proposal with a `FunctionCall` action targeting the `intents.near` contract.
    *   **Method:** `ft_withdraw` (This method is on `intents.near` itself and is used to initiate the withdrawal).
    *   **Arguments for `ft_withdraw`:**
        *   `token`: The NEP-141 token ID of the asset to withdraw (e.g., `\"btc.omft.near\"`).
        *   `receiver_id`: This argument might specify the token contract ID (e.g., `btc.omft.near`) from which the withdrawal is being made or serve another internal purpose for `intents.near`. The actual recipient on the native chain is determined by the `memo`.
        *   `amount`: The quantity of the token to withdraw, as a string.
        *   `memo`: This is critical. It must be formatted to specify the native chain and destination address. For example: `\"WITHDRAW_TO:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh\"`.

2.  **Proposal Voting and Execution:**
    *   DAO members vote on the proposal.
    *   If the proposal passes, it is executed. This triggers the `ft_withdraw` function call on `intents.near`.

3.  **Cross-Chain Withdrawal by `intents.near`:**
    *   The `intents.near` contract verifies that the DAO (the caller of `ft_withdraw` via the proposal) has a sufficient balance of the specified `token`.
    *   If the balance is sufficient, `intents.near` debits the DAO\'s balance and initiates the cross-chain transfer to the native address provided in the `memo`. The `intents.near` contract and its associated infrastructure handle the complexities of this cross-chain transaction.

4.  **Verification:**
    *   The DAO\'s token balance on `intents.near` (viewable with `mt_batch_balance_of`) will decrease.
    *   Final confirmation is the arrival of funds at the specified native chain address.

### Key Advantages of Direct DAO-Initiated Withdrawals

This direct withdrawal mechanism via `ft_withdraw` offers significant advantages for DAOs managing cross-chain assets:

*   **Streamlined Process:** It allows a DAO to disburse assets directly to their native chains with a single on-chain proposal.
*   **Simplified Recipient Experience:** The recipient receives funds directly at their L1 address without needing to perform any additional steps on NEAR (like signing a separate withdrawal intent).
*   **DAO Authorization:** The DAO\'s approval of the proposal directly authorizes `intents.near` to execute the cross-chain withdrawal. This is possible because `intents.near` is designed to act on these instructions, and the DAO itself does not need to sign any off-chain messages (which it cannot do).
*   **Critical Memo Field:** The accuracy of the `memo` field, containing the native destination address and the correct `\"WITHDRAW_TO:\"` prefix, is essential for the successful execution of the withdrawal.

This direct withdrawal capability allows DAOs on NEAR to fully manage payouts to external L1 addresses through their existing on-chain governance mechanisms.
