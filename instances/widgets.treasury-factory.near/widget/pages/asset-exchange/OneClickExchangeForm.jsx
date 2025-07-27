const { instance, onCancel, onSubmit } = props;

if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const { getIntentsBalances } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

// State management
const [tokenIn, setTokenIn] = useState(null);
const [tokenOut, setTokenOut] = useState(null);
const [networkOut, setNetworkOut] = useState(null);
const [amountIn, setAmountIn] = useState("");
const [isLoading, setIsLoading] = useState(false);
const [intentsTokensIn, setIntentsTokensIn] = useState([]);
const [allTokensOut, setAllTokensOut] = useState([]);
const [isLoadingTokens, setIsLoadingTokens] = useState(false);
const [errorApi, setErrorApi] = useState(null);

// Fetch treasury's NEAR Intents tokens for Send dropdown
useEffect(() => {
  if (typeof getIntentsBalances === "function" && treasuryDaoID) {
    getIntentsBalances(treasuryDaoID).then((balances) => {
      const formattedTokens = balances.map((token) => ({
        id: token.contract_id,
        symbol: token.ft_meta.symbol,
        name: token.ft_meta.name,
        icon: token.ft_meta.icon,
        balance: Big(token.amount ?? "0")
          .div(Big(10).pow(token.ft_meta.decimals))
          .toFixed(2),
        decimals: token.ft_meta.decimals,
        blockchain: token.blockchain,
      }));
      setIntentsTokensIn(formattedTokens);
    });
  }
}, [treasuryDaoID]);

// Fetch all available tokens from bridge API for Receive dropdown
useEffect(() => {
  setIsLoadingTokens(true);
  setErrorApi(null);
  
  asyncFetch("https://bridge.chaindefuser.com/rpc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: "supportedTokensFetchAll",
      jsonrpc: "2.0",
      method: "supported_tokens",
      params: [{}], // Fetch all tokens
    }),
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = res.body;
      if (data.error) {
        throw new Error(data.error.message || "Error fetching tokens.");
      }
      if (data.result && data.result.tokens) {
        const uniqueTokens = new Map();
        
        data.result.tokens.forEach((token) => {
          if (!token.defuse_asset_identifier || !token.asset_name) return;
          
          const parts = token.defuse_asset_identifier.split(":");
          let chainId = parts.length >= 2 ? parts.slice(0, 2).join(":") : parts[0];
          
          const key = `${token.asset_name}_${chainId}`;
          if (!uniqueTokens.has(key)) {
            uniqueTokens.set(key, {
              id: token.intents_token_id || token.defuse_asset_id,
              symbol: token.asset_name,
              network: chainId,
              nearTokenId: token.near_token_id,
            });
          }
        });
        
        setAllTokensOut(Array.from(uniqueTokens.values()));
      }
    })
    .catch((err) => {
      console.error("Failed to fetch tokens:", err);
      setErrorApi(err.message || "Failed to fetch tokens.");
    })
    .finally(() => {
      setIsLoadingTokens(false);
    });
}, []);

// Network names mapping
const networkNames = {
  "eth:1": "Ethereum",
  "base:8453": "Base",
  "arbitrum:42161": "Arbitrum", 
  "optimism:10": "Optimism",
  "near:near": "NEAR",
  "btc:mainnet": "Bitcoin",
  "sol:mainnet-beta": "Solana",
};

// Get unique networks from selected token
const getAvailableNetworks = () => {
  if (!tokenOut) return [];
  
  const networks = allTokensOut
    .filter(token => token.symbol === tokenOut)
    .map(token => ({
      id: token.network,
      name: networkNames[token.network] || token.network,
      tokenId: token.id,
    }));
  
  return networks;
};

const handleSubmit = () => {
  if (!tokenIn || !tokenOut || !networkOut || !amountIn) {
    return;
  }
  
  onSubmit({
    tokenIn,
    tokenOut,
    networkOut,
    amountIn,
  });
};

const isFormValid = tokenIn && tokenOut && networkOut && amountIn;

return (
  <div className="one-click-exchange-form">
    <div className="mb-4">
      <h6 className="text-muted mb-3">Exchange tokens within your NEAR Intents holdings using 1Click API</h6>
    </div>
    
    {/* Error display */}
    {errorApi && (
      <div className="alert alert-danger mb-3">
        <i className="bi bi-exclamation-triangle-fill me-2"></i>
        {errorApi}
      </div>
    )}
    
    {/* Send Section */}
    <div className="mb-3">
      <label className="form-label">Send</label>
      <div className="d-flex gap-2">
        <input
          type="number"
          className="form-control"
          placeholder="0.00"
          value={amountIn}
          onChange={(e) => setAmountIn(e.target.value)}
          min="0"
          step="any"
        />
        <div style={{ minWidth: "200px" }}>
          <select 
            className="form-select"
            value={tokenIn || ""}
            onChange={(e) => setTokenIn(e.target.value)}
            disabled={intentsTokensIn.length === 0}
          >
            <option value="">
              {intentsTokensIn.length === 0 ? "Loading tokens..." : "Select token"}
            </option>
            {intentsTokensIn.map((token) => (
              <option key={token.id} value={token.id}>
                {token.symbol} ({token.balance} available)
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
    
    {/* Swap Icon */}
    <div className="text-center my-2">
      <i className="bi bi-arrow-down-circle h4 text-muted"></i>
    </div>
    
    {/* Receive Section */}
    <div className="mb-3">
      <label className="form-label">Receive</label>
      <div className="d-flex gap-2">
        <div style={{ flex: 1 }}>
          <select 
            className="form-select"
            value={tokenOut || ""}
            onChange={(e) => {
              setTokenOut(e.target.value);
              setNetworkOut(null); // Reset network selection
            }}
            disabled={isLoadingTokens}
          >
            <option value="">
              {isLoadingTokens ? "Loading tokens..." : "Select token"}
            </option>
            {[...new Set(allTokensOut.map(t => t.symbol))].sort().map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: "200px" }}>
          <select 
            className="form-select"
            value={networkOut || ""}
            onChange={(e) => setNetworkOut(e.target.value)}
            disabled={!tokenOut || getAvailableNetworks().length === 0}
          >
            <option value="">
              {!tokenOut ? "Select token first" : "Select network"}
            </option>
            {getAvailableNetworks().map((network) => (
              <option key={network.id} value={network.id}>
                {network.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <small className="text-muted">
        Swapped tokens will remain in the treasury's NEAR Intents account
      </small>
    </div>
    
    {/* Quote Preview (placeholder for now) */}
    {tokenIn && tokenOut && networkOut && amountIn && (
      <div className="alert alert-secondary mb-4">
        <small className="text-muted">Quote preview will appear here</small>
      </div>
    )}
    
    {/* Action Buttons */}
    <div className="d-flex justify-content-end gap-2 mt-4">
      <button className="btn btn-outline-secondary" onClick={onCancel}>
        Cancel
      </button>
      <button 
        className="btn btn-primary" 
        onClick={handleSubmit}
        disabled={!isFormValid || isLoading}
      >
        {isLoading ? "Processing..." : "Get Quote"}
      </button>
    </div>
  </div>
);