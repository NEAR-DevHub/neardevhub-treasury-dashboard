const { id, instance } = props;
const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
if (!instance) {
  return <></>;
}
const {
  decodeBase64,
  getNearBalances,
  decodeProposalDescription,
  getApproversAndThreshold,
  accountToLockup,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common");

const { treasuryDaoID, showKYC } = VM.require(`${instance}/widget/config.data`);

const [proposalData, setProposalData] = useState(null);
const [isDeleted, setIsDeleted] = useState(false);
const [lockupNearBalances, setLockupNearBalances] = useState(null);

const isCompactVersion = props.isCompactVersion;
const accountId = context.accountId;
const transferApproversGroup = getApproversAndThreshold(
  treasuryDaoID,
  "transfer",
  accountId
);

const nearBalances = getNearBalances(treasuryDaoID);
const lockupContract = accountToLockup(treasuryDaoID);

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

const deleteGroup = getApproversAndThreshold(
  treasuryDaoID,
  "transfer",
  accountId,
  true
);

const hasVotingPermission = (
  transferApproversGroup?.approverAccounts ?? []
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

        // Check if this is a NEAR Intents payment request
        const isIntentsPayment =
          isFunctionType &&
          item.kind.FunctionCall?.receiver_id === "intents.near" &&
          item.kind.FunctionCall?.actions[0]?.method_name === "ft_withdraw";

        let args;
        let intentsTokenInfo = null;

        if (isIntentsPayment) {
          // For intents payments, extract the real token and recipient info
          let realRecipient;

          // Check if this is a cross-chain withdrawal (memo contains WITHDRAW_TO:)
          if (
            decodedArgs?.memo &&
            typeof decodedArgs.memo === "string" &&
            decodedArgs.memo.includes("WITHDRAW_TO:")
          ) {
            // Cross-chain intents payment - extract address from memo
            realRecipient = decodedArgs.memo.split("WITHDRAW_TO:")[1];
          } else {
            // NEAR intents payment - use receiver_id
            realRecipient = decodedArgs?.receiver_id;
          }

          intentsTokenInfo = {
            tokenContract: decodedArgs?.token,
            realRecipient: realRecipient,
            amount: decodedArgs?.amount,
          };

          args = {
            token_id: decodedArgs?.token, // Use the actual token contract
            receiver_id: realRecipient, // Use the real recipient
            amount: decodedArgs?.amount,
          };
        } else {
          // Regular transfer or function call
          args = isFunctionType
            ? {
                token_id: "",
                receiver_id: decodedArgs?.receiver_id,
                amount: decodedArgs?.amount,
              }
            : item.kind.Transfer;
        }
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
          title: title ? title : description,
          summary,
          proposalId,
          args,
          status,
          isLockupTransfer: isFunctionType,
          isIntentsPayment,
          intentsTokenInfo,
        });
      })
      .catch((e) => {
        // proposal is deleted or doesn't exist
        console.error("Error fetching proposal data:", e);
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
    Storage.set("REFRESH_PAYMENTS_TABLE_DATA", Math.random());
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
      page: "payments",
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
              isIntentsRequest: proposalData?.isIntentsPayment,
              nearBalance: proposalData?.isLockupTransfer
                ? lockupNearBalances.available
                : nearBalances.available,
              currentAmount: proposalData?.args?.amount,
              currentContract: proposalData?.args?.token_id,
              requiredVotes,
              checkProposalStatus: () => checkProposalStatus(proposalData?.id),
              isProposalDetailsPage: true,
            }}
          />
        ),
      ProposalContent: (
        <div className="card card-body d-flex flex-column gap-2">
          <h6 className="mb-0 flex-1">{proposalData?.title}</h6>
          {proposalData?.summary && (
            <div className=" text-secondary">{proposalData?.summary}</div>
          )}
          {proposalData?.proposalId && (
            <div>
              <Link
                target="_blank"
                rel="noopener noreferrer"
                to={href({
                  widgetSrc: `${REPL_DEVHUB}/widget/app`,
                  params: {
                    page: "proposal",
                    id: proposalData?.proposalId,
                  },
                })}
              >
                <button
                  className="btn p-0 d-flex align-items-center gap-2 h-auto"
                  style={{ fontSize: 14 }}
                >
                  Open Proposal <i class="bi bi-box-arrow-up-right"></i>
                </button>
              </Link>
            </div>
          )}
          <div className=" d-flex flex-column gap-2 mt-1">
            <label className="border-top">Recipient</label>
            <div className="d-flex justify-content-between gap-2 align-items-center flex-wrap">
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
                props={{
                  accountId: proposalData?.args.receiver_id,
                  showKYC,
                  displayImage: true,
                  displayName: true,
                  instance,
                  profileClass: "text-secondary text-sm",
                }}
              />
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Copy`}
                props={{
                  label: "Copy Address",
                  clipboardText: proposalData?.args.receiver_id,
                  showLogo: true,
                  className:
                    "btn btn-outline-secondary d-flex gap-1 align-items-center",
                }}
              />
            </div>
          </div>
          <div className="d-flex flex-column gap-2 mt-1">
            <label className="border-top">Funding Ask</label>
            <h5 className="mb-0">
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmountAndIcon`}
                props={{
                  instance,
                  amountWithoutDecimals: proposalData?.args.amount,
                  address: proposalData?.args.token_id,
                  // For intents payments, we need to use the actual token contract
                  ...(proposalData?.isIntentsPayment && {
                    address: proposalData?.intentsTokenInfo?.tokenContract,
                  }),
                }}
              />
            </h5>
          </div>
        </div>
      ),
      proposalData: proposalData,
      isDeleted: isDeleted,
      isCompactVersion,
      approversGroup: transferApproversGroup,
      instance,
      deleteGroup,
      proposalStatusLabel: {
        approved: "Payment Request Funded",
        rejected: "Payment Request Rejected",
        deleted: "Payment Request Deleted",
        failed: "Payment Request Failed",
        expired: "Payment Request Expired",
      },
      checkProposalStatus,
    }}
  />
);
