const { getNearBalances, TooltipText, isBosGateway } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);
const { NearToken } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };
const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };
const { encodeToMarkdown } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const instance = props.instance;

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const { allowLockupCancellation } = VM.require(
  `${instance}/widget/config.data`
);

if (
  !getNearBalances ||
  !instance ||
  typeof isBosGateway !== "function" ||
  !treasuryDaoID
)
  return <></>;

let balance = getNearBalances(treasuryDaoID);
balance = balance ? parseFloat(balance.availableParsed) : 0;
const onCloseCanvas = props.onCloseCanvas ?? (() => {});

const Container = styled.div`
  font-size: 14px;

  label {
    font-weight: 600;
    margin-bottom: 3px;
    font-size: 15px;
  }

  .p-2 {
    padding: 0px !important;
  }
`;

const MINIMUM_AMOUNT = 3.5;

const [isTxnCreated, setTxnCreated] = useState(false);
const [showCancelModal, setShowCancelModal] = useState(false);
const [showErrorToast, setShowErrorToast] = useState(false);
const [parsedAmount, setParsedAmount] = useState(0);
const [isReceiverAccountValid, setIsReceiverAccountValid] = useState(false);

const [receiver, setReceiver] = useState(null);
const [startDate, setStartDate] = useState("");
const [endDate, setEndDate] = useState("");
const [amount, setAmount] = useState("");
const [cliffDate, setCliffDate] = useState("");
const [allowCancellation, setAllowCancellation] = useState(false);
const [allowStaking, setAllowStaking] = useState(false);
const [amountError, setAmountError] = useState(null);
const [lastProposalId, setLastProposalId] = useState(null);

function formatTimestamp(date) {
  return new Date(date).getTime() * 1000000;
}

function toBase64(json) {
  return Buffer.from(JSON.stringify(json)).toString("base64");
}

function onSubmitClick() {
  setTxnCreated(true);

  const deposit = Big(isNaN(amount) ? 0 : parseInt(amount))
    .mul(Big(10).pow(24))
    .toFixed();
  const gas = 270000000000000;
  const vestingArgs = allowCancellation
    ? {
        vesting_schedule: {
          VestingSchedule: {
            cliff_timestamp: formatTimestamp(cliffDate || startDate).toString(),
            end_timestamp: formatTimestamp(endDate).toString(),
            start_timestamp: formatTimestamp(startDate).toString(),
          },
        },
      }
    : {
        lockup_timestamp: formatTimestamp(startDate).toString(),
        release_duration: (
          formatTimestamp(endDate) - formatTimestamp(startDate)
        ).toString(),
      };

  const calls = [
    {
      contractName: treasuryDaoID,
      methodName: "add_proposal",
      args: {
        proposal: {
          description: `Create lockup for ${receiver}`,
          kind: {
            FunctionCall: {
              receiver_id: "lockup.near",
              actions: [
                {
                  method_name: "create",
                  args: toBase64(
                    allowStaking
                      ? {
                          lockup_duration: "0",
                          owner_account_id: receiver,
                          ...vestingArgs,
                        }
                      : {
                          lockup_duration: "0",
                          owner_account_id: receiver,
                          whitelist_account_id: "lockup-no-whitelist.near",
                          ...vestingArgs,
                        }
                  ),
                  deposit,
                  gas: "150000000000000",
                },
              ],
            },
          },
        },
      },
      gas,
    },
  ];

  Near.call(calls);
}

function cleanInputs() {
  setReceiver("");
  setAmount("");
  setStartDate("");
  setEndDate("");
  setCliffDate("");
}

function isValidAmount() {
  if (
    isNaN(amount) ||
    amount === "" ||
    parseFloat(amount) > balance ||
    parseFloat(amount) < MINIMUM_AMOUNT
  )
    return false;

  return true;
}

function getLastProposalId() {
  return Near.asyncView(treasuryDaoID, "get_last_proposal_id").then(
    (result) => result
  );
}

useEffect(() => {
  getLastProposalId().then((i) => setLastProposalId(i));
}, []);

function refreshData() {
  Storage.set("REFRESH_LOCKUP_TABLE_DATA", Math.random());
}
// close canvas after proposal is submitted
useEffect(() => {
  if (isTxnCreated) {
    let checkTxnTimeout = null;

    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (lastProposalId !== id) {
          cleanInputs();
          onCloseCanvas();
          refreshData();
          setTxnCreated(false);
        } else {
          checkTxnTimeout = setTimeout(() => checkForNewProposal(), 1000);
        }
      });
    };
    checkForNewProposal();

    return () => {
      clearTimeout(checkTxnTimeout);
    };
  }
}, [isTxnCreated]);

return (
  <Container>
    <TransactionLoader
      showInProgress={isTxnCreated}
      cancelTxn={() => setTxnCreated(false)}
    />
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
      props={{
        instance,
        heading: "Are you sure you want to cancel?",
        content:
          "This action will clear all the information you have entered in the form and cannot be undone.",
        confirmLabel: "Yes",
        isOpen: showCancelModal,
        onCancelClick: () => setShowCancelModal(false),
        onConfirmClick: () => {
          cleanInputs();
          setShowCancelModal(false);
          onCloseCanvas();
        },
      }}
    />

    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-column gap-1">
        <label className="form-label">Recipient</label>
        <Widget
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.AccountInput"
          props={{
            placeholder: "recipient.near",
            value: receiver,
            onUpdate: setReceiver,
            setParentAccountValid: setIsReceiverAccountValid,
            maxWidth: "100%",
            instance,
          }}
        />
      </div>

      <div className="d-flex flex-column gap-1">
        <div>
          <label className="form-label">Amount</label>
          <Widget
            src="test-widgets.treasury-factory.near/widget/components.OverlayTrigger"
            props={{
              popup: <span>Minimum amount is {MINIMUM_AMOUNT} NEAR</span>,
              children: <i className="bi bi-info-circle h6 mb-0"></i>,
              instance,
            }}
          />
        </div>
        <div class="input-group">
          <span class="input-group-text input-icon">
            <NearToken />
          </span>
          <input
            data-testid="amount"
            type="number"
            id="amount"
            class="form-control amount-input"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (e.target.value === "") {
                setAmountError("Amount is required");
              } else if (e.target.value < MINIMUM_AMOUNT) {
                setAmountError(`Minimum amount is ${MINIMUM_AMOUNT} NEAR`);
              } else if (e.target.value > balance) {
                setAmountError("Insufficient balance");
              } else {
                setAmountError(null);
              }
            }}
          />
        </div>
        <div className="d-flex justify-content-between align-items-center">
          {amountError && (
            <div className="text-sm text-danger">{amountError}</div>
          )}
          <span className="text-secondary text-sm">
            Balance: {balance} NEAR
          </span>
        </div>
      </div>

      <div className="d-flex flex-column gap-1">
        <label className="form-label">Start Date</label>
        <Widget
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Input"
          props={{
            type: "date",
            key: "start-date",
            value: startDate,
            inputProps: { required: true },
            onChange: (e) => setStartDate(e.target.value),
          }}
        />
        <div className="form-text text-secondary">
          Select the start date of the lockup
        </div>
      </div>

      <div className="d-flex flex-column gap-1">
        <label className="form-label fw-semibold">End Date</label>
        <Widget
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Input"
          props={{
            type: "date",
            key: "end-date",
            value: endDate,
            inputProps: { min: startDate, required: true },
            onChange: (e) => setEndDate(e.target.value),
          }}
        />
        <div className="form-text text-secondary">
          Select the end date of the lockup
        </div>
      </div>

      <div className="d-flex flex-column gap-1">
        <div className="d-flex justify-content-between align-items-center gap-2">
          <div>
            <label className="form-label">Allow Cancellation</label>
            <div className="form-text text-secondary">
              Allows the NEAR Foundation to cancel the lockup at any time.
              Non-cancellable lockups are not compatible with cliff dates.
            </div>
          </div>
          <div className="form-check form-switch">
            <input
              data-testid="allow-cancellation"
              className="form-check-input"
              style={{ width: "38px", height: "24px" }}
              type="checkbox"
              role="switch"
              disabled={!allowLockupCancellation}
              checked={allowCancellation}
              onChange={(e) => setAllowCancellation(e.target.checked)}
            />
          </div>
        </div>
      </div>

      {allowCancellation && (
        <div className="d-flex flex-column gap-1">
          <label className="form-label fw-semibold">Cliff Date</label>
          <Widget
            src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Input"
            props={{
              type: "date",
              key: "cliff-date",
              value: cliffDate,
              inputProps: { min: startDate, max: endDate },
              onChange: (e) => setCliffDate(e.target.value),
            }}
          />
          <div className="form-text text-secondary">
            Select the date when the receiver can start withdrawing tokens
          </div>
        </div>
      )}

      <div className="d-flex flex-column gap-1">
        <div className="d-flex justify-content-between align-items-center gap-2">
          <div>
            <label className="form-label">Allow Staking</label>
            <div className="form-text text-secondary">
              Allows the owner of the lockup to stake the full amount of tokens
              in the lockup (even before the cliff date).
            </div>
          </div>
          <div className="form-check form-switch">
            <input
              data-testid="allow-staking"
              className="form-check-input"
              style={{ width: "38px", height: "24px" }}
              type="checkbox"
              role="switch"
              checked={allowStaking}
              onChange={(e) => setAllowStaking(e.target.checked)}
            />
          </div>
        </div>
      </div>

      <div className="d-flex mt-2 gap-3 justify-content-end">
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: {
              root: "btn btn-outline-secondary shadow-none no-transparent",
            },
            label: "Cancel",
            onClick: () => setShowCancelModal(true),
            disabled: isTxnCreated,
          }}
        />

        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: { root: "theme-btn" },
            disabled:
              !receiver ||
              !isValidAmount() ||
              !startDate ||
              !endDate ||
              new Date(endDate) < new Date(startDate) ||
              new Date(cliffDate) < new Date(startDate) ||
              new Date(cliffDate) > new Date(endDate) ||
              isTxnCreated,
            label: "Submit",
            onClick: onSubmitClick,
            loading: isTxnCreated,
          }}
        />
      </div>
    </div>
  </Container>
);
