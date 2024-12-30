const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
const {
  getNearBalances,
  formatSubmissionTimeStamp,
  decodeProposalDescription,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common");

const instance = props.instance;
const policy = props.policy;
if (
  !instance ||
  typeof getNearBalances !== "function" ||
  typeof formatSubmissionTimeStamp !== "function" ||
  typeof decodeProposalDescription !== "function"
) {
  return <></>;
}

const { treasuryDaoID, showKYC, showReferenceProposal } = VM.require(
  `${instance}/widget/config.data`
);

const proposals = props.proposals;

const highlightProposalId = props.highlightProposalId;
const loading = props.loading;
const isPendingRequests = props.isPendingRequests;
const settingsApproverGroup = props.settingsApproverGroup;
const [showToastStatus, setToastStatus] = useState(false);
const [voteProposalId, setVoteProposalId] = useState(null);
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

  td {
    padding: 0.5rem;
    color: inherit;
    vertical-align: middle;
    background: inherit;
  }

  table {
    overflow-x: auto;
  }
`;

function checkProposalStatus(proposalId) {
  Near.asyncView(treasuryDaoID, "get_proposal", {
    id: proposalId,
  })
    .then((result) => {
      setToastStatus(result.status);
      setVoteProposalId(proposalId);
      refreshTableData();
    })
    .catch(() => {
      // deleted request (thus proposal won't exist)
      setToastStatus("Removed");
      setVoteProposalId(proposalId);
      refreshTableData();
    });
}

useEffect(() => {
  if (typeof highlightProposalId === "number" && isPendingRequests) {
    checkProposalStatus(highlightProposalId);
  }
}, [highlightProposalId]);

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

const nearBalances = getNearBalances(treasuryDaoID);

const ToastStatusContent = () => {
  let content = "";
  switch (showToastStatus) {
    case "InProgress":
      content = "Your vote is counted, the request is highlighted.";
      break;
    case "Approved":
      content = "The request has been successfully executed.";
      break;
    case "Rejected":
      content = "The request has been rejected.";
      break;
    case "Removed":
      content = "The request has been successfully deleted.";
      break;
    default:
      content = `The request has ${showToastStatus}.`;
      break;
  }
  return (
    <div className="toast-body">
      {content}
      <br />
      {showToastStatus !== "InProgress" && (
        <a
          href={href({
            widgetSrc: `${instance}/widget/app`,
            params: {
              page: "settings",
              selectedTab: "History",
              highlightProposalId:
                typeof highlightProposalId === "number"
                  ? highlightProposalId
                  : voteProposalId,
            },
          })}
        >
          View in History
        </a>
      )}
    </div>
  );
};

const VoteSuccessToast = () => {
  return showToastStatus &&
    (typeof voteProposalId === "number" ||
      typeof highlightProposalId === "number") ? (
    <div className="toast-container position-fixed bottom-0 end-0 p-3">
      <div className={`toast ${showToastStatus ? "show" : ""}`}>
        <div className="toast-header px-2">
          <strong className="me-auto">Just Now</strong>
          <i className="bi bi-x-lg h6" onClick={() => setToastStatus(null)}></i>
        </div>
        <ToastStatusContent />
      </div>
    </div>
  ) : null;
};

const proposalPeriod = policy.proposal_period;

const [showDetailsProposalKind, setShowDetailsProposalKind] = useState(null);
const ProposalsComponent = () => {
  return (
    <tbody style={{ overflowX: "auto" }}>
      {proposals?.map((item, index) => {
        const title = decodeProposalDescription("title", item.description);
        const summary = decodeProposalDescription("summary", item.description);
        return (
          <tr
            key={index}
            className={
              voteProposalId === item.id || highlightProposalId === item.id
                ? "bg-highlight"
                : ""
            }
          >
            <td className="fw-semi-bold">{item.id}</td>
            <td className={isVisible("Created Date")}>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Date`}
                props={{
                  timestamp: item.submission_time,
                }}
              />
            </td>
            {!isPendingRequests && (
              <td>
                <Widget
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
              <Widget
                src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                props={{
                  popup: (
                    <Widget
                      src="${REPL_MOB}/widget/Profile.Popover"
                      props={{ accountId: item.proposer }}
                    />
                  ),
                  children: (
                    <div
                      className="text-truncate"
                      style={{ maxWidth: "300px" }}
                    >
                      {item.proposer}
                    </div>
                  ),
                  instance,
                }}
              />
            </td>
            <td className={"text-center " + isVisible("Details")}>
              <Widget
                src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
                props={{
                  classNames: {
                    root: "border p-2",
                  },
                  label: "Details",
                  onClick: () => {
                    setShowDetailsProposalKind({
                      transactionDetails: item.kind,
                      summary,
                    });
                  },
                }}
              />
            </td>
            {isPendingRequests && (
              <td className={isVisible("Required Votes") + " text-center"}>
                {requiredVotes}
              </td>
            )}
            {isPendingRequests && (
              <td className={isVisible("Votes") + " text-center"}>
                <Widget
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Votes`}
                  props={{
                    votes: item.votes,
                    requiredVotes,
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
                <td className="text-right">
                  <Widget
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
    <VoteSuccessToast />
    {loading === true ||
    proposals === null ||
    settingsApproverGroup === null ||
    policy === null ? (
      <div className="d-flex justify-content-center align-items-center w-100 h-100">
        <Widget
          src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"}
        />
      </div>
    ) : (
      <div>
        {showDetailsProposalKind && (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
            props={{
              instance,
              heading: "Proposal details",
              content: (
                <Markdown
                  text={`
${
  showDetailsProposalKind.summary
    ? `###### Summary\n ${showDetailsProposalKind.summary}`
    : ""
}
###### Transaction Details
\`\`\`jsx
${JSON.stringify(showDetailsProposalKind.transactionDetails, null, 2)}
`}
                  syntaxHighlighterProps={{
                    wrapLines: true,
                  }}
                />
              ),
              confirmLabel: "Yes",
              isOpen: showDetailsProposalKind,
              onCancelClick: () => setShowDetailsProposalKind(null),
            }}
          />
        )}
        {proposals.length === 0 ? (
          <div
            style={{ height: "50vh" }}
            className="d-flex justify-content-center align-items-center"
          >
            {isPendingRequests ? (
              <div className="d-flex justify-content-center align-items-center flex-column gap-2">
                <h4>No settings proposals found</h4>
                <h6>There are currently no proposals</h6>
              </div>
            ) : (
              <div className="d-flex justify-content-center align-items-center flex-column gap-2">
                <h4>No settings proposals found</h4>
                <h6>There are currently no history proposals</h6>
              </div>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr className="text-secondary">
                <td>#</td>
                <td className={isVisible("Created Date")}>Created Date</td>
                {!isPendingRequests && <td className="text-center">Status</td>}

                <td className={isVisible("Title")}>Title</td>

                <td className={isVisible("Creator") + " text-center"}>
                  Created by
                </td>
                <td className={isVisible("Details") + " text-center"}>
                  Details
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
            <ProposalsComponent />
          </table>
        )}
      </div>
    )}
  </Container>
);
