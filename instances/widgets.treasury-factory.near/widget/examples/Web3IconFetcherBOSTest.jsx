/**
 * Simple test widget to verify Web3IconFetcher works with BOS message handling
 */

State.init({
  iconCache: {},
  testTokens: [
    { symbol: "USDC", networkId: "ethereum:1" },
    { symbol: "USDT", networkId: "ethereum:1" },
    "NEAR"
  ],
});

const handleIconsLoaded = (cache) => {
  console.log("Icons loaded:", cache);
  State.update({ iconCache: cache });
};

return (
  <div>
    <h3>Web3IconFetcher BOS Test</h3>
    <p>Testing BOS-compatible message handling in Web3IconFetcher</p>
    
    {/* Web3IconFetcher for assets */}
    <Widget
      src="widgets.treasury-factory.near/widget/components.Web3IconFetcher"
      props={{
        tokens: state.testTokens,
        onIconsLoaded: handleIconsLoaded,
        fetchNetworkIcons: false,
      }}
    />
    
    {/* Web3IconFetcher for networks */}
    <Widget
      src="widgets.treasury-factory.near/widget/components.Web3IconFetcher"
      props={{
        tokens: state.testTokens.filter(t => typeof t === 'object'),
        onIconsLoaded: handleIconsLoaded,
        fetchNetworkIcons: true,
      }}
    />
    
    <div className="mt-3">
      <h4>Results:</h4>
      <pre>{JSON.stringify(state.iconCache, null, 2)}</pre>
    </div>
    
    <div className="mt-3">
      <h4>Icon Display Test:</h4>
      {Object.entries(state.iconCache).map(([key, value]) => {
        if (typeof value === 'object' && value.tokenIcon) {
          return (
            <div key={key} className="d-flex align-items-center mb-2">
              <img src={value.tokenIcon} alt={key} width="24" height="24" className="me-2" />
              <span>{key} (token)</span>
              {value.networkIcon && (
                <>
                  <img src={value.networkIcon} alt={`${key} network`} width="20" height="20" className="ms-2 me-1" />
                  <span>(network)</span>
                </>
              )}
            </div>
          );
        } else if (typeof value === 'string' && value.startsWith('data:image')) {
          return (
            <div key={key} className="d-flex align-items-center mb-2">
              <img src={value} alt={key} width="24" height="24" className="me-2" />
              <span>{key}</span>
            </div>
          );
        }
        return null;
      })}
    </div>
  </div>
);
