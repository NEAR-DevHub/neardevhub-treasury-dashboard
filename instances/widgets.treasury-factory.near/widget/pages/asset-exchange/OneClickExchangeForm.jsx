const { instance, onCancel, onSubmit } = props;

if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const { getIntentsBalances } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

// Styled components
const Container = styled.div`
  .dropdown-container {
    .custom-select {
      width: 100%;
    }
  }

  .info-message {
    background-color: var(--bs-gray-100);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
    display: flex;
    align-items: flex-start;
    gap: 12px;

    .info-icon {
      color: var(--bs-secondary);
      font-size: 20px;
      margin-top: 2px;
    }

    .info-text {
      color: var(--bs-gray-700);
      font-size: 14px;
      line-height: 1.5;
    }
  }

  .available-balance-box {
    background-color: white;
    border: 1px solid var(--bs-gray-300);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;

    .balance-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      font-weight: 500;
      color: var(--bs-gray-700);
    }

    .balance-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .balance-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--bs-gray-900);
      font-size: 14px;
    }

    .token-info {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .token-icon {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      object-fit: cover;
    }
  }

  .form-section {
    margin-bottom: 24px;

    .form-label {
      color: var(--bs-gray-700);
      font-weight: 500;
      margin-bottom: 8px;
    }

    .input-row {
      display: flex;
      gap: 0;
      margin-bottom: 8px;
    }

    .amount-input {
      flex: 1;

      input.form-control {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
        border-right: 0;
      }
    }

    .token-dropdown {
      flex: 1;

      .dropdown-toggle {
        border-top-left-radius: 0 !important;
        border-bottom-left-radius: 0 !important;
        border-left: 1px solid #dee2e6;
      }

      .custom-select > div.dropdown-toggle {
        border-radius: 0 0.375rem 0.375rem 0 !important;
      }
    }

    .network-dropdown {
      width: 100%;
    }

    .helper-text {
      color: var(--bs-gray-600);
      font-size: 13px;
      margin-top: 4px;
    }
  }

  .swap-icon-container {
    text-align: center;
    margin: 16px 0;

    .swap-icon {
      color: var(--bs-gray-400);
      font-size: 24px;
    }
  }

  .quote-display {
    background-color: var(--bs-light);
    border: 1px solid var(--bs-gray-300);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 24px;

    .slippage-section {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--bs-gray-300);

      .slippage-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        font-weight: 500;
        color: var(--bs-gray-700);
      }

      .slippage-input-group {
        display: flex;
        align-items: center;
        gap: 8px;

        .slippage-input {
          width: 100px;
        }

        .slippage-help {
          color: var(--bs-gray-600);
          font-size: 13px;
        }
      }

      .slippage-info {
        margin-top: 8px;
        color: var(--bs-gray-600);
        font-size: 13px;
        line-height: 1.5;
      }
    }

    .quote-alert {
      background-color: #fef3cd;
      border: 1px solid #ffeeba;
      color: #856404;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;

      .alert-icon {
        color: #f0ad4e;
        font-size: 18px;
      }
    }

    .quote-summary {
      font-size: 18px;
      font-weight: 500;
      color: var(--bs-gray-900);
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;

      .arrow-icon {
        color: var(--bs-gray-600);
      }
    }

    .quote-details {
      border-top: 1px solid var(--bs-gray-300);
      padding-top: 16px;
      margin-top: 16px;

      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        color: var(--bs-gray-700);
        font-size: 14px;

        &:not(:last-child) {
          border-bottom: 1px solid var(--bs-gray-200);
        }

        .detail-label {
          color: var(--bs-gray-600);
        }

        .detail-value {
          font-weight: 500;
          color: var(--bs-gray-900);
        }
      }
    }

    .details-toggle {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      margin-top: 12px;
      color: var(--bs-primary);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      gap: 4px;

      &:hover {
        text-decoration: underline;
      }
    }
  }
`;

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
const [web3IconsCache, setWeb3IconsCache] = useState({});
const [tokenIconMap, setTokenIconMap] = useState({});
const [allIconsFetched, setAllIconsFetched] = useState(false);
const [showQuoteDetails, setShowQuoteDetails] = useState(false);
const [slippageTolerance, setSlippageTolerance] = useState("100"); // Default 1% = 100 basis points

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
          let chainId =
            parts.length >= 2 ? parts.slice(0, 2).join(":") : parts[0];

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

// Handle icons loaded from Web3IconFetcher
const handleAllIconsLoaded = (iconCache) => {
  const newTokenIconMap = {};

  // Process the icon cache to build token icon map
  Object.keys(iconCache).forEach((key) => {
    const cached = iconCache[key];
    if (cached !== "NOT_FOUND" && cached.tokenIcon) {
      // Map by symbol for tokens
      newTokenIconMap[cached.symbol] = cached.tokenIcon;
      // Also map by uppercase symbol for case-insensitive matching
      newTokenIconMap[cached.symbol.toUpperCase()] = cached.tokenIcon;
    }
  });

  setTokenIconMap(newTokenIconMap);
  setWeb3IconsCache(iconCache);
  setAllIconsFetched(true);
};

// Get token icon from map or from token metadata
const getTokenIcon = (symbol) => {
  if (!symbol) return null;

  // First check if we have it in the icon map
  if (tokenIconMap) {
    const icon = tokenIconMap[symbol] || tokenIconMap[symbol.toUpperCase()];
    if (icon) return icon;
  }

  // Then check if the token already has an icon in its metadata
  // For intents tokens (Send dropdown)
  const intentsToken = intentsTokensIn.find((t) => t.symbol === symbol);
  if (intentsToken && intentsToken.icon) {
    return intentsToken.icon;
  }

  // For all tokens out (Receive dropdown)
  const outToken = allTokensOut.find((t) => t.symbol === symbol);
  if (outToken && outToken.icon) {
    return outToken.icon;
  }

  return null;
};

// Get network icon from cache
const getNetworkIcon = (networkId) => {
  if (!networkId || !web3IconsCache) return null;
  const cached = web3IconsCache[networkId];
  if (cached && cached !== "NOT_FOUND" && cached.networkIcon) {
    return cached.networkIcon;
  }
  return null;
};

// Get unique networks from selected token
const getAvailableNetworks = () => {
  if (!tokenOut) return [];

  const networks = allTokensOut
    .filter((token) => token.symbol === tokenOut)
    .map((token) => {
      const networkCache = web3IconsCache && web3IconsCache[token.network];
      const networkName = networkCache?.networkName || token.network;

      return {
        id: token.network,
        name: networkName,
        tokenId: token.id,
        icon: getNetworkIcon(token.network),
      };
    });

  return networks;
};

// Find the token details for the quote request
const getTokenDetails = () => {
  if (!tokenIn || !tokenOut || !networkOut) return null;

  // Find the input token from intents tokens
  const inputToken = intentsTokensIn.find((t) => t.id === tokenIn);
  if (!inputToken) return null;

  // Find the output token with the correct network
  const outputToken = allTokensOut.find(
    (t) => t.symbol === tokenOut && t.network === networkOut
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
  setShowQuoteDetails(false);

  // Calculate deadline (7 days for DAO voting)
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);

  // Prepare the quote request in the format expected by 1Click API v0
  const quoteRequest = {
    dry: false,
    swapType: "EXACT_INPUT",
    slippageTolerance: parseInt(slippageTolerance), // Convert to number
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
    amount: amountInSmallestUnit,
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
        amountOutFormatted:
          data.quote.amountOutFormatted ||
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

  // Don't submit if quote has no deadline
  if (!quote.deadline) {
    console.error("Quote has no deadline:", quote);
    setErrorApi("Invalid quote: No expiry deadline provided");
    return;
  }

  // Find the selected token info to get the symbol
  const selectedTokenIn = intentsTokensIn.find((t) => t.id === tokenIn);

  // Don't submit if we can't find the token info
  if (!selectedTokenIn) {
    console.error("Cannot find token information for:", tokenIn);
    setErrorApi("Cannot find token information. Please try again.");
    return;
  }

  onSubmit({
    tokenIn,
    tokenInSymbol: selectedTokenIn.symbol,
    tokenOut,
    networkOut,
    amountIn,
    quote,
  });
};

const isFormValid = tokenIn && tokenOut && networkOut && amountIn;

// Calculate time remaining for quote expiry
const getTimeRemaining = (deadline) => {
  if (!deadline) return null;

  const now = new Date();
  const expiryDate = new Date(deadline);
  const diffMs = expiryDate - now;

  if (diffMs <= 0) return "expired";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  } else {
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  }
};

// Prepare tokens for icon fetching
const allTokensForIcons = [
  ...intentsTokensIn.map((t) => ({
    symbol: t.symbol,
    networkId: t.blockchain,
  })),
  ...allTokensOut.map((t) => ({ symbol: t.symbol, networkId: t.network })),
];

return (
  <Container>
    <div className="one-click-exchange-form">
      {/* Available Balance Box */}
      <div className="available-balance-box">
        <div className="balance-header">
          <span>Available Balance</span>
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger`}
            props={{
              popup: (
                <div className="p-2">
                  <small>
                    These are the tokens available in your NEAR Intents treasury
                  </small>
                </div>
              ),
              children: <i className="bi bi-info-circle text-muted" />,
            }}
          />
        </div>
        <div className="balance-list">
          {intentsTokensIn.length > 0 ? (
            intentsTokensIn.map((token) => (
              <div key={token.id} className="balance-item">
                <div className="token-info">
                  {(token.icon || getTokenIcon(token.symbol)) && (
                    <img
                      src={token.icon || getTokenIcon(token.symbol)}
                      alt={token.symbol}
                      className="token-icon"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  )}
                  <span>{token.symbol}</span>
                </div>
                <span>
                  {token.balance} {token.symbol}
                </span>
              </div>
            ))
          ) : (
            <div className="text-muted small">Loading balances...</div>
          )}
        </div>
      </div>

      {/* Info Message */}
      <div className="info-message">
        <i className="bi bi-info-circle-fill info-icon"></i>
        <div className="info-text">
          Swap tokens in your NEAR Intents holdings via the 1Click API.
          Exchanged tokens stay in your treasury account.
        </div>
      </div>

      {/* Web3IconFetcher - Load icons asynchronously without blocking UI */}
      {allTokensForIcons.length > 0 && (
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Web3IconFetcher`}
          props={{
            tokens: allTokensForIcons,
            onIconsLoaded: handleAllIconsLoaded,
            fetchNetworkIcons: true,
          }}
        />
      )}

      {/* Error display */}
      {errorApi && (
        <div className="alert alert-danger mb-3">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {errorApi}
        </div>
      )}

      {/* Send Section */}
      <div className="form-section">
        <label className="form-label">Send</label>
        <div className="input-row">
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Input`}
            props={{
              className: "amount-input",
              onChange: (e) => {
                setAmountIn(e.target.value);
                setQuote(null);
              },
              placeholder: "0.00",
              value: amountIn,
              inputProps: {
                min: "0",
                type: "number",
                step: "any",
                className: "form-control amount-input",
              },
              skipPaddingGap: true,
              debounceTimeout: 300,
              style: { flex: 1 },
            }}
          />
          <div className="token-dropdown dropdown-container">
            <Widget
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDownWithSearchAndManualRequest`}
              props={{
                selectedValue: tokenIn,
                onChange: (option) => {
                  setTokenIn(option.value);
                  setQuote(null);
                },
                options: intentsTokensIn.map((token) => ({
                  label: token.symbol,
                  value: token.id,
                  icon: token.icon || getTokenIcon(token.symbol),
                })),
                defaultLabel: "Select token",
                showSearch: true,
                searchInputPlaceholder: "Search token...",
                searchByLabel: true,
              }}
            />
          </div>
        </div>
        {tokenIn && (
          <div className="helper-text">
            Current Balance:{" "}
            {intentsTokensIn.find((t) => t.id === tokenIn)?.balance || "0.00"}{" "}
            {intentsTokensIn.find((t) => t.id === tokenIn)?.symbol}
          </div>
        )}
      </div>

      {/* Swap Icon */}
      <div className="swap-icon-container">
        <i className="bi bi-arrow-down-circle swap-icon"></i>
      </div>

      {/* Receive Section */}
      <div className="form-section">
        <label className="form-label">Receive</label>
        <div className="input-row">
          <input
            type="text"
            className="form-control amount-input"
            placeholder={
              isLoadingQuote
                ? "Fetching..."
                : quote && quote.amountOutFormatted
                ? quote.amountOutFormatted
                : "0.00"
            }
            readOnly
            disabled
          />
          <div className="token-dropdown dropdown-container">
            <Widget
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDownWithSearchAndManualRequest`}
              props={{
                selectedValue: tokenOut,
                onChange: (option) => {
                  setTokenOut(option.value);
                  setNetworkOut(null); // Reset network selection
                  setQuote(null);
                },
                options: [...new Set(allTokensOut.map((t) => t.symbol))]
                  .sort()
                  .map((symbol) => ({
                    label: symbol,
                    value: symbol,
                    icon: getTokenIcon(symbol),
                  })),
                defaultLabel: "Select token",
                showSearch: true,
                searchInputPlaceholder: "Search token...",
                searchByLabel: true,
              }}
            />
          </div>
        </div>
        {tokenOut && (
          <div className="helper-text">Current Balance: 0.00 {tokenOut}</div>
        )}
      </div>

      {/* Network Section */}
      <div className="form-section">
        <label className="form-label">Network</label>
        <div className="network-dropdown dropdown-container">
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDownWithSearchAndManualRequest`}
            props={{
              selectedValue: networkOut,
              onChange: (option) => {
                setNetworkOut(option.value);
                setQuote(null);
              },
              options: getAvailableNetworks().map((network) => ({
                label: network.name,
                value: network.id,
                icon: network.icon,
              })),
              defaultLabel: !tokenOut ? "Select token first" : "Select network",
              showSearch: false, // Network list is shorter, search not needed
            }}
          />
        </div>
        <div className="helper-text">
          Swapped tokens will remain in the treasury's NEAR Intents account
        </div>
      </div>

      {/* Price Slippage Limit Section */}
      <div className="form-section">
        <label className="form-label">
          Price Slippage Limit
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger`}
            props={{
              popup: (
                <div className="p-2">
                  <small>
                    Maximum price change you're willing to accept. The swap will
                    fail if the price moves beyond this limit.
                  </small>
                </div>
              ),
              children: <i className="bi bi-info-circle text-muted ms-2" />,
            }}
          />
        </label>
        <div className="input-row">
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Input`}
            props={{
              onChange: (e) => {
                const value = e.target.value;
                // Convert percentage to basis points (e.g., 1% = 100 basis points)
                const basisPoints = parseFloat(value || "0") * 100;
                setSlippageTolerance(basisPoints.toString());
                setQuote(null); // Clear quote when slippage changes
              },
              placeholder: "1.0",
              value: (parseFloat(slippageTolerance) / 100).toString(),
              inputProps: {
                min: "0",
                max: "50",
                type: "number",
                step: "0.1",
                className: "form-control",
              },
              skipPaddingGap: true,
              debounceTimeout: 300,
              style: { flex: 1 },
            }}
          />
          <span className="ms-2">%</span>
        </div>
        <div className="helper-text">
          Your transaction will revert if the price changes unfavorably by more
          than this percentage.
        </div>
      </div>

      {/* Quote Display */}
      {quote && (
        <div className="quote-display">
          {/* Expiry Alert */}
          {quote.deadline ? (
            <div className="quote-alert">
              <i className="bi bi-exclamation-triangle-fill alert-icon"></i>
              <span>
                Please approve this request within{" "}
                {getTimeRemaining(quote.deadline)} - otherwise, it will be
                expired. We recommend confirming as soon as possible.
              </span>
            </div>
          ) : (
            <div className="alert alert-danger">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Invalid quote: No expiry deadline provided
            </div>
          )}

          {/* Quote Summary */}
          <div className="quote-summary">
            <span>
              {quote.amountInFormatted}{" "}
              {intentsTokensIn.find((t) => t.id === tokenIn)?.symbol}($
              {quote.amountInUsd || "0.00"})
            </span>
            <i className="bi bi-arrow-right arrow-icon"></i>
            <span>
              {quote.amountOutFormatted} {tokenOut}($
              {quote.amountOutUsd || "0.00"})
            </span>
          </div>

          {/* Collapsible Details */}
          {showQuoteDetails && (
            <div className="quote-details">
              <div className="detail-row">
                <span className="detail-label">Estimated time</span>
                <span className="detail-value">
                  {quote.timeEstimate || 10} minutes
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Minimum received</span>
                <span className="detail-value">
                  {quote.minAmountOut &&
                  quote.amountOut &&
                  quote.amountOutFormatted
                    ? `${Big(quote.minAmountOut)
                        .mul(Big(quote.amountOutFormatted))
                        .div(Big(quote.amountOut))
                        .toFixed(6)} ${tokenOut}`
                    : "N/A"}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Deposit address</span>
                <span className="detail-value">
                  {quote.depositAddress
                    ? `${quote.depositAddress.substring(0, 20)}...`
                    : "N/A"}
                </span>
              </div>
              {quote.deadline && (
                <div className="detail-row">
                  <span className="detail-label">Quote expires</span>
                  <span className="detail-value">
                    {new Date(quote.deadline).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Details Toggle */}
          <div
            className="details-toggle"
            onClick={() => setShowQuoteDetails(!showQuoteDetails)}
          >
            <span>Details</span>
            <i
              className={`bi bi-chevron-${showQuoteDetails ? "up" : "down"}`}
            ></i>
          </div>
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
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
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
            disabled={isLoading || !quote.deadline}
          >
            {isLoading ? "Creating Proposal..." : "Create Proposal"}
          </button>
        )}
      </div>
    </div>
  </Container>
);
