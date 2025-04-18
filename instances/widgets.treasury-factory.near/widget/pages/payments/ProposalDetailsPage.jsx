const { ApprovedStatus, RejectedStatus, Warning } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || {
  ApprovedStatus: () => <></>,
  RejectedStatus: () => <></>,
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

const { treasuryDaoID, showKYC } = VM.require(`${instance}/widget/config.data`);

const [proposalData, setProposalData] = useState(null);
const [isDeleted, setIsDeleted] = useState(false);

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
    Storage.set("REFRESH_PAYMENTS_TABLE_DATA", Math.random());
  }
  setProposalData(null);
}

function checkProposalStatus(proposalId) {
  Near.asyncView(treasuryDaoID, "get_proposal", {
    id: proposalId,
  })
    .then((result) => {
      console.log(result.status);
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

const Container = styled.div`
  font-size: 14px;
  .flex-1 {
    flex: 1;
  }

  .flex-3 {
    flex: 3;
  }

  label {
    font-size: 12px;
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
    font-size: 18px;
    font-weight: 600;
  }

  .text-grey-02 {
    color: var(--grey-02);
  }

  .sticky-header {
    position: sticky;
    top: 0;
    z-index: 998;
    background-color: var(--bg-system-color);

    .content {
      border: 1px solid var(--border-color);
      border-bottom: 0px;
      height: 70px !important;
      background-color: var(--grey-05);
    }

    /* Create the bottom inward curve */
    .content::after {
      content: "";
      position: absolute;
      bottom: 0px;
      left: 0px;
      width: 100%;
      height: 11px;
      border-radius: 150rem 150rem 0px 0px;
      border-top: 1px solid var(--border-color);
      background: var(--bg-page-color) !important;
    }
  }

  .details-container {
    position: ${isCompactVersion ? "absolute" : "relative"};
  }

  @media screen and (max-width: 650px) {
    .details-container {
      position: relative !important;
    }
  }

  .toast-container {
    position: fixed;
    right: 0px;
    bottom: 0px;
    transition: top 0.3s ease-in-out;
  }

  .gap-10px {
    gap: 10px !important;
  }
`;

const ProposalStatus = () => {
  const Status = ({ bgColor, icon, label, className }) => {
    return (
      <div
        className={
          "d-flex flex-column align-items-center px-3 py-4 rounded-4 " +
          (className || "")
        }
        style={{ backgroundColor: bgColor }}
      >
        <div className="d-flex gap-3 align-items-center">
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
          icon={<ApprovedStatus width={32} height={32} hideStroke={true} />}
          label="Payment Request Funded"
        />
      );
    case "Rejected":
      return (
        <Status
          className="error-icon"
          bgColor="rgba(217, 92, 74, 0.16)"
          icon={<RejectedStatus width={32} height={32} hideStroke={true} />}
          label="Payment Request Rejected"
        />
      );
    case "Removed":
      return (
        <Status
          className="error-icon"
          bgColor="rgba(217, 92, 74, 0.16)"
          icon={<RejectedStatus width={32} height={32} hideStroke={true} />}
          label="Payment Request Deleted"
        />
      );
    case "Failed":
      return (
        <Status
          className="warning-icon"
          bgColor="rgba(177, 113, 8, 0.16)"
          icon={<Warning width={32} height={32} />}
          label="Payment Request Failed"
        />
      );
    case "Expired":
      return (
        <Status
          className="text-grey-02"
          bgColor="var(--grey-04)"
          icon={<i class="bi bi-clock h2 mb-0"></i>}
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
        (isCompactVersion && " border-top-0 rounded-top-0")
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
      {Object.keys(proposalData?.votes ?? {}).length > 0 && (
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Approvers`}
          props={{
            votes: proposalData?.votes,
            approversGroup: transferApproversGroup?.approverAccounts,
            showApproversList: true,
          }}
        />
      )}
    </div>
  );
};

const CopyComponent = () => {
  const clipboardText = `https://near.social/${instance}/widget/app?page=payments&id=${proposalData.id}`;
  return isCompactVersion ? (
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Copy`}
      props={{
        label: "",
        clipboardText,
        showLogo: true,
        logoDimensions: { width: 25, height: 25 },
      }}
    />
  ) : (
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Copy`}
      props={{
        label: "Copy link",
        clipboardText,
        showLogo: true,
        className: "btn btn-outline-secondary d-flex gap-1 align-items-center",
      }}
    />
  );
};

const Navbar = () => {
  return !isCompactVersion ? (
    <div className="d-flex justify-content-between gap-2 align-items-center">
      <a
        href={`?page=payments${props?.tab === "history" ? "&tab=history" : ""}`}
      >
        <button className="btn btn-outline-secondary d-flex gap-1 align-items-center">
          <i class="bi bi-arrow-left"></i> Back
        </button>
      </a>
      <CopyComponent />
    </div>
  ) : null;
};

const MainSkeleton = () => {
  return (
    <div className="card card-body d-flex flex-column gap-3">
      <div className="w-50" style={{ height: 35 }}>
        <CardSkeleton />
      </div>
      <div className="w-100" style={{ height: 150 }}>
        <CardSkeleton />
      </div>
      <div className="w-100" style={{ height: 50 }}>
        <CardSkeleton />
      </div>
      <div className="w-100" style={{ height: 50 }}>
        <CardSkeleton />
      </div>
    </div>
  );
};

const SecondaryTopSkeleton = () => {
  return (
    <div className="card card-body d-flex flex-column gap-3 h-100">
      <div className="w-100" style={{ height: 50 }}>
        <CardSkeleton />
      </div>
      <div className="d-flex gap-2 align-items-center">
        <div className="w-100" style={{ height: 50 }}>
          <CardSkeleton />
        </div>
        <div className="w-100" style={{ height: 50 }}>
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
};

const SecondaryBottomSkeleton = () => {
  return (
    <div className="card card-body d-flex flex-column gap-3">
      <div className="w-100" style={{ height: 50 }}>
        <CardSkeleton />
      </div>
      <div className="w-100" style={{ height: 50 }}>
        <CardSkeleton />
      </div>
      <div className="w-100" style={{ height: 50 }}>
        <CardSkeleton />
      </div>
    </div>
  );
};

if (isDeleted) {
  return (
    <div
      class="container-lg alert alert-danger d-flex flex-column gap-3"
      role="alert"
    >
      The requested proposal was not found. Please verify the proposal ID or
      check if it has been removed.
      <a href={`?page=payments`}>
        <button className="btn btn-danger d-flex gap-1 align-items-center">
          Go Back
        </button>
      </a>
    </div>
  );
}

if (!proposalData) {
  return (
    <Container key={id} className="container-lg d-flex flex-column gap-3">
      <Navbar />
      <div>
        {isCompactVersion ? (
          <div
            className="d-flex flex-column gap-10px w-100"
            style={{ height: "500px" }}
          >
            <SecondaryTopSkeleton />
            <MainSkeleton />
            <SecondaryBottomSkeleton />
          </div>
        ) : (
          <div className="d-flex gap-3 w-100 flex-wrap">
            <div className="flex-3 ">
              <MainSkeleton />
            </div>
            <div className="d-flex flex-column gap-10px flex-2 h-100">
              <SecondaryTopSkeleton />
              <SecondaryBottomSkeleton />
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}

return (
  <Container key={id}>
    <div
      className="container-lg d-flex flex-column details-container"
      style={{
        gap: isCompactVersion ? "0rem" : "1rem",
      }}
    >
      <Navbar />

      {isCompactVersion && (
        <div className="sticky-header">
          <div className="d-flex justify-content-between gap-2 px-3 py-3 rounded-top-4 content">
            <div className="cursor-pointer" onClick={() => props.onClose()}>
              <i class="bi bi-x-lg h5 mb-0"></i>
            </div>
            <h5 className="mb-0">#{id}</h5>
            <div className="d-flex gap-3">
              <CopyComponent />
              <a
                className="cursor-pointer"
                href={`?page=payments${
                  props?.currentTab?.title === "History" ? "&tab=history" : ""
                }&id=${proposalData.id}`}
              >
                <i class="bi bi-arrows-angle-expand h5 mb-0"></i>
              </a>
            </div>
          </div>
        </div>
      )}
      {isCompactVersion && (
        <div className="mb-2">
          <VotesDetails />
        </div>
      )}
      <div
        className={
          "d-flex flex-wrap " +
          (isCompactVersion ? " gap-10px flex-column" : " gap-3")
        }
      >
        <div
          className="flex-3 d-flex flex-column gap-3"
          style={{ minWidth: 200, height: "fit-content" }}
        >
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
                  }}
                />
              </h5>
            </div>
          </div>
        </div>
        <div
          className={"flex-2 d-flex flex-column gap-10px"}
          style={{ minWidth: 200 }}
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
                profileClass: "text-secondary text-sm",
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
            <label className="border-top">Expires At</label>
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
    </div>
  </Container>
);
