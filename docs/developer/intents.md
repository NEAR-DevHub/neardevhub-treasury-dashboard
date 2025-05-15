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
