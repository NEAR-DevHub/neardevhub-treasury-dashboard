# 1Click API Integration - Implementation Plan

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

### Phase 1: Create Separate 1Click Exchange Form Component

**New File**: `pages/asset-exchange/OneClickExchangeForm.jsx`

This will be a **completely separate component** from the existing `ExchangeForm.jsx` (which handles Ref Finance integration). The OneClickExchangeForm will be specifically designed for NEAR Intents using the 1Click API.

Key features:
- Token selection dropdowns (NEAR tokens to external chains)
- Amount input with validation
- Recipient address input for destination chain
- Slippage tolerance setting
- Real-time quote fetching from 1Click API
- Display quote details (rate, fees, expiry time)
- Quote expiry countdown timer
- 1Click-specific validation logic

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

Changes to proposal creation:
1. Add support for 1Click proposal type
2. Modify `fillTxn` function to handle 1Click deposits
3. Update proposal description to include:
   - Quote ID and expiry
   - 1Click service signature
   - Link to 1Click explorer for tracking
   - Cryptographic proof for dispute resolution

```javascript
// New proposal description format for 1Click
const description = {
  proposal_action: "1click-asset-exchange",
  quote_id: quote.quote_id,
  quote_expiry: quote.deadline,
  signature: quote.signature,
  explorer_url: `https://intents-explorer.near.org/quote/${quote.quote_id}`,
  notes: proposalDetails.notes,
  tokenIn: proposalDetails.tokenIn,
  tokenOut: proposalDetails.tokenOut,
  amountIn: proposalDetails.amountIn,
  recipient: proposalDetails.recipient,
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

### 4. Data Flow
```
Tab Selection → OneClickExchangeForm → Get Quote → Display Quote → Create Proposal → DAO Voting → Execute Transfer
      ↓                ↓                    ↓             ↓              ↓                ↓              ↓
 Near Intents     Validate Input       1Click API   Show Expiry   Add Signature    Track Time    Monitor Status
```

## Testing Strategy

1. **Unit Tests**: Test quote parsing, validation logic
2. **Integration Tests**: Full flow from quote to proposal creation
3. **E2E Tests**: Already implemented in `intents-usdc-swap-withdrawal.spec.js`
4. **Manual Testing**: Test various token pairs and edge cases

## Rollout Plan

1. **Phase 1**: Implement OneClickExchangeForm component (1 week)
2. **Phase 2**: Add tab switcher to CreateRequest component (2 days)
3. **Phase 3**: Integrate with existing proposal system (3 days)
4. **Phase 4**: Add quote management and expiry handling (3 days)
5. **Phase 5**: Testing and bug fixes (1 week)
6. **Phase 6**: Documentation and deployment (2 days)

## Component Separation Benefits

- **Maintainability**: Clear separation between Ref Finance and 1Click logic
- **Testing**: Can test each form independently
- **User Experience**: Tailored UI for each swap type
- **Feature Development**: Can iterate on 1Click features without affecting existing Ref Finance integration

## Next Steps

1. Start with creating the `OneClickExchangeForm.jsx` component
2. Add basic tab switcher to `CreateRequest.jsx`
3. Test 1Click API integration in the new component
4. Coordinate with DAO to understand voting timeline constraints