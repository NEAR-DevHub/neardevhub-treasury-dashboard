const { Modal, ModalContent, ModalHeader, ModalFooter } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal"
);

if (!Modal || !ModalContent || !ModalHeader || !ModalFooter) {
  return <></>; // Or a loading state
}

const DepositModal = ({ show, onClose, treasuryDaoID }) => {
  if (!show) {
    return null;
  }

  // TODO: Implement tab state and content for Sputnik DAO vs Near Intents

  return (
    <Modal>
      <ModalHeader>
        <h5 className="modal-title">Deposit Funds</h5>
        <button
          type="button"
          className="btn-close"
          aria-label="Close"
          onClick={onClose}
        ></button>
      </ModalHeader>
      <ModalContent>
        <p>Deposit options for {treasuryDaoID}</p>
        {/* Tabs will go here */}
        <div>
          <h6>Sputnik DAO</h6>
          <p>Deposit NEAR to this address: {treasuryDaoID}</p>
          {/* QR Code and copy button for Sputnik DAO */}
        </div>
        <hr />
        <div>
          <h6>Near Intents</h6>
          <p>
            Deposit NEAR or other supported tokens to the same address:{" "}
            {treasuryDaoID}.
          </p>
          <p>
            Funds deposited to this address can be utilized by Near Intents for
            cross-chain operations.
          </p>
          {/* QR Code and copy button for Near Intents */}
        </div>
      </ModalContent>
      <ModalFooter>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
        >
          Close
        </button>
      </ModalFooter>
    </Modal>
  );
};

return { DepositModal };
