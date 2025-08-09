const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
const {
  getNearBalances,
  decodeProposalDescription,
  formatSubmissionTimeStamp,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common");

const instance = props.instance;
const policy = props.policy;
const { TableSkeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
);
if (
  !instance ||
  !TableSkeleton ||
  typeof getNearBalances !== "function" ||
  typeof decodeProposalDescription !== "function" ||
  typeof formatSubmissionTimeStamp !== "function"
) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const proposals = props.proposals;
const columnsVisibility = JSON.parse(
  Storage.get(
    "COLUMNS_VISIBILITY",
    `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.SettingsDropdown`
  ) ?? "[]"
);

const highlightProposalId =
  props.highlightProposalId ||
  props.highlightProposalId === "0" ||
  props.highlightProposalId === 0
    ? parseInt(props.highlightProposalId)
    : null;

const loading = props.loading;
const isPendingRequests = props.isPendingRequests;
const functionCallApproversGroup = props.functionCallApproversGroup;
const deleteGroup = props.deleteGroup;
const refreshTableData = props.refreshTableData;

const accountId = context.accountId;

const hasVotingPermission = (
  functionCallApproversGroup?.approverAccounts ?? []
).includes(accountId);

const hasDeletePermission = (deleteGroup?.approverAccounts ?? []).includes(
  accountId
);

const Container = styled.div`
  font-size: 13px;
  min-height: 60vh;
  display: flex;

  table {
    overflow-x: auto;

    thead td {
      text-wrap: nowrap;
    }
  }

  .text-warning {
    color: var(--other-warning) !important;
  }
`;

function updateVoteSuccess(status, proposalId) {
  props.setToastStatus(status);
  props.setVoteProposalId(proposalId);
  props.onSelectRequest(null);
  refreshTableData();
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

function isVisible(column) {
  return columnsVisibility.find((i) => i.title === column)?.show !== false
    ? ""
    : "display-none";
}

const requiredVotes = functionCallApproversGroup.requiredVotes;

const hideApproversCol = isPendingRequests && requiredVotes === 1;

const proposalPeriod = policy.proposal_period;

const daoFTTokens = fetch(
  `${REPL_BACKEND_API}/ft-tokens/?account_id=${treasuryDaoID}`
);

const nearBalances = getNearBalances(treasuryDaoID);

const hasOneDeleteIcon =
  isPendingRequests &&
  hasDeletePermission &&
  (proposals ?? []).find(
    (i) =>
      i.proposer === accountId &&
      !Object.keys(i.votes ?? {}).includes(accountId)
  );

const ProposalsComponent = () => {
  return (
    <tbody style={{ overflowX: "auto" }}>
      {proposals?.map((item) => {
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

        // Extract quote deadline from notes for 1Click API proposals
        let quoteDeadline = null;
        let isQuoteExpired = false;
        if (
          notes &&
          typeof notes === "string" &&
          notes.includes("Quote Deadline:")
        ) {
          const deadlineMatch = notes.match(/Quote Deadline:\s*([^\n]+)/);
          if (deadlineMatch && deadlineMatch[1]) {
            const deadlineStr = deadlineMatch[1].trim();
            quoteDeadline = new Date(deadlineStr);
            const currentTime = Date.now();
            isQuoteExpired = quoteDeadline.getTime() < currentTime;
          }
        }
        return (
          <tr
            data-testid={"proposal-request-#" + item.id}
            onClick={() => {
              props.onSelectRequest(item.id);
            }}
            className={
              "cursor-pointer proposal-row " +
              (highlightProposalId === item.id ||
              props.selectedProposalDetailsId === item.id
                ? "bg-highlight"
                : "")
            }
          >
            <td className="fw-semi-bold">{item.id}</td>
            <td className={isVisible("Created Date")}>
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Date`}
                props={{
                  timestamp: item.submission_time,
                }}
              />
            </td>
            {!isPendingRequests && (
              <td>
                <Widget
                  loading=""
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.HistoryStatus`}
                  props={{
                    instance,
                    isVoteStatus: false,
                    status: item.status,
                  }}
                />
              </td>
            )}

            <td className={"text-right " + isVisible("Send")}>
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmount`}
                props={{
                  instance,
                  amountWithDecimals: amountIn,
                  address: tokenIn,
                  showUSDValue: true,
                }}
              />
            </td>
            <td className={isVisible("Receive") + " text-right"}>
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmount`}
                props={{
                  instance,
                  amountWithDecimals: amountOut,
                  address: tokenOut,
                  showUSDValue: true,
                }}
              />
            </td>
            <td className={isVisible("Minimum received") + " text-right"}>
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmount`}
                props={{
                  instance,
                  amountWithDecimals: minAmountReceive,
                  address: tokenOut,
                  showUSDValue: true,
                }}
              />
            </td>

            <td className={"fw-semi-bold text-center " + isVisible("Creator")}>
              <div className="d-inline-block">
                <Widget
                  loading=""
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
                  props={{
                    accountId: item.proposer,
                    showKYC: false,
                    displayImage: false,
                    displayName: false,
                    instance,
                  }}
                />
              </div>
            </td>
            <td className={"text-sm text-left " + isVisible("Notes")}>
              {notes ?? "-"}
            </td>
            {isPendingRequests && (
              <td className={isVisible("Required Votes") + " text-center"}>
                {requiredVotes}
              </td>
            )}
            {isPendingRequests && (
              <td className={isVisible("Votes") + " text-center"}>
                <Widget
                  loading=""
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Votes`}
                  props={{
                    votes: item.votes,
                    requiredVotes,
                    isInProgress: true,
                  }}
                />
              </td>
            )}
            <td
              className={
                isVisible("Approvers") +
                " text-center " +
                (hideApproversCol && " display-none")
              }
              style={{ minWidth: 100 }}
            >
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Approvers`}
                props={{
                  votes: item.votes,
                  approversGroup: functionCallApproversGroup?.approverAccounts,
                }}
              />
            </td>

            {isPendingRequests && (
              <td
                className={isVisible("Expiring Date") + " text-left"}
                style={{ minWidth: 150 }}
              >
                {formatSubmissionTimeStamp(
                  item.submission_time,
                  proposalPeriod
                )}
              </td>
            )}
            {isPendingRequests &&
              (hasVotingPermission || hasDeletePermission) && (
                <td className="text-right" onClick={(e) => e.stopPropagation()}>
                  <Widget
                    loading=""
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.VoteActions`}
                    props={{
                      instance,
                      votes: item.votes,
                      proposalId: item.id,
                      hasDeletePermission,
                      hasVotingPermission,
                      proposalCreator: item.proposer,
                      nearBalance: nearBalances.available,
                      currentAmount: amountIn,
                      currentContract: tokenIn,
                      requiredVotes,
                      isHumanReadableCurrentAmount: true,
                      checkProposalStatus: () => checkProposalStatus(item.id),
                      hasOneDeleteIcon,
                      proposal: item,
                      isQuoteExpired,
                      quoteDeadline,
                    }}
                  />
                </td>
              )}
          </tr>
        );
      })}
    </tbody>
  );
};

return (
  <Container style={{ overflowX: "auto" }}>
    {loading === true ||
    proposals === null ||
    functionCallApproversGroup === null ||
    policy === null ? (
      <TableSkeleton numberOfCols={8} numberOfRows={3} numberOfHiddenRows={4} />
    ) : (
      <div className="w-100">
        {proposals.length === 0 ? (
          <div
            style={{ height: "50vh" }}
            className="d-flex justify-content-center align-items-center"
          >
            {isPendingRequests ? (
              <div className="d-flex justify-content-center align-items-center flex-column gap-2">
                <h4>No Asset Exchange Requests Found</h4>
                <h6>There are currently no asset exchange requests</h6>
              </div>
            ) : (
              <div className="d-flex justify-content-center align-items-center flex-column gap-2">
                <h4>No History Exchange Requests Found</h4>
                <h6>There are currently no history exchange requests</h6>
              </div>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr className="text-secondary">
                <td>#</td>
                <td className={isVisible("Created Date")}>Created Date</td>
                {!isPendingRequests && (
                  <td className={"text-center"}>Status</td>
                )}

                <td className={isVisible("Send") + " text-right"}>Send</td>
                <td className={isVisible("Receive") + " text-right"}>
                  Receive
                </td>
                <td className={isVisible("Minimum received") + " text-right"}>
                  Minimum received
                </td>

                <td className={isVisible("Creator") + " text-center"}>
                  Created by
                </td>
                <td className={isVisible("Notes") + " text-left"}>Notes</td>
                {isPendingRequests && (
                  <td className={isVisible("Required Votes") + " text-center"}>
                    Required Votes
                  </td>
                )}
                {isPendingRequests && (
                  <td className={isVisible("Votes") + " text-center"}>Votes</td>
                )}
                <td
                  className={
                    isVisible("Approvers") +
                    " text-center " +
                    (hideApproversCol && " display-none")
                  }
                >
                  Approvers
                </td>
                {isPendingRequests && (
                  <td className={isVisible("Expiring Date") + " text-left "}>
                    Expiring Date
                  </td>
                )}
                {isPendingRequests &&
                  (hasVotingPermission || hasDeletePermission) && (
                    <td className="text-right">Actions</td>
                  )}
              </tr>
            </thead>
            <ProposalsComponent />
          </table>
        )}
      </div>
    )}
  </Container>
);
