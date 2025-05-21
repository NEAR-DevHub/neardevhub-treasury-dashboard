const { id, instance } = props;
const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
if (!instance) {
  return <></>;
}
const {
  decodeBase64,
  decodeProposalDescription,
  getApproversAndThreshold,
  accountToLockup,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common");

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const [proposalData, setProposalData] = useState(null);
const [isDeleted, setIsDeleted] = useState(false);

const isCompactVersion = props.isCompactVersion;
const accountId = context.accountId;
const functionCallApprovers = getApproversAndThreshold(
  treasuryDaoID,
  "call",
  accountId
);

const lockupContract = accountToLockup(treasuryDaoID);

const deleteGroup = getApproversAndThreshold(
  treasuryDaoID,
  "call",
  accountId,
  true
);

const hasVotingPermission = (
  functionCallApprovers?.approverAccounts ?? []
).includes(accountId);

const hasDeletePermission = (deleteGroup?.approverAccounts ?? []).includes(
  accountId
);

const policy = treasuryDaoID
  ? Near.view(treasuryDaoID, "get_policy", {})
  : null;

const proposalPeriod = policy.proposal_period;

const RequestType = {
  STAKE: "Stake",
  UNSTAKE: "Unstake",
  WITHDRAW: "Withdraw",
  WHITELIST: "Whitelist",
};

useEffect(() => {
  if (proposalPeriod && !proposalData) {
    Near.asyncView(treasuryDaoID, "get_proposal", { id: parseInt(id) })
      .then((item) => {
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
          amount,
          submissionTime: item.submission_time,
          validatorAccount,
          action,
          notes:
            notes || customNotes ? (
              <Markdown
                text={customNotes || notes}
                syntaxHighlighterProps={{
                  wrapLines: true,
                }}
              />
            ) : (
              "-"
            ),
          proposalId,
          requestType: isStakeRequest
            ? RequestType.STAKE
            : isWithdrawRequest
            ? RequestType.WITHDRAW
            : action.method_name === "select_staking_pool"
            ? RequestType.WHITELIST
            : RequestType.UNSTAKE,
          treasuryWallet,
          status,
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
    Storage.set("REFRESH_STAKE_TABLE_DATA", Math.random());
  }
  setProposalData(null);
}

function checkProposalStatus(proposalId) {
  Near.asyncView(treasuryDaoID, "get_proposal", {
    id: proposalId,
  })
    .then((result) => {
      props.setVoteProposalId(proposalId);
      props.setToastStatus(result.status);
      refreshData();
    })
    .catch(() => {
      // deleted request (thus proposal won't exist)
      props.setVoteProposalId(proposalId);
      props.setToastStatus("Removed");
      refreshData();
    });
}

const Container = styled.div`
  .markdown-href p {
    margin-bottom: 0px !important;
  }

  .markdown-href a {
    color: inherit !important;
  }
`;

return (
  <Container>
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.ProposalDetails`}
      props={{
        ...props,
        page: "stake-delegation",
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
                requiredVotes,
                checkProposalStatus: () =>
                  checkProposalStatus(proposalData?.id),
                isProposalDetailsPage: true,
                avoidCheckForBalance: true, // we don't allow user to create request with insufficient balance
              }}
            />
          ),
        ProposalContent: (
          <div className="card card-body d-flex flex-column gap-2">
            <div className="d-flex flex-column gap-2 mt-1">
              <label>Request Type</label>
              <div style={{ width: "fit-content" }}>
                <Widget
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.Type`}
                  props={{
                    type: proposalData?.action.method_name,
                  }}
                />
              </div>
            </div>
            {proposalData.amount !== 0 && proposalData.amount && (
              <div className="d-flex flex-column gap-2 mt-1">
                <label className="border-top">Amount</label>
                <h5 className="mb-0">
                  <Widget
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmountAndIcon`}
                    props={{
                      instance,
                      amountWithoutDecimals: proposalData.amount,
                      address: "",
                    }}
                  />
                </h5>
              </div>
            )}
            <div className="d-flex flex-column gap-2 mt-1">
              <label className="border-top">Validator</label>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.Validator`}
                props={{
                  validatorId: proposalData?.validatorAccount,
                  instance,
                }}
              />
            </div>
            {lockupContract && (
              <div className="d-flex flex-column gap-2 mt-1">
                <label className="border-top">Treasury Wallet</label>
                <Widget
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
                  props={{
                    accountId: proposalData?.treasuryWallet,
                    showKYC: false,
                    instance,
                    displayImage: false,
                    displayName: false,
                  }}
                />
              </div>
            )}
          </div>
        ),
        proposalData: proposalData,
        isDeleted: isDeleted,
        isCompactVersion,
        approversGroup: functionCallApprovers,
        instance,
        deleteGroup,
        proposalStatusLabel: {
          approved: proposalData?.requestType + " Request Executed",
          rejected: proposalData?.requestType + " Request Rejected",
          deleted: proposalData?.requestType + " Request Deleted",
          failed: proposalData?.requestType + " Request Failed",
          expired: proposalData?.requestType + " Request Expired",
        },
        checkProposalStatus,
      }}
    />
  </Container>
);
