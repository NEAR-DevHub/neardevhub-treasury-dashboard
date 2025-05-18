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
const [isAddressCopied, setIsAddressCopied] = useState(false);

const handleAddressCopy = (textToCopy) => {
  clipboard.writeText(textToCopy).then(() => {
    setIsAddressCopied(true);
    setTimeout(() => setIsAddressCopied(false), 2000);
  });
};

const address = props.treasuryDaoID;
// qrCodeSvg is no longer needed here, the QRCodeGenerator component will handle SVG generation and rendering

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

const intentsWarning = (
  <div
    className="alert alert-info d-flex align-items-center mt-2"
    role="alert"
  >
    <i className="bi bi-info-circle-fill me-2"></i>
    <div>
      You can deposit <strong>NEAR, ETH, wBTC, SOL</strong> and other supported tokens to this address for Near Intents. These funds can be used for cross-chain operations.
    </div>
  </div>
);

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
      <p className="mb-0">Deposit options for: <strong>{address}</strong></p>
      
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
            <strong className="text-break">{address}</strong>
            <button className="btn btn-sm btn-outline-secondary ms-2" onClick={() => handleAddressCopy(address)}>
              {isAddressCopied ? (
                <>
                  <i className="bi bi-check-lg me-1"></i>Copied
                </>
              ) : (
                <>
                  <i className="bi bi-clipboard me-1"></i>Copy
                </>
              )}
            </button>
          </div>
          {address && (
            <div className="mt-2 mb-3 text-center">
              <Widget 
                src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.QRCodeGenerator" 
                props={{
                  text: address,
                  cellSize: 4, // Or your preferred cell size
                  margin: 4    // Or your preferred margin
                }}
              />
            </div>
          )}
          {sputnikWarning}
        </>
      )}

      {activeTab === "intents" && (
        <>
          <p className="mt-3">
            Deposit NEAR or other supported tokens to this Near Intents enabled address:
          </p>
          <div className="d-flex align-items-center mb-2">
            <strong className="text-break">{address}</strong>
            <button className="btn btn-sm btn-outline-secondary ms-2" onClick={() => handleAddressCopy(address)}>
              {isAddressCopied ? (
                <>
                  <i className="bi bi-check-lg me-1"></i>Copied
                </>
              ) : (
                <>
                  <i className="bi bi-clipboard me-1"></i>Copy
                </>
              )}
            </button>
          </div>
          {address && (
            <div className="mt-2 mb-3 text-center">
              <Widget 
                src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.QRCodeGenerator" 
                props={{
                  text: address,
                  cellSize: 4, // Or your preferred cell size
                  margin: 4    // Or your preferred margin
                }}
              />
            </div>
          )}
          {intentsWarning}
          <p className="mt-2 small text-muted">
             Note: While the address is the same as the Sputnik DAO, depositing here signals intent for funds to be available for cross-chain actions via Near Intents. Standard DAO proposals will still be required to move funds from the main treasury.
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
