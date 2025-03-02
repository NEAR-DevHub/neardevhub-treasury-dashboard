const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const { getNearBalances, formatSubmissionTimeStamp } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);
const instance = props.instance;
const policy = props.policy;

const { TableSkeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
);

if (
  !instance ||
  !TableSkeleton ||
  typeof getNearBalances !== "function" ||
  typeof formatSubmissionTimeStamp !== "function"
) {
  return <></>;
}

const { treasuryDaoID, lockupContract } = VM.require(
  `${instance}/widget/config.data`
);

const proposals = props.proposals;
// search for showAfterProposalIdApproved only in pending requests
const visibleProposals = proposals;

const columnsVisibility = JSON.parse(
  Storage.get(
    "COLUMNS_VISIBILITY",
    `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.lockup.SettingsDropdown`
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
const [showToastStatus, setToastStatus] = useState(false);
const [voteProposalId, setVoteProposalId] = useState(null);
const [lockupStakedPoolId, setLockupStakedPoolId] = useState(null);

const refreshTableData = props.refreshTableData;
const accountId = context.accountId;

console.log("lockupContract", lockupContract);

useEffect(() => {
  if (lockupContract) {
    Near.asyncView(lockupContract, "get_staking_pool_account_id").then((res) =>
      setLockupStakedPoolId(res)
    );
  }
}, [lockupContract]);

const Container = styled.div`
  font-size: 14px;
  min-height: 60vh;
  display: flex;

  td {
    padding: 0.5rem;
    color: inherit;
    vertical-align: middle;
    background: inherit;
  }

  table {
    overflow-x: auto;

    thead td {
      text-wrap: nowrap;
    }
  }

  .text-warning {
    color: var(--other-warning) !important;
  }

  .markdown-href p {
    margin-bottom: 0px !important;
  }

  .markdown-href a {
    color: inherit !important;
  }
`;

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
      {title && <h6>{title}</h6>}
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
      content = "The payment request has been rejected.";
      break;
    case "Removed":
      content = "The payment request has been successfully deleted.";
      break;
    default:
      content = `The request has ${showToastStatus}.`;
      break;
  }
  return (
    <div className="toast-body">
      <div className="d-flex align-items-center gap-3">
        {showToastStatus === "Approved" && (
          <i class="bi bi-check2 h3 mb-0 success-icon"></i>
        )}
        <div>
          {content}
          <br />
          {showToastStatus !== "InProgress" &&
            showToastStatus !== "Removed" && (
              <a
                className="text-underline"
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
      </div>
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
          <i
            className="bi bi-x-lg h6 mb-0 cursor-pointer"
            onClick={() => setToastStatus(null)}
          ></i>
        </div>
        <ToastStatusContent />
      </div>
    </div>
  ) : null;
};

const handleApprove = (requestId) => {
  Near.call(lockupContract, "approve_request", {
    request_id: requestId,
  });
};

const handleReject = (requestId) => {
  Near.call(lockupContract, "delete_request", {
    request_id: requestId,
  });
};

const ProposalsComponent = () => {
  return (
    <tbody style={{ overflowX: "auto" }}>
      {visibleProposals?.map((item, index) => {
        const vestingSchedule = item.vesting_schedule.VestingSchedule;

        return (
          <tr>
            <td>{index + 1}</td>
            <td className={isVisible("Created Date")}>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Date`}
                props={{ timestamp: vestingSchedule.start_timestamp }}
              />
            </td>
            <td className={isVisible("Funding wallet")}>
              {item.owner_account_id}
            </td>
            <td className={isVisible("Receiver account")}>
              {item.receiver_id}
            </td>
            <td className={isVisible("Amount") + " text-right"}>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmount`}
                props={{
                  instance,
                  amountWithoutDecimals: item.actions[0].deposit,
                  address: "",
                }}
              />
            </td>
            <td className={isVisible("Start date")}>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Date`}
                props={{ timestamp: vestingSchedule.start_timestamp }}
              />
            </td>
            <td className={isVisible("End date")}>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Date`}
                props={{ timestamp: vestingSchedule.end_timestamp }}
              />
            </td>
            <td className={isVisible("Cliff date")}>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Date`}
                props={{ timestamp: vestingSchedule.cliff_timestamp }}
              />
            </td>
            <td className={isVisible("Allow cancellation")}>yes</td>
            <td className={isVisible("Allow staking")}>yes</td>
            <td className={isVisible("Require votes")}>yes</td>
            <td className={isVisible("Approvers")}>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Approvers`}
                props={{
                  votes: item.votes,
                  approversGroup: functionCallApproversGroup?.approverAccounts,
                  instance,
                }}
              />
            </td>
            <td className={isVisible("Actions")}>
              <Widget
                src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
                props={{
                  classNames: {
                    root: "btn btn-primary shadow-none no-transparent",
                  },
                  label: "Approve",
                  onClick: () => handleApprove(item.request_id),
                  disabled: false,
                }}
              />
              <Widget
                src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
                props={{
                  classNames: {
                    root: "btn btn-danger shadow-none no-transparent",
                  },
                  label: "Reject",
                  onClick: () => handleReject(item.request_id),
                  disabled: false,
                }}
              />
            </td>
          </tr>
        );
      })}
    </tbody>
  );
};

const columns = [
  { title: "#", show: true },
  { title: "Created Date", show: true },
  { title: "Funding wallet", show: true },
  { title: "Receiver account", show: true },
  { title: "Amount", show: true },
  { title: "Start date", show: true },
  { title: "End date", show: true },
  { title: "Cliff date", show: true },
  { title: "Allow cancellation", show: true },
  { title: "Allow staking", show: true },
  { title: "Require votes", show: true },
  { title: "Approvers", show: true },
  { title: "Actions", show: true },
];

return (
  <Container style={{ overflowX: "auto" }}>
    <VoteSuccessToast />
    {loading === true ||
    proposals === null ||
    functionCallApproversGroup === null ||
    policy === null ? (
      <TableSkeleton
        numberOfCols={columns.length}
        numberOfRows={3}
        numberOfHiddenRows={4}
      />
    ) : (
      <div className="w-100">
        {visibleProposals.length === 0 ? (
          <div
            style={{ height: "50vh" }}
            className="d-flex justify-content-center align-items-center"
          >
            {isPendingRequests ? (
              <div className="d-flex justify-content-center align-items-center flex-column gap-2">
                <h4>No Lockup Requests Found</h4>
                <h6>There are currently no lockup requests</h6>
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
              <tr className="text-secondary">
                {columns.map((column) => (
                  <td key={column.title} className={isVisible(column.title)}>
                    {column.title}
                  </td>
                ))}
              </tr>
            </thead>
            <ProposalsComponent />
          </table>
        )}
      </div>
    )}
  </Container>
);
