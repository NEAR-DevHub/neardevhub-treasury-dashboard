const { Modal, ModalContent, ModalHeader, ModalFooter } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal"
);

if (!Modal || !ModalContent || !ModalHeader || !ModalFooter) {
  return <></>;
}

if (!props.show) {
  return <></>;
}

// Initialize state for the entire component
State.init({
  activeTab: props.initialTab || "sputnik",
  allFetchedTokens: [],
  assetNamesForDropdown: [],
  selectedAssetName: "",
  networksForSelectedAssetDropdown: [],
  selectedNetworkFullInfo: null,
  intentsDepositAddress: "",
  isLoadingTokens: false,
  isLoadingAddress: false,
  errorApi: null,
  web3IconsCache: {},
  allTokensForIcons: [], // All tokens (assets + networks) for one-time icon fetching
  allIconsFetched: false, // Track if all icons have been fetched
});

const activeTab = state.activeTab;
const sputnikAddress = props.treasuryDaoID;
const nearIntentsTargetAccountId = props.treasuryDaoID;

const allTokens =
  fetch("https://api-mng-console.chaindefuser.com/api/tokens").body?.items ||
  [];

const defuse_asset_id_to_chain_map = {};
const iconMap = {};
for (const token of allTokens) {
  const ftMetadata = Near.view(
    token.defuse_asset_id.substring("nep141:".length),
    "ft_metadata",
    {}
  );
  if (ftMetadata?.icon) {
    //iconMap[token.symbol.toUpperCase()] = ftMetadata.icon;
  }
  defuse_asset_id_to_chain_map[token.defuse_asset_id] = token.blockchain;
}

// Callback when all icons are loaded from Web3Icons widget
const handleAllIconsLoaded = (iconCache) => {
  State.update({
    web3IconsCache: Object.assign({}, state.web3IconsCache, iconCache),
    allIconsFetched: true,
  });
  console.log(
    "All icons loaded:",
    Object.keys(iconCache).length,
    "cached icons"
  );

  // Re-build network options with updated icons if we have a selected asset
  if (state.selectedAssetName) {
    updateNetworksForAsset(state.selectedAssetName);
  }
};

// Function to get enhanced icons from cache
const getTokenIcon = (symbol) => {
  if (state.web3IconsCache && state.web3IconsCache[symbol]) {
    const cached = state.web3IconsCache[symbol];
    if (cached !== "NOT_FOUND") {
      return cached.tokenIcon || cached;
    }
  }
  return iconMap[symbol.toUpperCase()] || null;
};

const getNetworkIcon = (symbol, networkId) => {
  if (!networkId) return null;

  const key = `${symbol}:${networkId}`;
  if (state.web3IconsCache && state.web3IconsCache[key]) {
    const cached = state.web3IconsCache[key];
    if (cached !== "NOT_FOUND" && cached.networkIcon) {
      return cached.networkIcon;
    }
  }
  return null;
};

// Function to fetch tokens when switching to intents tab
const fetchIntentsTokens = () => {
  if (activeTab !== "intents") {
    State.update({
      allFetchedTokens: [],
      assetNamesForDropdown: [],
      selectedAssetName: "",
      networksForSelectedAssetDropdown: [],
      selectedNetworkFullInfo: null,
      intentsDepositAddress: "",
      errorApi: null,
      allTokensForIcons: [],
      allIconsFetched: false,
    });
    return;
  }

  State.update({
    isLoadingTokens: true,
    errorApi: null,
    allFetchedTokens: [],
    assetNamesForDropdown: [],
    selectedAssetName: "",
    networksForSelectedAssetDropdown: [],
    selectedNetworkFullInfo: null,
    intentsDepositAddress: "",
  });

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
        throw new Error(
          `HTTP error! status: ${res.status} ${res.statusText}. Body: ${res.body}`
        );
      }
      const data = res.body;
      if (data.error) {
        throw new Error(
          data.error.message || "Error fetching all supported tokens."
        );
      }
      if (data.result && data.result.tokens) {
        const filteredTokens = data.result.tokens.filter(
          (token) => token.standard === "nep141"
        );
        const uniqueAssetNames = Array.from(
          new Set(data.result.tokens.map((t) => t.asset_name))
        )
          .filter((name) => name) // Ensure name is not null or empty
          .sort();

        // Collect all tokens for one-time icon fetching optimization
        // This includes both simple asset names and network-specific tokens
        // to avoid individual Web3IconFetcher calls when dropdowns are populated
        const allTokensForIcons = [];
        const seenAssetNames = new Set();
        const seenNetworkKeys = new Set();

        // First, collect unique asset names for simple asset icon fetching
        uniqueAssetNames.forEach((assetName) => {
          if (!seenAssetNames.has(assetName)) {
            seenAssetNames.add(assetName);
            allTokensForIcons.push(assetName); // Simple string for asset icons
          }
        });

        // Then, collect network-specific tokens for network icon fetching
        data.result.tokens.forEach((token) => {
          if (!token.defuse_asset_identifier || !token.asset_name) return;

          const parts = token.defuse_asset_identifier.split(":");
          let chainId;
          if (parts.length >= 2) {
            chainId = parts.slice(0, 2).join(":");
          } else {
            chainId = parts[0];
          }

          const networkKey = `${token.asset_name}:${chainId}`;
          if (!seenNetworkKeys.has(networkKey)) {
            seenNetworkKeys.add(networkKey);
            allTokensForIcons.push({
              symbol: token.asset_name,
              networkId: chainId,
            });
          }
        });

        State.update({
          allFetchedTokens: filteredTokens,
          assetNamesForDropdown: uniqueAssetNames,
          errorApi:
            uniqueAssetNames.length === 0
              ? "No bridgeable assets found."
              : null,
          allTokensForIcons: allTokensForIcons, // All tokens for one-time fetching
        });
      } else {
        State.update({
          errorApi: "No bridgeable assets found or unexpected API response.",
          allFetchedTokens: [],
          assetNamesForDropdown: [],
          allTokensForIcons: [],
        });
      }
    })
    .catch((err) => {
      console.error("Failed to fetch all supported tokens:", err);
      State.update({
        errorApi: err.message || "Failed to fetch assets. Please try again.",
        allFetchedTokens: [],
        assetNamesForDropdown: [],
        allTokensForIcons: [],
      });
    })
    .finally(() => {
      State.update({ isLoadingTokens: false });
    });
};

// Function to update networks when asset changes
const updateNetworksForAsset = (assetName) => {
  if (!assetName || state.allFetchedTokens.length === 0) {
    State.update({
      networksForSelectedAssetDropdown: [],
      selectedNetworkFullInfo: null,
      intentsDepositAddress: "",
    });
    return;
  }

  const tokensOfSelectedAsset = state.allFetchedTokens.filter(
    (token) => token.asset_name === assetName
  );

  const networks = tokensOfSelectedAsset
    .map((token) => {
      if (!token.defuse_asset_identifier) return null;
      const parts = token.defuse_asset_identifier.split(":");
      // The first part of the defuse_asset_identitier is the blockchain id
      let chainId;
      if (parts.length >= 2) {
        chainId = parts.slice(0, 2).join(":");
      } else {
        chainId = parts[0];
      }

      // The API for all tokens has the property  `defuse_asset_id` which is the same as `intents_token_id`
      const intents_token_id = token.intents_token_id;
      const blockchainName =
        defuse_asset_id_to_chain_map[intents_token_id].toUpperCase();

      return {
        id: chainId, // This is the ID like "eth:1"
        name: `${blockchainName} ( ${chainId} )`,
        icon: getNetworkIcon(assetName, chainId), // Use enhanced network icon lookup
        near_token_id: token.near_token_id,
        originalTokenData: token,
      };
    })
    .filter((network) => network && network.id && network.near_token_id); // Ensure valid network objects

  State.update({
    networksForSelectedAssetDropdown: networks,
    selectedNetworkFullInfo: null,
    intentsDepositAddress: "",
  });
};

// Function to fetch deposit address when network changes
const fetchDepositAddress = (networkInfo) => {
  if (activeTab !== "intents" || !networkInfo || !nearIntentsTargetAccountId) {
    State.update({ intentsDepositAddress: "" });
    return;
  }

  State.update({
    isLoadingAddress: true,
    errorApi: null,
  });

  asyncFetch("https://bridge.chaindefuser.com/rpc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: "depositAddressFetch",
      jsonrpc: "2.0",
      method: "deposit_address",
      params: [
        {
          account_id: nearIntentsTargetAccountId,
          chain: networkInfo.id, // e.g., "eth:1"
        },
      ],
    }),
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(
          `HTTP error! status: ${res.status} ${res.statusText}. Body: ${res.body}`
        );
      }
      const data = res.body;
      if (data.error) {
        throw new Error(
          data.error.message || "Error fetching deposit address."
        );
      }
      if (data.result && data.result.address) {
        State.update({ intentsDepositAddress: data.result.address });
      } else {
        State.update({
          intentsDepositAddress: "",
          errorApi:
            "Could not retrieve deposit address for the selected asset and network.",
        });
      }
    })
    .catch((err) => {
      console.error("Failed to fetch deposit address:", err);
      State.update({
        errorApi:
          err.message || "Failed to fetch deposit address. Please try again.",
        intentsDepositAddress: "",
      });
    })
    .finally(() => {
      State.update({ isLoadingAddress: false });
    });
};

// Initialize data fetching if intents tab is active
if (
  activeTab === "intents" &&
  state.allFetchedTokens.length === 0 &&
  !state.isLoadingTokens
) {
  fetchIntentsTokens();
}

const sputnikWarning = (
  <div
    className="alert mt-2 mb-0 px-3 py-2"
    style={{
      background: "#47391c",
      color: "#ffb84d",
      fontWeight: 500,
      border: "none",
    }}
  >
    Only deposit from the NEAR network
    <br />
    <span style={{ fontWeight: 400, color: "#ffb84dcc" }}>
      Depositing using a different network will result in loss of funds.
    </span>
  </div>
);

const DynamicIntentsWarning = () => {
  if (!state.selectedAssetName || !state.selectedNetworkFullInfo) {
    return (
      <div
        className="alert alert-info d-flex align-items-center mt-2"
        role="alert"
      >
        <i className="bi bi-info-circle-fill me-2"></i>
        <div>
          Select an asset and network to see deposit instructions and address.
        </div>
      </div>
    );
  }

  return <></>;
};

// Enhanced icon mapping function with cache lookup
const getIconForTokenWithRequest = (symbol) => {
  return getTokenIcon(symbol);
};

return (
  <Modal props={{ minWidth: "700px" }}>
    {/* Single Web3IconFetcher for all icons - optimized to fetch all asset and network icons at once */}
    {state.allTokensForIcons.length > 0 && !state.allIconsFetched && (
      <Widget
        src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Web3IconFetcher"
        props={{
          tokens: state.allTokensForIcons,
          onIconsLoaded: handleAllIconsLoaded,
          fallbackIconMap: iconMap,
          fetchNetworkIcons: true, // Enable both asset and network icon fetching
        }}
      />
    )}

    <ModalHeader>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="d-flex gap-3">Deposit</div>
        <i
          className="bi bi-x-lg h4 mb-0 cursor-pointer"
          onClick={props.onClose}
        ></i>
      </div>
    </ModalHeader>
    <ModalContent>
      <ul className="nav nav-tabs mt-3">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "sputnik" ? "active" : ""}`}
            onClick={() => {
              State.update({ activeTab: "sputnik" });
            }}
          >
            Sputnik DAO
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "intents" ? "active" : ""}`}
            onClick={() => {
              const newTab = "intents";
              State.update({ activeTab: newTab });
              // Trigger token fetching if switching to intents
              if (
                newTab === "intents" &&
                state.allFetchedTokens.length === 0 &&
                !state.isLoadingTokens
              ) {
                fetchIntentsTokens();
              }
            }}
          >
            NEAR Intents
          </button>
        </li>
      </ul>

      {activeTab === "sputnik" && (
        <>
          <h5 className="mt-3">Use this deposit address</h5>
          <p className="mt-2 text-muted">
            Always double-check your deposit address — it may change without
            notice.
          </p>
          <div
            className="row g-0 align-items-start mb-2"
            style={{ marginTop: 8 }}
          >
            <div className="col-auto" style={{ paddingRight: 20 }}>
              {sputnikAddress && (
                <div
                  className="bg-dark-subtle rounded p-2"
                  style={{
                    display: "inline-block",
                    border: "1.5px solid #444",
                  }}
                >
                  <Widget
                    src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.QRCodeGenerator"
                    props={{
                      text: sputnikAddress,
                      cellSize: 4,
                      margin: 4,
                    }}
                  />
                </div>
              )}
            </div>
            <div className="col ps-0">
              <label className="form-label mb-1" style={{ fontWeight: 500 }}>
                Deposit Address
              </label>
              <div
                className="d-flex align-items-center mb-2"
                style={{ maxWidth: 420 }}
              >
                <div
                  className="form-control bg-dark-subtle text-light border-secondary pe-1"
                  style={{
                    fontFamily: "monospace",
                    fontSize: "1.1em",
                    display: "flex",
                  }}
                >
                  <div
                    style={{
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      flexGrow: "1",
                    }}
                  >
                    {sputnikAddress}
                  </div>
                  <Widget
                    src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Copy"
                    props={{
                      label: "",
                      clipboardText: sputnikAddress,
                      className:
                        "btn btn-sm btn-outline-secondary ms-n5 end-0 me-2",
                      iconOnly: true,
                    }}
                  />
                </div>
              </div>
              {sputnikWarning}
            </div>
          </div>
        </>
      )}

      {activeTab === "intents" && (
        <>
          <h6 className="mt-3">Select asset and network</h6>
          {/* Asset Selector */}
          <div className="mb-3">
            <label htmlFor="assetSelectIntents" className="form-label">
              Asset
            </label>
            <Widget
              src={
                "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDownWithSearchAndManualRequest"
              }
              props={{
                selectedValue: state.selectedAssetName,
                onChange: (option) => {
                  const newAssetName =
                    option && option.value !== undefined ? option.value : "";
                  State.update({ selectedAssetName: newAssetName });
                  updateNetworksForAsset(newAssetName);
                },
                options: state.assetNamesForDropdown.map((assetName) => ({
                  value: assetName,
                  label: assetName,
                  icon: getIconForTokenWithRequest(assetName), // Use enhanced icon function
                })),
                defaultLabel: state.isLoadingTokens
                  ? "Loading assets..."
                  : state.assetNamesForDropdown.length === 0
                  ? "No assets found"
                  : "Select an asset",
                showSearch: true,
                searchInputPlaceholder: "Search assets",
                searchByLabel: true,
              }}
            />
          </div>

          {/* Network Selector */}
          <div className="mb-3">
            <label htmlFor="networkSelectIntents" className="form-label">
              Network
            </label>

            <Widget
              src={
                "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDownWithSearchAndManualRequest"
              }
              props={{
                selectedValue: state.selectedNetworkFullInfo
                  ? state.selectedNetworkFullInfo.id
                  : "",
                onChange: (option) => {
                  const networkInfo =
                    option && option.value !== undefined
                      ? state.networksForSelectedAssetDropdown.find(
                          (n) => n.id === option.value
                        )
                      : null;
                  State.update({ selectedNetworkFullInfo: networkInfo });
                  fetchDepositAddress(networkInfo);
                },
                options: state.networksForSelectedAssetDropdown.map(
                  (network) => ({
                    value: network.id,
                    label: network.name,
                    icon: network.icon,
                  })
                ),
                defaultLabel: !state.selectedAssetName
                  ? "Select an asset first"
                  : state.networksForSelectedAssetDropdown.length === 0 &&
                    state.selectedAssetName &&
                    !state.isLoadingTokens
                  ? "No networks for this asset"
                  : "Select a network",
                showSearch: true,
                searchInputPlaceholder: "Search networks",
                searchByLabel: true,
                disabled:
                  state.isLoadingTokens ||
                  state.isLoadingAddress ||
                  !state.selectedAssetName ||
                  state.networksForSelectedAssetDropdown.length === 0,
              }}
            />
          </div>

          {state.isLoadingAddress && (
            <p className="mt-2">Loading deposit address...</p>
          )}
          {state.errorApi && (
            <div className="alert alert-danger mt-2">{state.errorApi}</div>
          )}

          {!state.isLoadingAddress && state.intentsDepositAddress ? (
            <>
              <h5>Use this deposit address</h5>
              <p className="mt-2 text-muted">
                Always double-check your deposit address — it may change without
                notice.
              </p>

              <div
                className="row g-0 align-items-start mb-2"
                style={{ marginTop: 8 }}
              >
                <div className="col-auto" style={{ paddingRight: 20 }}>
                  <div
                    className="bg-dark-subtle rounded p-2"
                    style={{
                      display: "inline-block",
                      border: "1.5px solid #444",
                    }}
                  >
                    <Widget
                      src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.QRCodeGenerator"
                      props={{
                        text: state.intentsDepositAddress,
                        cellSize: 4,
                        margin: 4,
                      }}
                    />
                  </div>
                </div>
                <div className="col ps-0">
                  <label
                    className="form-label mb-1"
                    style={{ fontWeight: 500 }}
                  >
                    Deposit Address
                  </label>
                  <div
                    className="d-flex align-items-center mb-2"
                    style={{ maxWidth: 420 }}
                  >
                    <div
                      className="form-control bg-dark-subtle text-light border-secondary pe-1"
                      style={{
                        fontFamily: "monospace",
                        fontSize: "1.1em",
                        display: "flex",
                      }}
                    >
                      <div
                        style={{
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          flexGrow: "1",
                        }}
                      >
                        {state.intentsDepositAddress}
                      </div>
                      <Widget
                        src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Copy"
                        props={{
                          label: "",
                          clipboardText: state.intentsDepositAddress,
                          className:
                            "btn btn-sm btn-outline-secondary ms-n5 end-0 me-2",
                          iconOnly: true,
                        }}
                      />
                    </div>
                  </div>
                  <div
                    className="alert mt-2 mb-0 px-3 py-2"
                    style={{
                      background: "#47391c",
                      color: "#ffb84d",
                      fontWeight: 500,
                      border: "none",
                    }}
                  >
                    Only deposit {state.selectedAssetName} from the{" "}
                    {state.selectedNetworkFullInfo?.name?.toLowerCase()} network
                    <br />
                    <span style={{ fontWeight: 400, color: "#ffb84dcc" }}>
                      Depositing other assets or using a different network will
                      result in loss of funds
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            !state.isLoadingAddress &&
            state.selectedAssetName &&
            state.selectedNetworkFullInfo &&
            !state.errorApi && (
              <p className="mt-3 fst-italic">
                Could not load deposit address. Please ensure your selection is
                valid or try again.
              </p>
            )
          )}
          <DynamicIntentsWarning />
        </>
      )}
    </ModalContent>
    <ModalFooter>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={props.onClose}
      >
        Close
      </button>
    </ModalFooter>
  </Modal>
);
