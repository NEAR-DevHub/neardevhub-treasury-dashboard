const { id, instance } = props;
const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
if (!instance) {
  return <></>;
}
const { decodeProposalDescription, getApproversAndThreshold } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const [proposalData, setProposalData] = useState(null);
const [isDeleted, setIsDeleted] = useState(false);

const isCompactVersion = props.isCompactVersion;
const accountId = context.accountId;
const customFunctionCallApproverGroup = getApproversAndThreshold(
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
const requiredVotes = customFunctionCallApproverGroup?.requiredVotes;

const hasVotingPermission = (
  customFunctionCallApproverGroup?.approverAccounts ?? []
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
          proposal: item,
        });
      })
      .catch(() => {
        // proposal is deleted or doesn't exist
        setIsDeleted(true);
      });
  }
}, [id, proposalPeriod, proposalData]);

useEffect(() => {
  if (proposalData?.id !== id) {
    setProposalData(null);
  }
}, [id]);

function refreshData() {
  setProposalData(null);

  if (props.transactionHashes) {
    return;
  }
  if (isCompactVersion) {
    setTimeout(() => {
      Storage.set("REFRESH_TABLE_DATA", Math.random());
    }, 1000);
  }
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

// Parse function call details from proposal kind
function getFunctionCallDetails() {
  const functionCall = proposalData?.kind?.FunctionCall;
  if (!functionCall) return null;

  const action = functionCall.actions?.[0];
  if (!action) return null;

  let argsString = Buffer.from(action.args, "base64").toString("utf-8");
  // Try to parse and format JSON for better display
  try {
    const parsed = JSON.parse(argsString);
    argsString = JSON.stringify(parsed, null, 2);
  } catch (e) {
    // If not valid JSON, keep as is
  }

  return {
    contractId: functionCall.receiver_id,
    methodName: action.method_name,
    args: argsString,
    gas: action.gas,
    deposit: action.deposit,
  };
}

// Convert gas units to Tgas
function formatGas(gasUnits) {
  if (!gasUnits) return "0";
  try {
    // Convert from gas units to Tgas (divide by 10^12)
    const tgas = Big(gasUnits).div(Big(10).pow(12));
    return tgas.toFixed();
  } catch (e) {
    return gasUnits;
  }
}

// Convert yoctoNEAR to NEAR
function formatDeposit(yoctoNEAR) {
  if (!yoctoNEAR) return "0";
  try {
    // Convert from yoctoNEAR to NEAR (divide by 10^24)
    const near = Big(yoctoNEAR).div(Big(10).pow(24));
    return near.toFixed();
  } catch (e) {
    return yoctoNEAR;
  }
}

const CustomFunctionCallContent = () => {
  const details = getFunctionCallDetails();
  if (!details) return null;

  return (
    <div className="d-flex flex-column gap-3">
      <div>
        <label>Contract ID</label>
        <div className="text-muted">{details.contractId}</div>
      </div>

      <div>
        <label>Method Name</label>
        <div className="text-muted">{details.methodName}</div>
      </div>

      <div>
        <label>Arguments</label>
        <div className="markdown-scroll">
          <Markdown
            text={`
\`\`\`jsx
${details.args}
\`\`\`
`}
            syntaxHighlighterProps={{
              wrapLines: true,
            }}
          />
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <label>Gas</label>
          <div className="text-muted">{formatGas(details.gas)} Tgas</div>
        </div>

        <div className="col-md-6">
          <label>Deposit</label>
          <div className="text-muted">
            {formatDeposit(details.deposit)} NEAR
          </div>
        </div>
      </div>
    </div>
  );
};

const Container = styled.div`
  .markdown-scroll {
    max-height: 400px;
    width: 100%;
    overflow: auto;

    pre {
      margin-bottom: 0px !important;
    }

    p {
      margin-bottom: 0px !important;
    }
  }

  label {
    font-weight: 600;
    margin-bottom: 0.25rem;
    display: block;
  }

  .text-muted {
    color: var(--text-secondary);
  }
`;

return (
  <Container>
    <Widget
      loading=""
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.ProposalDetails`}
      props={{
        ...props,
        proposalPeriod,
        page: "custom-proposals",
        VoteActions: (hasVotingPermission || hasDeletePermission) &&
          proposalData?.status === "InProgress" && (
            <Widget
              loading=""
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
                proposal: proposalData?.proposal,
              }}
            />
          ),
        ProposalContent: (
          <div className="card card-body d-flex flex-column gap-2">
            <CustomFunctionCallContent />
          </div>
        ),
        proposalData: proposalData,
        isDeleted: isDeleted,
        isCompactVersion,
        approversGroup: customFunctionCallApproverGroup,
        instance,
        deleteGroup,
        proposalStatusLabel: {
          approved: "Custom Function Call Executed",
          rejected: "Custom Function Call Rejected",
          deleted: "Custom Function Call Deleted",
          failed: "Custom Function Call Failed",
          expired: "Custom Function Call Expired",
        },
        checkProposalStatus,
      }}
    />
  </Container>
);
