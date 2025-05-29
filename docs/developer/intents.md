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

The `intents.near` contract can also be used to facilitate payment requests, allowing DAOs to manage and disburse assets that are under the control of the intents contract. This is particularly useful for tokens that have been bridged from other chains, as the DAO can authorize transfers of these assets using familiar NEAR proposal mechanisms.

The `intents-payment-request.spec.js` test case (`playwright-tests/tests/intents/intents-payment-request.spec.js`) provides a practical example of this flow.

### Process Flow for Payment Requests

1.  **DAO Proposal:** A DAO member creates a proposal to transfer a certain amount of a specific token (e.g., `btc.omft.near`, which represents bridged Bitcoin) to a designated recipient.
    *   The core of this proposal is a `FunctionCall` action targeting the `intents.near` contract.
    *   The method called on `intents.near` is `mt_transfer`.
    *   The arguments for `mt_transfer` include:
        *   `token_id`: The identifier of the token to be transferred (e.g., `"nep141:btc.omft.near"`).
        *   `amount`: The quantity of the token to send, as a string.
        *   `receiver_id`: The NEAR account ID of the recipient.
        *   `message` (optional): A memo for the transaction.

2.  **Proposal Voting and Execution:**
    *   DAO members vote on the proposal.
    *   If the proposal passes, it is executed. This triggers the `mt_transfer` function call on `intents.near`.

3.  **Token Transfer by `intents.near`:**
    *   The `intents.near` contract verifies that the DAO (the caller of `mt_transfer` via the proposal) has a sufficient balance of the specified `token_id`.
    *   If the balance is sufficient, `intents.near` updates its internal ledger to debit the DAO\\'s balance and credit the `receiver_id`\\'s balance for that token.

4.  **Verification:** The recipient\\'s balance of the token, as recorded in the `intents.near` contract\\'s internal multi-token ledger, will increase. This can be verified by calling the `mt_batch_balance_of` view method on the `intents.near` contract with the recipient\\'s account ID and the token ID.

### Why the Recipient Must Be a NEAR Account

When `intents.near` processes a `mt_transfer` call, it is transferring ownership of tokens *that it manages on the NEAR blockchain*.

*   **Internal Ledger:** The `intents.near` contract maintains an internal record of token balances for various NEAR accounts. These tokens might be native to NEAR or representations of assets bridged from other chains (like BTC or ETH).
*   **No Native Chain Movement (Initially):** The `mt_transfer` operation within `intents.near` does *not* immediately trigger a transaction on the token\'s original native chain (e.g., the Bitcoin network for BTC). Instead, it\'s an internal accounting change within the NEAR ecosystem, specifically within the `intents.near` contract\'s state.
*   **NEAR Account as Identifier:** Consequently, the `receiver_id` must be a valid NEAR account. This is because `intents.near` needs a NEAR-based address to credit with the tokens in its ledger.

#### Limitations on Direct Cross-Chain Withdrawal via DAO Proposals

A common question is why a DAO proposal cannot directly instruct `intents.near` to send tokens to an address on their native chain (e.g., a Bitcoin wallet address). The primary reasons are:

1.  **Signature Requirement for Withdrawal:** Initiating a withdrawal from `intents.near` to a native chain (e.g., Bitcoin, Ethereum) requires the NEAR account holding the tokens to sign a specific withdrawal intent message. This signed message serves as authorization for the `intents.near` system to release the assets and bridge them back.
2.  **Signed Message Publication:** This signed withdrawal intent message must then be published to the intents REST API, which coordinates the cross-chain transfer.
3.  **DAOs Cannot Sign Messages:** SputnikDAO accounts, which are smart contracts themselves, do not possess private keys. Therefore, a DAO account cannot directly sign any message, including the required withdrawal intent.

Because of this limitation, the process for a DAO to disburse assets held in `intents.near` to an external recipient on another chain involves two steps:

1.  **DAO Proposal to a NEAR Account:** The DAO proposal executes an `mt_transfer` to the recipient\'s *NEAR account*. This transfers ownership of the tokens within the `intents.near` ledger.
2.  **Recipient-Initiated Withdrawal:** After the proposal is executed, the recipient (who controls the private keys for their NEAR account) must then use a user interface or application that integrates with `intents.near` (e.g., a dedicated dashboard or wallet feature, such as [https://app.near-intents.org/](https://app.near-intents.org/)). Through this application, the recipient can sign the necessary withdrawal intent message with their NEAR account keys and submit it to initiate the transfer of assets from `intents.near` to their address on the native chain.

*   **Subsequent Withdrawal:** Once a NEAR account has received tokens via `intents.near`, the owner of that account can then choose to initiate a withdrawal process. This withdrawal would involve interacting with `intents.near` (or an associated bridge contract) to move the tokens from NEAR back to their native chain (e.g., sending BTC from the intents system to an external Bitcoin wallet address). This withdrawal is a separate step from the DAO-approved payment request.

This system allows DAOs on NEAR to manage and transfer a diverse range of assets efficiently using on-chain NEAR transactions, abstracting away the complexities of direct cross-chain interactions for the payment approval step.
