const { id, instance } = props;
const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
if (!instance) {
  return <></>;
}
const {
  decodeProposalDescription,
  decodeBase64,
  getApproversAndThreshold,
  formatSubmissionTimeStamp,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common");

const { treasuryDaoID, allowLockupCancellation } = VM.require(
  `${instance}/widget/config.data`
);

const [proposalData, setProposalData] = useState(null);
const [isDeleted, setIsDeleted] = useState(false);

const isCompactVersion = props.isCompactVersion;
const accountId = context.accountId;
const functionCallApproversGroup = getApproversAndThreshold(
  treasuryDaoID,
  "call",
  accountId
);

const deleteGroup = getApproversAndThreshold(
  treasuryDaoID,
  "call",
  accountId,
  true
);
const requiredVotes = functionCallApproversGroup?.requiredVotes;

const hasVotingPermission = (
  functionCallApproversGroup?.approverAccounts ?? []
).includes(accountId);

const hasDeletePermission = (deleteGroup?.approverAccounts ?? []).includes(
  accountId
);

const policy = treasuryDaoID
  ? Near.view(treasuryDaoID, "get_policy", {})
  : null;

const proposalPeriod = policy.proposal_period;

useEffect(() => {
  if (proposalPeriod && !proposalData) {
    Near.asyncView(treasuryDaoID, "get_proposal", { id: parseInt(id) })
      .then((item) => {
        const notes = decodeProposalDescription("notes", item.description);
        const args = decodeBase64(item.kind.FunctionCall.actions[0].args);
        const vestingSchedule = args.vesting_schedule?.VestingSchedule;
        const startTimestamp =
          vestingSchedule?.start_timestamp || args.lockup_timestamp;
        const amount = item.kind.FunctionCall.actions[0].deposit;
        let status = item.status;
        if (status === "InProgress") {
          const endTime = Big(item.submission_time ?? "0")
            .plus(proposalPeriod ?? "0")
            .toFixed();
          const timestampInMilliseconds = Big(endTime) / Big(1_000_000);
          const currentTimeInMilliseconds = Date.now();
          if (Big(timestampInMilliseconds).lt(currentTimeInMilliseconds)) {
            status = "Expired";
          }
        }

        setProposalData({
          id: item.id,
          proposer: item.proposer,
          votes: item.votes,
          submissionTime: item.submission_time,
          notes,
          status,
          args,
          startTimestamp,
          vestingSchedule,
          amount,
        });
      })
      .catch(() => {
        // proposal is deleted or doesn't exist
        setIsDeleted(true);
      });
  }
}, [id, proposalPeriod, proposalData]);

useEffect(() => {
  if (proposalData.id !== id) {
    setProposalData(null);
  }
}, [id]);

function refreshData() {
  if (props.transactionHashes) {
    return;
  }
  if (isCompactVersion) {
    Storage.set("REFRESH_LOCKUP_TABLE_DATA", Math.random());
  }
  setProposalData(null);
}

function updateVoteSuccess(status, proposalId) {
  props.setVoteProposalId(proposalId);
  props.setToastStatus(status);
  refreshData();
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

return (
  <Widget
    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.ProposalDetails`}
    props={{
      ...props,
      page: "lockup",
      VoteActions: (hasVotingPermission || hasDeletePermission) &&
        proposalData.status === "InProgress" && (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.VoteActions`}
            props={{
              instance,
              votes: proposalData?.votes,
              proposalId: proposalData?.id,
              hasDeletePermission,
              hasVotingPermission,
              proposalCreator: proposalData?.proposer,
              avoidCheckForBalance: true,
              requiredVotes,
              checkProposalStatus: () => checkProposalStatus(proposalData?.id),
              isProposalDetailsPage: true,
            }}
          />
        ),
      ProposalContent: (
        <div className="card card-body d-flex flex-column gap-2">
          <div className=" d-flex flex-column gap-2 mt-1">
            <label>Recipient</label>
            <div className="d-flex justify-content-between gap-2 align-items-center flex-wrap">
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
                props={{
                  accountId: proposalData?.args?.owner_account_id,
                  showKYC,
                  displayImage: true,
                  displayName: true,
                  instance,
                  profileClass: "text-secondary text-sm",
                }}
              />
              {proposalData?.status === "Approved" && (
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://near.github.io/account-lookup/#${proposalData?.args?.owner_account_id}`}
                  className="btn btn-outline-secondary"
                >
                  View Lockup
                </a>
              )}
            </div>
          </div>
          <div className="d-flex flex-column gap-2">
            <label className="border-top">Amount</label>
            <h5 className="mb-0">
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmountAndIcon`}
                props={{
                  instance,
                  amountWithoutDecimals: proposalData?.amount,
                  address: "",
                }}
              />
            </h5>
          </div>
          <div className="d-flex flex-column gap-2 mt-1">
            <label className="border-top">Start Date</label>

            <Widget
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Date`}
              props={{
                timestamp: proposalData?.startTimestamp,
                isProposalDetailsPage: true,
              }}
            />
          </div>
          <div className="d-flex flex-column gap-2 mt-1">
            <label className="border-top">End Date</label>
            <Widget
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Date`}
              props={{
                timestamp:
                  proposalData?.vestingSchedule.end_timestamp ??
                  parseInt(proposalData?.startTimestamp) +
                    parseInt(proposalData?.args.release_duration),
                isProposalDetailsPage: true,
              }}
            />
          </div>
          {allowLockupCancellation && proposalData?.vestingSchedule && (
            <div className="d-flex flex-column gap-2">
              <div className="d-flex flex-column gap-2 mt-1">
                <label className="border-top">Cliff Date</label>
                {proposalData?.vestingSchedule.cliff_timestamp ? (
                  <Widget
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Date`}
                    props={{
                      timestamp: proposalData?.vestingSchedule.cliff_timestamp,
                      isProposalDetailsPage: true,
                    }}
                  />
                ) : (
                  "-"
                )}
              </div>
              <div className="d-flex flex-column gap-2 mt-1">
                <label className="border-top">Allow Cancellation</label>
                <div> {!!proposalData?.vestingSchedule ? "Yes" : "No"}</div>
              </div>
            </div>
          )}
          <div className="d-flex flex-column gap-2 mt-1">
            <label className="border-top">Allow Staking</label>
            <div>
              {proposalData?.args.whitelist_account_id ===
              "lockup-no-whitelist.near"
                ? "No"
                : "Yes"}
            </div>
          </div>
        </div>
      ),
      proposalData: proposalData,
      isDeleted: isDeleted,
      isCompactVersion,
      approversGroup: functionCallApproversGroup,
      instance,
      deleteGroup,
      proposalStatusLabel: {
        approved: "Lockup Request Executed",
        rejected: "Lockup Request Rejected",
        deleted: "Lockup Request Deleted",
        failed: "Lockup Request Failed",
        expired: "Lockup Request Expired",
      },
      checkProposalStatus,
    }}
  />
);
