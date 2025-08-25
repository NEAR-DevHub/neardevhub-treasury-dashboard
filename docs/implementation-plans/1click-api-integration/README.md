# 1Click API Integration Documentation

This folder contains the complete implementation plan and supporting materials for integrating the 1Click API into the NEAR DevHub Treasury Dashboard.

## Contents

### 📋 Implementation Plan
- **[1click-implementation-plan.md](./1click-implementation-plan.md)** - Comprehensive UI implementation plan with real-world mainnet execution reference

### 🛠️ Scripts & Tools
- **[manual-1click-swap.js](./manual-1click-swap.js)** - Script for executing real 1Click swaps on mainnet
- **[dao-proposal.json](./dao-proposal.json)** - Example DAO proposal from successful mainnet execution

## Real-World Reference

This implementation is based on a successful mainnet execution:

- **DAO**: webassemblymusic-treasury.sputnik-dao.near
- **Proposal ID**: 15
- **Transaction**: [H8U1Xz56LQAXWhk58Q6EJjApiwZzXioX9qxbAmHTMGCY](https://explorer.near.org/transactions/H8U1Xz56LQAXWhk58Q6EJjApiwZzXioX9qxbAmHTMGCY)
- **Amount**: 1.0 USDC (NEAR) → 0.999998 USDC (Ethereum)
- **Tracking**: [NEAR Intents Explorer](https://explorer.near-intents.org/?depositAddress=3ccf686b516ede32e2936c25798378623c99a5fce5bf56f5433005c8c12ba49c)

## Key Learnings

1. **Contract Method**: Use `mt_transfer` on `intents.near` (not `ft_transfer`)
2. **Token ID**: Must include full `nep141:` prefix
3. **Recipient Type**: Use `"INTENTS"` for DAO receiving on NEAR Intents
4. **Gas/Deposit**: 100 Tgas and 1 yoctoNEAR confirmed working

## GitHub Issues

- **Epic**: [#621 - NEAR Intents Integration](https://github.com/NEAR-DevHub/neardevhub-treasury-dashboard/issues/621)
- **PoC**: [#623 - 1Click API Integration](https://github.com/NEAR-DevHub/neardevhub-treasury-dashboard/issues/623) ✅ Completed
- **UI**: [#627 - 1Click API UI for Asset Exchange](https://github.com/NEAR-DevHub/neardevhub-treasury-dashboard/issues/627) 🚧 In Progress

## Usage

1. Review the implementation plan for UI development approach
2. Use the manual swap script to test 1Click API integration
3. Reference the DAO proposal JSON for proper proposal formatting
4. Follow the Playwright-driven development approach outlined in the plan