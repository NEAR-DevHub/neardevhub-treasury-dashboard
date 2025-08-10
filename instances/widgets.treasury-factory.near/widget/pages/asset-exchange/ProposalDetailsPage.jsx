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
const [tokenIcons, setTokenIcons] = useState({});

// Collect tokens that need icons
const tokensToFetch = [];
if (proposalData) {
  if (proposalData.tokenIn && !proposalData.tokenIn.includes(".")) {
    tokensToFetch.push(proposalData.tokenIn);
  }
  if (proposalData.tokenOut && !proposalData.tokenOut.includes(".")) {
    tokensToFetch.push(proposalData.tokenOut);
  }
}

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

        // Extract additional fields for 1Click API proposals
        let quoteDeadline = null;
        const quoteDeadlineStr = decodeProposalDescription(
          "quoteDeadline",
          item.description
        );
        if (quoteDeadlineStr) {
          // Parse the ISO string deadline
          quoteDeadline = new Date(quoteDeadlineStr);
        }

        const destinationNetwork = decodeProposalDescription(
          "destinationNetwork",
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
          proposal: item,
          quoteDeadline,
          destinationNetwork,
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
  <>
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
                checkProposalStatus: () =>
                  checkProposalStatus(proposalData?.id),
                isProposalDetailsPage: true,
                proposal: proposalData.proposal,
                // Pass quote deadline to disable voting if expired
                isQuoteExpired:
                  proposalData.quoteDeadline &&
                  new Date() > proposalData.quoteDeadline,
                quoteDeadline: proposalData.quoteDeadline,
              }}
            />
          ),
        ProposalContent: (
          <div className="card card-body d-flex flex-column gap-2">
            <div className="d-flex flex-column gap-2">
              <label>Send</label>
              <h5 className="mb-0">
                {proposalData?.tokenIn?.includes(".") ? (
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
                ) : (
                  <div
                    className="d-flex align-items-center gap-1"
                    style={{ fontSize: "18px" }}
                  >
                    {tokenIcons[proposalData?.tokenIn] ? (
                      <img
                        src={tokenIcons[proposalData?.tokenIn]}
                        width="20"
                        height="20"
                        alt={proposalData?.tokenIn}
                      />
                    ) : (
                      <div
                        className="d-flex align-items-center justify-content-center bg-secondary bg-opacity-10 rounded-circle"
                        style={{ width: "20px", height: "20px" }}
                      >
                        <span
                          className="text-secondary"
                          style={{ fontSize: "10px", fontWeight: "bold" }}
                        >
                          {proposalData?.tokenIn?.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="bolder mb-0">
                      {proposalData?.amountIn}
                    </span>
                    <span>{proposalData?.tokenIn}</span>
                  </div>
                )}
              </h5>
            </div>
            <div className="d-flex flex-column gap-2 mt-1">
              <label className="border-top">Receive</label>
              <h5 className="mb-0">
                {proposalData?.tokenOut?.includes(".") ? (
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
                ) : (
                  <div
                    className="d-flex align-items-center gap-1"
                    style={{ fontSize: "18px" }}
                  >
                    {tokenIcons[proposalData?.tokenOut] ? (
                      <img
                        src={tokenIcons[proposalData?.tokenOut]}
                        width="20"
                        height="20"
                        alt={proposalData?.tokenOut}
                      />
                    ) : (
                      <div
                        className="d-flex align-items-center justify-content-center bg-secondary bg-opacity-10 rounded-circle"
                        style={{ width: "20px", height: "20px" }}
                      >
                        <span
                          className="text-secondary"
                          style={{ fontSize: "10px", fontWeight: "bold" }}
                        >
                          {proposalData?.tokenOut
                            ?.substring(0, 2)
                            .toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="bolder mb-0">
                      {proposalData?.amountOut}
                    </span>
                    <span>{proposalData?.tokenOut}</span>
                  </div>
                )}
              </h5>
              {proposalData?.destinationNetwork && (
                <div className="d-flex align-items-center gap-2 text-muted small mt-1">
                  <Widget
                    loading=""
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Web3IconFetcher`}
                    props={{
                      chainName: proposalData.destinationNetwork,
                      width: 16,
                      height: 16,
                    }}
                  />
                  <span className="text-capitalize">
                    {proposalData.destinationNetwork}
                  </span>
                </div>
              )}
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
                      "This is the minimum amount you'll receive from this exchange, based on the slippage limit set for the request.",
                    children: (
                      <i className="bi bi-info-circle text-secondary"></i>
                    ),
                    instance,
                  }}
                />
              </label>
              <h5 className="mb-0">
                {proposalData?.tokenOut?.includes(".") ? (
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
                ) : (
                  <div
                    className="d-flex align-items-center gap-1"
                    style={{ fontSize: "18px" }}
                  >
                    {tokenIcons[proposalData?.tokenOut] ? (
                      <img
                        src={tokenIcons[proposalData?.tokenOut]}
                        width="20"
                        height="20"
                        alt={proposalData?.tokenOut}
                      />
                    ) : (
                      <div
                        className="d-flex align-items-center justify-content-center bg-secondary bg-opacity-10 rounded-circle"
                        style={{ width: "20px", height: "20px" }}
                      >
                        <span
                          className="text-secondary"
                          style={{ fontSize: "10px", fontWeight: "bold" }}
                        >
                          {proposalData?.tokenOut
                            ?.substring(0, 2)
                            .toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="bolder mb-0">
                      {proposalData?.minAmountReceive?.toFixed
                        ? proposalData?.minAmountReceive?.toFixed(2)
                        : proposalData?.minAmountReceive}
                    </span>
                    <span>{proposalData?.tokenOut}</span>
                  </div>
                )}
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
                <div
                  className={
                    new Date() > proposalData.quoteDeadline
                      ? "text-danger fw-bold"
                      : ""
                  }
                >
                  {proposalData.quoteDeadline.toLocaleString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                    timeZone: "UTC",
                    timeZoneName: "short",
                  })}
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
    {/* Web3IconFetcher for loading token icons */}
    {proposalData && (
      <>
        {/* Fetch icons for tokens that are not contract addresses */}
        {tokensToFetch.length > 0 && (
          <Widget
            loading=""
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Web3IconFetcher`}
            props={{
              tokens: tokensToFetch,
              onIconsLoaded: (iconCache) => {
                const newIcons = {};
                for (let i = 0; i < tokensToFetch.length; i++) {
                  const token = tokensToFetch[i];
                  const icon = iconCache[token];
                  if (icon && icon.tokenIcon) {
                    newIcons[token] = icon.tokenIcon;
                  }
                }
                if (Object.keys(newIcons).length > 0) {
                  setTokenIcons({ ...tokenIcons, ...newIcons });
                }
              },
              fetchNetworkIcons: false,
            }}
          />
        )}
      </>
    )}
  </>
);
