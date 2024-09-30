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
const [receiveToken, setReceiveToken] = useState("wrap.near");
const [receiveAmount, setReceiveAmount] = useState(null);
const [notes, setNotes] = useState(null);
const [isTxnCreated, setTxnCreated] = useState(false);
const [nearStakedTokens, setNearStakedTokens] = useState(null);
const [daoPolicy, setDaoPolicy] = useState(null);
const [lastProposalId, setLastProposalId] = useState(null);
const [showCancelModal, setShowCancelModal] = useState(false);
const [priceSlippage, setPriceSlippage] = useState("5");
const [txns, setTxns] = useState([]);
const [error, setError] = useState(null);
const [calculatingSwap, setCalculatingSwap] = useState(false);
const [nearSwapInfo, setNearSwapInfo] = useState(null);
const [swapLoading, setSwapLoading] = useState(false);
const [isRegisterToken, setRegisterToken] = useState(false);

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

  .border-left {
    border-left: 1px solid #dee2e6;
  }

  .input-border-radius {
    border-bottom-right-radius: 0px !important;
    border-top-right-radius: 0px !important;
    border-right: none !important;
  }

  .warning {
    background-color: rgba(255, 158, 0, 0.1);
    color: #b17108;
  }

  .swap-info {
    background-color: rgba(0, 16, 61, 0.06);
    color: #1b1b18;
  }
`;

const SendAmountComponent = useMemo(() => {
  return (
    <input
      className={`form-control input-border-radius`}
      type="number"
      tabIndex="0"
      // value={sendAmount}
      onBlur={(e) => setSendAmount(e.target.value)}
    />
  );
}, [sendAmount]);

const ReceiveAmountComponent = useMemo(() => {
  return (
    <input
      className={`form-control input-border-radius`}
      type="number"
      disabled={true}
      value={receiveAmount}
      onChange={() => {}}
    />
  );
}, [receiveAmount]);

const NotesComponent = useMemo(() => {
  return (
    <Widget
      src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Input`}
      props={{
        className: "flex-grow-1",
        key: `notes`,
        onBlur: (e) => setNotes(e.target.value),
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
        onBlur: (e) => setPriceSlippage(e.target.value),
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
        sendToken: sendToken,
      }}
    />
  );
}, [sendToken, receiveToken, whitelistedTokens]);

useEffect(() => {
  if (whitelistedTokens.length) {
    updateCurrentTokenBalance(sendToken ?? "near");
  }
}, [sendToken, whitelistedTokens]);

function fillTxn(args, isStorageDeposit) {
  if (isStorageDeposit) {
    return args.functionCalls.map((call) => ({
      contractName: args.receiverId,
      methodName: call.methodName,
      args: call.args,
      deposit: call.amount,
      gas: call.gas,
    }));
  } else {
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
    return [
      {
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
                  deposit: fc.amount,
                  gas: fc.gas,
                })),
              },
            },
          },
        },
        gas: gas,
      },
    ];
  }
}

function onSubmitClick() {
  setTxnCreated(true);
  let calls = [];
  txns.map(
    (i, index) =>
      (calls = calls.concat(fillTxn(i, isRegisterToken && index === 0)))
  );

  Near.call(calls);
}

const swap = useCallback(() => {
  if (!sendAmount) {
    return;
  }
  setSwapLoading(true);
  asyncFetch(
    `http://localhost:3003/swap?accountId=${treasuryDaoID}&amountIn=${sendAmount}&tokenIn=${sendToken}&tokenOut=${receiveToken}&slippage=${
      (typeof priceSlippage === "string" ? parseFloat(priceSlippage) : 0) / 100
    }`
  ).then((res) => {
    const response = res.body;
    setTxns(response.transactions);
    if (response.transactions.length > 0) {
      setRegisterToken(true);
    } else {
      setRegisterToken(false);
    }
    setReceiveAmount(response.outEstimate);
    setSwapLoading(false);
  });
}, [sendAmount, sendToken, receiveToken, priceSlippage]);

useEffect(() => {
  if (!sendAmount && receiveAmount) {
    setReceiveAmount("");
  }
}, [sendAmount, receiveAmount]);

useEffect(() => {
  const isNearOrWrapNear = (token) => token === "near" || token === "wrap.near";
  if (
    sendToken === receiveToken ||
    (isNearOrWrapNear(sendToken) && isNearOrWrapNear(receiveToken)) ||
    (!isNearOrWrapNear(sendToken) && !isNearOrWrapNear(receiveToken)) ||
    (sendToken === "wrap.near" && !isNearOrWrapNear(receiveToken)) ||
    (receiveToken === "wrap.near" && !isNearOrWrapNear(sendToken))
  ) {
    setNearSwapInfo(null);
  } else {
    setNearSwapInfo(
      "To exchange NEAR for another token, first swap it for wNEAR. You can then exchange wNEAR for your desired token"
    );
  }
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
  setReceiveAmount("");
}, [receiveToken, sendAmount, sendToken, sendTokenMetadata]);

useEffect(() => {
  swap();
}, [priceSlippage]);

function cleanInputs() {
  setNotes("");
  setReceiveAmount("");
  setSendAmount("");
}

if (!whitelistedTokens) {
  return (
    <div className="w-100 h-100 d-flex justify-content-center align-items-center">
      {loading}
    </div>
  );
}

return (
  <Container>
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
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.StakedNearIframe`}
      props={{
        setNearStakedTokens: setNearStakedTokens,
        instance,
      }}
    />
    <div className="d-flex flex-column gap-3">
      <div className="d-flex gap-1 border border-1 rounded-3 px-2">
        <div className="flex-1">
          <div
            className={
              "d-flex gap-2 align-items-center py-3 " +
              (sendToken === "near" && "justify-content-center")
            }
          >
            <i class="bi bi-safe h5 mb-0"></i>
            <div>
              <div className="text-green fw-bold">Available Balance</div>
              <h6 className="mb-0">
                {Big(sendTokenMetadata?.parsedBalance).toFixed(4)}{" "}
                {sendTokenMetadata?.symbol}
              </h6>
            </div>
          </div>
        </div>
        {sendToken === "near" && (
          <div className="border-left d-flex gap-2 align-items-center flex-1 py-3 justify-content-center">
            <i class="bi bi-lock h5 mb-0"></i>
            <div>
              <div className="text-muted fw-bold">Staked</div>
              <h6>
                {nearStakedTokens} {sendTokenMetadata?.symbol}
              </h6>
            </div>
          </div>
        )}
      </div>
      <div className="d-flex flex-column gap-1">
        <label>Send</label>
        <div className="d-flex">
          {SendAmountComponent}
          {TokensInComponent}
        </div>
      </div>
      <div className="d-flex flex-column gap-1">
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: {
              root: "primary w-100 justify-content-center",
            },
            label: "Calculate",
            onClick: swap,
            disabled: sendToken === receiveToken || swapLoading,
            loading: swapLoading,
          }}
        />
      </div>
      <div className="d-flex flex-column gap-1">
        <label>Receive</label>
        <div className="d-flex">
          {ReceiveAmountComponent}
          {TokensOutComponent}
        </div>
      </div>
      <div className="d-flex flex-column gap-1">
        <label>Price slippage limit (%)</label>
        {PriceSlippageComponent}
      </div>
      <div className="d-flex flex-column gap-1">
        <label>Notes (Optional)</label>
        {NotesComponent}
      </div>
      {nearSwapInfo && (
        <div className="d-flex gap-3 align-items-center swap-info px-3 py-2 rounded-3">
          <i class="bi bi-info-circle h5"></i>
          <div>{nearSwapInfo}</div>
        </div>
      )}
      {error && (
        <div className="d-flex gap-3 align-items-center warning px-3 py-2 rounded-3">
          <i class="bi bi-exclamation-triangle h5"></i>
          <div>{error}</div>
        </div>
      )}
      {isRegisterToken && (
        <div className="d-flex gap-3 align-items-center warning px-3 py-2 rounded-3">
          <i class="bi bi-exclamation-triangle h5"></i>
          <div>
            To collect this token, you must first register the DAO account with
            the FT contract. Upon registration, an additional transaction fee of
            0.1 NEAR will be deducted from your account.
          </div>
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
            disabled:
              !sendToken || !sendAmount || !receiveAmount || nearSwapInfo,
            label: "Submit",
            onClick: onSubmitClick,
            loading: isTxnCreated,
          }}
        />
      </div>
    </div>
  </Container>
);
