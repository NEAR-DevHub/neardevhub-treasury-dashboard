const { getLinkUsingCurrentGateway } = VM.require(
  "${REPL_DEVHUB}/widget/core.lib.url"
) || { getLinkUsingCurrentGateway: () => {} };
const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };

const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
const { encodeToMarkdown } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);
const instance = props.instance;
const onCloseCanvas = props.onCloseCanvas ?? (() => {});

if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const [isTxnCreated, setTxnCreated] = useState(false);
const [daoPolicy, setDaoPolicy] = useState(null);
const [lastProposalId, setLastProposalId] = useState(null);
const [showCancelModal, setShowCancelModal] = useState(false);
const [showRateWarningModal, setShowRateWarningModal] = useState(false);
const [exchangeDetails, setExchangeDetails] = useState(null);

function getLastProposalId() {
  return Near.asyncView(treasuryDaoID, "get_last_proposal_id").then(
    (result) => result
  );
}

useEffect(() => {
  getLastProposalId().then((i) => setLastProposalId(i));
  Near.asyncView(treasuryDaoID, "get_policy").then((policy) => {
    setDaoPolicy(policy);
  });
}, []);

function refreshData() {
  props.setToastStatus("ProposalAdded");
  Storage.set("REFRESH_ASSET_TABLE_DATA", Math.random());
}

// close canvas after proposal is submitted
useEffect(() => {
  if (isTxnCreated) {
    let checkTxnTimeout = null;

    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (typeof lastProposalId === "number" && lastProposalId !== id) {
          onCloseCanvas();
          clearTimeout(checkTxnTimeout);
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
}, [isTxnCreated, lastProposalId]);

function fillTxn(proposalDetails, args, isStorageDeposit) {
  const proposalBond = daoPolicy?.proposal_bond || 0;
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
      proposal_action: "asset-exchange",
      notes: proposalDetails.notes,
      tokenIn: proposalDetails.tokenIn,
      tokenOut: proposalDetails.tokenOut,
      amountIn: proposalDetails.amountIn,
      slippage: proposalDetails.slippage,
      amountOut: proposalDetails.amountOut,
    };
    const gas = "270000000000000";
    return [
      {
        contractName: treasuryDaoID,
        methodName: "add_proposal",
        args: {
          proposal: {
            description: encodeToMarkdown(description),
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
        deposit: proposalBond,
      },
    ];
  }
}

function onSubmitClick(proposalDetails) {
  setTxnCreated(true);
  let calls = [];
  let isRegisterToken = false;
  if (proposalDetails.transactions.length > 1) {
    isRegisterToken = true;
  }
  proposalDetails.transactions.map(
    (i, index) =>
      (calls = calls.concat(
        fillTxn(proposalDetails, i, isRegisterToken && index === 0)
      ))
  );

  Near.call(calls);
}

return (
  <div>
    <TransactionLoader
      showInProgress={isTxnCreated}
      cancelTxn={() => setTxnCreated(false)}
    />
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
      props={{
        instance,
        heading: (
          <h5 className="mb-0 d-flex gap-2 align-items-center">
            <i class="bi bi-exclamation-triangle warning-icon"></i>
            High Fee Warning
          </h5>
        ),
        content: `The exchange rate applied differs by ${exchangeDetails.rateDifference}% from other platforms. Are you sure you want to continue?.`,
        confirmLabel: "Yes",
        isOpen: showRateWarningModal,
        onCancelClick: () => setShowRateWarningModal(false),
        onConfirmClick: () => {
          setShowRateWarningModal(false);
          onSubmitClick(exchangeDetails);
        },
      }}
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
          setShowCancelModal(false);
          onCloseCanvas();
        },
      }}
    />

    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.ExchangeForm`}
      props={{
        instance,
        onCancel: () => setShowCancelModal(true),
        onSubmit: (args) => {
          setExchangeDetails(args);
          if (args.rateDifference && args.rateDifference < -1) {
            setShowRateWarningModal(true);
          } else {
            onSubmitClick(args);
          }
        },
      }}
    />
  </div>
);
