const { Modal, ModalContent, ModalHeader, ModalFooter } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal"
);

if (!Modal || !ModalContent || !ModalHeader || !ModalFooter) {
  return <></>;
}

if (!props.show) {
  return <></>;
}

const chainIdToNameMap = {
  "eth:1": "Ethereum",
  "bsc:56": "BNB Smart Chain",
  "polygon:137": "Polygon PoS",
  "arbitrum:42161": "Arbitrum One",
  "optimism:10": "Optimism",
  "avax:43114": "Avalanche C-Chain",
  "btc:mainnet": "Bitcoin",
  // Add more as needed from defuse_asset_identifier
};

function getChainName(chainId) {
  return chainIdToNameMap[chainId] || chainId;
}

const [activeTab, setActiveTab] = useState(props.initialTab || "sputnik");
const sputnikAddress = props.treasuryDaoID;
const nearIntentsTargetAccountId = props.treasuryDaoID;

// State for Intents tab - Refactored
const [allFetchedTokens, setAllFetchedTokens] = useState([]);
const [assetNamesForDropdown, setAssetNamesForDropdown] = useState([]);
const [selectedAssetName, setSelectedAssetName] = useState(""); // Stores the name like "ETH", "USDT"

const [networksForSelectedAssetDropdown, setNetworksForSelectedAssetDropdown] =
  useState([]);
const [selectedNetworkFullInfo, setSelectedNetworkFullInfo] = useState(null); // Stores { id, name, near_token_id, originalTokenData }

const [intentsDepositAddress, setIntentsDepositAddress] = useState("");
const [isLoadingTokens, setIsLoadingTokens] = useState(false);
const [isLoadingAddress, setIsLoadingAddress] = useState(false);
const [errorApi, setErrorApi] = useState(null);

// New state for stabilized dropdown options
const [stableAssetOptions, setStableAssetOptions] = useState([]);
const [stableNetworkOptions, setStableNetworkOptions] = useState([]);

// Effect 1: Fetch all supported tokens when tab becomes active
useEffect(() => {
  if (activeTab !== "intents") {
    setAllFetchedTokens([]);
    setAssetNamesForDropdown([]);
    setSelectedAssetName("");
    setNetworksForSelectedAssetDropdown([]);
    setSelectedNetworkFullInfo(null);
    setIntentsDepositAddress("");
    setErrorApi(null);
    return;
  }

  setIsLoadingTokens(true);
  setErrorApi(null);
  // Reset all dependent states
  setAllFetchedTokens([]);
  setAssetNamesForDropdown([]);
  setSelectedAssetName("");
  setNetworksForSelectedAssetDropdown([]);
  setSelectedNetworkFullInfo(null);
  setIntentsDepositAddress("");

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
        setAllFetchedTokens(data.result.tokens);
        const uniqueAssetNames = Array.from(
          new Set(data.result.tokens.map((t) => t.asset_name))
        )
          .filter((name) => name) // Ensure name is not null or empty
          .sort();
        setAssetNamesForDropdown(uniqueAssetNames);
        if (uniqueAssetNames.length === 0) {
          setErrorApi("No bridgeable assets found.");
        }
      } else {
        setErrorApi("No bridgeable assets found or unexpected API response.");
        setAllFetchedTokens([]);
        setAssetNamesForDropdown([]);
      }
    })
    .catch((err) => {
      console.error("Failed to fetch all supported tokens:", err);
      setErrorApi(err.message || "Failed to fetch assets. Please try again.");
      setAllFetchedTokens([]);
      setAssetNamesForDropdown([]);
    })
    .finally(() => {
      setIsLoadingTokens(false);
    });
}, [activeTab]);

// Effect 2: Populate networks when selectedAssetName changes
useEffect(() => {
  if (!selectedAssetName || allFetchedTokens.length === 0) {
    setNetworksForSelectedAssetDropdown([]);
    setSelectedNetworkFullInfo(null);
    setIntentsDepositAddress("");
    // Don't clear errorApi here as it might be from token loading
    return;
  }

  const tokensOfSelectedAsset = allFetchedTokens.filter(
    (token) => token.asset_name === selectedAssetName
  );

  const networks = tokensOfSelectedAsset
    .map((token) => {
      if (!token.defuse_asset_identifier) return null;
      const parts = token.defuse_asset_identifier.split(":");
      // Assuming chainId is the first two parts like "eth:1" or "btc:mainnet"
      // Or just one part if it's like "near" (though bridge context implies external chains)
      let chainId;
      if (parts.length >= 2) {
        chainId = parts.slice(0, 2).join(":");
      } else {
        // Fallback or error if format is unexpected, for now, we'll try to use the first part
        // This case needs to be verified with actual non-EVM chain identifiers from the API
        chainId = parts[0];
      }

      return {
        id: chainId, // This is the ID like "eth:1"
        name: getChainName(chainId), // User-friendly name
        near_token_id: token.near_token_id,
        originalTokenData: token,
      };
    })
    .filter((network) => network && network.id && network.near_token_id); // Ensure valid network objects

  setNetworksForSelectedAssetDropdown(networks);
  setSelectedNetworkFullInfo(null); // Reset selected network
  setIntentsDepositAddress(""); // Reset address

  if (networks.length === 0 && selectedAssetName) {
    // setErrorApi might be too aggressive here if it overwrites a token loading error
    // console.warn(`No networks found for asset: ${selectedAssetName}`);
  }
}, [selectedAssetName, allFetchedTokens]);

// Effect 3: Fetch deposit address when selectedNetworkFullInfo changes
useEffect(() => {
  if (
    activeTab !== "intents" ||
    !selectedNetworkFullInfo ||
    !nearIntentsTargetAccountId
  ) {
    setIntentsDepositAddress("");
    // Do not clear errorApi here, as it might be from previous steps
    return;
  }

  setIsLoadingAddress(true);
  setErrorApi(null); // Clear previous address-specific errors

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
          chain: selectedNetworkFullInfo.id, // e.g., "eth:1"
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
        setIntentsDepositAddress(data.result.address);
      } else {
        setIntentsDepositAddress("");
        setErrorApi(
          "Could not retrieve deposit address for the selected asset and network."
        );
      }
    })
    .catch((err) => {
      console.error("Failed to fetch deposit address:", err);
      setErrorApi(
        err.message || "Failed to fetch deposit address. Please try again."
      );
      setIntentsDepositAddress("");
    })
    .finally(() => {
      setIsLoadingAddress(false);
    });
}, [activeTab, selectedNetworkFullInfo, nearIntentsTargetAccountId]);

const sputnikWarning = (
  <div
    className="alert alert-warning d-flex align-items-center mt-2"
    role="alert"
  >
    <i className="bi bi-exclamation-triangle-fill me-2"></i>
    <div>
      Only deposit <strong>NEAR</strong> to this address for Sputnik DAO
      operations. Other tokens sent here may not be recoverable.
    </div>
  </div>
);

const DynamicIntentsWarning = () => {
  if (!selectedAssetName || !selectedNetworkFullInfo) {
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

return (
  <Modal props={{ minWidth: "700px" }}>
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
            onClick={() => setActiveTab("sputnik")}
          >
            Sputnik DAO
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "intents" ? "active" : ""}`}
            onClick={() => setActiveTab("intents")}
          >
            NEAR Intents
          </button>
        </li>
      </ul>

      {activeTab === "sputnik" && (
        <>
          <p className="mt-3">Deposit NEAR to this Sputnik DAO address:</p>
          <div className="d-flex align-items-center mb-2">
            <strong className="text-break">{sputnikAddress}</strong>
            <Widget
              src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Copy"
              props={{
                clipboardText: sputnikAddress,
                label: "Copy",
                className: "btn btn-sm btn-outline-secondary ms-2",
              }}
            />
          </div>
          {sputnikAddress && (
            <div className="mt-2 mb-3 text-center">
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
          {sputnikWarning}
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
                selectedValue: selectedAssetName,
                onChange: (option) => {
                  if (option && option.value !== undefined) {
                    setSelectedAssetName(option.value);
                  } else {
                    // Handle clear or invalid/undefined option from DropDown
                    setSelectedAssetName("");
                  }
                  // Dependent states (networks, address) will be reset by useEffect for selectedAssetName
                },
                options: assetNamesForDropdown.map((assetName) => ({
                  value: assetName,
                  label: assetName,
                })),
                defaultLabel: isLoadingTokens
                  ? "Loading assets..."
                  : assetNamesForDropdown.length === 0
                  ? "No assets found"
                  : "Select an asset",
                showSearch: true,
                searchInputPlaceholder: "Search assets",
                searchByLabel: true,
                // Assuming your DropDown.jsx doesn't use isLoadingProposals or showManualRequest
                // If it does, you might need to pass them or adjust DropDown.jsx
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
                selectedValue: selectedNetworkFullInfo
                  ? selectedNetworkFullInfo.id
                  : "",
                onChange: (option) => {
                  if (option && option.value !== undefined) {
                    const networkInfo = networksForSelectedAssetDropdown.find(
                      (n) => n.id === option.value
                    );
                    setSelectedNetworkFullInfo(networkInfo || null);
                  } else {
                    // Handle clear or invalid/undefined option from DropDown
                    setSelectedNetworkFullInfo(null);
                  }
                  // Address will be fetched by useEffect for selectedNetworkFullInfo
                },
                options: networksForSelectedAssetDropdown.map((network) => ({
                  value: network.id,
                  label: network.name,
                })),
                defaultLabel: !selectedAssetName
                  ? "Select an asset first"
                  : networksForSelectedAssetDropdown.length === 0 &&
                    selectedAssetName &&
                    !isLoadingTokens
                  ? "No networks for this asset"
                  : "Select a network",
                showSearch: true,
                searchInputPlaceholder: "Search networks",
                searchByLabel: true,
                disabled:
                  isLoadingTokens ||
                  isLoadingAddress ||
                  !selectedAssetName ||
                  networksForSelectedAssetDropdown.length === 0,
                // Assuming your DropDown.jsx doesn't use isLoadingProposals or showManualRequest
              }}
            />
          </div>

          {isLoadingAddress && (
            <p className="mt-2">Loading deposit address...</p>
          )}
          {errorApi && (
            <div className="alert alert-danger mt-2">{errorApi}</div>
          )}

          {intentsDepositAddress ? (
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
                        text: intentsDepositAddress,
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
                        }}
                      >
                        {intentsDepositAddress}
                      </div>
                      <Widget
                        src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Copy"
                        props={{
                          label: "",
                          clipboardText: intentsDepositAddress,
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
                    Only deposit {selectedAssetName} from the{" "}
                    {selectedNetworkFullInfo?.name?.toLowerCase()} network
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
            !isLoadingAddress &&
            selectedAssetName &&
            selectedNetworkFullInfo &&
            !errorApi && (
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
