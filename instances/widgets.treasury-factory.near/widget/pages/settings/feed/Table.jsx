const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
const { formatSubmissionTimeStamp, decodeProposalDescription } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const instance = props.instance;
const policy = props.policy;
const { RowsSkeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
);

if (
  !instance ||
  !RowsSkeleton ||
  typeof formatSubmissionTimeStamp !== "function" ||
  typeof decodeProposalDescription !== "function"
) {
  return <></>;
}

const { treasuryDaoID, showKYC, showReferenceProposal } = VM.require(
  `${instance}/widget/config.data`
);
const proposals = props.proposals;

const highlightProposalId =
  props.highlightProposalId ||
  props.highlightProposalId === "0" ||
  props.highlightProposalId === 0
    ? parseInt(props.highlightProposalId)
    : null;

const loading = props.loading;
const isPendingRequests = props.isPendingRequests;
const settingsApproverGroup = props.settingsApproverGroup;
const [showToastStatus, setToastStatus] = useState(false);
const [voteProposalId, setVoteProposalId] = useState(null);
const [showRefreshPageText, setShowRefreshPageText] = useState(false);
const refreshTableData = props.refreshTableData;
const deleteGroup = props.deleteGroup;

const accountId = context.accountId;

const hasVotingPermission = (
  settingsApproverGroup?.approverAccounts ?? []
).includes(accountId);

const hasDeletePermission = (deleteGroup?.approverAccounts ?? []).includes(
  accountId
);

const columnsVisibility = JSON.parse(
  Storage.get(
    "COLUMNS_VISIBILITY",
    `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.feed.SettingsDropdown`
  ) ?? "[]"
);

const Container = styled.div`
  font-size: 13px;
  min-height: 60vh;
  display: flex;

  table {
    overflow-x: auto;
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

useEffect(() => {
  if (props.transactionHashes) {
    asyncFetch("${REPL_RPC_URL}", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "dontcare",
        method: "tx",
        params: [props.transactionHashes, context.accountId],
      }),
    }).then((transaction) => {
      if (transaction !== null) {
        const transaction_method_name =
          transaction?.body?.result?.transaction?.actions[0].FunctionCall
            .method_name;

        if (transaction_method_name === "act_proposal") {
          const args =
            transaction?.body?.result?.transaction?.actions[0].FunctionCall
              .args;
          const decodedArgs = JSON.parse(atob(args ?? "") ?? "{}");
          if (decodedArgs.id) {
            const proposalId = decodedArgs.id;
            checkProposalStatus(proposalId);
          }
        }
      }
    });
  }
}, [props.transactionHashes]);

const TooltipContent = ({ title, summary }) => {
  return (
    <div className="p-1">
      <h6>{title}</h6>
      <div>{summary}</div>
    </div>
  );
};

function isVisible(column) {
  return columnsVisibility.find((i) => i.title === column)?.show !== false
    ? ""
    : "display-none";
}

const requiredVotes = settingsApproverGroup?.requiredVotes;

const hideApproversCol = isPendingRequests && requiredVotes === 1;

const proposalPeriod = policy.proposal_period;

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
      {proposals?.map((item, index) => {
        const title = decodeProposalDescription("title", item.description);
        const summary = decodeProposalDescription("summary", item.description);
        return (
          <tr
            data-testid={"proposal-request-#" + item.id}
            onClick={() => {
              props.onSelectRequest(item.id);
            }}
            key={index}
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

            <td className={isVisible("Title")}>
              <div
                className="custom-truncate fw-semi-bold"
                style={{ width: 180 }}
              >
                {title ?? item.description}
              </div>
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
                  approversGroup: settingsApproverGroup?.approverAccounts,
                  instance,
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
                      hasVotingPermission,
                      proposalCreator: item.proposer,
                      hasDeletePermission,
                      avoidCheckForBalance: true,
                      requiredVotes,
                      checkProposalStatus: () => checkProposalStatus(item.id),
                      hasOneDeleteIcon,
                      proposal: item,
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
    <div className="w-100">
      <table className="table">
        <thead>
          <tr className="text-secondary">
            <td>#</td>
            <td
              className={isVisible("Created Date") + " cursor-pointer"}
              onClick={props.handleSortClick}
              style={{ color: "var(--text-color)" }}
            >
              Created Date
              <span style={{ marginLeft: 4 }}>
                {props.sortDirection === "desc" ? (
                  <i className="bi bi-arrow-down"></i>
                ) : (
                  <i className="bi bi-arrow-up"></i>
                )}
              </span>
            </td>
            {!isPendingRequests && <td className="text-center">Status</td>}

            <td className={isVisible("Title")}>Title</td>

            <td className={isVisible("Creator") + " text-center"}>
              Created by
            </td>
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

        {loading === true || proposals === null || !Array.isArray(proposals) ? (
          <tbody>
            <RowsSkeleton
              numberOfCols={isPendingRequests ? 8 : 6}
              numberOfRows={3}
              numberOfHiddenRows={4}
            />
          </tbody>
        ) : proposals.length === 0 ? (
          <tr>
            <td
              colSpan={isPendingRequests ? 8 : 6}
              className="text-center py-5"
            >
              {isPendingRequests ? (
                <>
                  <h4>No Settings Requests Found</h4>
                  <h6>There are currently no settings requests</h6>
                </>
              ) : (
                <>
                  <h4>No History Requests Found</h4>
                  <h6>There are currently no history requests</h6>
                </>
              )}
            </td>
          </tr>
        ) : (
          proposals.map((item, index) => (
            <ProposalsComponent item={item} key={index} />
          ))
        )}
      </table>
    </div>
  </Container>
);
