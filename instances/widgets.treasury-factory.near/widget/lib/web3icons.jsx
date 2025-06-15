// Web3Icons Library for BOS Components
// Provides batch icon fetching functionality with caching

// Function to generate iframe HTML for batch icon fetching
const generateBatchIconHTML = (symbols) => {
  const symbolsArray = JSON.stringify(symbols);
  return `<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import * as web3Icons from 'https://cdn.jsdelivr.net/npm/@web3icons/core@4/+esm';
    
    const symbols = ${symbolsArray};
    console.log('Iframe loading for symbols:', symbols);
    
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
      
      console.log('Sending batch response with', Object.keys(results).length, 'icons');
      // Send all results back to parent
      window.parent.postMessage({
        handler: 'batchIconResponse',
        results
      }, '*');
    } catch (error) {
      console.error('Error in iframe:', error);
      window.parent.postMessage({
        handler: 'batchIconResponse',
        results: {},
        error: error.message
      }, '*');
    }
  </script>
</head>
<body style="margin:0;padding:0;width:1px;height:1px;"></body>
</html>`;
};

// Create web3icons service for a component
const createWeb3IconsService = (props) => {
  const fallbackIconMap = props.fallbackIconMap || {};
  const onIconsLoaded = props.onIconsLoaded || (() => {});
  const currentState = props.state || {};
  const updateState = props.updateState || (() => {});

  // Initialize state structure if not exists
  const iconCache = currentState.web3IconsCache || {};
  const iconsFetched = currentState.web3IconsFetched || false;
  const symbolsToFetch = currentState.web3IconsSymbolsToFetch || [];

  // Function to trigger batch icon fetching
  const fetchIconsForSymbols = (symbols) => {
    if (!symbols || symbols.length === 0) return;
    
    // Filter out already cached symbols
    const uncachedSymbols = symbols.filter(symbol => 
      !iconCache[symbol] && !symbolsToFetch.includes(symbol)
    );
    
    if (uncachedSymbols.length > 0 && !iconsFetched) {
      updateState({
        web3IconsSymbolsToFetch: [...symbolsToFetch, ...uncachedSymbols],
      });
    }
  };

  // Function to get icon from cache with fallback
  const getIconForToken = (symbol) => {
    // Check web3icons cache first
    if (iconCache && iconCache[symbol]) {
      const cachedValue = iconCache[symbol];
      // Return null if it was previously not found, otherwise return the cached icon
      return cachedValue === "NOT_FOUND" ? null : cachedValue;
    }

    // Return fallback while waiting for batch response or if not cached
    return fallbackIconMap[symbol.toUpperCase()] || null;
  };

  // Function to handle batch icon response
  const handleBatchIconResponse = (e) => {
    if (e.handler === "batchIconResponse") {
      const results = e.results;
      const error = e.error;
      console.log(
        "Received batch icon response with",
        Object.keys(results || {}).length,
        "icons"
      );

      // Build cache from results, marking missing icons as "NOT_FOUND"
      const newCache = { ...iconCache };
      for (const symbol of symbolsToFetch) {
        newCache[symbol] = results[symbol] || "NOT_FOUND";
      }

      // Update cache and mark icons as fetched
      updateState({
        web3IconsCache: newCache,
        web3IconsFetched: true,
        web3IconsSymbolsToFetch: [], // Clear the fetch list
      });

      // Call callback
      onIconsLoaded(newCache);

      if (error) {
        console.error("Error in batch icon fetch:", error);
      }
    }
  };

  // Render iframe if needed
  const renderIconServiceIframe = () => {
    if (symbolsToFetch && symbolsToFetch.length > 0 && !iconsFetched) {
      return (
        <iframe
          srcDoc={generateBatchIconHTML(symbolsToFetch)}
          style={{ display: "none" }}
          onMessage={handleBatchIconResponse}
        />
      );
    }
    return null;
  };

  return {
    fetchIconsForSymbols,
    getIconForToken,
    renderIconServiceIframe,
    isReady: iconsFetched,
    cache: iconCache,
  };
};

return {
  generateBatchIconHTML,
  createWeb3IconsService,
};