# NEAR Intents Documentation

Welcome to the comprehensive documentation for NEAR Intents functionality in the Treasury Dashboard.

## 📚 Documentation Files

### User Documentation
- **[User Guide](NEAR_Intents_User_Guide.md)** - Complete step-by-step guide for end users
- **[Screenshot Gallery](NEAR_Intents_Screenshot_Gallery.md)** - Visual guide with real interface screenshots
- **[Quick Reference](NEAR_Intents_Quick_Reference.md)** - Quick answers and checklists

### Technical Documentation  
- **[Technical Documentation](NEAR_Intents_Technical_Documentation.md)** - Developer and system administrator guide
- **[Documentation Summary](NEAR_Intents_Documentation_Summary.md)** - Overview of all documentation

## 🖼️ Screenshots

The `screenshots/` folder contains high-quality interface screenshots automatically generated from Playwright tests:

- **Dashboard views** - Treasury dashboard with and without NEAR Intents
- **Deposit flows** - Complete deposit process from button click to QR code
- **Asset examples** - Over 40 different assets across 8+ blockchain networks
- **Payment requests** - Interface for creating cross-chain payment requests

## 🚀 Quick Start

1. **For End Users**: Start with the [User Guide](NEAR_Intents_User_Guide.md)
2. **For Visual Learners**: Browse the [Screenshot Gallery](NEAR_Intents_Screenshot_Gallery.md)  
3. **For Developers**: Review the [Technical Documentation](NEAR_Intents_Technical_Documentation.md)
4. **For Quick Answers**: Check the [Quick Reference](NEAR_Intents_Quick_Reference.md)

## 🔄 Updating Screenshots

Screenshots are automatically generated from Playwright tests. To update them:

```bash
# Run the screenshot-generating tests
npx playwright test playwright-tests/tests/intents/intents-dashboard.spec.js
npx playwright test playwright-tests/tests/intents/intents-deposit-ui.spec.js  
npx playwright test playwright-tests/tests/intents/intents-payment-request-ui.spec.js
```

The screenshots will be updated in the `docs/nearintents/screenshots/` directory and are ready for use in documentation.

## 📋 Features Covered

- ✅ Cross-chain deposits (BTC, ETH, SOL, USDC, and 40+ other assets)
- ✅ QR code generation for mobile wallets
- ✅ Payment request creation and management
- ✅ Multi-network support (Ethereum, Bitcoin, Solana, Base, Arbitrum, etc.)
- ✅ USD value display and conversion
- ✅ Address validation and error handling
- ✅ Dashboard integration and balance tracking

---

*Last updated: June 2025 | Generated from automated test runs*
