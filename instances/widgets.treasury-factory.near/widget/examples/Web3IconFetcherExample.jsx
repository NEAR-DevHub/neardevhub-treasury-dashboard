/**
 * Example: Enhanced Web3IconFetcher with Network Icons
 * 
 * Demonstrates how the DepositModal now fetches both token and network icons
 */

State.init({
  // Test case similar to what DepositModal creates
  testTokens: [
    { symbol: "USDC", networkId: "eth:1" },      // Ethereum
    { symbol: "USDC", networkId: "eth:42161" },  // Arbitrum  
    { symbol: "USDC", networkId: "eth:8453" },   // Base
    { symbol: "USDC", networkId: "eth:100" },    // Gnosis
    { symbol: "SOL", networkId: "sol:mainnet" }, // Solana
    { symbol: "NEAR", networkId: "near:mainnet" }, // NEAR
  ],
  
  iconCache: {},
});

// Callback when icons are loaded
const handleIconsLoaded = (iconCache) => {
  State.update({ iconCache });
  console.log("Enhanced icons loaded:", Object.keys(iconCache).length);
};

// Functions to get icons (same as DepositModal)
const getTokenIcon = (symbol) => {
  if (state.iconCache && state.iconCache[symbol]) {
    const cached = state.iconCache[symbol];
    if (cached !== "NOT_FOUND") {
      return cached.tokenIcon || cached;
    }
  }
  return null;
};

const getNetworkIcon = (symbol, networkId) => {
  if (!networkId) return null;
  
  const key = `${symbol}:${networkId}`;
  if (state.iconCache && state.iconCache[key]) {
    const cached = state.iconCache[key];
    if (cached !== "NOT_FOUND" && cached.networkIcon) {
      return cached.networkIcon;
    }
  }
  return null;
};

return (
  <div className="p-4">
    <h3>🚀 Enhanced Network Icon Test</h3>
    <p className="text-muted">Testing the same logic used in DepositModal for network icons</p>

    {/* Enhanced Web3IconFetcher with network icons enabled */}
    <Widget
      src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Web3IconFetcher"
      props={{
        tokens: state.testTokens,
        onIconsLoaded: handleIconsLoaded,
        fallbackIconMap: {},
        fetchNetworkIcons: true, // This is the key enhancement!
      }}
    />

    {/* Display results showing both token and network icons */}
    <div className="mt-4">
      <h5>Network Icons Found:</h5>
      <div className="row g-3">
        {state.testTokens.map((token, idx) => {
          const tokenIcon = getTokenIcon(token.symbol);
          const networkIcon = getNetworkIcon(token.symbol, token.networkId);
          
          return (
            <div key={idx} className="col-auto">
              <div className="border rounded p-3 text-center" style={{ minWidth: '140px' }}>
                <div className="d-flex justify-content-center align-items-center gap-2 mb-2">
                  {tokenIcon && (
                    <img src={tokenIcon} alt={token.symbol} width="24" height="24" title="Token Icon" />
                  )}
                  {networkIcon ? (
                    <img src={networkIcon} alt={token.networkId} width="20" height="20" title="Network Icon" />
                  ) : (
                    <div className="bg-light rounded" style={{width: '20px', height: '20px'}} title="No Network Icon"></div>
                  )}
                </div>
                <div className="fw-bold">{token.symbol}</div>
                <small className="text-muted">{token.networkId}</small>
                <div className="mt-1">
                  <small className={networkIcon ? "text-success" : "text-danger"}>
                    {networkIcon ? "✅ Network Icon" : "❌ Missing"}
                  </small>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    
    {/* Debug info */}
    <details className="mt-4">
      <summary>Debug: Enhanced Icon Cache</summary>
      <pre className="mt-2 p-2 bg-light small" style={{maxHeight: '300px', overflow: 'auto'}}>
        {JSON.stringify(state.iconCache, null, 2)}
      </pre>
    </details>
  </div>
);
