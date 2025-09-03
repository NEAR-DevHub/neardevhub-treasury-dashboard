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
) || { encodeToMarkdown: (data) => JSON.stringify(data) };
const instance = props.instance;
const onCloseCanvas = props.onCloseCanvas ?? (() => {});

if (!instance) {
  return <></>;
}

const { treasuryDaoID, showNearIntents } = VM.require(
  `${instance}/widget/config.data`
);

const [isTxnCreated, setTxnCreated] = useState(false);
const [daoPolicy, setDaoPolicy] = useState(null);
const [lastProposalId, setLastProposalId] = useState(null);
const [showCancelModal, setShowCancelModal] = useState(false);
const [showRateWarningModal, setShowRateWarningModal] = useState(false);
const [exchangeDetails, setExchangeDetails] = useState(null);
const [treasuryWallet, setTreasuryWallet] = useState("sputnik-dao");

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
  props.setVoteProposalId(lastProposalId);
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
          setTimeout(() => {
            clearTimeout(checkTxnTimeout);
            refreshData();
            setTxnCreated(false);
            onCloseCanvas();
          }, 1000);
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
    // All asset exchange proposals use the same encoded format
    const description = proposalDetails.description;

    const gas = "270000000000000";
    return [
      {
        contractName: treasuryDaoID,
        methodName: "add_proposal",
        args: {
          proposal: {
            description: description,
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

    {/* Treasury Wallet Dropdown - Only show if showNearIntents is enabled */}
    {showNearIntents && (
      <div className="mb-3">
        <label className="form-label">Treasury Wallet</label>
        <Widget
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDownWithSearchAndManualRequest"
          props={{
            selectedValue: treasuryWallet,
            onChange: (option) => setTreasuryWallet(option.value),
            options: [
              { label: "SputnikDAO", value: "sputnik-dao" },
              { label: "NEAR Intents", value: "near-intents" },
            ],
            defaultLabel: "Select wallet",
            showSearch: false,
          }}
        />
      </div>
    )}

    <Widget
      loading=""
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
      loading=""
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

    {/* Conditional Form Rendering based on treasury wallet */}
    {showNearIntents && treasuryWallet === "near-intents" ? (
      <Widget
        loading=""
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.OneClickExchangeFormIframe`}
        props={{
          instance,
          onCancel: () => setShowCancelModal(true),
          onSubmit: (args) => {
            // Format the 1Click proposal with encoded metadata
            // Include full swap details in notes for table view clarity
            const sourceInfo = args.tokenInBlockchain
              ? ` (${args.tokenInBlockchain})`
              : "";
            const proposalDescription = encodeToMarkdown({
              proposal_action: "asset-exchange",
              notes: `**Must be executed before ${args.quote.deadline}** for transferring tokens to 1Click's deposit address for swap execution.`,
              tokenIn: args.tokenInSymbol,
              tokenOut: args.tokenOut,
              amountIn: args.quote.amountInFormatted,
              amountOut: args.quote.amountOutFormatted,
              slippage: args.slippage || "2",
              quoteDeadline: args.quote.deadline, // Already ISO string from API
              destinationNetwork: args.networkOut,
              timeEstimate: `${args.quote.timeEstimate} minutes`,
              depositAddress: args.quote.depositAddress,
              signature: args.quote.signature,
            });

            const proposalDetails = {
              description: proposalDescription,
              transactions: [
                {
                  treasuryKind: "NEAR_INTENTS",
                  receiverId: "intents.near", // Changed from receiver_id to receiverId
                  functionCalls: [
                    {
                      methodName: "mt_transfer",
                      args: {
                        receiver_id: args.quote.depositAddress,
                        amount: args.quote.amountIn,
                        token_id: args.tokenIn,
                      },
                      amount: "1", // 1 yoctoNEAR
                      gas: "100000000000000", // 100 TGas
                    },
                  ],
                },
              ],
            };

            onSubmitClick(proposalDetails);
          },
        }}
      />
    ) : (
      <Widget
        loading=""
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.ExchangeForm`}
        props={{
          instance,
          onCancel: () => setShowCancelModal(true),
          onSubmit: (args) => {
            // Generate description for SputnikDAO asset exchange
            const description = encodeToMarkdown({
              proposal_action: "asset-exchange",
              notes: args.notes,
              tokenIn: args.tokenIn,
              tokenOut: args.tokenOut,
              amountIn: args.amountIn,
              slippage: args.slippage,
              amountOut: args.amountOut,
            });

            const proposalDetailsWithDescription = {
              ...args,
              description: description,
            };

            setExchangeDetails(proposalDetailsWithDescription);
            if (args.rateDifference && args.rateDifference < -1) {
              setShowRateWarningModal(true);
            } else {
              onSubmitClick(proposalDetailsWithDescription);
            }
          },
        }}
      />
    )}
  </div>
);
