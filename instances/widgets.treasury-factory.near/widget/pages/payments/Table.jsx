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
if (!instance || typeof accountToLockup !== "function") {
  return <></>;
}

const { treasuryDaoID, showKYC, showReferenceProposal } = VM.require(
  `${instance}/widget/config.data`
);

const { TableSkeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
);

const lockupContract = accountToLockup(treasuryDaoID);

if (
  !instance ||
  !TableSkeleton ||
  typeof getNearBalances !== "function" ||
  typeof decodeProposalDescription !== "function" ||
  typeof formatSubmissionTimeStamp !== "function"
) {
  return <></>;
}

const proposals = props.proposals;
const columnsVisibility = JSON.parse(
  Storage.get(
    "COLUMNS_VISIBILITY",
    `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.SettingsDropdown`
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
const transferApproversGroup = props.transferApproversGroup;
const deleteGroup = props.deleteGroup;
const [nearStakedTokens, setNearStakedTokens] = useState(null);
const [lockupNearBalances, setLockupNearBalances] = useState(null);
const refreshTableData = props.refreshTableData;

const accountId = context.accountId;

const hasVotingPermission = (
  transferApproversGroup?.approverAccounts ?? []
).includes(accountId);

const hasDeletePermission = (deleteGroup?.approverAccounts ?? []).includes(
  accountId
);

const Container = styled.div`
  font-size: 13px;
  min-height: 60vh;
  display: flex;

  thead td {
    text-wrap: nowrap;
  }

  table {
    overflow-x: auto;
  }

  .proposal-row {
    &:hover {
      background-color: var(--grey-04) !important;
    }
  }
`;

function checkProposalStatus(proposalId) {
  Near.asyncView(treasuryDaoID, "get_proposal", {
    id: proposalId,
  })
    .then((result) => {
      props.setToastStatus(result.status);
      props.setVoteProposalId(proposalId);
      refreshTableData();
    })
    .catch(() => {
      // deleted request (thus proposal won't exist)
      props.setToastStatus("Removed");
      props.setVoteProposalId(proposalId);
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

const requiredVotes = transferApproversGroup?.requiredVotes;

const hideApproversCol = isPendingRequests && requiredVotes === 1;

const userFTTokens = fetch(
  `${REPL_BACKEND_API}/ft-tokens/?account_id=${treasuryDaoID}`
);

const nearBalances = getNearBalances(treasuryDaoID);

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

useEffect(() => {
  if (lockupContract) {
    Near.asyncView(lockupContract, "get_liquid_owners_balance").then((res) => {
      setLockupNearBalances((prev) => ({
        ...prev,
        available: res,
      }));
    });
  }
}, [lockupContract]);

const ProposalsComponent = () => {
  return (
    <tbody style={{ overflowX: "auto" }}>
      {proposals?.map((item, index) => {
        const notes = decodeProposalDescription("notes", item.description);
        const title = decodeProposalDescription("title", item.description);
        const summary = decodeProposalDescription("summary", item.description);
        const description = !title && !summary && item.description;
        const id = decodeProposalDescription("proposalId", item.description);
        const proposalId = id ? parseInt(id, 10) : null;
        const isFunctionType =
          Object.values(item?.kind?.FunctionCall ?? {})?.length > 0;
        const decodedArgs =
          isFunctionType &&
          decodeBase64(item.kind.FunctionCall?.actions[0].args);
        const args = isFunctionType
          ? {
              token_id: "",
              receiver_id: decodedArgs?.receiver_id,
              amount: decodedArgs?.amount,
            }
          : item.kind.Transfer;

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
                    isPaymentsPage: true,
                  }}
                />
              </td>
            )}
            {lockupContract && (
              <td className={"text-left"}>
                <div className="text-secondary fw-semi-bold">
                  {isFunctionType ? "Lockup" : "Sputnik DAO"}
                </div>
                <Widget
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
                  props={{
                    accountId: isFunctionType ? lockupContract : treasuryDaoID,
                    showKYC: false,
                    instance,
                    displayImage: false,
                    displayName: false,
                    width: 200,
                  }}
                />
              </td>
            )}
            {showReferenceProposal && (
              <td className={isVisible("Reference")}>
                {typeof proposalId === "number" ? (
                  <Link
                    target="_blank"
                    rel="noopener noreferrer"
                    to={href({
                      widgetSrc: `${REPL_DEVHUB}/widget/app`,
                      params: {
                        page: "proposal",
                        id: proposalId,
                      },
                    })}
                  >
                    <div className="d-flex gap-2 align-items-center text-underline fw-semi-bold">
                      #{proposalId} <i class="bi bi-box-arrow-up-right"> </i>
                    </div>
                  </Link>
                ) : (
                  "-"
                )}
              </td>
            )}

            <td className={isVisible("Title")}>
              {description ? (
                description
              ) : (
                <Widget
                  src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                  props={{
                    popup: <TooltipContent title={title} summary={summary} />,
                    children: (
                      <div
                        className="custom-truncate fw-semi-bold"
                        style={{ width: 180 }}
                      >
                        {title}
                      </div>
                    ),
                    instance,
                  }}
                />
              )}
            </td>
            <td className={isVisible("Summary")}>
              <Widget
                src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                props={{
                  popup: <TooltipContent title={title} summary={summary} />,
                  children: (
                    <div
                      className="custom-truncate"
                      style={{ width: summary ? 180 : 10 }}
                    >
                      {summary ? summary : "-"}
                    </div>
                  ),
                  instance,
                }}
              />
            </td>
            <td className={"fw-semi-bold " + isVisible("Recipient")}>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
                props={{
                  accountId: args.receiver_id,
                  showKYC,
                  instance,
                }}
              />
            </td>
            <td className={isVisible("Requested Token") + " text-center"}>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenIcon`}
                props={{
                  address: args.token_id,
                }}
              />
            </td>
            <td className={isVisible("Funding Ask") + " text-right"}>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmount`}
                props={{
                  instance,
                  amountWithoutDecimals: args.amount,
                  address: args.token_id,
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
            <td className={"text-sm text-left " + isVisible("Notes")}>
              {notes ? (
                <Widget
                  src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                  props={{
                    popup: <TooltipContent summary={notes} />,
                    children: (
                      <div className="custom-truncate" style={{ width: 180 }}>
                        {notes}
                      </div>
                    ),
                    instance,
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
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Approvers`}
                props={{
                  votes: item.votes,
                  approversGroup: transferApproversGroup?.approverAccounts,
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
                      nearBalance: isFunctionType
                        ? Big(lockupNearBalances.available).toFixed(2)
                        : nearBalances.available,

                      currentAmount: args.amount,
                      currentContract: args.token_id,
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
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.StakedNearIframe`}
      props={{
        accountId: treasuryDaoID,
        setNearStakedTotalTokens: (v) => setNearStakedTokens(Big(v).toFixed(2)),
      }}
    />
    {loading === true ||
    proposals === null ||
    transferApproversGroup === null ||
    !nearStakedTokens ||
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
                <h4>No Payment Requests Found</h4>
                <h6>There are currently no payment requests</h6>
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
                <td className="px-3">#</td>
                <td className={isVisible("Created Date")}>Created Date</td>
                {!isPendingRequests && <td className="text-center">Status</td>}
                {lockupContract && (
                  <td className={"text-left"}>Treasury Wallet</td>
                )}
                {showReferenceProposal && (
                  <td className={isVisible("Reference")}>Reference</td>
                )}
                <td className={isVisible("Title")}>Title</td>
                <td className={isVisible("Summary")}>Summary</td>
                <td className={isVisible("Recipient")}>Recipient</td>
                <td className={isVisible("Requested Token") + " text-center"}>
                  Requested Token
                </td>
                <td className={isVisible("Funding Ask") + " text-right"}>
                  Funding Ask
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
