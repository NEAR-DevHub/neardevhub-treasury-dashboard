const { getLinkUsingCurrentGateway } = VM.require(
  "${REPL_DEVHUB}/widget/core.lib.url"
) || { getLinkUsingCurrentGateway: () => {} };

const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const instance = props.instance;
const onCloseCanvas = props.onCloseCanvas ?? (() => {});

if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const [sendTokenMetadata, setSendTokenMetadata] = useState("");
const [sendTokenSymbol, setSendTokenSymbol] = useState("NEAR");
const [sendAmount, setSendAmount] = useState(null);
const [receiveToken, setReceiveToken] = useState(null);
const [receiveAmount, setReceiveAmount] = useState(null);
const [notes, setNotes] = useState(null);
const [isTxnCreated, setTxnCreated] = useState(false);
const [nearStakedTokens, setNearStakedTokens] = useState(null);
const [daoPolicy, setDaoPolicy] = useState(null);
const [lastProposalId, setLastProposalId] = useState(null);
const [availableBalance, setAvailableBalance] = useState(null);
const [nearBalance, setNearBalance] = useState(null);
const [ftTokensBalance, setFtTokensBalance] = useState(null);
const [showCancelModal, setShowCancelModal] = useState(false);
const [pools, setPools] = useState([]);
const [whitelistedTokens, setWhitelistedTokens] = useState([]);

function getLastProposalId() {
  return Near.asyncView(sender, "get_last_proposal_id").then(
    (result) => result
  );
}

function getTokenMetadata(tokenId) {
  return Near.asyncView(tokenId, "ft_metadata").then((result) =>
    setSendTokenMetadata(result)
  );
}

useEffect(() => {
  getLastProposalId().then((i) => setLastProposalId(i));
  Near.asyncView(sender, "get_policy").then((policy) => {
    setDaoPolicy(policy);
  });

  getTokenMetadata("wrap.near");

  asyncFetch(
    `https://api3.nearblocks.io/v1/account/${treasuryDaoID}/inventory`
  ).then((res) => setFtTokensBalance(res?.body?.inventory?.fts ?? []));

  asyncFetch(`https://api3.nearblocks.io/v1/account/${treasuryDaoID}`).then(
    (res) => {
      const tokenBalance = Big(res?.body?.account?.[0]?.amount ?? "0")
        .div(Big(10).pow(24))
        .toFixed(4);

      const lockedStorageAmt = Big(
        nearBalanceResp?.body?.account?.[0]?.storage_usage ?? "0"
      )
        .div(Big(10).pow(5))
        .toFixed(5);
      setNearBalance(tokenBalance);
      setAvailableBalance(Big(tokenBalance).minus(lockedStorageAmt).toFixed(4));
    }
  );
}, []);

function convertBalanceToReadableFormat(amount, decimals) {
  return Big(amount ?? "0")
    .div(Big(10).pow(decimals ?? "1"))
    .toFixed();
}

function refreshData() {
  Storage.set("REFRESH_ASSET_TABLE_DATA", Math.random());
}

// close canvas after proposal is submitted
useEffect(() => {
  if (isTxnCreated) {
    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (lastProposalId !== id) {
          onCloseCanvas();
          refreshData();
          setTxnCreated(false);
        } else {
          setTimeout(() => checkForNewProposal(), 1000);
        }
      });
    };
    checkForNewProposal();
  }
}, [isTxnCreated]);

const Container = styled.div`
  font-size: 14px;
  .text-grey {
    color: #b9b9b9 !important;
  }

  .text-grey a {
    color: inherit !important;
  }
  label {
    font-weight: 600;
    margin-bottom: 3px;
    font-size: 15px;
  }
  .p-2 {
    padding: 0px !important;
  }
  .rounded-pill {
    border-radius: 5px !important;
  }
  .theme-btn {
    background-color: var(--theme-color) !important;
    color: white;
  }

  .primary-text-color a {
    color: var(--theme-color) !important;
  }

  .btn:hover {
    color: black !important;
  }

  .text-sm {
    font-size: 13px;
  }

  .flex-1 {
    flex: 1;
  }

  .text-green {
    color: #34c759;
  }

  .border-right {
    border-right: 1px solid #dee2e6;
  }
`;

useEffect(() => {
  if (amount && tokenId) {
    const isNEAR = tokenId === tokenMapping.NEAR;
    if (isNEAR) {
      setParsedAmount(Big(amount).mul(Big(10).pow(24)).toFixed());
    } else {
      Near.asyncView(tokenId, "ft_metadata", {}).then((ftMetadata) => {
        setParsedAmount(
          Big(amount).mul(Big(10).pow(ftMetadata.decimals)).toFixed()
        );
      });
    }
  }
}, [amount, tokenId]);

function onSubmitClick() {
  setTxnCreated(true);
  const isNEAR = tokenId === tokenMapping.NEAR;
  const gas = 270000000000000;
  const deposit = daoPolicy?.proposal_bond || 100000000000000000000000;

  Near.call([
    {
      contractName: sender,
      methodName: "add_proposal",
      args: {
        proposal: {
          description: JSON.stringify(description),
          kind: {
            FunctionCall: {
              receiver_id: registry,
              actions: [
                {
                  method_name: "",
                  args: "",
                  deposit: deposit,
                  gas: gas,
                },
              ],
            },
          },
        },
      },
      gas: gas,
      deposit: deposit,
    },
  ]);
}

function cleanInputs() {}

return (
  <Container>
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
      props={{
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
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.StakedNearIframe`}
      props={{
        setNearStakedTokens: setNearStakedTokens,
        instance,
      }}
    />
    <div className="d-flex flex-column gap-3">
      <div className="d-flex gap-1 border border-1 rounded-3 px-2">
        <div className="border-right flex-1">
          <div className="d-flex gap-2 align-items-center py-3 justify-content-center">
            <i class="bi bi-safe h5 mb-0"></i>
            <div>
              <div className="text-green fw-bold">Available Balance</div>
              <h6 className="mb-0">
                {console.log(
                  availableBalance,
                  sendTokenSymbol,
                  nearStakedTokens
                )}
                {availableBalance} {sendTokenSymbol}
              </h6>
            </div>
          </div>
        </div>
        <div className="d-flex gap-2 align-items-center flex-1 py-3 justify-content-center">
          <i class="bi bi-lock h5 mb-0"></i>
          <div>
            <div className="text-muted fw-bold">Staked</div>
            <h6>{nearStakedTokens} NEAR</h6>
          </div>
        </div>
      </div>
      <div className="d-flex flex-column gap-1">
        <label>Send</label>
        <div className="d-flex">
          <Widget
            src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Input`}
            props={{
              className: "flex-grow-1",
              key: `send-amount`,
              onChange: (e) => sendAmount(e.target.value),
              value: sendAmount,
              inputProps: {
                type: "number",
              },
            }}
          />
        </div>
      </div>
      <div className="d-flex flex-column gap-1">
        <button className="primary d-flex align-items-center rounded-3 justify-content-center gap-1">
          <div className="d-flex align-items-center">
            <i class="bi bi-arrow-up"></i>
            <i class="bi bi-arrow-down"></i>
          </div>
          Change
        </button>
      </div>
      <div className="d-flex flex-column gap-1">
        <label>Receive</label>
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Input`}
          props={{
            className: "flex-grow-1",
            key: `receive-amount`,
            onChange: (e) => setReceiveAmount(e.target.value),
            value: receiveAmount,
            inputProps: {
              type: "number",
            },
          }}
        />
      </div>
      <div className="d-flex flex-column gap-1">
        <label>Notes (Optional)</label>
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Input`}
          props={{
            className: "flex-grow-1",
            key: `notes`,
            onChange: (e) => setNotes(e.target.value),
            value: notes,
            multiline: true,
          }}
        />
      </div>
      <div className="d-flex mt-2 gap-3 justify-content-end">
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: {
              root: "btn-outline shadow-none border-0",
            },
            label: "Cancel",
            onClick: () => {
              setShowCancelModal(true);
            },
            disabled: isTxnCreated,
          }}
        />

        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: { root: "theme-btn" },
            disabled: "",
            label: "Submit",
            onClick: onSubmitClick,
            loading: isTxnCreated,
          }}
        />
      </div>
    </div>
  </Container>
);
