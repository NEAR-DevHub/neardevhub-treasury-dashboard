const { getNearBalances } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const { Modal, ModalContent, ModalHeader, ModalFooter } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal"
);

function formatNearAmount(amount) {
  return parseFloat(
    Big(amount ?? "0")
      .div(Big(10).pow(24))
      .toFixed(2)
  );
}

const { ActionButton, checkForDeposit, treasuryDaoID, callbackAction } = props;

const nearBalances = getNearBalances(context.accountId);
const profile = Social.getr(`${context.accountId}/profile`);
const name = profile.name ?? context.accountId;
const daoPolicy = useCache(
  () => Near.asyncView(treasuryDaoID, "get_policy"),
  "get_policy",
  { subscribe: false }
);

const [showModal, setShowModal] = useState(false);
const ADDITIONAL_AMOUNT = checkForDeposit
  ? formatNearAmount(daoPolicy?.proposal_bond)
  : 0;

const INSUFFICIENT_BALANCE_LIMIT = ADDITIONAL_AMOUNT + 0.3; // 0.3N

function checkBalance() {
  if (parseFloat(nearBalances?.availableParsed) < INSUFFICIENT_BALANCE_LIMIT) {
    setShowModal(true);
  } else {
    callbackAction();
  }
}

const WarningModal = () => (
  <Modal sty>
    <ModalHeader>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="d-flex gap-3">
          <i class="bi bi-exclamation-octagon error-icon h4 mb-0"></i>
          Insufficient Funds
        </div>
        <i
          className="bi bi-x-lg h4 mb-0 cursor-pointer"
          onClick={() => setShowModal(false)}
        ></i>
      </div>
    </ModalHeader>
    <ModalContent>
      Hey {name}, you don't have enough NEAR to complete actions on your
      treasury. You need at least {INSUFFICIENT_BALANCE_LIMIT}N{" "}
      {checkForDeposit &&
        ", which includes the proposal bond needed to create a proposal"}
      . Please add more funds to your account and try again.
    </ModalContent>
  </Modal>
);

return (
  <>
    <div onClick={checkBalance}>
      <ActionButton />
    </div>
    {showModal && <WarningModal />}
  </>
);
