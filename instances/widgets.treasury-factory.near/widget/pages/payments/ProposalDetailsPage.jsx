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
        isFunctionType && decodeBase64(item.kind.FunctionCall?.actions[0].args);
      const args = isFunctionType
        ? {
            token_id: "",
            receiver_id: decodedArgs?.receiver_id,
            amount: decodedArgs?.amount,
          }
        : item.kind.Transfer;
      setProposalData({
        id: item.id,
        proposer: item.proposer,
        votes: item.votes,
        submission_time: item.submission_time,
        notes,
        title: title ? title : description,
        summary,
        proposalId,
        args,
        status: item.status,
      });
    }
  );
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
`;

const VotesDetails = () => {
  return (
    <div
      className={
        "card card-body d-flex flex-column gap-3 justify-content-around " +
        (isCompactVersion && " border-0 border-top")
      }
    >
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Votes`}
        props={{
          votes: proposalData?.votes,
          requiredVotes,
          isProposalDetailsPage: true,
        }}
      />
      {(hasVotingPermission || hasDeletePermission) && (
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
    <i class="bi bi-copy h5 mb-0 cursor-pointer" onClick={onCopy}></i>
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

return (
  <Container className="container-lg d-flex flex-column gap-3">
    {!isCompactVersion && (
      <div className="d-flex justify-content-between gap-2 align-items-center">
        <a href={`?page=payments`}>
          <button className="btn btn-outline-plain d-flex gap-1 align-items-center">
            <i class="bi bi-arrow-left"></i> Back
          </button>
        </a>
        <CopyComponent />
      </div>
    )}
    {proposalData ? (
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
            <div className="d-flex justify-content-between gap-2 align-items-center px-3 pt-3">
              <div className="cursor-pointer" onClick={() => props.onClose()}>
                <i class="bi bi-x-lg h5 mb-0 text-color"></i>
              </div>
              <h5>#{id}</h5>
              <div className="d-flex gap-2">
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
                timestamp: proposalData?.submission_time,
                isProposalDetailsPage: true,
              }}
            />
            <label className="border-top">Expiring Date</label>
            {formatSubmissionTimeStamp(
              proposalData?.submission_time,
              proposalPeriod,
              true
            )}
            {/* <label className="border-top">Transaction</label> */}
            <label className="border-top">Note</label>
            {proposalData?.notes ?? "-"}
          </div>
        </div>
      </div>
    ) : (
      <div className="card card-body d-flex justify-content-center align-items-center">
        {" "}
        <Widget
          src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"}
        />
      </div>
    )}
  </Container>
);
