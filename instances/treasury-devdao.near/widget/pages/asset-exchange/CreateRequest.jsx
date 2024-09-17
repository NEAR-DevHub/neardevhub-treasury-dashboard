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

const [sendTokenMetadata, setSendTokenMetadata] = useState({});
const [sendToken, setSendToken] = useState("near");
const [sendAmount, setSendAmount] = useState(null);
const [receiveToken, setReceiveToken] = useState("usdt.tether-token.near");
const [receiveAmount, setReceiveAmount] = useState(null);
const [notes, setNotes] = useState(null);
const [isTxnCreated, setTxnCreated] = useState(false);
const [nearStakedTokens, setNearStakedTokens] = useState(null);
const [daoPolicy, setDaoPolicy] = useState(null);
const [lastProposalId, setLastProposalId] = useState(null);
const [showCancelModal, setShowCancelModal] = useState(false);
const [priceSlippage, setPriceSlippage] = useState(null);
const [txns, setTxns] = useState([]);
const [error, setError] = useState(null);
const [calculatingSwap, setCalculatingSwap] = useState(false);

const loading = (
  <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
);

const whitelistedTokens = useCache(
  () =>
    asyncFetch(
      `http://localhost:3003/whitelist-tokens?account=${treasuryDaoID}`
    ).then((res) => {
      return res.body;
    }),
  "whitelisted-tokens",
  { subscribe: false }
);

function getLastProposalId() {
  return Near.asyncView(treasuryDaoID, "get_last_proposal_id").then(
    (result) => result
  );
}

const updateCurrentTokenBalance = useCallback(
  (tokenId) => {
    setSendTokenMetadata(
      (whitelistedTokens ?? []).find((i) => i.id === tokenId)
    );
  },
  [whitelistedTokens]
);

useEffect(() => {
  getLastProposalId().then((i) => setLastProposalId(i));
  Near.asyncView(treasuryDaoID, "get_policy").then((policy) => {
    setDaoPolicy(policy);
  });
}, []);

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

  .input-border-radius {
    border-bottom-right-radius: 0px !important;
    border-top-right-radius: 0px !important;
    border-right: none !important;
  }

  .warning {
    background-color: rgba(255, 158, 0, 0.1);
    color: #ff9e00;
  }
`;

const SendAmountComponent = useMemo(() => {
  return (
    <input
      className={`form-control input-border-radius`}
      type="number"
      value={sendAmount}
      onChange={(e) => setSendAmount(e.target.value)}
    />
  );
}, []);

const NotesComponent = useMemo(() => {
  return (
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
  );
}, []);

const PriceSlippageComponent = useMemo(() => {
  return (
    <Widget
      src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Input`}
      props={{
        className: "flex-grow-1",
        placeholder: "0%",
        key: `price-slippage`,
        onChange: (e) => setPriceSlippage(e.target.value),
        value: priceSlippage,
        inputProps: {
          type: "number",
        },
      }}
    />
  );
}, []);

const TokensInComponent = useMemo(() => {
  return (
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.TokensSelector`}
      props={{
        tokens: whitelistedTokens,
        defaultTokenId: sendToken,
        onChange: (v) => setSendToken(v),
      }}
    />
  );
}, [sendToken, whitelistedTokens]);

const TokensOutComponent = useMemo(() => {
  return (
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.TokensSelector`}
      props={{
        tokens: whitelistedTokens,
        defaultTokenId: receiveToken,
        onChange: (v) => setReceiveToken(v),
      }}
    />
  );
}, [receiveToken, whitelistedTokens]);

useEffect(() => {
  if (whitelistedTokens.length) {
    updateCurrentTokenBalance(sendToken ?? "near");
  }
}, [sendToken, whitelistedTokens]);

function fillTxn(args) {
  const description = {
    isAssetExchangeTxn: true,
    notes: notes,
    tokenIn: sendToken,
    tokenOut: receiveToken,
    amountIn: sendAmount,
    slippage: priceSlippage,
    amountOut: receiveAmount,
  };
  const gas = "270000000000000";
  return {
    contractName: treasuryDaoID,
    methodName: "add_proposal",
    args: {
      proposal: {
        description: JSON.stringify(description),
        kind: {
          FunctionCall: {
            receiver_id: args.receiverId,
            actions: args.functionCalls.map((fc) => ({
              method_name: fc.methodName,
              args: Buffer.from(JSON.stringify(fc.args)).toString("base64"),
              deposit: "1",
              gas: fc.gas,
            })),
          },
        },
      },
    },
    gas: gas,
  };
}

function onSubmitClick() {
  setTxnCreated(true);
  const calls = [];
  txns.map((i) => calls.push(fillTxn(i)));
  Near.call(calls);
}

function swap() {
  asyncFetch(
    `http://localhost:3003/swap?accountId=${treasuryDaoID}&amountIn=${sendAmount}&tokenIn=${sendToken}&tokenOut=${receiveToken}&slippage=${
      (priceSlippage ?? 0) / 100
    }`
  ).then((res) => {
    const response = res.body;
    setTxns(response.transactions);
    setReceiveAmount(response.outEstimate);
    return response;
  });
}

useEffect(() => {
  if (
    sendAmount &&
    sendToken &&
    sendTokenMetadata &&
    receiveToken &&
    sendToken !== receiveToken
  ) {
    const timer = setTimeout(() => {
      swap();
    }, 1000);

    return () => clearTimeout(timer);
  }
}, [sendAmount, sendToken, receiveToken, sendTokenMetadata, priceSlippage]);

useEffect(() => {
  if (sendToken === receiveToken) {
    setError(`Please select different tokens for the swap.`);
  } else if (sendAmount && sendToken && sendTokenMetadata) {
    const balance = sendTokenMetadata.parsedBalance;
    if (parseFloat(balance) < parseFloat(sendAmount)) {
      setError(
        `The treasury balance doesn't have insufficient tokens to swap. You can create the request, but it won’t be approved until the balance is topped up.`
      );
    } else {
      setError(false);
    }
  } else {
    setError(false);
  }
}, [receiveToken, sendAmount, sendToken, sendTokenMetadata]);

function cleanInputs() {
  setNotes("");
  setReceiveAmount("");
  setSendAmount("");
}

if (!whitelistedTokens) {
  return loading;
}

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
                {sendTokenMetadata?.parsedBalance} {sendTokenMetadata?.symbol}
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
          {SendAmountComponent}
          {TokensInComponent}
        </div>
      </div>
      <div className="d-flex flex-column gap-1">
        <button
          className="primary d-flex align-items-center rounded-3 justify-content-center gap-1"
          onClick={() => {
            const inToken = sendToken;
            const outToken = receiveToken;
            setSendToken(outToken);
            setReceiveToken(inToken);
          }}
        >
          <div className="d-flex align-items-center">
            <i class="bi bi-arrow-up"></i>
            <i class="bi bi-arrow-down"></i>
          </div>
          Change
        </button>
      </div>
      <div className="d-flex flex-column gap-1">
        <label>Receive</label>
        <div className="d-flex">
          <input
            className={`form-control input-border-radius`}
            type="number"
            disabled={true}
            value={receiveAmount}
            onChange={(e) => setReceiveAmount(e.target.value)}
          />
          {TokensOutComponent}
        </div>
      </div>
      <div className="d-flex flex-column gap-1">
        <label>Price slippage limit (in %)</label>
        {PriceSlippageComponent}
      </div>
      <div className="d-flex flex-column gap-1">
        <label>Notes (Optional)</label>
        {NotesComponent}
      </div>
      {error && (
        <div className="d-flex gap-3 align-items-center warning px-3 py-2 rounded-3">
          <i class="bi bi-exclamation-triangle h5"></i>
          <div>{error}</div>
        </div>
      )}
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
            disabled: !sendToken || !sendAmount || !receiveAmount,
            label: "Submit",
            onClick: onSubmitClick,
            loading: isTxnCreated,
          }}
        />
      </div>
    </div>
  </Container>
);
