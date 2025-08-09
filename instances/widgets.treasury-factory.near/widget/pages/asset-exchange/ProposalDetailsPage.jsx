const { id, instance } = props;
const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
if (!instance) {
  return <></>;
}
const {
  getNearBalances,
  decodeProposalDescription,
  decodeBase64,
  getApproversAndThreshold,
  formatSubmissionTimeStamp,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common");

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const [proposalData, setProposalData] = useState(null);
const [isDeleted, setIsDeleted] = useState(false);

const isCompactVersion = props.isCompactVersion;
const accountId = context.accountId;
const functionCallApproversGroup = getApproversAndThreshold(
  treasuryDaoID,
  "call",
  accountId
);

const nearBalances = getNearBalances(treasuryDaoID);
const deleteGroup = getApproversAndThreshold(
  treasuryDaoID,
  "call",
  accountId,
  true
);
const requiredVotes = functionCallApproversGroup?.requiredVotes;

const hasVotingPermission = (
  functionCallApproversGroup?.approverAccounts ?? []
).includes(accountId);

const hasDeletePermission = (deleteGroup?.approverAccounts ?? []).includes(
  accountId
);

const policy = treasuryDaoID
  ? Near.view(treasuryDaoID, "get_policy", {})
  : null;

const proposalPeriod = policy.proposal_period;

useEffect(() => {
  if (proposalPeriod && !proposalData) {
    Near.asyncView(treasuryDaoID, "get_proposal", { id: parseInt(id) })
      .then((item) => {
        const notes = decodeProposalDescription("notes", item.description);
        const amountIn = decodeProposalDescription(
          "amountIn",
          item.description
        );
        const tokenIn = decodeProposalDescription("tokenIn", item.description);
        const tokenOut = decodeProposalDescription(
          "tokenOut",
          item.description
        );
        const slippage = decodeProposalDescription(
          "slippage",
          item.description
        );
        const amountOut = decodeProposalDescription(
          "amountOut",
          item.description
        );
        
        // Extract quote deadline from notes for 1Click API proposals
        let quoteDeadline = null;
        if (notes && typeof notes === 'string' && notes.includes('Quote Deadline:')) {
          const deadlineMatch = notes.match(/Quote Deadline:\s*([^\n]+)/);
          if (deadlineMatch && deadlineMatch[1]) {
            // Parse the deadline date string
            const deadlineStr = deadlineMatch[1].trim();
            quoteDeadline = new Date(deadlineStr);
          }
        }

        const outEstimate = parseFloat(amountOut) || 0;
        const slippageValue = parseFloat(slippage) || 0;
        const minAmountReceive = Number(
          outEstimate * (1 - slippageValue / 100)
        );
        let status = item.status;
        if (status === "InProgress") {
          const endTime = Big(item.submission_time ?? "0")
            .plus(proposalPeriod ?? "0")
            .toFixed();
          const timestampInMilliseconds = Big(endTime) / Big(1_000_000);
          const currentTimeInMilliseconds = Date.now();
          if (Big(timestampInMilliseconds).lt(currentTimeInMilliseconds)) {
            status = "Expired";
          }
        }

        setProposalData({
          id: item.id,
          proposer: item.proposer,
          votes: item.votes,
          submissionTime: item.submission_time,
          notes,
          status,
          amountIn,
          amountOut,
          minAmountReceive,
          tokenIn,
          tokenOut,
          slippage,
          proposal: item,
          quoteDeadline,
        });
      })
      .catch(() => {
        // proposal is deleted or doesn't exist
        setIsDeleted(true);
      });
  }
}, [id, proposalPeriod, proposalData]);

useEffect(() => {
  if (proposalData.id !== id) {
    setProposalData(null);
  }
}, [id]);

function refreshData() {
  if (props.transactionHashes) {
    return;
  }
  if (isCompactVersion) {
    Storage.set("REFRESH_ASSET_TABLE_DATA", Math.random());
  }
  setProposalData(null);
}

function updateVoteSuccess(status, proposalId) {
  props.setVoteProposalId(proposalId);
  props.setToastStatus(status);
  refreshData();
}

function checkProposalStatus(proposalId) {
  Near.asyncView(treasuryDaoID, "get_proposal", {
    id: proposalId,
  })
    .then((result) => {
      updateVoteSuccess(result.status, proposalId);
    })
    .catch(() => {
      // deleted request (thus proposal won't exist)
      updateVoteSuccess("Removed", proposalId);
    });
}

return (
  <Widget
    loading=""
    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.ProposalDetails`}
    props={{
      ...props,
      proposalPeriod,
      page: "asset-exchange",
      VoteActions: (hasVotingPermission || hasDeletePermission) &&
        proposalData.status === "InProgress" && (
          <Widget
            loading=""
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.VoteActions`}
            props={{
              instance,
              votes: proposalData?.votes,
              proposalId: proposalData?.id,
              hasDeletePermission,
              hasVotingPermission,
              proposalCreator: proposalData?.proposer,
              nearBalance: nearBalances.available,
              currentAmount: proposalData?.amountIn,
              currentContract: proposalData?.tokenIn,
              isHumanReadableCurrentAmount: true,
              requiredVotes,
              checkProposalStatus: () => checkProposalStatus(proposalData?.id),
              isProposalDetailsPage: true,
              proposal: proposalData.proposal,
              // Pass quote deadline to disable voting if expired
              isQuoteExpired: proposalData.quoteDeadline && new Date() > proposalData.quoteDeadline,
              quoteDeadline: proposalData.quoteDeadline,
            }}
          />
        ),
      ProposalContent: (
        <div className="card card-body d-flex flex-column gap-2">
          <div className="d-flex flex-column gap-2">
            <label>Send</label>
            <h5 className="mb-0">
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmountAndIcon`}
                props={{
                  instance,
                  amountWithDecimals: proposalData?.amountIn,
                  address: proposalData?.tokenIn,
                  showUSDValue: true,
                }}
              />
            </h5>
          </div>
          <div className="d-flex flex-column gap-2 mt-1">
            <label className="border-top">Receive</label>
            <h5 className="mb-0">
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmountAndIcon`}
                props={{
                  instance,
                  amountWithDecimals: proposalData?.amountOut,
                  address: proposalData?.tokenOut,
                  showUSDValue: true,
                }}
              />
            </h5>
          </div>
          <div className="d-flex flex-column gap-2 mt-1">
            <label className="border-top">
              Price Slippage Limit {"   "}
              <Widget
                loading=""
                src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                props={{
                  popup:
                    "This is the slippage limit defined for this request. If the market rate changes beyond this threshold during execution, the request will automatically fail.",
                  children: (
                    <i className="bi bi-info-circle text-secondary"></i>
                  ),
                  instance,
                }}
              />
            </label>
            <div>{proposalData?.slippage}%</div>
          </div>
          <div className="d-flex flex-column gap-2 mt-1">
            <label className="border-top">
              Minimum Amount Receive {"   "}
              <Widget
                loading=""
                src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                props={{
                  popup:
                    "This is the minimum amount you’ll receive from this exchange, based on the slippage limit set for the request.",
                  children: (
                    <i className="bi bi-info-circle text-secondary"></i>
                  ),
                  instance,
                }}
              />
            </label>
            <h5 className="mb-0">
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmountAndIcon`}
                props={{
                  instance,
                  amountWithDecimals: proposalData?.minAmountReceive,
                  address: proposalData?.tokenOut,
                  showUSDValue: true,
                }}
              />
            </h5>
          </div>
          {proposalData?.quoteDeadline && (
            <div className="d-flex flex-column gap-2 mt-1">
              <label className="border-top">
                1Click Quote Deadline {"   "}
                <Widget
                  loading=""
                  src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                  props={{
                    popup:
                      "This is the expiry time for the 1Click API quote. After this time, the quoted exchange rate is no longer valid and voting will be disabled to prevent loss of funds.",
                    children: (
                      <i className="bi bi-info-circle text-secondary"></i>
                    ),
                    instance,
                  }}
                />
              </label>
              <div className={new Date() > proposalData.quoteDeadline ? "text-danger fw-bold" : ""}>
                {proposalData.quoteDeadline.toLocaleString()}
                {new Date() > proposalData.quoteDeadline && " (EXPIRED)"}
              </div>
            </div>
          )}
        </div>
      ),
      proposalData: proposalData,
      isDeleted: isDeleted,
      isCompactVersion,
      approversGroup: functionCallApproversGroup,
      instance,
      deleteGroup,
      proposalStatusLabel: {
        approved: "Asset Exchange Request Executed",
        rejected: "Asset Exchange Request Rejected",
        deleted: "Asset Exchange Request Deleted",
        failed: "Asset Exchange Request Failed",
        expired: "Asset Exchange Request Expired",
      },
      checkProposalStatus,
    }}
  />
);
