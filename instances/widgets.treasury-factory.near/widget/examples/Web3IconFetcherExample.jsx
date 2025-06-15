/**
 * Example: How to use Web3IconFetcher Widget
 * 
 * This demonstrates the simple, reusable approach for fetching web3 icons
 */

State.init({
  tokens: ["BTC", "ETH", "USDC", "NEAR"],
  iconCache: {},
});

// Callback when icons are loaded
const handleIconsLoaded = (iconCache) => {
  State.update({ iconCache });
  console.log("Icons loaded:", Object.keys(iconCache).length);
};

// Function to get icon with fallback
const getIcon = (symbol) => {
  if (state.iconCache[symbol] && state.iconCache[symbol] !== "NOT_FOUND") {
    return state.iconCache[symbol];
  }
  return null; // or your fallback icon
};

return (
  <div>
    {/* Web3IconFetcher Widget - handles all the complexity */}
    <Widget
      src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Web3IconFetcher"
      props={{
        symbols: state.tokens,
        onIconsLoaded: handleIconsLoaded,
        fallbackIconMap: { /* optional fallback icons */ },
      }}
    />

    {/* Your UI that uses the icons */}
    <div className="d-flex gap-3">
      {state.tokens.map((symbol) => (
        <div key={symbol} className="d-flex align-items-center gap-2">
          {getIcon(symbol) && (
            <img src={getIcon(symbol)} alt={symbol} width="24" height="24" />
          )}
          <span>{symbol}</span>
        </div>
      ))}
    </div>
  </div>
);
