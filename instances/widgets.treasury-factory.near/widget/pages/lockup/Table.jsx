const accountId = context.accountId;
const functionCallApproversGroup = props.functionCallApproversGroup;
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

const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
const { decodeBase64 } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);
const { RowsSkeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
);
const { treasuryDaoID, allowLockupCancellation } = VM.require(
  `${instance}/widget/config.data`
);

if (!instance || !RowsSkeleton || !decodeBase64 || !treasuryDaoID) return <></>;

const columnsVisibility = JSON.parse(
  Storage.get(
    "COLUMNS_VISIBILITY",
    `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.lockup.SettingsDropdown`
  ) ?? "[]"
);

const [showToastStatus, setToastStatus] = useState(false);
const [voteProposalId, setVoteProposalId] = useState(null);
const hasVotingPermission = (
  functionCallApproversGroup?.approverAccounts ?? []
).includes(accountId);
const hasDeletePermission = (deleteGroup?.approverAccounts ?? []).includes(
  accountId
);

const Container = styled.div`
  font-size: 14px;
  min-height: 60vh;

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
  { title: "Created At", show: true },
  { title: "Status", show: !isPendingRequests, className: "text-center" },
  { title: "Recipient Account", show: true },
  { title: "Amount", show: true, className: "text-right" },
  { title: "Start Date", show: true },
  { title: "End Date", show: true },
  { title: "Cliff Date", show: allowLockupCancellation },
  { title: "Allow Cancellation", show: allowLockupCancellation },
  { title: "Allow Staking", show: true },
  { title: "Required Votes", show: isPendingRequests },
  { title: "Votes", show: isPendingRequests, className: "text-center" },
  { title: "Approvers", show: true },
  { title: "Actions", show: isPendingRequests, className: "text-right" },
];

function isVisible(column) {
  return columnsVisibility.find((i) => i.title === column)?.show !== false;
}

const requiredVotes = functionCallApproversGroup?.requiredVotes;

const formatTimestamp = (timestamp) => Math.floor(timestamp / 1e6);

const hasOneDeleteIcon =
  isPendingRequests &&
  hasDeletePermission &&
  (proposals ?? []).find(
    (i) =>
      i.proposer === accountId &&
      !Object.keys(i.votes ?? {}).includes(accountId)
  );

const ProposalsComponent = ({ item }) => {
  const proposalId = parseInt(item.id, 10);
  const args = decodeBase64(item.kind.FunctionCall.actions[0].args);
  const vestingSchedule = args.vesting_schedule?.VestingSchedule;
  const startTimestamp =
    vestingSchedule?.start_timestamp || args.lockup_timestamp;

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
      <td className="fw-semi-bold">{proposalId}</td>
      <td className={isVisible("Created Date")}>
        <Widget
          loading=""
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DateTimeDisplay"
          props={{
            timestamp: item.submission_time / 1e6,
            format: "date-time",
            instance,
          }}
        />
      </td>
      {!isPendingRequests && (
        <td className={isVisible("Status") + " text-center"}>
          <Widget
            loading=""
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.HistoryStatus`}
            props={{ instance, isVoteStatus: false, status: item.status }}
          />
        </td>
      )}
      <td className={isVisible("Recipient Account")}>
        {item.status === "Approved" ? (
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://near.github.io/account-lookup/#${args.owner_account_id}`}
          >
            {args.owner_account_id}
            <i className="bi bi-box-arrow-up-right"></i>
          </a>
        ) : (
          args.owner_account_id
        )}
      </td>

      <td className={isVisible("Amount") + " text-right"}>
        <Widget
          loading=""
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmount`}
          props={{
            instance,
            amountWithoutDecimals: item.kind.FunctionCall.actions[0].deposit,
          }}
        />
      </td>
      <td className={isVisible("Start Date")}>
        <Widget
          loading=""
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DateTimeDisplay"
          props={{
            timestamp: startTimestamp / 1e6,
            format: "date-time",
            instance,
          }}
        />
      </td>
      <td className={isVisible("End Date")}>
        <Widget
          loading=""
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DateTimeDisplay"
          props={{
            timestamp: vestingSchedule.end_timestamp
              ? vestingSchedule.end_timestamp / 1e6
              : (parseInt(startTimestamp) + parseInt(args.release_duration)) /
                1e6,
            format: "date-time",
            instance,
          }}
        />
      </td>
      {allowLockupCancellation && (
        <>
          <td className={isVisible("Cliff Date")}>
            {vestingSchedule.cliff_timestamp ? (
              <Widget
                loading=""
                src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DateTimeDisplay"
                props={{
                  timestamp: vestingSchedule.cliff_timestamp / 1e6,
                  format: "date-time",
                  instance,
                }}
              />
            ) : (
              "-"
            )}
          </td>
          <td className={isVisible("Allow Cancellation")}>
            {!!vestingSchedule ? "Yes" : "No"}
          </td>
        </>
      )}
      <td className={isVisible("Allow Staking")}>
        {args.whitelist_account_id === "lockup-no-whitelist.near"
          ? "No"
          : "Yes"}
      </td>
      {isPendingRequests && (
        <td className={isVisible("Required Votes") + " text-center"}>
          {requiredVotes ?? "-"}
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
      <td className={isVisible("Approvers") + " text-center"}>
        <Widget
          loading=""
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Approvers`}
          props={{
            votes: item.votes,
            approversGroup: functionCallApproversGroup?.approverAccounts,
            instance,
          }}
        />
      </td>
      {isPendingRequests && (hasVotingPermission || hasDeletePermission) && (
        <td
          className={isVisible("Actions") + " text-right"}
          onClick={(e) => e.stopPropagation()}
        >
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
};

return (
  <Container style={{ overflowX: "auto" }}>
    <table className="table">
      <thead>
        <tr>
          {columns
            .filter((i) => i.show)
            .map((column) =>
              column.title === "Created At" ? (
                <td
                  key={column.title}
                  className={isVisible("Created At") + " cursor-pointer"}
                  onClick={props.handleSortClick}
                  style={{ color: "var(--text-color)" }}
                >
                  Created At
                  <span style={{ marginLeft: 4 }}>
                    {props.sortDirection === "desc" ? (
                      <i className="bi bi-arrow-down"></i>
                    ) : (
                      <i className="bi bi-arrow-up"></i>
                    )}
                  </span>
                </td>
              ) : (
                <td
                  key={column.title}
                  className={`${column.className} ${isVisible(
                    column.title
                  )} text-secondary`}
                >
                  {column.title}
                </td>
              )
            )}
        </tr>
      </thead>

      {loading ||
      proposals === null ||
      functionCallApproversGroup === null ||
      policy === null ||
      !Array.isArray(proposals) ? (
        <tbody>
          <RowsSkeleton
            numberOfCols={
              isPendingRequests ? columns.length : columns.length - 2
            }
            numberOfRows={3}
            numberOfHiddenRows={4}
          />
        </tbody>
      ) : !Array.isArray(proposals) || proposals.length === 0 ? (
        <tbody>
          <tr>
            <td colSpan={14} rowSpan={10} className="text-center align-middle">
              {isPendingRequests ? (
                <>
                  <h4>No Lockup Requests Found</h4>
                  <h6>There are currently no lockup requests</h6>
                </>
              ) : (
                <>
                  <h4>No History Requests Found</h4>
                  <h6>There are currently no history requests</h6>
                </>
              )}
            </td>
          </tr>
          {[...Array(8)].map((_, index) => (
            <tr key={index}></tr>
          ))}
        </tbody>
      ) : (
        <tbody style={{ overflowX: "auto" }}>
          {proposals.map((item, index) => (
            <ProposalsComponent item={item} key={index} />
          ))}
        </tbody>
      )}
    </table>
  </Container>
);
