const { instance, onCancel, onSubmit } = props;

if (!instance) {
  return <></>;
}

const { treasuryDaoID, themeColor } = VM.require(
  `${instance}/widget/config.data`
);
const { getIntentsBalances, getAllColorsAsObject } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

// Get theme configuration
const config = treasuryDaoID ? Near.view(treasuryDaoID, "get_config") : null;
const metadata = config ? JSON.parse(atob(config.metadata ?? "")) : {};
const isDarkTheme = metadata.theme === "dark";
const primaryColor = metadata?.primaryColor || themeColor || "#01BF7A";
const colors = getAllColorsAsObject(isDarkTheme, primaryColor);

// Styled components
const Container = styled.div`
  ${JSON.stringify(colors)
    .replace(/[{}]/g, "")
    .replace(/,/g, ";")
    .replace(/"/g, "")}
  .dropdown-container {
    .custom-select {
      width: 100%;
    }
  }

  .info-message {
    background-color: var(--grey-04);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
    display: flex;
    align-items: flex-start;
    gap: 12px;

    .info-icon {
      color: var(--text-secondary-color);
      font-size: 20px;
      margin-top: 2px;
    }

    .info-text {
      color: var(--text-color);
      font-size: 14px;
      line-height: 1.5;
    }
  }

  .exchange-sections {
    position: relative;

    .send-section,
    .receive-section {
      background-color: var(--bg-system-color);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;

      .section-label {
        color: var(--text-secondary-color);
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 12px;
      }

      .input-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }

      .amount-input {
        flex: 1;

        input {
          background: transparent;
          border: none;
          font-size: 24px;
          font-weight: 500;
          padding: 0;
          color: var(--text-color);

          &:focus {
            outline: none;
            box-shadow: none;
          }

          &::placeholder {
            color: var(--text-secondary-color);
          }
        }
      }

      .token-dropdown {
        flex: 0 0 auto;

        .dropdown-toggle {
          background-color: var(--bg-page-color);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 8px 16px;
          min-width: 150px;
        }
      }

      .value-display {
        color: var(--text-secondary-color);
        font-size: 14px;
        margin-top: 4px;
      }
    }

    .send-section {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
      border-bottom: none;
    }

    .receive-section {
      border-top-left-radius: 0;
      border-top-right-radius: 0;
    }

    .swap-divider {
      position: relative;
      height: 1px;
      background-color: var(--border-color);
      margin: 0;

      .swap-icon-container {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        background-color: var(--bg-system-color);
        border: 1px solid var(--border-color);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1;

        .swap-icon {
          color: var(--text-secondary-color);
          font-size: 20px;
          transform: rotate(90deg);
        }
      }
    }
  }

  .form-section {
    margin-bottom: 24px;

    .form-label {
      color: var(--bs-gray-700);
      font-weight: 500;
      margin-bottom: 8px;
    }

    .network-dropdown {
      width: 100%;
    }

    .helper-text {
      color: var(--text-secondary-color);
      font-size: 13px;
      margin-top: 4px;
    }
  }

  .quote-display {
    background-color: var(--bg-system-color);
    border: 1px solid var(--border-color);
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
        color: var(--text-color);
      }

      .slippage-input-group {
        display: flex;
        align-items: center;
        gap: 8px;

        .slippage-input {
          width: 100px;
        }

        .slippage-help {
          color: var(--text-secondary-color);
          font-size: 13px;
        }
      }

      .slippage-info {
        margin-top: 8px;
        color: var(--text-secondary-color);
        font-size: 13px;
        line-height: 1.5;
      }
    }

    .quote-alert {
      background-color: rgba(177, 113, 8, 0.1);
      border: 1px solid var(--other-warning);
      color: var(--other-warning);
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;

      .alert-icon {
        color: var(--other-warning);
        font-size: 18px;
      }
    }

    .quote-summary {
      font-size: 18px;
      font-weight: 500;
      color: var(--grey-01);
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;

      .arrow-icon {
        color: var(--text-secondary-color);
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
        color: var(--text-color);
        font-size: 14px;

        &:not(:last-child) {
          border-bottom: 1px solid var(--bs-gray-200);
        }

        .detail-label {
          color: var(--text-secondary-color);
        }

        .detail-value {
          font-weight: 500;
          color: var(--grey-01);
        }
      }
    }

    .details-toggle {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      margin-top: 12px;
      color: var(--theme-color);
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
const [autoFetchTimeout, setAutoFetchTimeout] = useState(null);

// Auto-fetch dry quotes when form values change
useEffect(() => {
  // Clear any existing timeout
  if (autoFetchTimeout) {
    clearTimeout(autoFetchTimeout);
  }

  // Check if we have all required fields
  if (
    !tokenIn ||
    !tokenOut ||
    !networkOut ||
    !amountIn ||
    parseFloat(amountIn) <= 0
  ) {
    setQuote(null);
    return;
  }

  // Set a new timeout to fetch quote after 500ms of no changes
  const timeoutId = setTimeout(() => {
    // Find the selected tokens
    const selectedTokenIn = intentsTokensIn.find((t) => t.id === tokenIn);
    // tokenOut is the symbol, and we need to match it with the selected network
    const selectedTokenOut = allTokensOut.find(
      (t) => t.symbol === tokenOut && (!networkOut || t.network === networkOut)
    );
    if (!selectedTokenIn || !selectedTokenOut) {
      return;
    }

    // Fetch dry quote automatically
    setIsLoadingQuote(true);
    setErrorApi(null);

    const decimals = selectedTokenIn.decimals || 18;
    const amountInSmallestUnit = Big(amountIn)
      .mul(Big(10).pow(decimals))
      .toFixed(0);

    // Calculate deadline (7 days for DAO voting)
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

    // Prepare the dry quote request
    const quoteRequest = {
      dry: true,
      swapType: "EXACT_INPUT",
      slippageTolerance: parseInt(slippageTolerance),
      originAsset: selectedTokenIn.id.startsWith("nep141:")
        ? selectedTokenIn.id
        : `nep141:${selectedTokenIn.id}`,
      depositType: "INTENTS",
      destinationAsset: selectedTokenOut.id,
      refundTo: treasuryDaoID,
      refundType: "INTENTS",
      recipient: treasuryDaoID,
      recipientType: "INTENTS",
      deadline: deadline.toISOString(),
      amount: amountInSmallestUnit,
    };

    console.log("Auto-fetching dry quote:", quoteRequest);

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

        if (!data.quote) {
          throw new Error("Invalid quote response format");
        }

        // Format the quote for display
        const formattedQuote = {
          ...data.quote,
          signature: data.signature,
          deadline: quoteRequest.deadline, // Include deadline from our request
          amountOutFormatted:
            data.quote.amountOutFormatted ||
            Big(data.quote.amountOut || "0")
              .div(Big(10).pow(18)) // TODO: Get actual decimals for output token
              .toFixed(6),
          amountInFormatted: data.quote.amountInFormatted || amountIn,
          requestPayload: quoteRequest,
        };

        setQuote(formattedQuote);
        setShowQuoteDetails(false); // Reset details view for new quote
      })
      .catch((err) => {
        console.error("Failed to auto-fetch quote:", err);
        // Don't show error for auto-fetch, just clear the quote
        setQuote(null);
      })
      .finally(() => {
        setIsLoadingQuote(false);
      });
  }, 500); // 500ms debounce

  setAutoFetchTimeout(timeoutId);

  // Cleanup timeout on unmount
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}, [
  tokenIn,
  tokenOut,
  networkOut,
  amountIn,
  slippageTolerance,
  treasuryDaoID,
  intentsTokensIn,
  allTokensOut,
]);

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

// Note: Quotes are now auto-fetched in the useEffect above when form values change
// The dry quotes go directly to 1Click API, while actual quotes for proposals go through our backend

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
  // tokenOut is the symbol, and we need to match it with the selected network
  const selectedTokenOut = allTokensOut.find(
    (t) => t.symbol === tokenOut && t.network === networkOut
  );

  // Don't submit if we can't find the token info
  if (!selectedTokenIn || !selectedTokenOut) {
    console.error("Cannot find token information for:", tokenIn, tokenOut);
    setErrorApi("Cannot find token information. Please try again.");
    return;
  }

  // Get the network name from the available networks
  const selectedNetwork = getAvailableNetworks().find(
    (n) => n.id === networkOut
  );
  const networkName = selectedNetwork ? selectedNetwork.name : networkOut;

  // Set loading state
  setIsLoading(true);
  setErrorApi(null);

  // Convert amount to smallest unit if needed
  const decimals = selectedTokenIn.decimals || 18;
  const amountInSmallestUnit = Big(amountIn)
    .mul(Big(10).pow(decimals))
    .toFixed(0);

  // Prepare the request for our custom backend endpoint
  const backendRequest = {
    treasuryDaoID,
    inputToken: selectedTokenIn,
    outputToken: selectedTokenOut,
    amountIn: amountInSmallestUnit,
    slippageTolerance: parseInt(slippageTolerance),
    networkOut: networkName,
  };

  console.log("Fetching actual quote from backend:", backendRequest);

  // Use our custom backend endpoint to get the actual quote with proposal payload
  asyncFetch("${REPL_BACKEND_API}/treasury/oneclick-quote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(backendRequest),
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = res.body;
      if (data.error) {
        throw new Error(data.error);
      }
      if (!data.success || !data.proposalPayload) {
        throw new Error("Invalid response from backend");
      }

      // Submit the proposal payload (ensure tokenOut is the symbol)
      const payload = {
        ...data.proposalPayload,
        tokenOut: selectedTokenOut.symbol, // Use symbol instead of ID
      };
      onSubmit(payload);
    })
    .catch((err) => {
      console.error("Failed to fetch actual quote:", err);
      setErrorApi(
        err.message || "Failed to create proposal. Please try again."
      );
    })
    .finally(() => {
      setIsLoading(false);
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

      {/* Exchange Sections Container */}
      <div className="exchange-sections">
        {/* Send Section */}
        <div className="send-section">
          <div className="section-label">Send</div>
          <div className="input-row">
            <div className="amount-input">
              <input
                type="number"
                placeholder="00.00"
                value={amountIn}
                onChange={(e) => {
                  setAmountIn(e.target.value);
                  setQuote(null);
                }}
                min="0"
                step="any"
              />
            </div>
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
                    subLabel: `Tokens available: ${token.balance} / ${
                      token.blockchain || "NEAR Protocol"
                    }`,
                  })),
                  defaultLabel: "Select token",
                  showSearch: true,
                  searchInputPlaceholder: "Search token...",
                  searchByLabel: true,
                }}
              />
            </div>
          </div>
          <div className="value-display">
            {tokenIn && intentsTokensIn.find((t) => t.id === tokenIn) ? (
              <>
                ${parseFloat(amountIn || 0).toFixed(2)}
                {" • "}
                NEAR Intents balance:{" "}
                {intentsTokensIn.find((t) => t.id === tokenIn)?.balance ||
                  "0.00"}{" "}
                {intentsTokensIn.find((t) => t.id === tokenIn)?.symbol}
              </>
            ) : (
              "$00.00"
            )}
          </div>
        </div>

        {/* Swap Divider with Icon */}
        <div className="swap-divider">
          <div className="swap-icon-container">
            <i className="bi bi-arrow-down-up swap-icon"></i>
          </div>
        </div>

        {/* Receive Section */}
        <div className="receive-section">
          <div className="section-label">Receive</div>
          <div className="input-row">
            <div className="amount-input">
              <input
                type="text"
                placeholder={
                  isLoadingQuote
                    ? "Fetching..."
                    : quote && quote.amountOutFormatted
                    ? quote.amountOutFormatted
                    : "00.00"
                }
                readOnly
                disabled
              />
            </div>
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
          <div className="value-display">
            {quote && quote.amountOutUsd ? `$${quote.amountOutUsd}` : "$00.00"}
          </div>
        </div>
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
        {isLoadingQuote ? (
          <button className="btn btn-primary" disabled>
            <span
              className="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            ></span>
            Fetching Quote...
          </button>
        ) : quote ? (
          <button
            className="btn btn-success"
            onClick={handleSubmit}
            disabled={isLoading || !quote.deadline}
          >
            {isLoading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Creating Proposal...
              </>
            ) : (
              "Create Proposal"
            )}
          </button>
        ) : (
          <button
            className="btn btn-primary"
            disabled
            title="Fill in all fields to get a quote"
          >
            Get Quote
          </button>
        )}
      </div>
    </div>
  </Container>
);
