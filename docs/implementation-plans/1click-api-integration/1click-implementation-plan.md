# 1Click API Integration - UI Implementation Plan

## GitHub Issues Context

This implementation addresses:
- **Epic**: [NEAR Intents Integration](https://github.com/NEAR-DevHub/neardevhub-treasury-dashboard/issues/621) (#621)
- **PoC/Workflow Illustration**: [1Click API Integration](https://github.com/NEAR-DevHub/neardevhub-treasury-dashboard/issues/623) (#623) - IN PROGRESS
- **UI Implementation**: [1Click API UI for Asset Exchange](https://github.com/NEAR-DevHub/neardevhub-treasury-dashboard/issues/627) (#627) - THIS PLAN

## Current Status

### 🔧 PoC/Workflow Illustration In Progress (Issue #623)

**Original Requirements from Issue #623:**
- ✅ NEAR workspaces setup with Sputnik DAO, Intents and token contracts
- ✅ Test case implemented with USDC on NEAR to USDC on ETH swap
- ✅ Real 1Click API integration (using production API for maximum realism)
- 🚧 Manual mainnet swaps replicated in test (still needed)

**Current Implementation in `intents-usdc-swap-withdrawal.spec.js`:**
- Real 1Click API quote requests with production endpoints
- DAO proposal creation with specific deposit addresses from quotes
- Cryptographic signature verification for dispute resolution
- Complete tracking via NEAR Intents Explorer integration
- Production-ready workflow with proper quote deadline management

**Alignment Assessment:**
Our PoC strongly aligns with issue #623 requirements. We have the automated test with real 1Click API integration and proper contract setup. The main gap is replicating actual mainnet swaps in the test.

### ✅ Completed Work for Issue #623
Successfully executed real 1Click swap on mainnet:
- ✅ Created manual swap script (`manual-1click-swap.js`) for executing real 1Click swaps
- ✅ Captured actual response payloads from successful mainnet swap
- ✅ Replicated exact payloads in test scenarios
- ✅ Verified test accurately represents real-world swap behavior
- ✅ Documented complete workflow from quote to token delivery

### 📊 Real-World Mainnet Execution Reference

**Successful 1Click Swap Execution Details:**
- **DAO**: webassemblymusic-treasury.sputnik-dao.near
- **Proposal ID**: 15
- **Transaction Hash**: [H8U1Xz56LQAXWhk58Q6EJjApiwZzXioX9qxbAmHTMGCY](https://explorer.near.org/transactions/H8U1Xz56LQAXWhk58Q6EJjApiwZzXioX9qxbAmHTMGCY)
- **Amount**: 1.0 USDC (NEAR) → 0.999998 USDC (Ethereum)
- **Deposit Address**: `3ccf686b516ede32e2936c25798378623c99a5fce5bf56f5433005c8c12ba49c`
- **Tracking**: [NEAR Intents Explorer](https://explorer.near-intents.org/?depositAddress=3ccf686b516ede32e2936c25798378623c99a5fce5bf56f5433005c8c12ba49c)

**Key Implementation Details Verified:**
1. **Contract Method**: `mt_transfer` on `intents.near` (confirmed working)
2. **Token ID Format**: Must use full `nep141:` prefix (e.g., `nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1`)
3. **Recipient Type**: Use `recipientType: "INTENTS"` for DAO receiving on NEAR Intents
4. **Gas**: 100 Tgas sufficient for mt_transfer
5. **Deposit**: 1 yoctoNEAR for function call

**1Click API Response Structure:**
```json
{
  "quote": {
    "amountIn": "1000000",
    "amountInFormatted": "1.0",
    "amountInUsd": "0.9998",
    "amountOut": "999998",
    "amountOutFormatted": "0.999998",
    "timeEstimate": 10,
    "deadline": "2025-07-27T16:03:03.540Z",
    "depositAddress": "3ccf686b516ede32e2936c25798378623c99a5fce5bf56f5433005c8c12ba49c"
  },
  "signature": "ed25519:2gwvazipVnPYqYYyBYTAb5M8dcKoJBFmJADuL5VebL2RTMZEQpvZ8iyDq6GAkvudW5aAkRKr7U7LdynhguSy84De"
}
```

**Event Emitted:**
```json
EVENT_JSON: {
  "standard": "nep245",
  "version": "1.0.0",
  "event": "mt_transfer",
  "data": [{
    "old_owner_id": "webassemblymusic-treasury.sputnik-dao.near",
    "new_owner_id": "3ccf686b516ede32e2936c25798378623c99a5fce5bf56f5433005c8c12ba49c",
    "token_ids": ["nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1"],
    "amounts": ["1000000"]
  }]
}
```

### 🎯 Current Task: UI Implementation
Create user interface for the 1Click API integration in Asset Exchange.

## Why We're Building This

### Problem
Currently, Asset Exchange only supports Ref Finance swaps (Sputnik DAO tab). Users who want to do cross-network swaps must use a separate flow in "Create Payment Requests" for withdrawals. This creates a fragmented user experience.

### Solution
Add a "Near Intents" tab to Asset Exchange that uses the 1Click API for **swap-only operations within NEAR Intents**. This provides:

- **Unified Asset Exchange interface** for both internal (Ref Finance) and cross-network (1Click) swaps
- **Simplified 1Click integration** - only swaps, no withdrawals
- **Consistent DAO governance** - both swap types go through proposals
- **Clear separation of concerns** - withdrawals remain in Payment Requests where NEAR Intents withdrawal is already supported

### Scope Clarification
- **ONLY swaps** via 1Click API (not withdrawals)
- **Cross-network swaps** from NEAR tokens to other chains
- **DAO proposals** for all 1Click operations
- **No withdrawal functionality** - users continue using "Create Payment Requests" for that

This builds on our PoC that demonstrated intent creation with swap+withdrawal, but simplifies the Asset Exchange to focus only on the swap portion.

## Observations from Current Codebase

### 1. Architecture Overview
- The Asset Exchange feature is built using BOS (Blockchain Operating System) widget architecture
- Main entry point: `pages/asset-exchange/index.jsx` - handles navigation, tabs, and state management
- `CreateRequest.jsx` - manages proposal creation workflow and transaction building
- `ExchangeForm.jsx` - contains the actual swap interface (1280 lines) with Ref Finance integration via iframe

### 2. Key Architectural Patterns
- **Widget-based architecture**: Components are loaded dynamically using `VM.require()`
- **DAO Integration**: All swaps go through Sputnik DAO proposals with voting
- **Transaction Building**: Uses `Near.call()` for blockchain interactions
- **State Management**: React hooks for local state, Storage API for cross-widget communication
- **Permission System**: Checks user permissions before allowing proposal creation

### 3. Current Workflow
1. User fills out exchange form (token selection, amounts, slippage)
2. System generates transaction details through Ref Finance
3. Creates DAO proposal with FunctionCall kind
4. Members vote on proposal
5. If approved, transaction executes automatically

### 4. Critical Issues Discovered
- **Timeline Mismatch**: 1Click quotes expire in ~24 hours while DAO proposals can take days/weeks
- **Quote Immutability**: 1Click API ignores requested deadlines and always returns ~24 hour expiry
- **Frontend-First Design**: Quote must be obtained before creating proposal (not after approval)

## Implementation Plan

### Component Design: OneClickExchangeForm

**New File**: `pages/asset-exchange/OneClickExchangeForm.jsx`

This will be a **completely separate component** from the existing `ExchangeForm.jsx` (which handles Ref Finance integration). The OneClickExchangeForm will be specifically designed for **swap-only operations** using the 1Click API.

Key features for **swaps only**:
- Token selection dropdowns (NEAR tokens to external chain tokens)
- Amount input with validation  
- Recipient address input for destination chain
- Slippage tolerance setting
- Real-time quote fetching from 1Click API
- Display quote details (rate, fees, expiry time)
- Quote expiry countdown timer
- 1Click-specific validation logic

**Important**: No withdrawal functionality - users will continue using "Create Payment Requests" for NEAR Intents withdrawals.

Implementation approach:
```javascript
// Core state management for 1Click API
const [tokenIn, setTokenIn] = useState(null);
const [tokenOut, setTokenOut] = useState(null);
const [amountIn, setAmountIn] = useState("");
const [recipient, setRecipient] = useState("");
const [quote, setQuote] = useState(null);
const [loading, setLoading] = useState(false);
const [quoteExpiry, setQuoteExpiry] = useState(null);

// Fetch quote when inputs change
useEffect(() => {
  if (tokenIn && tokenOut && amountIn && recipient) {
    fetchOneClickQuote();
  }
}, [tokenIn, tokenOut, amountIn, recipient]);

// 1Click API integration
async function fetchOneClickQuote() {
  const response = await asyncFetch('https://1click.chaindefuser.com/v0/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // 1Click specific payload
    })
  });
  // Handle 1Click response format
}
```

### Phase 2: Modify CreateRequest Component

**Updates to**: `pages/asset-exchange/CreateRequest.jsx`

Add tab switcher to choose between Sputnik DAO (existing) and Near Intents (new):
```javascript
const [selectedTab, setSelectedTab] = useState("sputnik-dao");

// Tab switcher UI
<div className="tab-switcher">
  <button 
    className={selectedTab === "sputnik-dao" ? "active" : ""}
    onClick={() => setSelectedTab("sputnik-dao")}
  >
    Sputnik DAO
  </button>
  <button 
    className={selectedTab === "near-intents" ? "active" : ""}
    onClick={() => setSelectedTab("near-intents")}
  >
    Near Intents
  </button>
</div>

// Conditional form rendering
{selectedTab === "sputnik-dao" ? (
  <Widget
    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.ExchangeForm`}
    props={{ ...props }}
  />
) : (
  <Widget
    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.OneClickExchangeForm`}
    props={{ ...props }}
  />
)}
```

### DAO Proposal Structure for 1Click Integration (VERIFIED)

**Contract Call Details (Confirmed Working):**
- **Contract**: `intents.near`
- **Method**: `mt_transfer` ✅
- **Args Structure**: 
  - `receiver_id`: Deposit address from 1Click API
  - `amount`: Amount in base units (e.g., "1000000" for 1 USDC)
  - `token_id`: Full token ID with `nep141:` prefix
- **Gas**: `100000000000000` (100 Tgas) ✅
- **Deposit**: `1` (1 yoctoNEAR) ✅

**Proposal Description Format (From Real Execution):**
```
1Click USDC Cross-Network Swap (NEAR → Ethereum)

Swap Details:
- Amount In: 1.0 USDC (NEAR)
- Amount Out: 0.999998 USDC (Ethereum)
- Rate: 1 USDC (NEAR) = 0.999998 USDC (Ethereum)
- Destination: webassemblymusic-treasury.sputnik-dao.near (NEAR Intents)
- Time Estimate: 10 minutes
- Quote Deadline: 2025-07-27T16:03:03.540Z

Deposit Address: 3ccf686b516ede32e2936c25798378623c99a5fce5bf56f5433005c8c12ba49c

🔗 TRACKING:
Monitor status: https://explorer.near-intents.org/?depositAddress=3ccf686b516ede32e2936c25798378623c99a5fce5bf56f5433005c8c12ba49c

1Click Service Signature (for dispute resolution):
ed25519:2gwvazipVnPYqYYyBYTAb5M8dcKoJBFmJADuL5VebL2RTMZEQpvZ8iyDq6GAkvudW5aAkRKr7U7LdynhguSy84De

EXECUTION:
This proposal authorizes transferring 1.0 USDC (NEAR) to 1Click's deposit address.
1Click will execute the cross-network swap and deliver 0.999998 USDC (Ethereum) back to the DAO's NEAR Intents account.

The signature above provides cryptographic guarantees and can be used for dispute resolution.
```

**Implementation Code (Verified Working):**
```javascript
// DAO Proposal Structure - PRODUCTION READY
const proposalKind = {
  FunctionCall: {
    receiver_id: "intents.near",
    actions: [{
      method_name: "mt_transfer",
      args: Buffer.from(JSON.stringify({
        receiver_id: quote.depositAddress, // From 1Click API
        amount: quote.amountIn, // Base units
        token_id: quoteRequest.originAsset, // Full nep141: format
      })).toString("base64"),
      deposit: "1",
      gas: "100000000000000",
    }],
  },
};
```

### Phase 3: Component Structure

**File Structure**:
```
pages/asset-exchange/
├── index.jsx                    # Main page (unchanged)
├── CreateRequest.jsx           # Updated with tab switcher
├── ExchangeForm.jsx            # Existing Ref Finance form (unchanged)
├── OneClickExchangeForm.jsx    # NEW - 1Click API form
├── PendingRequests.jsx         # Existing (unchanged)
└── History.jsx                 # Existing (unchanged)
```

The **OneClickExchangeForm.jsx** will be completely independent and handle:
- Different token selection (cross-chain focus)
- 1Click API quote requests
- Quote expiry warnings
- Different validation rules
- NEAR Intents specific UI/UX

### Phase 4: Quote Management System

Create a quote caching mechanism to handle the 24-hour expiry:
- Store active quotes in browser storage
- Display warning when quote is near expiry
- Auto-refresh quotes when approaching expiration
- Clear expired quotes from storage

### Phase 5: Enhanced Proposal Display

Update proposal display components to show 1Click-specific information:
- Quote status (active/expired)
- Link to 1Click explorer
- Destination address and chain
- Warning if quote expires before voting period

## Technical Considerations

### 1. API Integration
- Use `asyncFetch` for 1Click API calls (BOS environment constraint)
- Handle CORS properly for cross-origin requests
- Implement proper error handling for API failures

### 2. Security
- Validate all input addresses
- Store cryptographic signatures in proposal for dispute resolution
- Never expose private keys or sensitive data
- Implement NEP-413 message signing for additional security

### 3. User Experience
- Clear indication of quote expiry time
- Warning dialogs for high slippage or poor rates
- Loading states during API calls
- Clear error messages for failed quotes
- **Distinct UI** for 1Click vs Ref Finance forms

### 4. Data Flow - Swap Only
```
Tab Selection → OneClickExchangeForm → Get Quote → Display Quote → Create Proposal → DAO Voting → Execute Swap
      ↓                ↓                    ↓             ↓              ↓                ↓              ↓
 Near Intents     Validate Input       1Click API   Show Expiry   Add Signature    Track Time    Monitor Swap

Note: No withdrawal step - swaps deliver directly to recipient address on destination chain
```

## Testing Strategy - Screenshot-Driven Playwright Development

**Primary Focus**: Use Playwright tests with screenshot verification to drive development and ensure UI functionality works correctly.

### Screenshot-Driven Development Approach:
1. **Start with failing Playwright test** - Write test that navigates to asset-exchange and expects NEAR Intents tab
2. **Run test and capture screenshot** of current state to understand what needs to be implemented
3. **Implement minimal components** to make test pass
4. **Run test again with screenshots** to verify visual appearance matches expectations
5. **Iteratively add functionality** with corresponding Playwright tests and screenshots
6. **Validate each step** with browser automation and visual inspection before moving to next feature

### Screenshot Capture Strategy:
```javascript
// Capture screenshots at key points for visual verification
await page.screenshot({ 
  path: 'screenshots/asset-exchange-initial.png',
  fullPage: true 
});

// Capture specific elements
await page.locator('.tab-switcher').screenshot({ 
  path: 'screenshots/tab-switcher.png' 
});

// Capture after interactions
await page.getByRole("button", { name: "Near Intents" }).click();
await page.screenshot({ 
  path: 'screenshots/near-intents-tab-active.png' 
});
```

### Playwright Test Progression with Screenshots:
1. **Navigation Test**: 
   - Test navigating to asset-exchange page and opening "Create Request"
   - Screenshot: Initial page state, Create Request button
2. **Tab Switcher Test**: 
   - Test switching between "Sputnik DAO" and "Near Intents" tabs
   - Screenshots: Tab switcher UI, active tab states
3. **Empty Component Test**: 
   - Verify NEAR Intents tab shows placeholder content
   - Screenshot: Placeholder content appearance
4. **Form Elements Test**: 
   - Test form inputs (token selection, amounts, recipient)
   - Screenshots: Each form element, validation states
5. **Quote Integration Test**: 
   - Test 1Click API integration (mocked)
   - Screenshots: Loading state, quote display, error states
6. **Proposal Creation Test**: 
   - Test creating DAO proposal with 1Click data
   - Screenshot: Proposal preview, transaction modal
7. **Full E2E Test**: 
   - Complete workflow from quote to proposal
   - Screenshots: Each major step in the flow

### Development Workflow:
```bash
# 1. Write/update test
# 2. Run test and capture screenshots
npm run test:e2e -- create-1click-exchange-request.spec.js

# 3. Inspect screenshots
open screenshots/

# 4. Implement/fix based on visual feedback
# 5. Re-run test to verify
# 6. Repeat until test passes and UI looks correct
```

### Screenshot Inspection Points:
- **Before implementation**: See current state and plan changes
- **After minimal implementation**: Verify basic structure
- **After styling**: Ensure visual consistency
- **After interactions**: Confirm state changes are visible
- **Error states**: Verify error handling UI
- **Edge cases**: Check UI handles all scenarios gracefully

### Existing Test Foundation:
- Build on `create-exchange-request.spec.js` patterns
- Use existing `openCreatePage()` helper function
- Follow existing iframe interaction patterns for form testing
- Add screenshot capture to existing test helpers

## Implementation Steps - Test-First Approach

### Step 1: Basic Navigation & Tab Switcher
Create Playwright test and minimal components:
1. Write Playwright test for asset-exchange navigation and tab switcher
2. Implement tab switcher in CreateRequest.jsx to make test pass

### Step 2: Empty Component Setup
1. Create empty OneClickExchangeForm.jsx component  
2. Add Playwright test to verify tab content switches correctly
3. Ensure "Near Intents" tab shows placeholder content

### Step 3: Form UI Development
1. Add Playwright tests for form inputs (token selection, amounts, recipient)
2. Implement form UI elements to make tests pass
3. Add validation and input handling with Playwright verification

### Step 4: 1Click API Integration
1. Write Playwright test with mocked 1Click API responses
2. Implement quote fetching logic to make tests pass

### Step 5: Proposal Integration  
1. Add Playwright test for proposal creation with 1Click data
2. Integrate with existing proposal system

### Step 6: Full E2E Testing
1. Create comprehensive E2E test covering complete workflow
2. Bug fixes and edge case handling based on test results

## Component Separation Benefits

- **Maintainability**: Clear separation between Ref Finance and 1Click logic
- **Testing**: Can test each form independently
- **User Experience**: Tailored UI for each swap type
- **Feature Development**: Can iterate on 1Click features without affecting existing Ref Finance integration

## Next Steps - Playwright-First Development

### Immediate Action Items:
1. **CREATE PLAYWRIGHT TEST FIRST** - Write failing test for asset-exchange navigation and tab switcher
2. **Implement minimal tab switcher** in CreateRequest.jsx to make test pass
3. **Add empty OneClickExchangeForm.jsx** component with placeholder content
4. **Verify tab switching works** in Playwright before adding any form logic
5. **Iteratively add form elements** with corresponding Playwright tests

### Development Workflow:
```
Write Playwright Test (failing) → Implement Feature → Run Test (passing) → Repeat
```

This ensures:
- ✅ UI actually works in browser
- ✅ No broken navigation or interactions  
- ✅ All features are testable and tested
- ✅ Development is driven by real user workflows
- ✅ Each step is validated before moving forward

### Key Testing Principles:
- **Test navigation first** - ensure we can get to the asset-exchange page
- **Test tab switching** - verify UI responds correctly to user interactions
- **Test empty states** - make sure placeholder content appears
- **Test incrementally** - add one feature at a time with corresponding test