/**
 * Simple single Web3IconFetcher test to debug the cache issue
 */

State.init({
  iconCache: {},
  testTokens: [
    { symbol: "USDC", networkId: "ethereum:1" },
    { symbol: "USDT", networkId: "ethereum:1" },
    "NEAR",
  ],
});

const handleIconsLoaded = (cache) => {
  console.log("handleIconsLoaded called with cache:", cache);
  State.update({ iconCache: cache });
};

return (
  <div>
    <h3>Simple Web3IconFetcher Test</h3>
    <p>Testing single Web3IconFetcher instance</p>

    {/* Single Web3IconFetcher for assets only */}
    <Widget
      src="widgets.treasury-factory.near/widget/components.Web3IconFetcher"
      props={{
        tokens: state.testTokens,
        onIconsLoaded: handleIconsLoaded,
        fetchNetworkIcons: false,
      }}
    />

    <div className="mt-3">
      <h4>Results:</h4>
      <pre>{JSON.stringify(state.iconCache, null, 2)}</pre>
    </div>

    <div className="mt-3">
      <h4>Icon Display Test:</h4>
      {Object.entries(state.iconCache).map(([key, value]) => {
        if (typeof value === "object" && value !== null && value.tokenIcon) {
          return (
            <div key={key} className="d-flex align-items-center mb-2">
              <img
                src={value.tokenIcon}
                alt={key}
                width="24"
                height="24"
                className="me-2"
              />
              <span>{key} (token)</span>
            </div>
          );
        } else if (
          typeof value === "string" &&
          value.startsWith("data:image")
        ) {
          return (
            <div key={key} className="d-flex align-items-center mb-2">
              <img
                src={value}
                alt={key}
                width="24"
                height="24"
                className="me-2"
              />
              <span>{key}</span>
            </div>
          );
        }
        return (
          <div key={key} className="mb-2">
            <span>
              {key}: {typeof value === "object" ? JSON.stringify(value) : value}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);
