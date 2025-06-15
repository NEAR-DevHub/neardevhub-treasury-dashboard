/**
 * Debug Test: Network Icon Loading in DepositModal
 * 
 * This test simulates the exact flow used in DepositModal to debug
 * why network icons might not be appearing.
 */

State.init({
  selectedAsset: "USDC",
  networkTokensForIcons: [
    { symbol: "USDC", networkId: "eth:1" },
    { symbol: "USDC", networkId: "eth:42161" },
    { symbol: "USDC", networkId: "eth:8453" },
    { symbol: "USDC", networkId: "eth:100" },
  ],
  iconCache: {},
  networksBuilt: [],
  step: 1,
});

// Same functions as DepositModal
const getNetworkIcon = (symbol, networkId) => {
  if (!networkId) return null;
  
  const key = `${symbol}:${networkId}`;
  console.log(`Looking for network icon: ${key}`);
  
  if (state.iconCache && state.iconCache[key]) {
    const cached = state.iconCache[key];
    console.log(`Found cached entry for ${key}:`, cached);
    if (cached !== "NOT_FOUND" && cached.networkIcon) {
      console.log(`Returning network icon for ${key}`);
      return cached.networkIcon;
    }
  }
  console.log(`No network icon found for ${key}`);
  return null;
};

const buildNetworksWithIcons = () => {
  console.log("Building networks with icons...");
  console.log("Current icon cache:", state.iconCache);
  
  const networks = [
    { id: "eth:1", name: "ETH (eth:1)", chainId: "eth:1" },
    { id: "eth:42161", name: "ARB (eth:42161)", chainId: "eth:42161" },
    { id: "eth:8453", name: "BASE (eth:8453)", chainId: "eth:8453" },
    { id: "eth:100", name: "GNOSIS (eth:100)", chainId: "eth:100" },
  ].map(network => ({
    ...network,
    icon: getNetworkIcon(state.selectedAsset, network.chainId),
  }));
  
  console.log("Built networks:", networks);
  State.update({ networksBuilt: networks, step: 3 });
};

const handleIconsLoaded = (iconCache) => {
  console.log("Icons loaded callback triggered!");
  console.log("Received icon cache:", iconCache);
  
  State.update({ iconCache, step: 2 });
  
  // Build networks after icons are loaded
  setTimeout(() => buildNetworksWithIcons(), 100);
};

return (
  <div className="p-4">
    <h3>🔍 Network Icon Debug Test</h3>
    <p>Step {state.step}: {
      state.step === 1 ? "Loading icons..." :
      state.step === 2 ? "Icons loaded, building networks..." :
      "Networks built with icons"
    }</p>

    {/* Web3IconFetcher for network icons - same as DepositModal with proper BOS onMessage */}
    <Widget
      src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Web3IconFetcher"
      props={{
        tokens: state.networkTokensForIcons,
        onIconsLoaded: handleIconsLoaded,
        fallbackIconMap: {},
        fetchNetworkIcons: true,
      }}
    />

    {/* Display current state */}
    <div className="mt-4">
      <h5>Debug Info:</h5>
      
      <div className="mb-3">
        <strong>Tokens sent for icon fetching:</strong>
        <pre className="bg-light p-2 small">{JSON.stringify(state.networkTokensForIcons, null, 2)}</pre>
      </div>
      
      <div className="mb-3">
        <strong>Icon cache received:</strong>
        <pre className="bg-light p-2 small" style={{maxHeight: '200px', overflow: 'auto'}}>
          {JSON.stringify(state.iconCache, null, 2)}
        </pre>
      </div>
      
      {state.step >= 3 && (
        <div className="mb-3">
          <strong>Networks with icons:</strong>
          <div className="row g-2">
            {state.networksBuilt.map((network, idx) => (
              <div key={idx} className="col-auto">
                <div className="border rounded p-2 text-center">
                  {network.icon ? (
                    <img src={network.icon} alt={network.name} width="20" height="20" />
                  ) : (
                    <div className="bg-secondary" style={{width: '20px', height: '20px', display: 'inline-block'}}></div>
                  )}
                  <div className="small mt-1">{network.name}</div>
                  <div className={`small ${network.icon ? 'text-success' : 'text-danger'}`}>
                    {network.icon ? '✅ Has Icon' : '❌ No Icon'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    
    <button 
      className="btn btn-secondary btn-sm" 
      onClick={() => {
        console.clear();
        State.update({ step: 1, iconCache: {}, networksBuilt: [] });
      }}
    >
      🔄 Reset Test
    </button>
  </div>
);
