const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const {
  decodeBase64,
  getNearBalances,
  decodeProposalDescription,
  formatSubmissionTimeStamp,
  accountToLockup,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common");
const instance = props.instance;
const policy = props.policy;

const { RowsSkeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
);

if (
  !instance ||
  !RowsSkeleton ||
  typeof getNearBalances !== "function" ||
  typeof decodeProposalDescription !== "function" ||
  typeof formatSubmissionTimeStamp !== "function" ||
  typeof accountToLockup !== "function"
) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const lockupContract = accountToLockup(treasuryDaoID);

const proposals = props.proposals;
// search for showAfterProposalIdApproved only in pending requests
const visibleProposals = isPendingRequests
  ? (proposals ?? []).filter((proposal, index) => {
      const showAfterProposalIdApproved = decodeProposalDescription(
        "showAfterProposalIdApproved",
        proposal.description
      );

      // Check if `showAfterProposalIdApproved` exists and if the proposal ID exists in the array
      if (showAfterProposalIdApproved) {
        return !(proposals ?? []).some(
          (p) => p.id === parseInt(showAfterProposalIdApproved)
        );
      }
      // If no `showAfterProposalIdApproved`, the proposal is visible
      return true;
    })
  : proposals;

const columnsVisibility = JSON.parse(
  Storage.get(
    "COLUMNS_VISIBILITY",
    `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.SettingsDropdown`
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
const [showToastStatus, setToastStatus] = useState(false);
const [voteProposalId, setVoteProposalId] = useState(null);
const [lockupStakedPoolId, setLockupStakedPoolId] = useState(null);

const refreshTableData = props.refreshTableData;

const accountId = context.accountId;

useEffect(() => {
  if (lockupContract) {
    Near.asyncView(lockupContract, "get_staking_pool_account_id").then((res) =>
      setLockupStakedPoolId(res)
    );
  }
}, [lockupContract]);

const hasVotingPermission = (
  functionCallApproversGroup?.approverAccounts ?? []
).includes(accountId);

const hasDeletePermission = (deleteGroup?.approverAccounts ?? []).includes(
  accountId
);

const Container = styled.div`
  font-size: 13px;
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

  .markdown-href p {
    margin-bottom: 0px !important;
  }

  .markdown-href a {
    color: inherit !important;
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

function isVisible(column) {
  return columnsVisibility.find((i) => i.title === column)?.show !== false
    ? ""
    : "display-none";
}

const requiredVotes = functionCallApproversGroup.requiredVotes;

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
      {visibleProposals?.map((item, index) => {
        const notes = decodeProposalDescription("notes", item.description);
        const withdrawAmount = decodeProposalDescription(
          "amount",
          item.description
        );
        const args = item?.kind?.FunctionCall;
        const action = args?.actions[0];
        const isStakeRequest = action.method_name === "deposit_and_stake";
        const customNotes = decodeProposalDescription(
          "customNotes",
          item.description
        );
        const receiverAccount = args.receiver_id;
        let validatorAccount = receiverAccount;
        if (validatorAccount === lockupContract) {
          validatorAccount =
            lockupStakedPoolId ??
            decodeBase64(action.args)?.staking_pool_account_id ??
            "";
        }
        let amount = action.deposit;
        if (!isStakeRequest || receiverAccount.includes("lockup.near")) {
          let value = decodeBase64(action.args);
          amount = value.amount;
        }

        const isWithdrawRequest =
          action.method_name === "withdraw_all_from_staking_pool" ||
          action.method_name === "withdraw_all";

        if (isWithdrawRequest) {
          amount = withdrawAmount || 0;
        }

        const isLockup = receiverAccount === lockupContract;
        const treasuryWallet = isLockup ? lockupContract : treasuryDaoID;
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
            <td className="fw-semi-bold px-3">{item.id}</td>
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
            <td className={isVisible("Type") + " text-center fw-semi-bold"}>
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.Type`}
                props={{
                  type: action.method_name,
                }}
              />
            </td>
            <td className={isVisible("Amount") + " text-right"}>
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmount`}
                props={{
                  instance,
                  amountWithoutDecimals: amount,
                  address: "",
                }}
              />
            </td>
            {lockupContract && (
              <td className={"text-left"}>
                <div className="text-secondary fw-semi-bold">
                  {isLockup ? "Lockup" : "Sputnik DAO"}
                </div>
                <Widget
                  loading=""
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
                  props={{
                    accountId: treasuryWallet,
                    showKYC: false,
                    instance,
                    displayImage: false,
                    displayName: false,
                  }}
                />
              </td>
            )}

            <td className={isVisible("Validator")}>
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.Validator`}
                props={{
                  validatorId: validatorAccount,
                  instance,
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
            <td
              className={
                "text-sm text-left markdown-href " +
                isVisible("Notes") +
                (customNotes && " text-warning")
              }
            >
              {notes || customNotes ? (
                <Markdown
                  text={customNotes || notes}
                  syntaxHighlighterProps={{
                    wrapLines: true,
                  }}
                />
              ) : (
                "-"
              )}
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
                  proposalPeriod,
                  instance
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
                      requiredVotes,
                      checkProposalStatus: () => checkProposalStatus(item.id),
                      avoidCheckForBalance: true, // we don't allow user to create request with insufficient balance
                      isWithdrawRequest,
                      validatorAccount,
                      treasuryWallet,
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
  <Container className="h-100 w-100" style={{ overflowX: "auto" }}>
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
            {!isPendingRequests && <td className="text-center"> Status</td>}
            <td className={isVisible("Type") + " text-center"}>Type</td>
            <td className={isVisible("Amount") + " text-right"}>Amount</td>
            {lockupContract && <td className={"text-left"}>Treasury Wallet</td>}
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
            {isPendingRequests &&
              (hasVotingPermission || hasDeletePermission) && (
                <td className="text-right">Actions</td>
              )}
            {/* {!isPendingRequests && <td>Transaction Date</td>}
        {!isPendingRequests && <td>Transaction</td>} */}
          </tr>
        </thead>

        {loading === true ||
        proposals === null ||
        !Array.isArray(visibleProposals) ? (
          <tbody>
            <RowsSkeleton
              numberOfCols={isPendingRequests ? 11 : 9}
              numberOfRows={3}
              numberOfHiddenRows={4}
            />
          </tbody>
        ) : !Array.isArray(visibleProposals) ||
          visibleProposals.length === 0 ? (
          <tbody>
            <tr>
              <td
                colSpan={14}
                rowSpan={10}
                className="text-center align-middle"
              >
                {isPendingRequests ? (
                  <>
                    <h4>No Stake Delegation Requests Found</h4>
                    <h6>There are currently no stake delegation requests</h6>
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
          <ProposalsComponent />
        )}
      </table>
    </div>
  </Container>
);
