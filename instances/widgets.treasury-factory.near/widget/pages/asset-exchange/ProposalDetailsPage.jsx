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
    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.ProposalDetails`}
    props={{
      ...props,
      proposalPeriod,
      page: "asset-exchange",
      VoteActions: (hasVotingPermission || hasDeletePermission) &&
        proposalData.status === "InProgress" && (
          <Widget
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
            }}
          />
        ),
      ProposalContent: (
        <div className="card card-body d-flex flex-column gap-2">
          <div className="d-flex flex-column gap-2">
            <label>Send</label>
            <h5 className="mb-0">
              <Widget
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
