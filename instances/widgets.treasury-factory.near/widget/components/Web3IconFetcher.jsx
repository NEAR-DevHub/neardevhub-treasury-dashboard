/**
 * Web3IconFetcher Widget
 *
 * Fetches both asset and network icons using @web3icons/common
 * for accurate metadata mapping and better icon coverage.
 *
 * Props:
 * - tokens: array of token objects with {symbol, networkId} or just strings for symbols
 * - onIconsLoaded: callback function that receives the icon cache object
 * - fetchNetworkIcons: boolean to enable network icon fetching (default: false)
 */

// Initialize state for icon fetching
State.init({
  iconCache: {},
  isLoading: false,
  tokensToFetch: [],
  hasStartedFetching: false,
});

const tokens = props.tokens || props.symbols || []; // Support both new and legacy prop names
const onIconsLoaded = props.onIconsLoaded || (() => {});
const fetchNetworkIcons = props.fetchNetworkIcons || false;

// Function to generate iframe HTML for enhanced icon fetching
const generateEnhancedIconHTML = () => {
  return `<!DOCTYPE html>
<html>
<head>
  <script type="module">
    let tokens = [];
    let fetchNetworkIcons = false;
    
    // Listen for message from parent (correct BOS pattern)
    window.addEventListener("message", function(event) {
      tokens = event.data.tokens || [];
      fetchNetworkIcons = event.data.fetchNetworkIcons || false;
       
      // Start the icon fetching process
      processIconFetching();
    });
    
    async function processIconFetching() {
      // Import both core and common packages
      const web3IconsCommon = await import('https://cdn.jsdelivr.net/npm/@web3icons/common@0.11.12/dist/index.min.js');
      const web3IconsCore = await import('https://cdn.jsdelivr.net/npm/@web3icons/core@4.0.15/+esm');
      
      const results = {};
      
      try {
        for (const tokenInput of tokens) {
        // Handle both string symbols and token objects
        const isTokenObject = typeof tokenInput === 'object';
        const symbol = isTokenObject ? tokenInput.symbol : tokenInput;
        const networkId = isTokenObject ? tokenInput.networkId : null;
        
        let tokenIcon = null;
        let networkIcon = null;
        
        // Find token in web3icons metadata
        const web3IconToken = web3IconsCommon.tokens.find(t => 
          t.symbol.toLowerCase() === symbol.toLowerCase()
        );
        
        if (web3IconToken && web3IconsCore.svgs.tokens.background[web3IconToken.fileName]) {
          tokenIcon = web3IconsCore.svgs.tokens.background[web3IconToken.fileName].default;
        }
        
        // Network icon matching (if requested and networkId provided)
        if (fetchNetworkIcons && networkId && web3IconToken) {
          let web3IconNetwork = null;
          
          // Try multiple matching strategies
          const parts = networkId.split(':');
          const layer1 = parts[0];
          const layer2 = parts[1];
          
          // 1. Match by exact chainId
          if (layer2) {
            web3IconNetwork = web3IconsCommon.networks.find(n => 
              \`\${n.chainId}\` === layer2
            );
          }
          
          // 2. Match by network ID starting with layer1
          if (!web3IconNetwork && layer1) {
            web3IconNetwork = web3IconsCommon.networks.find(n => 
              n.id.startsWith(layer1)
            );
          }
          
          // 3. Match by token's native network
          if (!web3IconNetwork) {
            web3IconNetwork = web3IconsCommon.networks.find(n => 
              n.id === web3IconToken.id
            );
          }
          
          if (web3IconNetwork && web3IconsCore.svgs.networks.background[web3IconNetwork.fileName]) {
            networkIcon = web3IconsCore.svgs.networks.background[web3IconNetwork.fileName].default;
          }
        }
        
        // Store results
        const key = isTokenObject ? \`\${symbol}:\${networkId || 'default'}\` : symbol;
        results[key] = {
          tokenIcon: tokenIcon ? \`data:image/svg+xml;base64,\${btoa(tokenIcon)}\` : null,
          networkIcon: networkIcon ? \`data:image/svg+xml;base64,\${btoa(networkIcon)}\` : null,
          symbol: symbol,
          networkId: networkId,
        };
      }
      
      window.parent.postMessage({
        handler: 'web3IconFetcherResponse',
        results
      }, '*');
      
    } catch (error) {
      console.error('Error in Web3IconFetcher:', error);
      window.parent.postMessage({
        handler: 'web3IconFetcherResponse',
        results: {},
        error: error.message
      }, '*');
    }
    }
  </script>
</head>
<body style="margin:0;padding:0;width:1px;height:1px;"></body>
</html>`;
};

// Function to handle iframe messages
const handleIconResponse = (e) => {
  const handler = (e.data && e.data.handler) || e.handler;
  const results = (e.data && e.data.results) || e.results || {};
  const error = (e.data && e.data.error) || e.error;

  if (handler === "web3IconFetcherResponse") {
    // Build cache from results
    const newCache = Object.assign({}, state.iconCache);
    for (const token of state.tokensToFetch) {
      const key =
        typeof token === "object"
          ? `${token.symbol}:${token.networkId || "default"}`
          : token;
      const result = results[key];

      if (result) {
        // Store both token and network icons
        newCache[key] = result;

        // Also store simple symbol mapping for backward compatibility
        if (!result.tokenIcon) {
          result.tokenContract = token.ftContractId;
        }
      }
    }

    // Update state and call callback
    State.update({
      iconCache: newCache,
      isLoading: false,
      hasStartedFetching: true,
    });

    // Call the callback with the new cache
    onIconsLoaded(newCache);

    if (error) {
      console.error("Error in Enhanced Web3IconFetcher:", error);
    }
  } else {
    console.log(
      "handleIconResponse called but handler not web3IconFetcherResponse. Handler:",
      handler
    );
  }
};

// Determine which tokens need fetching
const getTokenKey = (token) => {
  return typeof token === "object"
    ? `${token.symbol}:${token.networkId || "default"}`
    : token;
};

const uncachedTokens = tokens.filter((token) => {
  const key = getTokenKey(token);
  return (
    !state.iconCache[key] &&
    !state.tokensToFetch.find((t) => getTokenKey(t) === key)
  );
});

// Start fetching if we have new tokens and haven't started yet
if (
  uncachedTokens.length > 0 &&
  !state.isLoading &&
  !state.hasStartedFetching
) {
  State.update({
    tokensToFetch: uncachedTokens,
    isLoading: true,
  });
}

// Enhanced API for getting icons
const getIconForToken = (tokenOrSymbol, networkId) => {
  if (networkId === undefined) {
    networkId = null;
  }
  let key;
  if (typeof tokenOrSymbol === "object") {
    key = `${tokenOrSymbol.symbol}:${tokenOrSymbol.networkId || "default"}`;
  } else if (networkId) {
    key = `${tokenOrSymbol}:${networkId}`;
  } else {
    key = tokenOrSymbol;
  }

  const cached = state.iconCache[key];
  if (cached && cached !== "NOT_FOUND") {
    // Return token icon if it's the enhanced format, otherwise the cached value
    return cached.tokenIcon || cached;
  }

  return null;
};

const getNetworkIcon = (tokenOrSymbol, networkId) => {
  if (networkId === undefined) {
    networkId = null;
  }
  let key;
  if (typeof tokenOrSymbol === "object") {
    key = `${tokenOrSymbol.symbol}:${tokenOrSymbol.networkId || "default"}`;
  } else if (networkId) {
    key = `${tokenOrSymbol}:${networkId}`;
  } else {
    return null; // No network icon without networkId
  }

  const cached = state.iconCache[key];
  if (cached && cached !== "NOT_FOUND" && cached.networkIcon) {
    return cached.networkIcon;
  }

  return null;
};

// Expose enhanced API to parent via callback (backward compatible)
if (props.onApiReady && typeof props.onApiReady === "function") {
  props.onApiReady({
    getIconForSymbol: getIconForToken, // Backward compatibility
    getIconForToken,
    getNetworkIcon,
    cache: state.iconCache,
  });
}

return (
  <div style={{ display: "none" }}>
    {/* Render iframe if we need to fetch icons */}
    {state.isLoading && state.tokensToFetch.length > 0 && (
      <iframe
        srcDoc={generateEnhancedIconHTML()}
        style={{ display: "none" }}
        message={{
          tokens: state.tokensToFetch,
          fetchNetworkIcons: fetchNetworkIcons,
        }}
        onMessage={handleIconResponse}
      />
    )}
  </div>
);
