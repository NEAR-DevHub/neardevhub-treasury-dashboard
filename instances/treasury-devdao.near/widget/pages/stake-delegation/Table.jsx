const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const { getNearBalances } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);
const instance = props.instance;
const policy = props.policy;
if (!instance || typeof getNearBalances !== "function") {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const proposals = props.proposals;
const columnsVisibility = JSON.parse(
  Storage.get(
    "COLUMNS_VISIBILITY",
    `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.SettingsDropdown`
  ) ?? "[]"
);

const highlightProposalId = props.highlightProposalId;
const loading = props.loading;
const isPendingRequests = props.isPendingRequests;
const functionCallApproversGroup = props.functionCallApproversGroup;
const [showToastStatus, setToastStatus] = useState(false);
const [voteProposalId, setVoteProposalId] = useState(null);
const refreshTableData = props.refreshTableData;

const accountId = context.accountId;

const hasVotingPermission = (
  functionCallApproversGroup?.approverAccounts ?? []
).includes(accountId);

const Container = styled.div`
  font-size: 13px;
  min-height: 60vh;
  .text-grey {
    color: #b9b9b9 !important;
  }
  .text-size-2 {
    font-size: 15px;
  }
  .text-dark-grey {
    color: #687076;
  }
  .text-grey-100 {
    background-color: #f5f5f5;
  }
  td {
    padding: 0.5rem;
    color: inherit;
    vertical-align: middle;
    background: inherit;
  }

  .max-w-100 {
    max-width: 100%;
  }

  table {
    overflow-x: auto;
  }

  .bold {
    font-weight: 500;
  }

  .custom-truncate {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.5;
    max-height: 4.5em;
    text-align: left;
  }

  .display-none {
    display: none;
  }

  .text-right {
    text-align: end;
  }

  .text-left {
    text-align: left;
  }
  .text-underline {
    text-decoration: underline !important;
  }

  .bg-highlight {
    background-color: rgb(185, 185, 185, 0.2);
  }

  .toast {
    background: white !important;
  }

  .toast-header {
    background-color: #2c3e50 !important;
    color: white !important;
  }
`;

const ToastContainer = styled.div`
  a {
    color: black !important;
    text-decoration: underline !important;
    &:hover {
      color: black !important;
    }
  }
`;

function checkProposalStatus(proposalId) {
  Near.asyncView(treasuryDaoID, "get_proposal", {
    id: proposalId,
  }).then((result) => {
    setToastStatus(result.status);
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

const requiredVotes = functionCallApproversGroup.requiredVotes;

const hideApproversCol = isPendingRequests && requiredVotes === 1;

const userFTTokens = fetch(
  `https://api3.nearblocks.io/v1/account/${treasuryDaoID}/inventory`
);

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
    default:
      content = `The request has ${showToastStatus}.`;
      break;
  }
  return (
    <div className="toast-body">
      {content}
      {showToastStatus !== "InProgress" && (
        <a
          href={href({
            widgetSrc: `${instance}/widget/app`,
            params: {
              page: "stake-delegation",
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
    <ToastContainer className="toast-container position-fixed bottom-0 end-0 p-3">
      <div className={`toast ${showToastStatus ? "show" : ""}`}>
        <div className="toast-header px-2">
          <strong className="me-auto">Just Now</strong>
          <i className="bi bi-x-lg h6" onClick={() => setToastStatus(null)}></i>
        </div>
        <ToastStatusContent />
      </div>
    </ToastContainer>
  ) : null;
};

const proposalPeriod = policy.proposal_period;

function formatSubmissionTimeStamp(submissionTime) {
  const endTime = Big(submissionTime).plus(proposalPeriod).toFixed();
  const milliseconds = Number(endTime) / 1000000;
  const date = new Date(milliseconds);

  // Calculate days and minutes remaining from the timestamp
  const now = new Date();
  let diffTime = date - now;

  // Check if the difference is negative
  const isNegative = diffTime < 0;

  // Convert the total difference into days, hours, and minutes
  const totalMinutes = Math.floor(diffTime / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const totalDays = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;

  // Get hours, minutes, day, month, and year
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("default", { month: "short" });
  const year = date.getFullYear();
  return (
    <div className="d-flex flex-column">
      <div className="fw-bold">
        {isNegative
          ? "Expired"
          : `${totalDays}d ${remainingHours}h ${remainingMinutes}m`}
      </div>
      <div className="text-muted text-sm">
        {hours}:{minutes} {day} {month} {year}
      </div>
    </div>
  );
}

const ProposalsComponent = () => {
  return (
    <tbody style={{ overflowX: "auto" }}>
      {proposals?.map((item, index) => {
        const description = JSON.parse(item.description);
        const args = item?.kind?.FunctionCall;
        const action = args?.actions[0];
        const isStakeRequest = action.method_name === "deposit_and_stake";
        const notes = description.notes;
        let amount = action.deposit;
        if (!isStakeRequest) {
          let value = JSON.parse(
            Buffer.from(action.args, "base64").toString("utf-8")
          );
          amount = value.amount;
        }
        return (
          <tr
            className={
              voteProposalId === item.id || highlightProposalId === item.id
                ? "bg-highlight"
                : ""
            }
          >
            <td className="bold">{item.id}</td>
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
            <td className={isVisible("Type") + " text-center bold"}>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.Type`}
                props={{
                  isStakeRequest,
                }}
              />
            </td>
            <td className={isVisible("Amount") + " text-right"}>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmount`}
                props={{
                  instance,
                  amountWithoutDecimals: amount,
                  address: "",
                }}
              />
            </td>
            <td className={isVisible("Validator")}>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.Validator`}
                props={{
                  validatorId: args.receiver_id,
                }}
              />
            </td>
            <td className={"bold text-center " + isVisible("Creator")}>
              <Widget
                src="${REPL_MOB}/widget/Profile.OverlayTrigger"
                props={{
                  accountId: item.proposer,
                  children: (
                    <div
                      className="text-truncate"
                      style={{ maxWidth: "300px" }}
                    >
                      {item.proposer}
                    </div>
                  ),
                }}
              />
            </td>
            <td className={"text-sm text-left " + isVisible("Notes")}>
              {notes ? notes : "-"}
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
                  functionCallApproversGroup:
                    functionCallApproversGroup?.approverAccounts,
                }}
              />
            </td>

            {isPendingRequests && (
              <td
                className={isVisible("Expiring Date") + " text-left"}
                style={{ minWidth: 150 }}
              >
                {formatSubmissionTimeStamp(item.submission_time)}
              </td>
            )}
            {isPendingRequests && hasVotingPermission && (
              <td className="text-right">
                <Widget
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.VoteActions`}
                  props={{
                    instance,
                    votes: item.votes,
                    proposalId: item.id,
                    tokensBalance: [
                      ...(userFTTokens?.body?.inventory?.fts ?? []),
                      {
                        contract: "near",
                        amount: nearBalances.available,
                      },
                    ],
                    currentAmount: amount,
                    currentContract: "near",
                    requiredVotes,
                    checkProposalStatus: () => checkProposalStatus(item.id),

                    avoidCheckForBalance: !isStakeRequest,
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
    functionCallApproversGroup === null ||
    policy === null ? (
      <div className="d-flex justify-content-center align-items-center w-100 h-100">
        <Widget
          src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"}
        />
      </div>
    ) : (
      <div>
        {proposals.length === 0 ? (
          <div
            style={{ height: "50vh" }}
            className="d-flex justify-content-center align-items-center"
          >
            {isPendingRequests ? (
              <div className="d-flex justify-content-center align-items-center flex-column gap-2">
                <h4>No Stake Delegation Requests Found</h4>
                <h6>There are currently no stake delegation requests</h6>
              </div>
            ) : (
              <div className="d-flex justify-content-center align-items-center flex-column gap-2">
                <h4>No History Requests Found</h4>
                <h6>There are currently no history requests</h6>
              </div>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr className="text-grey">
                <td>#</td>
                <td className={isVisible("Created Date")}>Created Date</td>
                {!isPendingRequests && <td>Status</td>}
                <td className={isVisible("Type") + " text-center"}>Type</td>
                <td className={isVisible("Amount") + " text-right"}>Amount</td>
                <td className={isVisible("Validator")}>Validator</td>
                <td className={"text-center " + isVisible("Creator")}>
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
                {isPendingRequests && hasVotingPermission && (
                  <td className="text-right">Actions</td>
                )}
                {/* {!isPendingRequests && <td>Transaction Date</td>}
          {!isPendingRequests && <td>Transaction</td>} */}
              </tr>
            </thead>
            <ProposalsComponent />
          </table>
        )}
      </div>
    )}
  </Container>
);
