const { Modal, ModalContent, ModalHeader, ModalFooter } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal"
);

// QRCodeGenerator is now a component, so we don't destructure a function from VM.require
// We will use it directly as <Widget src="..." props={...} />

if (!Modal || !ModalContent || !ModalHeader || !ModalFooter) {
  return <></>; // Or a loading state
}

// Props are implicitly available from <Widget src="..." props={...} />
// Expected props: show (boolean), onClose (function), treasuryDaoID (string)

if (!props.show) {
  return <></>; // Render nothing if not supposed to be shown
}

const [activeTab, setActiveTab] = useState(props.initialTab || "sputnik");

// State for Sputnik tab (remains the same)
const sputnikAddress = props.treasuryDaoID;

// State for Intents tab
const [supportedChains, setSupportedChains] = useState([
  { id: "eth:1", name: "Ethereum" },
  // { id: "bsc:56", name: "BNB Smart Chain" }, // Example: Can add more later
  // { id: "polygon:137", name: "Polygon PoS" },
]);
const [selectedChain, setSelectedChain] = useState(supportedChains[0]);
const [availableTokens, setAvailableTokens] = useState([]); // Tokens available on selectedChain
const [selectedToken, setSelectedToken] = useState(null); // The full token object
const [intentsDepositAddress, setIntentsDepositAddress] = useState("");
const [isLoadingTokens, setIsLoadingTokens] = useState(false);
const [isLoadingAddress, setIsLoadingAddress] = useState(false);
const [errorApi, setErrorApi] = useState(null);

const nearIntentsTargetAccountId = props.treasuryDaoID; // This is the NEAR account that will ultimately receive the funds

// Fetch available tokens when selectedChain changes for the Intents tab
useEffect(() => {
  if (activeTab !== "intents" || !selectedChain) {
    setAvailableTokens([]);
    setSelectedToken(null);
    setIntentsDepositAddress("");
    setErrorApi(null);
    return;
  }

  setIsLoadingTokens(true);
  setErrorApi(null);
  setAvailableTokens([]); // Clear previous tokens
  setSelectedToken(null); // Clear selected token
  setIntentsDepositAddress(""); // Clear previous address

  asyncFetch("https://bridge.chaindefuser.com/rpc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: "supportedTokensFetch",
      jsonrpc: "2.0",
      method: "supported_tokens",
      params: [{ chains: [selectedChain.id] }],
    }),
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status} ${res.statusText}. Body: ${res.body}`);
      }
      // For asyncFetch, the body is already parsed if it's JSON, otherwise it's a string.
      // We expect JSON, so res.body should be the parsed object.
      const data = res.body; 
      if (data.error) {
        throw new Error(data.error.message || "Error fetching supported tokens.");
      }
      if (data.result && data.result.tokens) {
        // Filter tokens based on the defuse_asset_identifier and selectedChain.id
        // and map to the structure expected by the UI.
        const filteredTokens = data.result.tokens.filter(t => 
          t.defuse_asset_identifier && 
          t.defuse_asset_identifier.startsWith(selectedChain.id + ":") &&// e.g., "eth:1:"
          t.asset_name && 
          t.near_token_id
        ).map(t => ({
          near_token_id: t.near_token_id, // Used as the value for select options
          name: t.asset_name,             // Used for display
          symbol: t.asset_name,           // Used for display (e.g., ETH, USDT)
          decimals: t.decimals,
          // Store original token data if needed later
          original_token_data: t 
        }));

        setAvailableTokens(filteredTokens);
        if (filteredTokens.length > 0) {
          // setErrorApi(null); // Clear previous error if tokens are found
          // Optionally, auto-select the first token or let user choose
          // setSelectedToken(filteredTokens[0]); 
        } else {
          setErrorApi(`No bridgeable tokens found for ${selectedChain.name}.`);
        }
      } else {
        setAvailableTokens([]);
        setErrorApi(`No bridgeable tokens found for ${selectedChain.name}.`);
      }
    })
    .catch((err) => {
      console.error("Failed to fetch supported tokens:", err);
      setErrorApi(err.message || "Failed to fetch supported tokens. Please try again.");
      setAvailableTokens([]);
    })
    .finally(() => {
      setIsLoadingTokens(false);
    });
}, [activeTab, selectedChain]);

// Fetch deposit address when selectedToken, selectedChain, and targetAccountId are set for Intents tab
useEffect(() => {
  if (activeTab !== "intents" || !selectedToken || !selectedChain || !nearIntentsTargetAccountId) {
    setIntentsDepositAddress("");
    return;
  }

  setIsLoadingAddress(true);
  setErrorApi(null); // Clear previous errors

  // The 'chain' parameter for 'deposit_address' is the chain ID like "eth:1".

  asyncFetch("https://bridge.chaindefuser.com/rpc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: "depositAddressFetch",
      jsonrpc: "2.0",
      method: "deposit_address",
      params: [{ 
        account_id: nearIntentsTargetAccountId, 
        chain: selectedChain.id,
      }],
    }),
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status} ${res.statusText}. Body: ${res.body}`);
      }
      // For asyncFetch, the body is already parsed if it's JSON.
      const data = res.body;
      if (data.error) {
        throw new Error(data.error.message || "Error fetching deposit address.");
      }
      if (data.result && data.result.address) {
        setIntentsDepositAddress(data.result.address);
      } else {
        setIntentsDepositAddress("");
        setErrorApi("Could not retrieve deposit address for the selected asset and network.");
      }
    })
    .catch((err) => {
      console.error("Failed to fetch deposit address:", err);
      setErrorApi(err.message || "Failed to fetch deposit address. Please try again.");
      setIntentsDepositAddress("");
    })
    .finally(() => {
      setIsLoadingAddress(false);
    });
}, [activeTab, selectedToken, selectedChain, nearIntentsTargetAccountId]);


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

// Dynamic warning for Intents tab
const DynamicIntentsWarning = () => {
  if (!selectedToken || !selectedChain) {
    return (
      <div className="alert alert-info d-flex align-items-center mt-2" role="alert">
        <i className="bi bi-info-circle-fill me-2"></i>
        <div>
          Select an asset and network to see deposit instructions and address.
        </div>
      </div>
    );
  }
  return (
    <div className="alert alert-warning d-flex align-items-center mt-2" role="alert">
      <i className="bi bi-exclamation-triangle-fill me-2"></i>
      <div>
        Only deposit <strong>{selectedToken.symbol}</strong> from the <strong>{selectedChain.name}</strong> network to the address shown. Depositing other assets or using a different network may result in loss of funds.
      </div>
    </div>
  );
};


return (
  <Modal>
    <ModalHeader>
      <h5 className="modal-title">Deposit Funds</h5>
      <button
        type="button"
        className="btn-close"
        aria-label="Close"
        onClick={props.onClose} // Use props.onClose
      ></button>
    </ModalHeader>
    <ModalContent>
      <p className="mb-0">
        Deposit options for: <strong>{address}</strong>
      </p>

      <ul className="nav nav-tabs mt-3">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "sputnik" ? "active" : ""}`}
            onClick={() => setActiveTab("sputnik")}
          >
            Sputnik DAO (NEAR Only)
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "intents" ? "active" : ""}`}
            onClick={() => setActiveTab("intents")}
          >
            Near Intents (Multi-Asset)
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
                clipboardText: sputnikAddress, // Changed from text to clipboardText
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
                  cellSize: 4, // Or your preferred cell size
                  margin: 4, // Or your preferred margin
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
          {/* Network Selector */}
          <div className="mb-3">
            <label htmlFor="networkSelectIntents" className="form-label">Network</label>
            <select 
              id="networkSelectIntents" 
              className="form-select" 
              value={selectedChain ? selectedChain.id : ""}
              onChange={(e) => {
                const chain = supportedChains.find(c => c.id === e.target.value);
                setSelectedChain(chain);
                setSelectedToken(null); // Reset token when network changes
                setIntentsDepositAddress(""); // Reset address
                setErrorApi(null);
              }}
              disabled={isLoadingTokens || isLoadingAddress}
            >
              {supportedChains.map(chain => (
                <option key={chain.id} value={chain.id}>{chain.name}</option>
              ))}
            </select>
          </div>

          {/* Asset Selector */}
          <div className="mb-3">
            <label htmlFor="assetSelectIntents" className="form-label">Asset</label>
            <select 
              id="assetSelectIntents" 
              className="form-select" 
              value={selectedToken ? selectedToken.near_token_id : ""} // Assuming near_token_id is a unique identifier
              onChange={(e) => {
                const token = availableTokens.find(t => t.near_token_id === e.target.value);
                setSelectedToken(token);
                setIntentsDepositAddress(""); // Reset address
                setErrorApi(null);
              }}
              disabled={isLoadingTokens || isLoadingAddress || availableTokens.length === 0 || !selectedChain}
            >
              <option value="" disabled={selectedToken !== null}>
                {isLoadingTokens ? "Loading assets..." : (availableTokens.length === 0 && selectedChain ? "No assets found" : "Select an asset")}
              </option>
              {availableTokens.map(token => (
                // Assuming token object has 'name', 'symbol', and a unique 'near_token_id'
                <option key={token.near_token_id} value={token.near_token_id}>
                  {token.name} ({token.symbol})
                </option>
              ))}
            </select>
          </div>
          
          {isLoadingAddress && <p>Loading deposit address...</p>}
          {errorApi && <div className="alert alert-danger mt-2">{errorApi}</div>}

          {intentsDepositAddress ? (
            <>
              <p className="mt-3">Use this deposit address:</p>
              <div className="alert alert-secondary mb-2">
                Always double-check your deposit address — it may change without notice.
              </div>
              <div className="d-flex align-items-center mb-2">
                <strong className="text-break">{intentsDepositAddress}</strong>
                <Widget
                  src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Copy"
                  props={{
                    clipboardText: intentsDepositAddress, // Changed from text to clipboardText
                    className: "btn btn-sm btn-outline-secondary ms-2",
                  }}
                />
              </div>
              <div className="mt-2 mb-3 text-center">
                <Widget
                  src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.QRCodeGenerator"
                  props={{
                    text: intentsDepositAddress,
                    cellSize: 4,
                    margin: 4,
                  }}
                />
              </div>
            </>
          ) : (
            !isLoadingAddress && selectedChain && selectedToken && !errorApi && <p className="mt-3">Could not load deposit address. Please ensure selection is valid.</p>
          )}
          <DynamicIntentsWarning />
          <p className="mt-2 small text-muted">
            Note: Depositing assets to this address makes them available to the <strong>{nearIntentsTargetAccountId}</strong> account via Near Intents for cross-chain actions. Standard DAO proposals will still be required to move funds from the main treasury account itself.
          </p>
        </>
      )}
    </ModalContent>
    <ModalFooter>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={props.onClose} // Use props.onClose
      >
        Close
      </button>
    </ModalFooter>
  </Modal>
);
// No "return { DepositModal };" at the end. The file itself is the widget.
