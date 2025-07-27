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
const [quote, setQuote] = useState(null);
const [isLoadingQuote, setIsLoadingQuote] = useState(false);

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

// Find the token details for the quote request
const getTokenDetails = () => {
  if (!tokenIn || !tokenOut || !networkOut) return null;
  
  // Find the input token from intents tokens
  const inputToken = intentsTokensIn.find(t => t.id === tokenIn);
  if (!inputToken) return null;
  
  // Find the output token with the correct network
  const outputToken = allTokensOut.find(
    t => t.symbol === tokenOut && t.network === networkOut
  );
  if (!outputToken) return null;
  
  return { inputToken, outputToken };
};

// Fetch quote from 1Click API
const fetchQuote = () => {
  const tokenDetails = getTokenDetails();
  if (!tokenDetails) return;
  
  const { inputToken, outputToken } = tokenDetails;
  
  // Convert amount to smallest unit
  const amountInSmallestUnit = Big(amountIn)
    .mul(Big(10).pow(inputToken.decimals))
    .toFixed(0);
  
  setIsLoadingQuote(true);
  setQuote(null);
  setErrorApi(null);
  
  // Calculate deadline (7 days for DAO voting)
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);
  
  // Prepare the quote request in the format expected by 1Click API v0
  const quoteRequest = {
    dry: false,
    swapType: "EXACT_INPUT",
    slippageTolerance: 100, // 1% slippage
    originAsset: inputToken.id.startsWith("nep141:") 
      ? inputToken.id 
      : `nep141:${inputToken.id}`,
    depositType: "INTENTS",
    destinationAsset: outputToken.id,
    refundTo: treasuryDaoID,
    refundType: "INTENTS",
    recipient: treasuryDaoID, // Swapped tokens stay in treasury's NEAR Intents
    recipientType: "INTENTS",
    deadline: deadline.toISOString(),
    amount: amountInSmallestUnit
  };
  
  console.log("Fetching quote:", quoteRequest);
  
  asyncFetch("https://1click.chaindefuser.com/v0/quote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(quoteRequest),
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = res.body;
      if (data.error) {
        throw new Error(data.error || "Error fetching quote.");
      }
      
      // The API returns a response with quote object and signature
      if (!data.quote) {
        throw new Error("Invalid quote response format");
      }
      
      // Format the quote for display
      const formattedQuote = {
        ...data.quote,
        signature: data.signature,
        amountOutFormatted: data.quote.amountOutFormatted || 
          Big(data.quote.amountOut || "0")
            .div(Big(10).pow(18)) // TODO: Get actual decimals for output token
            .toFixed(6),
        amountInFormatted: data.quote.amountInFormatted || amountIn,
        requestPayload: quoteRequest,
      };
      
      setQuote(formattedQuote);
    })
    .catch((err) => {
      console.error("Failed to fetch quote:", err);
      setErrorApi(err.message || "Failed to fetch quote.");
    })
    .finally(() => {
      setIsLoadingQuote(false);
    });
};

const handleGetQuote = () => {
  if (!tokenIn || !tokenOut || !networkOut || !amountIn) {
    return;
  }
  
  fetchQuote();
};

const handleSubmit = () => {
  if (!quote) return;
  
  onSubmit({
    tokenIn,
    tokenOut,
    networkOut,
    amountIn,
    quote,
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
    
    {/* Quote Display */}
    {quote && (
      <div className="alert alert-info mb-4">
        <h6 className="mb-2">Quote Details</h6>
        <div className="d-flex justify-content-between mb-2">
          <span>You send:</span>
          <strong>{quote.amountInFormatted} {intentsTokensIn.find(t => t.id === tokenIn)?.symbol}</strong>
        </div>
        <div className="d-flex justify-content-between mb-2">
          <span>You receive:</span>
          <strong>{quote.amountOutFormatted} {tokenOut}</strong>
        </div>
        {quote.timeEstimate && (
          <div className="d-flex justify-content-between mb-2">
            <span>Estimated time:</span>
            <span>{quote.timeEstimate} minutes</span>
          </div>
        )}
        {quote.depositAddress && (
          <div className="mt-2">
            <small className="text-muted">Deposit address: {quote.depositAddress.substring(0, 16)}...</small>
          </div>
        )}
        {quote.deadline && (
          <div className="mt-2">
            <small className="text-muted">Quote expires: {new Date(quote.deadline).toLocaleString()}</small>
          </div>
        )}
      </div>
    )}
    
    {/* Action Buttons */}
    <div className="d-flex justify-content-end gap-2 mt-4">
      <button className="btn btn-outline-secondary" onClick={onCancel}>
        Cancel
      </button>
      {!quote ? (
        <button 
          className="btn btn-primary" 
          onClick={handleGetQuote}
          disabled={!isFormValid || isLoadingQuote}
        >
          {isLoadingQuote ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Fetching Quote...
            </>
          ) : (
            "Get Quote"
          )}
        </button>
      ) : (
        <button 
          className="btn btn-success" 
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? "Creating Proposal..." : "Create Proposal"}
        </button>
      )}
    </div>
  </div>
);