const { Approval, Reject, Warning } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || {
  Approval: () => <></>,
  Reject: () => <></>,
  Warning: () => <></>,
};

const { CardSkeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
) || { CardSkeleton: () => <></> };

const { id, instance } = props;
const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
if (!instance) {
  return <></>;
}
const {
  getNearBalances,
  decodeProposalDescription,
  formatSubmissionTimeStamp,
  getApproversAndThreshold,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common");

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const [proposalData, setProposalData] = useState(null);

const isCompactVersion = props.isCompactVersion;
const accountId = context.accountId;
const transferApproversGroup = getApproversAndThreshold(
  treasuryDaoID,
  "transfer",
  accountId
);

const nearBalances = getNearBalances(treasuryDaoID);
const deleteGroup = getApproversAndThreshold(
  treasuryDaoID,
  "transfer",
  accountId,
  true
);
const requiredVotes = transferApproversGroup?.requiredVotes;

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
  if (proposalPeriod && !proposalData) {
    Near.asyncView(treasuryDaoID, "get_proposal", { id: parseInt(id) }).then(
      (item) => {
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
        });
      }
    );
  }
}, [id, proposalPeriod, proposalData]);

useEffect(() => {
  if (proposalData.id !== id) {
    setProposalData(null);
  }
}, [id]);

const Container = styled.div`
  font-size: 14px;
  .flex-1 {
    flex: 1;
  }

  .flex-3 {
    flex: 3;
  }

  label {
    font-size: 13px;
    color: var(--text-secondary-color);
  }

  label.border-top {
    padding-top: 0.6rem;
  }

  .btn-outline-plain {
    background-color: transparent !important;
    font-size: 14px;
  }

  .flex-2 {
    flex: 2;
  }

  .text-large {
    font-size: 20px;
  }

  .text-grey-02 {
    color: var(--grey-02);
  }
`;

const ProposalStatus = () => {
  const Status = ({ bgColor, icon, label, className }) => {
    return (
      <div
        className={
          "d-flex flex-column align-items-center p-3 rounded-4 " +
          (className || "")
        }
        style={{ backgroundColor: bgColor }}
      >
        <div className="d-flex gap-2 align-items-center">
          {icon}
          <div className="mb-0 text-large">{label}</div>
        </div>
      </div>
    );
  };
  switch (proposalData.status) {
    case "Approved":
      return (
        <Status
          className="success-icon"
          bgColor="rgba(60, 177, 121, 0.16)"
          icon={<Approval width={30} height={30} hideStroke={true} />}
          label="Payment Request Funded"
        />
      );
    case "Rejected":
      return (
        <Status
          className="error-icon"
          bgColor="rgba(217, 92, 74, 0.16)"
          icon={<Reject width={30} height={30} hideStroke={true} />}
          label="Payment Request Rejected"
        />
      );
    case "Removed":
      return (
        <Status
          className="error-icon"
          bgColor="rgba(217, 92, 74, 0.16)"
          icon={<Reject width={30} height={30} hideStroke={true} />}
          label="Payment Request Deleted"
        />
      );
    case "Failed":
      return (
        <Status
          className="warning-icon"
          bgColor="rgba(177, 113, 8, 0.16)"
          icon={<Warning width={30} height={30} />}
          label="Payment Request Failed"
        />
      );
    case "Expired":
      return (
        <Status
          className="text-grey-02"
          bgColor="var(--grey-04)"
          icon={<i class="bi bi-clock h5 mb-0"></i>}
          label="Payment Request Expired"
        />
      );
    default: {
      return <></>;
    }
  }
};

const VotesDetails = () => {
  return (
    <div
      className={
        "card card-body d-flex flex-column gap-3 justify-content-around " +
        (isCompactVersion && " border-0 border-top")
      }
    >
      <ProposalStatus />
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Votes`}
        props={{
          votes: proposalData?.votes,
          requiredVotes,
          isProposalDetailsPage: true,
          isInProgress: proposalData?.status === "InProgress",
        }}
      />
      {(hasVotingPermission || hasDeletePermission) &&
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
              nearBalance: nearBalances.available,
              currentAmount: proposalData?.args?.amount,
              currentContract: proposalData?.args?.token_id,
              requiredVotes,
              checkProposalStatus: () => checkProposalStatus(proposalData?.id),
              isProposalDetailsPage: true,
            }}
          />
        )}
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Approvers`}
        props={{
          votes: proposalData?.votes,
          approversGroup: transferApproversGroup?.approverAccounts,
          showApproversList: true,
        }}
      />
    </div>
  );
};

const CopyComponent = () => {
  function onCopy(e) {
    e.stopPropagation();
    clipboard.writeText(
      `https://${instance}.page?page=payments&id=${proposalData.id}`
    );
  }

  return isCompactVersion ? (
    <div className="cursor-pointer" onClick={onCopy}>
      <i className="bi bi-copy h5 mb-0"></i>
    </div>
  ) : (
    <button
      className="btn btn-outline-plain d-flex gap-1 align-items-center"
      onClick={onCopy}
    >
      <i class="bi bi-copy"></i>
      Copy link
    </button>
  );
};

const Navbar = () => {
  return !isCompactVersion ? (
    <div className="d-flex justify-content-between gap-2 align-items-center">
      <a href={`?page=payments`}>
        <button className="btn btn-outline-plain d-flex gap-1 align-items-center">
          <i class="bi bi-arrow-left"></i> Back
        </button>
      </a>
      <CopyComponent />
    </div>
  ) : null;
};

if (!proposalData) {
  return (
    <Container key={id} className="container-lg d-flex flex-column gap-3">
      <Navbar />
      <div>
        {isCompactVersion ? (
          <div
            className="d-flex flex-column gap-2 w-100"
            style={{ height: "500px" }}
          >
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="d-flex gap-3 w-100" style={{ height: "600px" }}>
            <div className="flex-3 h-100">
              <CardSkeleton />
            </div>
            <div className="d-flex flex-column gap-3 flex-2 h-100">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}

return (
  <Container key={id} className="container-lg d-flex flex-column gap-3">
    <Navbar />
    <div
      className={
        "d-flex gap-3 flex-wrap " + (isCompactVersion && " flex-column")
      }
    >
      {isCompactVersion && (
        <div
          className="d-flex flex-column gap-2 rounded-4 border border-1"
          style={{ backgroundColor: "var(--grey-05)" }}
        >
          <div className="d-flex justify-content-between gap-2 align-items-center px-3 pt-2">
            <div className="cursor-pointer" onClick={() => props.onClose()}>
              <i class="bi bi-x-lg h5 mb-0"></i>
            </div>
            <h5>#{id}</h5>
            <div className="d-flex gap-3">
              <CopyComponent />
              <a
                className="cursor-pointer"
                href={`?page=payments&id=${proposalData.id}`}
              >
                <i class="bi bi-arrows-angle-expand h5 mb-0"></i>
              </a>
            </div>
          </div>
          <VotesDetails />
        </div>
      )}
      <div
        className="flex-3 d-flex flex-column gap-3"
        style={{ minWidth: 300, height: "fit-content" }}
      >
        <div className="card card-body d-flex flex-column gap-2">
          <div className="d-flex gap-2 justify-content-between flex-wrap">
            <h5 className="mb-0 flex-1">{proposalData?.title}</h5>
            <div>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.HistoryStatus`}
                props={{
                  instance,
                  isVoteStatus: false,
                  status: proposalData?.status,
                  isPaymentsPage: true,
                }}
              />
            </div>
          </div>
          {proposalData?.summary && (
            <div className="text-sm text-secondary">
              {proposalData?.summary}
            </div>
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
                  className="btn p-0 d-flex align-items-center gap-2"
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
                  showKYC: true,
                  displayImage: true,
                  displayName: true,
                  instance,
                }}
              />
              <button
                className="btn btn-outline-plain d-flex gap-1 align-items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  clipboard.writeText(proposalData?.args.receiver_id);
                }}
              >
                <i class="bi bi-copy"></i>Copy Address
              </button>
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
                }}
              />
            </h5>
          </div>
        </div>
      </div>
      <div
        className={"flex-2 d-flex flex-column gap-3 "}
        style={{ minWidth: 300 }}
      >
        {!isCompactVersion && <VotesDetails />}
        <div
          className="card card-body d-flex flex-column gap-2"
          style={{ fontSize: 14 }}
        >
          <label>Created By</label>
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
            props={{
              accountId: proposalData?.proposer,
              showKYC: false,
              displayImage: true,
              displayName: true,
              instance,
            }}
          />
          <label className="border-top">Created Date</label>
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Date`}
            props={{
              timestamp: proposalData?.submissionTime,
              isProposalDetailsPage: true,
            }}
          />
          <label className="border-top">Expiring Date</label>
          {formatSubmissionTimeStamp(
            proposalData?.submissionTime,
            proposalPeriod,
            true
          )}
          {/* <label className="border-top">Transaction</label> */}
          <label className="border-top">Note</label>
          {proposalData?.notes ?? "-"}
        </div>
      </div>
    </div>
  </Container>
);
