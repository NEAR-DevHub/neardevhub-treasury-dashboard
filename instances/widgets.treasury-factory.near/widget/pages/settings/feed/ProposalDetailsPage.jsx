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

        let requestType = RequestType.OTHER;
        // members or threshold
        if (
          ((title ?? "").includes("Add New Members") ||
            (title ?? "").includes("Edit Members Permissions") ||
            (title ?? "").includes("Remove Members") ||
            (title ?? "").includes("Members Permissions")) &&
          !(summary ?? "").includes("revoke")
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
          title: title || summary || item.description,
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

function parseMembersSummary() {
  const summary = proposalData?.summary || "";
  const lines = (summary.split("\n") ?? []).filter((line) => line.trim());
  const members = [];

  for (const line of lines) {
    let match;

    // Match: - add "alice" to ["Admin", "Editor"]
    if ((match = line.match(/- add "([^"]+)" to \[(.*?)\]/))) {
      members.push({
        member: match[1],
        oldRoles: [],
        newRoles: match[2].match(/"([^"]+)"/g).map((r) => r.replace(/"/g, "")),
        type: "add",
      });
    }

    // Match: - remove "bob" from ["Viewer"]
    else if ((match = line.match(/- remove "([^"]+)" from \[(.*?)\]/))) {
      members.push({
        member: match[1],
        oldRoles: match[2].match(/"([^"]+)"/g).map((r) => r.replace(/"/g, "")),
        newRoles: [],
        type: "remove",
      });
    }

    // Match: - edit "charlie" from ["Editor"] to ["Admin", "Finance"]
    else if (
      (match = line.match(/- edit "([^"]+)" from \[(.*?)\] to \[(.*?)\]/))
    ) {
      members.push({
        member: match[1],
        oldRoles: match[2].match(/"([^"]+)"/g).map((r) => r.replace(/"/g, "")),
        newRoles: match[3].match(/"([^"]+)"/g).map((r) => r.replace(/"/g, "")),
        type: "edit",
      });
    }

    // Fallback to old style
    else {
      const fallback = line.match(
        /requested to (add|remove) "([^"]+)" (?:to|from) (.+)$/
      );
      if (fallback) {
        const isAdd = fallback[1] === "add";
        const member = fallback[2];
        const roles = [...fallback[3].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
        members.push({
          member,
          oldRoles: isAdd ? [] : roles,
          newRoles: isAdd ? roles : [],
          type: isAdd ? "add" : "remove",
        });
      }
    }
  }

  return members;
}

function pluralize(count, singular) {
  if (count == "1" || count == "0") {
    return `${count} ${singular}`;
  } else {
    return `${count} ${singular + "s"}`;
  }
}

const RoleChangeCard = ({ member, type, oldRoles, newRoles, instance }) => {
  return (
    <div className="profile-header">
      <div
        className="content px-3 rounded-top-3"
        style={{ paddingTop: "11px" }}
      >
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
          props={{ accountId: member, instance }}
        />
      </div>
      <div className="card p-3 border-top-0 pt-1 rounded-top-0">
        {type === "edit" ? (
          <>
            <label>Old Roles:</label>
            <div className="d-flex flex-wrap gap-2 mt-1">
              {(oldRoles || []).join(", ")}
            </div>
            <label className="border-top mt-2">New Roles:</label>
            <div className="d-flex flex-wrap gap-2 mt-1">
              {(newRoles || []).join(", ")}
            </div>
          </>
        ) : (
          <>
            <label>{type === "add" ? "Assigned" : "Revoked"} Roles</label>
            <div className="d-flex flex-wrap gap-2 mt-1">
              {(type === "add" ? newRoles : oldRoles).join(", ")}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const SettingsContent = () => {
  const renderContent = () => {
    switch (proposalData.requestType) {
      case RequestType.MEMBERS: {
        const parsed = parseMembersSummary(proposalData.summary);
        return (
          <div className="d-flex flex-column gap-3">
            {parsed.map((change, index) => (
              <RoleChangeCard key={index} {...change} instance={instance} />
            ))}
          </div>
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
              <div className="summary-item mt-1">
                New Duration: {pluralize(newValue, "day")}
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
              <div className="summary-item mt-1">
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
                <div className="summary-item my-1">
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
  .profile-header {
    .content {
      border: 1px solid var(--border-color);
      border-bottom: 0px;
      height: 70px !important;
      background-color: var(--grey-05);
      position: relative;
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
    flex-wrap: wrap;
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
              <h6 className="flex-1">{proposalData?.title}</h6>
            )}
            <SettingsContent />
            <label
              className={
                proposalData?.requestType === RequestType.MEMBERS ||
                (proposalData?.requestType === RequestType.OTHER &&
                  !proposalData?.title)
                  ? ""
                  : "border-top"
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
