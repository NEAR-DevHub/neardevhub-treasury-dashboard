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

const {
  ActionButton,
  checkForDeposit,
  treasuryDaoID,
  callbackAction,
  disabled,
} = props;

if (typeof getNearBalances !== "function") {
  return <></>;
}

const nearBalances = getNearBalances(context.accountId);
const profile = Social.getr(`${context.accountId}/profile`);
const name = profile.name ?? context.accountId;

const daoPolicy = treasuryDaoID ? Near.view(treasuryDaoID, "get_policy") : null;

const [showModal, setShowModal] = useState(false);
const ADDITIONAL_AMOUNT = checkForDeposit
  ? formatNearAmount(daoPolicy?.proposal_bond)
  : 0;

const INSUFFICIENT_BALANCE_LIMIT = ADDITIONAL_AMOUNT + 0.1; // 0.1N

function checkBalance() {
  if (disabled || !context.accountId) {
    return;
  }
  if (parseFloat(nearBalances?.availableParsed) < INSUFFICIENT_BALANCE_LIMIT) {
    setShowModal(true);
  } else {
    callbackAction();
  }
}

const WarningModal = () => (
  <Modal>
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
    <div className="w-100" onClick={checkBalance}>
      <ActionButton />
    </div>
    {showModal && <WarningModal />}
  </>
);
