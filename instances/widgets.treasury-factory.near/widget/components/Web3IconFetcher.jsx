/**
 * Web3IconFetcher Widget
 * 
 * A reusable widget that fetches icons from @web3icons/core CDN in batch
 * and provides them back via a callback function.
 * 
 * Props:
 * - symbols: array of token/network symbols to fetch icons for
 * - onIconsLoaded: callback function that receives the icon cache object
 * - fallbackIconMap: optional fallback icons to use while loading
 */

// Initialize state for icon fetching
State.init({
  iconCache: {},
  isLoading: false,
  symbolsToFetch: [],
  hasStartedFetching: false,
});

const symbols = props.symbols || [];
const onIconsLoaded = props.onIconsLoaded || (() => {});
const fallbackIconMap = props.fallbackIconMap || {};

// Function to generate iframe HTML for batch icon fetching
const generateBatchIconHTML = (symbolsToFetch) => {
  const symbolsArray = JSON.stringify(symbolsToFetch);
  return `<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import * as web3Icons from 'https://cdn.jsdelivr.net/npm/@web3icons/core@4/+esm';
    
    const symbols = ${symbolsArray};
    console.log('Web3IconFetcher iframe loading for symbols:', symbols);
    
    const results = {};
    
    try {
      for (const symbol of symbols) {
        const normalizedSymbol = symbol.toUpperCase();
        const possibleNames = [
          \`TokenBranded\${normalizedSymbol}\`,
          \`TokenMono\${normalizedSymbol}\`,
          \`TokenBackground\${normalizedSymbol}\`,
          \`NetworkBranded\${normalizedSymbol}\`,
        ];
        
        let iconData = null;
        for (const exportName of possibleNames) {
          if (web3Icons[exportName]) {
            const svgContent = web3Icons[exportName].default || web3Icons[exportName];
            iconData = \`data:image/svg+xml;base64,\${btoa(svgContent)}\`;
            break;
          }
        }
        
        results[symbol] = iconData;
      }
      
      console.log('Web3IconFetcher sending batch response with', Object.keys(results).length, 'icons');
      // Send all results back to parent
      window.parent.postMessage({
        handler: 'web3IconFetcherResponse',
        results
      }, '*');
    } catch (error) {
      console.error('Error in Web3IconFetcher iframe:', error);
      window.parent.postMessage({
        handler: 'web3IconFetcherResponse',
        results: {},
        error: error.message
      }, '*');
    }
  </script>
</head>
<body style="margin:0;padding:0;width:1px;height:1px;"></body>
</html>`;
};

// Function to handle iframe messages
const handleIconResponse = (e) => {
  if (e.data && e.data.handler === "web3IconFetcherResponse") {
    const results = e.data.results || {};
    const error = e.data.error;
    
    console.log(
      "Web3IconFetcher received batch response with",
      Object.keys(results).length,
      "icons"
    );

    // Build cache from results, marking missing icons as "NOT_FOUND"
    const newCache = { ...state.iconCache };
    for (const symbol of state.symbolsToFetch) {
      newCache[symbol] = results[symbol] || "NOT_FOUND";
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
      console.error("Error in Web3IconFetcher batch fetch:", error);
    }
  }
};

// Register message listener
if (typeof window !== "undefined") {
  window.addEventListener("message", handleIconResponse);
}

// Determine which symbols need fetching
const uncachedSymbols = symbols.filter(symbol => 
  !state.iconCache[symbol] && !state.symbolsToFetch.includes(symbol)
);

// Start fetching if we have new symbols and haven't started yet
if (uncachedSymbols.length > 0 && !state.isLoading && !state.hasStartedFetching) {
  State.update({
    symbolsToFetch: uncachedSymbols,
    isLoading: true,
  });
}

// Create a public API for getting icons (for use by parent components)
const getIconForSymbol = (symbol) => {
  // Check cache first
  if (state.iconCache[symbol]) {
    const cachedValue = state.iconCache[symbol];
    // Return null if it was previously not found, otherwise return the cached icon
    return cachedValue === "NOT_FOUND" ? null : cachedValue;
  }

  // Return fallback while waiting for batch response or if not cached
  return fallbackIconMap[symbol.toUpperCase()] || null;
};

// Expose the getIconForSymbol function to parent via callback
if (props.onApiReady && typeof props.onApiReady === "function") {
  props.onApiReady({ getIconForSymbol, cache: state.iconCache });
}

return (
  <div style={{ display: "none" }}>
    {/* Render iframe if we need to fetch icons */}
    {state.isLoading && state.symbolsToFetch.length > 0 && (
      <iframe
        srcDoc={generateBatchIconHTML(state.symbolsToFetch)}
        style={{ display: "none" }}
      />
    )}
  </div>
);
