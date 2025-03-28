const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const {
  getNearBalances,
  decodeProposalDescription,
  formatSubmissionTimeStamp,
  accountToLockup,
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
                    tab: "History",
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

const proposalPeriod = policy.proposal_period;

function decodeBase64(encodedArgs) {
  if (!encodedArgs) return null;
  try {
    const jsonString = Buffer.from(encodedArgs, "base64").toString("utf8");
    const parsedArgs = JSON.parse(jsonString);
    return parsedArgs;
  } catch (error) {
    console.error("Failed to decode or parse encodedArgs:", error);
    return null;
  }
}

const ProposalsComponent = () => {
  return (
    <tbody style={{ overflowX: "auto" }}>
      {visibleProposals?.map((item, index) => {
        const notes = decodeProposalDescription("notes", item.description);
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

        const isLockup = receiverAccount === lockupContract;
        const treasuryWallet = isLockup ? lockupContract : treasuryDaoID;
        return (
          <tr
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
            <td className={isVisible("Type") + " text-center fw-semi-bold"}>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.Type`}
                props={{
                  type: action.method_name,
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
            {lockupContract && (
              <td className={"text-left"}>
                <div className="text-secondary fw-semi-bold">
                  {" "}
                  {isLockup ? "Lockup" : "Sputnik DAO"}
                </div>
                <Widget
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
                  props={{
                    accountId: treasuryWallet,
                    showKYC: false,
                    instance,
                    displayImage: false,
                    displayName: false,
                    width: 200,
                  }}
                />
              </td>
            )}

            <td className={isVisible("Validator")}>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.Validator`}
                props={{
                  validatorId: validatorAccount,
                  instance,
                }}
              />
            </td>
            <td className={"fw-semi-bold text-center " + isVisible("Creator")}>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
                props={{
                  accountId: item.proposer,
                  showKYC: false,
                  displayImage: false,
                  displayName: false,
                  instance,
                }}
              />
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
                      hasDeletePermission,
                      hasVotingPermission,
                      proposalCreator: item.proposer,
                      requiredVotes,
                      checkProposalStatus: () => checkProposalStatus(item.id),
                      avoidCheckForBalance: true, // we don't allow user to create request with insufficient balance
                      isWithdrawRequest,
                      validatorAccount,
                      treasuryWallet,
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
      <TableSkeleton numberOfCols={8} numberOfRows={3} numberOfHiddenRows={4} />
    ) : (
      <div className="w-100">
        {visibleProposals.length === 0 ? (
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
              <tr className="text-secondary">
                <td>#</td>
                <td className={isVisible("Created Date")}>Created Date</td>
                {!isPendingRequests && <td className="text-center"> Status</td>}
                <td className={isVisible("Type") + " text-center"}>Type</td>
                <td className={isVisible("Amount") + " text-right"}>Amount</td>
                {lockupContract && (
                  <td className={"text-left"}>Treasury Wallet</td>
                )}
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
            <ProposalsComponent />
          </table>
        )}
      </div>
    )}
  </Container>
);
