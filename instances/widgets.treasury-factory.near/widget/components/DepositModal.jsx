const { Modal, ModalContent, ModalHeader, ModalFooter } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal"
);

const { CardSkeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
) || { CardSkeleton: () => <></> };

if (!Modal || !ModalContent || !ModalHeader || !ModalFooter) {
  return <></>;
}

if (!props.show) {
  return <></>;
}

const Container = styled.div`
  min-height: 500px;
  .warning-box {
    background: rgba(255, 158, 0, 0.1);
    color: var(--other-warning);
    font-weight: 500;
    font-size: 13px;
  }

  .drop-btn {
    width: 100%;
    text-align: left;
  }

  /* Fix dropdown toggle icon wrapping for DropDownWithSearchAndManualRequest */
  .custom-select .dropdown-toggle {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .custom-select .dropdown-toggle .bi {
    flex-shrink: 0;
    margin-left: auto;
  }

  /* Fix Bootstrap dropdown arrow positioning */
  .custom-select .dropdown-toggle:after {
    flex-shrink: 0;
    margin-left: 8px;
    position: static !important;
    top: auto !important;
    right: auto !important;
  }

  /* Ensure dropdown container has proper flex properties */
  .custom-select {
    min-width: 0;
  }

  /* Fix selected option text wrapping */
  .custom-select .selected-option {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  /* Ensure dropdown menu maintains full width */
  .custom-select .dropdown-menu {
    width: 100% !important;
    min-width: 100% !important;
    left: 0 !important;
    right: auto !important;
  }

  /* Fix dropdown container positioning */
  .custom-select {
    position: relative;
    width: 100%;
  }

  .info-box {
    background: var(--grey-04);
    color: var(--grey-02);
    font-weight: 500;
    font-size: 13px;
    padding: 12px;
  }
`;

const DepositAddressSection = ({ address, warningMessage, warningDetails }) => {
  return (
    <>
      <h5 className="mt-3">Use this deposit address</h5>
      <p className="mt-2 text-secondary">
        Always double-check your deposit address — it may change without notice.
      </p>
      <div className="d-flex align-items-start mb-2">
        <div className="me-3">
          {address && (
            <div className="d-inline-block rounded-3 p-3 border border-1">
              <Widget
                src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.QRCodeGenerator"
                props={{
                  text: address,
                }}
              />
            </div>
          )}
        </div>
        <div className="w-100" style={{ overflow: "auto" }}>
          <div className="d-flex flex-column gap-3">
            <div className="d-flex flex-column gap-1">
              <label>Deposit Address</label>
              <div className="d-flex align-items-center w-100">
                <div
                  className="d-flex form-control border border-1 pe-1"
                  style={{
                    fontFamily: "monospace",
                    fontSize: "1.1em",
                  }}
                >
                  <div className="text-truncate flex-grow-1">{address}</div>
                  <Widget
                    src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Copy"
                    props={{
                      label: "",
                      clipboardText: address,
                      className: "px-2",
                      showLogo: true,
                      logoDimensions: { height: 20, width: 20 },
                    }}
                  />
                </div>
              </div>
            </div>
            {warningMessage && (
              <div className="px-3 py-2 warning-box rounded-3 d-flex flex-column gap-1">
                <div className="fw-bolder">{warningMessage}</div>
                <div>
                  We recommend starting with a small test transaction to ensure
                  everything works correctly before sending the full amount.
                  Using a different network may result in the loss of funds.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

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
  tokenIconMap: {}, // Map for token icons
  allTokensForIcons: [], // All tokens (assets + networks) for one-time icon fetching
  allIconsFetched: false, // Track if all icons have been fetched
});

const activeTab = state.activeTab;
const sputnikAddress = props.treasuryDaoID;
const nearIntentsTargetAccountId = props.treasuryDaoID;

// Callback when all icons are loaded from Web3Icons widget
const handleAllIconsLoaded = (iconCache) => {
  const tokenIconMap = {};
  Object.keys(iconCache).forEach((symbol) => {
    const cached = iconCache[symbol];
    if (cached !== "NOT_FOUND" && cached.tokenIcon) {
      tokenIconMap[cached.symbol] = cached.tokenIcon;
    }
    State.update({
      tokenIconMap,
      web3IconsCache: Object.assign({}, state.web3IconsCache, iconCache),
      allIconsFetched: true,
    });
  });
};

const getNetworkIcon = (networkId) => {
  if (!networkId) return null;

  const key = networkId;
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

  if (state.isLoadingTokens || state.allFetchedTokens.length > 0) {
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
              ftContractId: token.near_token_id,
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

      const networkCache = state.web3IconsCache[chainId];
      const networkName = networkCache?.networkName;

      // The API for all tokens has the property  `defuse_asset_id` which is the same as `intents_token_id`
      const intents_token_id = token.intents_token_id;

      return {
        id: chainId, // This is the ID like "eth:1"
        name: `${networkName} (${chainId})`,
        icon: getNetworkIcon(chainId), // Use enhanced network icon lookup
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
    intentsDepositAddress: "",
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
useEffect(() => {
  if (
    activeTab === "intents" &&
    state.allFetchedTokens.length === 0 &&
    !state.isLoadingTokens
  ) {
    fetchIntentsTokens();
  }
}, [activeTab]);

const DynamicIntentsWarning = () => {
  if (!state.selectedAssetName || !state.selectedNetworkFullInfo) {
    return (
      <div className="info-box d-flex align-items-center gap-2 rounded-3">
        <i className="bi bi-info-circle"></i>
        <div>
          Select an asset and network to see deposit instructions and address.
        </div>
      </div>
    );
  }

  return <></>;
};

return (
  <Modal props={{ minWidth: "700px" }}>
    <ModalHeader>
      <div className="d-flex align-items-center justify-content-between">
        <div className="h4 mb-0">Deposit</div>

        <i
          className="bi bi-x-lg h4 mb-0 cursor-pointer"
          onClick={props.onClose}
        ></i>
      </div>
    </ModalHeader>
    <ModalContent>
      <Container>
        <Widget
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TabsToggle"
          props={{
            options: [
              { label: "Sputnik DAO", value: "sputnik" },
              { label: "NEAR Intents", value: "intents" },
            ],
            activeTab: activeTab,
            onTabChange: (tabValue) => {
              State.update({ activeTab: tabValue });
            },
          }}
        />

        {activeTab === "sputnik" && (
          <DepositAddressSection
            address={sputnikAddress}
            warningMessage="Only deposit from the NEAR network"
          />
        )}

        {activeTab === "intents" && (
          <>
            {/* Single Web3IconFetcher for all icons - optimized to fetch all asset and network icons at once */}
            {state.allTokensForIcons.length > 0 && !state.allIconsFetched && (
              <Widget
                src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Web3IconFetcher"
                props={{
                  tokens: state.allTokensForIcons,
                  onIconsLoaded: handleAllIconsLoaded,
                  fetchNetworkIcons: true, // Enable both asset and network icon fetching
                }}
              />
            )}
            <h6 className="my-3">Select asset and network</h6>
            {/* Asset Selector */}
            <div className="mb-3">
              <Widget
                loading=""
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
                    icon: state.tokenIconMap[assetName],
                  })),
                  defaultLabel: state.isLoadingTokens
                    ? "Loading assets..."
                    : state.assetNamesForDropdown.length === 0
                    ? "No assets found"
                    : !state.allIconsFetched
                    ? "Loading asset icons..."
                    : "Select Asset",
                  showSearch: true,
                  searchInputPlaceholder: "Search assets",
                  searchByLabel: true,
                }}
              />
            </div>

            {/* Network Selector */}
            <div className="mb-3">
              <Widget
                loading=""
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
                    ? "Select Asset first"
                    : state.networksForSelectedAssetDropdown.length === 0 &&
                      state.selectedAssetName &&
                      !state.isLoadingTokens
                    ? "No networks for this asset"
                    : "Select Network",
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
              <div className="d-flex flex-column gap-3">
                <div className="d-flex flex-column gap-3 w-100">
                  <div style={{ height: 20, width: "20%" }}>
                    <CardSkeleton />
                  </div>
                  <div style={{ height: 20, width: "50%" }}>
                    <CardSkeleton />
                  </div>
                </div>
                <div className=" d-flex gap-2">
                  <div style={{ height: 150, width: "40%" }}>
                    <CardSkeleton />
                  </div>
                  <div className="d-flex flex-column gap-3 w-100">
                    <div style={{ height: 20, width: "100%" }}>
                      <CardSkeleton />
                    </div>
                    <div style={{ height: 30, width: "100%" }}>
                      <CardSkeleton />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {state.errorApi && (
              <div className="alert alert-danger mt-2">{state.errorApi}</div>
            )}

            {!state.isLoadingAddress && state.intentsDepositAddress ? (
              <DepositAddressSection
                address={state.intentsDepositAddress}
                warningMessage={`Only deposit ${
                  state.selectedAssetName
                } from the ${state.selectedNetworkFullInfo?.name?.toLowerCase()} network`}
              />
            ) : (
              !state.isLoadingAddress &&
              state.selectedAssetName &&
              state.selectedNetworkFullInfo &&
              !state.errorApi && (
                <p className="mt-3 fst-italic">
                  Could not load deposit address. Please ensure your selection
                  is valid or try again.
                </p>
              )
            )}
            <DynamicIntentsWarning />
          </>
        )}
      </Container>
    </ModalContent>
  </Modal>
);
