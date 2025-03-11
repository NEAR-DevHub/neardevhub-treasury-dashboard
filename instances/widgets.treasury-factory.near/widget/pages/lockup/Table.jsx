const accountId = context.accountId;
const transferApproversGroup = props.transferApproversGroup;
const deleteGroup = props.deleteGroup;
const instance = props.instance;
const policy = props.policy;
const proposals = props.proposals;
const refreshTableData = props.refreshTableData;
const loading = props.loading;
const isPendingRequests = props.isPendingRequests;
const highlightProposalId =
  props.highlightProposalId ||
  props.highlightProposalId === "0" ||
  props.highlightProposalId === 0
    ? parseInt(props.highlightProposalId)
    : null;
const lockupCreated = props.lockupCreated;

const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
const { decodeBase64 } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);
const { TableSkeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
);
const { treasuryDaoID, lockupContract } = VM.require(
  `${instance}/widget/config.data`
);

if (!instance || !TableSkeleton || !decodeBase64 || !treasuryDaoID)
  return <></>;

const columnsVisibility = JSON.parse(
  Storage.get(
    "COLUMNS_VISIBILITY",
    `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.lockup.SettingsDropdown`
  ) ?? "[]"
);

const [showToastStatus, setToastStatus] = useState(false);
const [voteProposalId, setVoteProposalId] = useState(null);
const [lockupNearBalances, setLockupNearBalances] = useState(null);
const hasVotingPermission = (
  transferApproversGroup?.approverAccounts ?? []
).includes(accountId);
const hasDeletePermission = (deleteGroup?.approverAccounts ?? []).includes(
  accountId
);

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

useEffect(() => {
  if (lockupContract)
    Near.asyncView(lockupContract, "get_liquid_owners_balance").then((res) => {
      setLockupNearBalances((prev) => ({
        ...prev,
        available: res,
      }));
    });
}, [lockupContract]);

const TooltipContent = ({ title, summary }) => {
  return (
    <div className="p-1">
      {title && <h6>{title}</h6>}
      <div>{summary}</div>
    </div>
  );
};

const columns = [
  { title: "#", show: true },
  { title: "Created Date", show: true },
  { title: "Status", show: !isPendingRequests },
  { title: "Receiver account", show: true },
  { title: "Token", show: true },
  { title: "Amount", show: true },
  { title: "Start date", show: true },
  { title: "End date", show: true },
  { title: "Cliff date", show: true },
  { title: "Allow cancellation", show: true },
  { title: "Allow staking", show: true },
  { title: "Required votes", show: true },
  { title: "Votes", show: isPendingRequests },
  { title: "Approvers", show: true },
  { title: "Actions", show: isPendingRequests },
];

function isVisible(column) {
  return columns.find((i) => i.title === column)?.show ? "" : "display-none";
}
const requiredVotes = transferApproversGroup?.requiredVotes;

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

const formatTimestamp = (timestamp) => Math.floor(timestamp / 1e6);
console.log(hasVotingPermission || hasDeletePermission);
const ProposalsComponent = ({ item }) => {
  const proposalId = parseInt(item.id, 10);
  const args = decodeBase64(item.kind.FunctionCall.actions[0].args);
  const vestingSchedule = args.vesting_schedule?.VestingSchedule;
  const startTimestamp =
    vestingSchedule?.start_timestamp || args.lockup_timestamp;

  return (
    <tr>
      <td>{proposalId}</td>
      <td className={isVisible("Created Date")}>
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Date`}
          props={{ timestamp: startTimestamp }}
        />
      </td>
      {!isPendingRequests && (
        <td>
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.HistoryStatus`}
            props={{ instance, isVoteStatus: false, status: item.status }}
          />
        </td>
      )}
      <td className={isVisible("Receiver account")}>
        {lockupCreated ? (
          <a
            target="_blank"
            href={`https://near.github.io/account-lookup/#${args.owner_account_id}`}
          >
            {args.owner_account_id}
            <i className="bi bi-box-arrow-up-right"></i>
          </a>
        ) : (
          args.owner_account_id
        )}
      </td>
      <td className={isVisible("Token")}>
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenIcon`}
        />
      </td>
      <td className={isVisible("Amount") + " text-right"}>
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmount`}
          props={{
            instance,
            amountWithoutDecimals: item.kind.FunctionCall.actions[0].deposit,
          }}
        />
      </td>
      <td className={isVisible("Start date")}>
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Date`}
          props={{ timestamp: startTimestamp }}
        />
      </td>
      <td className={isVisible("End date")}>
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Date`}
          props={{
            timestamp:
              vestingSchedule.end_timestamp ??
              parseInt(startTimestamp) + parseInt(args.release_duration),
          }}
        />
      </td>
      <td className={isVisible("Cliff date")}>
        {vestingSchedule.cliff_timestamp ? (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Date`}
            props={{ timestamp: vestingSchedule.cliff_timestamp }}
          />
        ) : (
          "-"
        )}
      </td>
      <td className={isVisible("Allow cancellation")}>
        {!!vestingSchedule ? "Yes" : "No"}
      </td>
      <td className={isVisible("Allow staking")}>
        {args.whitelist_account_id === "lockup-no-whitelist.near"
          ? "No"
          : "Yes"}
      </td>
      <td className={isVisible("Required votes") + " text-center"}>
        {requiredVotes ?? "-"}
      </td>
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
      <td className={isVisible("Approvers") + " text-center"}>
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Approvers`}
          props={{
            votes: item.votes,
            approversGroup: functionCallApproversGroup?.approverAccounts,
            instance,
          }}
        />
      </td>
      {isPendingRequests && (hasVotingPermission || hasDeletePermission) && (
        <td className={isVisible("Actions") + " text-center"}>
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.VoteActions`}
            props={{
              instance,
              votes: item.votes,
              proposalId: item.id,
              hasDeletePermission,
              hasVotingPermission,
              proposalCreator: item.proposer,
              tokensBalance: [
                {
                  contract: "near",
                  amount: Big(lockupNearBalances?.available ?? 0).toFixed(2),
                },
              ],
              currentAmount: args.amount,
              currentContract: "near",
              requiredVotes,
              checkProposalStatus: () => checkProposalStatus(item.id),
            }}
          />
        </td>
      )}
    </tr>
  );
};

return (
  <Container style={{ overflowX: "auto" }}>
    <VoteSuccessToast />
    {loading === true || proposals === null || policy === null ? (
      <TableSkeleton
        numberOfCols={columns.filter((i) => i.show).length}
        numberOfRows={3}
        numberOfHiddenRows={4}
      />
    ) : (
      <div className="w-100">
        {proposals.length === 0 ? (
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

            <tbody style={{ overflowX: "auto" }}>
              {proposals?.map((item, index) => (
                <ProposalsComponent item={item} key={index} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    )}
  </Container>
);
