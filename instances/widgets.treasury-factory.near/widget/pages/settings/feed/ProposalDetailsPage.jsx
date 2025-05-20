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
const [showDetailsProposalKind, setShowDetailsProposalKind] = useState(null);

const isCompactVersion = props.isCompactVersion;
const accountId = context.accountId;
const settingsApproverGroup = getApproversAndThreshold(
  treasuryDaoID,
  "policy",
  accountId
);

const deleteGroup = getApproversAndThreshold(
  treasuryDaoID,
  "policy",
  accountId,
  true
);
const requiredVotes = settingsApproverGroup?.requiredVotes;

const hasVotingPermission = (
  settingsApproverGroup?.approverAccounts ?? []
).includes(accountId);

const hasDeletePermission = (deleteGroup?.approverAccounts ?? []).includes(
  accountId
);

const policy = treasuryDaoID
  ? Near.view(treasuryDaoID, "get_policy", {})
  : null;

const proposalPeriod = policy.proposal_period;

const RequestType = {
  MEMBERS: "Members",
  VOTING_THRESHOLD: "Voting Threshold",
  VOTING_DURATION: "Voting Duration",
  THEME: "Theme",
  OTHER: "Settings",
};

useEffect(() => {
  if (proposalPeriod && !proposalData) {
    Near.asyncView(treasuryDaoID, "get_proposal", { id: parseInt(id) })
      .then((item) => {
        const notes = decodeProposalDescription("notes", item.description);
        const title = decodeProposalDescription("title", item.description);
        const summary = decodeProposalDescription("summary", item.description);

        const kind = Object.keys(item.kind)?.[0];
        let requestType = RequestType.OTHER;

        // members or threshold
        if (
          (title ?? "").includes("Members Permissions") &&
          !(title ?? "").includes("revoke")
        ) {
          requestType = RequestType.MEMBERS;
        } else if ((title ?? "").includes("Voting Thresholds")) {
          requestType = RequestType.VOTING_THRESHOLD;
        } else if ((title ?? "").includes("Voting Duration")) {
          // voting duration
          requestType = RequestType.VOTING_DURATION;
        } else if ((title ?? "").includes("Theme & logo")) {
          // theme
          requestType = RequestType.THEME;
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
          status,
          kind: item.kind,
          requestType,
          title,
          summary,
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
    Storage.set("REFRESH_SETTINGS_TABLE_DATA", Math.random());
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

function getOldAndNewValues() {
  const str = proposalData.summary;
  const regex = /from (.+?) to (.+?)[.\s]*$/;
  const match = str.match(regex);
  let oldValue = "";
  let newValue = "";
  if (match) {
    oldValue = match[1];
    newValue = match[2];
  }

  return { oldValue, newValue };
}

function getMemberDetails() {
  const str = proposalData.summary;

  const regex = /requested to (add|remove) "([^"]+)" (?:to|from) (.+)$/;

  const match = str.match(regex);

  let account = "";
  let roles = [];
  let isAdd = false;

  if (match) {
    isAdd = match[1] === "add";
    account = match[2];

    // Extract all role names enclosed in double quotes
    roles = [...match[3].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  }

  return { account, roles, isAdd };
}

function pluralize(count, singular) {
  if (count == "1" || count == "0") {
    return `${count} ${singular}`;
  } else {
    return `${count} ${singular + "s"}`;
  }
}

const SettingsContent = () => {
  const renderContent = () => {
    switch (proposalData.requestType) {
      case RequestType.MEMBERS: {
        const { account, isAdd, roles } = getMemberDetails();
        return (
          <ul className="summary-list mb-0 ps-3">
            <li>
              <div className="summary-item">
                Member:
                <Widget
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
                  props={{ accountId: account, instance }}
                />
              </div>
            </li>
            <li>
              <div className="summary-item">
                {isAdd ? "Assigned" : "Revoked"} Roles:
                {roles.map((i) => (
                  <div
                    style={{
                      width: "max-content",
                      border: "1px solid var(--border-color)",
                    }}
                    className="d-flex gap-2 align-items-center rounded-pill px-2 py-1 mb-0"
                  >
                    {i}
                  </div>
                ))}
              </div>
            </li>
          </ul>
        );
      }
      case RequestType.VOTING_DURATION: {
        const { oldValue, newValue } = getOldAndNewValues();
        return (
          <ul className="summary-list mb-0 ps-3">
            <li>
              <div className="summary-item">
                Old Duration: {pluralize(oldValue, "day")}
              </div>
            </li>
            <li>
              <div className="summary-item">
                New Duration:{pluralize(newValue, "day")}
              </div>
            </li>
          </ul>
        );
      }
      case RequestType.VOTING_THRESHOLD: {
        const { oldValue, newValue } = getOldAndNewValues();
        return (
          <ul className="summary-list mb-0 ps-3">
            <li>
              <div className="summary-item">
                Old Threshold: {pluralize(oldValue, "vote")}
              </div>
            </li>
            <li>
              <div className="summary-item">
                New Threshold: {pluralize(newValue, "vote")}
              </div>
            </li>
          </ul>
        );
      }
      case RequestType.THEME: {
        const decodedArgs = decodeBase64(
          proposalData?.kind?.ChangeConfig?.config?.metadata
        );
        const logo = decodedArgs?.flagLogo;
        const primaryColor = decodedArgs?.primaryColor;
        const theme = decodedArgs?.theme;

        return (
          <ul className="summary-list mb-0 ps-3">
            {logo && (
              <li>
                <div className="summary-item">
                  Logo:
                  <img src={logo} alt="Logo" className="appearance-logo" />
                </div>
              </li>
            )}
            {primaryColor && (
              <li>
                <div className="summary-item">
                  Primary Color:
                  <span
                    className="appearance-color-box"
                    style={{ backgroundColor: primaryColor }}
                    title={primaryColor}
                  />
                  {primaryColor}
                </div>
              </li>
            )}
            {theme && (
              <li>
                <div className="summary-item"> Theme: {theme}</div>
              </li>
            )}
          </ul>
        );
      }

      default:
        return null;
    }
  };

  const content = renderContent();
  return content ? (
    <div className="d-flex flex-column gap-2">
      <label className="border-top">Summary</label>
      {content}
    </div>
  ) : null;
};

const Container = styled.div`
  .markdown-scroll {
    max-height: 400px;
    width: 100%;
    overflow: auto;
  }

  .summary-list {
    list-style-type: disc;
    padding-left: 1rem;
    margin-bottom: 0;
  }

  .appearance-logo {
    width: 32px;
    height: 32px;
    object-fit: contain;
    vertical-align: middle;
    border-radius: 4px;
    border: 1px solid var(--border-color);
  }

  .appearance-color-box {
    display: inline-block;
    width: 25px;
    height: 25px;
    vertical-align: middle;
    margin-left: 4px;
    border-radius: 4px;
    border: 1px solid var(--border-color);
  }

  .summary-item {
    display: flex;
    align-items: center;
    gap: 0.2rem;
  }
`;

return (
  <Container>
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.ProposalDetails`}
      props={{
        ...props,
        page: "settings",
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
                checkProposalStatus: () =>
                  checkProposalStatus(proposalData?.id),
                isProposalDetailsPage: true,
              }}
            />
          ),
        ProposalContent: (
          <div className="card card-body d-flex flex-column gap-2">
            {proposalData?.title && (
              <h6 className="mb-0 flex-1">{proposalData?.title}</h6>
            )}
            <SettingsContent />
            <label
              className={
                proposalData?.requestType !== RequestType.OTHER
                  ? "border-top"
                  : ""
              }
            >
              Transaction Details
            </label>
            <div className="markdown-scroll">
              <Markdown
                text={`
\`\`\`jsx
${JSON.stringify(proposalData.kind, null, 2)}
`}
                syntaxHighlighterProps={{
                  wrapLines: true,
                }}
              />
            </div>
          </div>
        ),
        proposalData: proposalData,
        isDeleted: isDeleted,
        isCompactVersion,
        approversGroup: settingsApproverGroup,
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
