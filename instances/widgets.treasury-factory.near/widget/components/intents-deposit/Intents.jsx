const { instance } = props;
const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

State.init({
  currentStep: 1,
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

const placeholderAssetIcon =
  "https://ipfs.near.social/ipfs/bafkreib7ahtyc3p6txuwcnn6kmfo5naiyjzomqnpt26crv27prd5f3ogt4";
const placeholderNetworkIcon =
  "https://ipfs.near.social/ipfs/bafkreihc5rbvgxf4sz36pqdbg2gv2ag5erjm472zo2hapeh24idcvumt7m";
const Container = styled.div`
  .bg-theme-color {
    background-color: var(--theme-color);
    color: white !important;
  }
  .bg-grey-04 {
    background-color: var(--grey-04);
    color: var(--text-secondary);
  }

  .fw-bold {
    font-weight: 600 !important;
  }

  .gap-md {
    gap: 0.7rem !important;
  }
`;

const currentStep = state.currentStep;
const selectedAssetName = state.selectedAssetName;
const selectedNetworkFullInfo = state.selectedNetworkFullInfo;
const nearIntentsTargetAccountId = treasuryDaoID;

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

// Function to fetch tokens for intents
const fetchIntentsTokens = () => {
  if (state.allFetchedTokens.length > 0 || state.isLoadingTokens) {
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

      return {
        id: chainId, // This is the ID like "eth:1"
        name: networkName,
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
  if (!networkInfo || !networkInfo.near_token_id) {
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
      console.log("data", data);
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

useEffect(() => {
  if (state.allFetchedTokens.length === 0 && !state.isLoadingTokens) {
    fetchIntentsTokens();
  }
}, []);

const StepIndicator = ({ step, isActive, isCompleted }) => (
  <div
    className={`rounded-circle d-flex align-items-center justify-content-center ${
      isCompleted
        ? "bg-theme-color"
        : isActive
        ? "bg-theme-color"
        : "bg-grey-04"
    }`}
    style={{
      width: "25px",
      height: "25px",
      fontSize: "14px",
      flexShrink: 0,
    }}
  >
    {isCompleted ? "✓" : step}
  </div>
);

const AssetSelector = ({ isActive }) => {
  if (!isActive)
    return <div className="text-secondary h5 fw-bold mb-0">Select Asset</div>;

  return (
    <div className="d-flex flex-column gap-md">
      <div className="h5 fw-bold mb-0">Select Asset</div>
      {state.isLoadingTokens ||
      state.allFetchedTokens.length === 0 ||
      !state.allIconsFetched ? (
        <div>
          <Widget
            loading=""
            src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDownWithSearchAndManualRequest"
            props={{
              options: [],
              disabled: true,
              defaultLabel: (
                <div className="spinner-border spinner-border-sm" />
              ),
            }}
          />
        </div>
      ) : (
        <Widget
          loading=""
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDownWithSearchAndManualRequest"
          props={{
            selectedValue: selectedAssetName,
            onChange: (option) => {
              const newAssetName =
                option && option.value !== undefined ? option.value : "";
              State.update({ selectedAssetName: newAssetName });
              updateNetworksForAsset(newAssetName);
              if (newAssetName) {
                State.update({ currentStep: 2 });
              }
            },
            options: state.assetNamesForDropdown.map((assetName) => ({
              value: assetName,
              label: assetName,
              icon: state.tokenIconMap[assetName] || placeholderAssetIcon,
            })),
            defaultLabel: "Select Asset",
            showSearch: true,
            searchInputPlaceholder: "Search assets",
            searchByLabel: true,
            showCircularIcon: true,
          }}
        />
      )}
    </div>
  );
};

const NetworkSelector = ({ isActive }) => {
  if (!isActive || !selectedAssetName)
    return <div className="text-secondary h5 fw-bold mb-0">Select Network</div>;

  return (
    <div className="d-flex flex-column gap-md">
      <div className="h5 fw-bold mb-0">Select Network</div>
      <Widget
        loading=""
        src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDownWithSearchAndManualRequest"
        props={{
          selectedValue: selectedNetworkFullInfo
            ? selectedNetworkFullInfo.id
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
            if (networkInfo) {
              State.update({ currentStep: 3 });
            }
          },
          options: state.networksForSelectedAssetDropdown.map((network) => ({
            value: network.id,
            label: network.name,
            icon: network.icon || placeholderNetworkIcon,
          })),
          defaultLabel: "Select Network",
          showSearch: true,
          searchInputPlaceholder: "Search networks",
          searchByLabel: true,
          showCircularIcon: true,
          disabled:
            state.isLoadingTokens ||
            state.isLoadingAddress ||
            !selectedAssetName ||
            state.networksForSelectedAssetDropdown.length === 0,
        }}
      />
    </div>
  );
};

const DepositAddressSection = ({ isActive }) => {
  if (!isActive || !selectedAssetName || !selectedNetworkFullInfo)
    return (
      <div className="text-secondary h5 fw-bold mb-0">Deposit Address</div>
    );

  return (
    <div className="d-flex flex-column gap-md">
      <div className="h5 fw-bold mb-0">Deposit Address</div>
      <div className="text-muted">
        Always double-check your deposit address — it may change without notice.
      </div>
      {state.intentsDepositAddress && (
        <Widget
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.intents-deposit.DepositAddress"
          props={{
            address: state.intentsDepositAddress,
            warningMessage: `Only deposit from the ${selectedNetworkFullInfo.name} network.`,
            instance,
          }}
        />
      )}
    </div>
  );
};

return (
  <Container
    className="d-flex gap-4 align-items-start flex-wrap flex-md-nowrap"
    style={{ fontSize: "14px" }}
  >
    <div className="card card-body" style={{ maxWidth: "700px" }}>
      <div className="d-flex flex-column gap-2">
        <div className="h4 mb-0">NEAR Intents</div>
        <div style={{ fontWeight: 500 }}>
          Best for tokens from other blockchains (BTC, ETH, USDC, etc.) or
          sending cross-chain. Supports payments only. Token exchange coming
          soon.
        </div>

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

        {/* Step Indicators and Content */}
        <div className="position-relative mt-2">
          <div
            className="position-absolute"
            style={{
              left: "12px",
              top: "10px",
              bottom: "10px",
              width: "2px",
              backgroundColor: "var(--border-color)",
              zIndex: 1,
              maxHeight: "220px",
            }}
          ></div>

          {/* Step 1: Select Asset */}
          <div
            className="d-flex align-items-start gap-3 w-100 mt-2"
            style={{ marginBottom: "2rem" }}
          >
            <div style={{ position: "relative", zIndex: 2 }}>
              <StepIndicator
                step={1}
                isActive={currentStep === 1}
                isCompleted={currentStep > 1}
              />
            </div>
            <div className="flex-1">
              <AssetSelector isActive={currentStep >= 1} />
            </div>
          </div>

          {/* Step 2: Select Network */}
          <div
            className="d-flex align-items-start gap-3 w-100"
            style={{ marginBottom: "2rem" }}
          >
            <div style={{ position: "relative", zIndex: 2 }}>
              <StepIndicator
                step={2}
                isActive={currentStep === 2}
                isCompleted={currentStep > 2}
              />
            </div>
            <div className="flex-1">
              <NetworkSelector isActive={currentStep >= 2} />
            </div>
          </div>

          {/* Step 3: Deposit Address */}
          <div className="d-flex align-items-start gap-3 w-100">
            <div style={{ position: "relative", zIndex: 2 }}>
              <StepIndicator
                step={3}
                isActive={currentStep === 3}
                isCompleted={false}
              />
            </div>
            <div className="flex-1 w-75">
              <DepositAddressSection isActive={currentStep >= 3} />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="d-flex flex-column gap-2" style={{ maxWidth: "500px" }}>
      <Widget
        src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.intents-deposit.FAQSection"
        props={{
          faqItems: faqItems,
        }}
      />

      <div className="d-flex gap-2 justify-content-center">
        <div className="text-secondary">Still have questions?</div>
        <a
          className="text-primary"
          target="_blank"
          rel="noopener noreferrer"
          href={"https://docs.neartreasury.com/payments/intents"}
        >
          Learn More
        </a>
      </div>
    </div>
  </Container>
);
