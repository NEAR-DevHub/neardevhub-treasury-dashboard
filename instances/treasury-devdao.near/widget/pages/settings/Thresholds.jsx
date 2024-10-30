const { instance } = props;
if (!instance) {
  return <></>;
}
const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const { getRoleWiseData, hasPermission } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || { hasPermission: () => {} };
const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

if (typeof getRoleWiseData !== "function") {
  return <></>;
}
const [selectedGroup, setSelectedGroup] = useState(null);
const [selectedVoteOption, setSelectedVoteOption] = useState(null);
const [selectedVoteValue, setSelectedVoteValue] = useState(null);
const [isTxnCreated, setTxnCreated] = useState(false);
const [daoPolicy, setDaoPolicy] = useState(null);
const [lastProposalId, setLastProposalId] = useState(null);
const [showToastStatus, setToastStatus] = useState(false);
const [voteProposalId, setVoteProposalId] = useState(null);
const [valueError, setValueError] = useState(null);
const [showConfirmModal, setConfirmModal] = useState(null);
const [rolesData, setRolesData] = useState(null);
const [refreshData, setRefreshData] = useState(false);

const hasCreatePermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "policy",
  "vote"
);

useEffect(() => {
  if (Array.isArray(rolesData) && rolesData.length && !selectedGroup) {
    setSelectedGroup(rolesData[0]);
  }
}, [rolesData]);

const options = [
  {
    label: "Number of votes",
    value: "number",
    description: "A fixed number of votes is required for a decision to pass.",
  },
  {
    label: "Percentage of members",
    value: "percentage",
    description:
      "A percentage of the total group members must vote for a decision to pass.",
  },
];

function getLastProposalId() {
  return Near.asyncView(treasuryDaoID, "get_last_proposal_id").then(
    (result) => result
  );
}

useEffect(() => {
  getRoleWiseData(treasuryDaoID).then((resp) => {
    setRolesData(resp);
  });
}, [refreshData]);

useEffect(() => {
  getLastProposalId().then((i) => setLastProposalId(i));
  Near.asyncView(treasuryDaoID, "get_policy").then((policy) => {
    setDaoPolicy(policy);
  });
}, []);

function checkProposalStatus(proposalId) {
  Near.asyncView(treasuryDaoID, "get_proposal", {
    id: proposalId,
  }).then((result) => {
    if (result.status === "Approved") {
      setRefreshData(!refreshData);
    }
    setToastStatus(result.status);
    setVoteProposalId(proposalId);
  });
}

useEffect(() => {
  if (isTxnCreated) {
    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (lastProposalId !== id) {
          setTimeout(() => checkProposalStatus(id - 1), 2000);
        } else {
          setTimeout(() => checkForNewProposal(), 1000);
        }
      });
    };
    checkForNewProposal();
  }
}, [isTxnCreated]);

function resetForm() {
  setSelectedVoteOption(selectedGroup.isRatio ? options[1] : options[0]);
  setSelectedVoteValue(selectedGroup.threshold);
}

useEffect(() => {
  if (selectedGroup) {
    resetForm();
  }
}, [selectedGroup]);

const Container = styled.div`
  font-size: 14px;
  .border-right {
    border-right: 1px solid rgba(226, 230, 236, 1);
  }

  .card-title {
    font-size: 18px;
    font-weight: 600;
    padding-block: 5px;
    border-bottom: 1px solid rgba(226, 230, 236, 1);
  }

  .selected-role {
    background-color: rgba(244, 244, 244, 1);
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .tag {
    background-color: rgba(244, 244, 244, 1);
    font-size: 12px;
    padding-block: 5px;
  }

  label {
    color: rgba(153, 153, 153, 1);
    font-size: 12px;
  }

  .fw-bold {
    font-weight: 500 !important;
  }

  .p-0 {
    padding: 0 !important;
  }

  .text-md {
    font-size: 13px;
  }

  .theme-btn {
    background-color: var(--theme-color) !important;
    color: white;
  }

  .warning {
    background-color: rgba(255, 158, 0, 0.1);
    color: rgba(177, 113, 8, 1);
    font-weight: 500;
  }

  .text-sm {
    font-size: 12px !important;
  }

  .text-muted {
    color: rgba(153, 153, 153, 1);
  }

  .text-red {
    color: #d95c4a;
  }

  .toast {
    background: white !important;
  }

  .toast-header {
    background-color: #2c3e50 !important;
    color: white !important;
  }
`;

const ToastContainer = styled.div`
  a {
    color: black !important;
    text-decoration: underline !important;
    &:hover {
      color: black !important;
    }
  }
`;

function getApproveTxn() {
  return {
    contractName: treasuryDaoID,
    methodName: "act_proposal",
    args: {
      id: lastProposalId,
      action: "VoteApprove",
    },
    gas: 200000000000000,
  };
}
const proposalKinds = [
  "config",
  "policy",
  "add_bounty",
  "bounty_done",
  "transfer",
  "vote",
  "remove_member_from_role",
  "add_member_to_role",
  "call",
  "upgrade_self",
  "upgrade_remote",
  "set_vote_token",
];

function updateDaoPolicy() {
  const updatedPolicy = { ...daoPolicy };
  if (Array.isArray(updatedPolicy.roles)) {
    updatedPolicy.roles = updatedPolicy.roles.map((role) => {
      if (role.name === selectedGroup.roleName) {
        const vote_policy = proposalKinds.reduce((policy, kind) => {
          policy[kind] = {
            weight_kind: "RoleWeight",
            quorum: "0",
            threshold: isPercentageSelected
              ? [parseInt(selectedVoteValue), 100]
              : selectedVoteValue,
          };
          return policy;
        }, {});
        return {
          ...role,
          vote_policy,
        };
      }
      return role;
    });
  }

  return updatedPolicy;
}

function onSubmitClick() {
  setTxnCreated(true);
  const deposit = daoPolicy?.proposal_bond || 100000000000000000000000;
  const updatedPolicy = updateDaoPolicy();

  Near.call([
    {
      contractName: treasuryDaoID,
      methodName: "add_proposal",
      args: {
        proposal: {
          description: "Update Policy",
          kind: {
            ChangePolicy: {
              policy: updatedPolicy,
            },
          },
        },
      },
      gas: 200000000000000,
    },
    getApproveTxn(),
  ]);
}

const ToastStatusContent = () => {
  let content = "";
  switch (showToastStatus) {
    case "Approved":
      content = "Vote policy is successfully updated.";
      break;
    default:
      content = `Your request is created.`;
      break;
  }
  return (
    showToastStatus && (
      <div className="toast-body">
        {content}
        {showToastStatus == "InProgress" && (
          <a
            href={href({
              widgetSrc: `${instance}/widget/app`,
              params: {
                page: "settings",
                selectedTab: "History",
                highlightProposalId: voteProposalId,
              },
            })}
          >
            View it
          </a>
        )}
      </div>
    )
  );
};

const SubmitToast = () => {
  return (
    showToastStatus && (
      <ToastContainer className="toast-container position-fixed bottom-0 end-0 p-3">
        <div className={`toast ${showToastStatus ? "show" : ""}`}>
          <div className="toast-header px-2">
            <strong className="me-auto">Just Now</strong>
            <i
              className="bi bi-x-lg h6"
              onClick={() => setToastStatus(null)}
            ></i>
          </div>
          <ToastStatusContent />
        </div>
      </ToastContainer>
    )
  );
};

const isPercentageSelected = selectedVoteOption?.value === options[1].value;

const requiredVotes = selectedGroup
  ? isPercentageSelected
    ? Math.min(
        Math.floor(
          (parseInt(selectedVoteValue ? selectedVoteValue : 0) / 100) *
            selectedGroup.members?.length +
            1
        ),
        selectedGroup.members.length
      )
    : selectedVoteValue
  : 0;

return (
  <Container>
    <SubmitToast />
    {Array.isArray(rolesData) && rolesData.length ? (
      <div className="card rounded-3 d-flex flex-row px-0 flex-wrap">
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
          props={{
            instance,
            heading: "Are you sure?",
            content: (
              <div className="d-flex flex-column gap-2">
                This action will result in significant changes to the system.
                <div className="d-flex gap-3 warning px-3 py-2 rounded-3">
                  <i class="bi bi-exclamation-triangle h5"></i>
                  <div>
                    Changing this setting will require {requiredVotes} vote(s)
                    to approve requests. You will no longer be able to approve
                    requests with {selectedGroup.requiredVotes} vote(s).
                  </div>
                </div>
              </div>
            ),
            confirmLabel: "Confirm",
            isOpen: showConfirmModal,
            onCancelClick: () => setConfirmModal(false),
            onConfirmClick: () => {
              setConfirmModal(false);
              onSubmitClick();
            },
          }}
        />
        <div className="flex-1 border-right py-3 ">
          <div className="card-title px-3">Permission Groups</div>
          <div className="d-flex flex-column gap-1 fw-bold">
            {rolesData.map((role) => {
              const name = role.roleName;
              return (
                <div
                  onClick={() => setSelectedGroup(role)}
                  className={
                    "py-2 cursor-pointer " +
                    (name === selectedGroup.roleName && "selected-role")
                  }
                >
                  <span className="px-3">{name}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex-1 border-right py-3 ">
          <div className="card-title px-3">
            Members{" "}
            <span className="tag rounded-pill px-3">
              {selectedGroup.members.length}
            </span>
          </div>
          <div className="d-flex flex-column gap-1">
            {Array.isArray(selectedGroup.members) &&
              selectedGroup.members.map((member) => (
                <div
                  className="p-1 px-3 text-truncate"
                  style={{ width: "85%" }}
                >
                  <Widget
                    src="mob.near/widget/Profile.ShortInlineBlock"
                    props={{ accountId: member, tooltip: true }}
                  />
                </div>
              ))}
          </div>
        </div>
        <div className="flex-1 border-right py-3 ">
          <div className="card-title px-3">Voting Policy</div>
          <div className="d-flex flex-column gap-3 px-3 w-100">
            <div className="text-md">
              How many votes are needed for decisions in the `
              {selectedGroup.roleName}` permission group?
            </div>
            <div className="d-flex flex-column gap-1">
              <label>Based On</label>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDown`}
                props={{
                  options: options,
                  selectedValue: selectedVoteOption,
                  onUpdate: (v) => {
                    setSelectedVoteOption(v);
                  },
                  disabled: !hasCreatePermission,
                }}
              />
            </div>
            <div className="d-flex flex-column gap-1">
              <label>
                {isPercentageSelected ? "Enter percentage" : "Value"}
              </label>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Input`}
                props={{
                  className: "flex-grow-1 p-0",
                  key: `threshold-input`,
                  onChange: (e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    setSelectedVoteValue(value);
                    const number = parseInt(value);
                    setValueError(null);
                    if (isPercentageSelected) {
                      if (number > 100)
                        setValueError("Maximum percentage allowed is 100.");
                    } else {
                      if (number > selectedGroup.members.length)
                        setValueError(
                          `Maximum members allowed is ${selectedGroup.members.length}.`
                        );
                    }
                  },
                  value: selectedVoteValue,
                  inputProps: {
                    min: "0",
                    type: "number",
                    prefix: isPercentageSelected ? (
                      <i class="bi bi-percent"></i>
                    ) : (
                      <i class="bi bi-person"></i>
                    ),
                    disabled: !hasCreatePermission,
                  },
                }}
              />
              <div>
                {isPercentageSelected && (
                  <div className="text-muted text-sm">
                    This is equivalent to
                    <span className="fw-bolder">
                      {requiredVotes} votes
                    </span>{" "}
                    with the current number of members.
                  </div>
                )}
              </div>
              {valueError && <div className="text-red"> {valueError}</div>}
            </div>

            {isPercentageSelected &&
              selectedGroup.threshold != selectedVoteValue && (
                <div className="d-flex gap-3 warning px-3 py-2 rounded-3">
                  <i class="bi bi-exclamation-triangle h5"></i>
                  <div>
                    <span className="fw-bolder">Heads up, Bro! </span> <br />
                    If you choose a percentage-based threshold, the number of
                    votes required could change if new members are added or
                    existing members are removed. However, at least one vote
                    will always be required, regardless of the percentage.
                  </div>
                </div>
              )}
            {hasCreatePermission && (
              <div className="d-flex mt-2 gap-3 justify-content-end">
                <Widget
                  src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
                  props={{
                    classNames: {
                      root: "btn-outline shadow-none border-0",
                    },
                    label: "Cancel",
                    onClick: () => {
                      resetForm();
                    },
                    disabled: isTxnCreated,
                  }}
                />
                <Widget
                  src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
                  props={{
                    classNames: { root: "theme-btn" },
                    disabled: !selectedVoteValue || valueError,
                    label: "Submit",
                    onClick: () => setConfirmModal(true),
                    loading: isTxnCreated,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    ) : (
      <div
        className="card rounded-3 d-flex justify-content-center align-items-center w-100 h-100"
        style={{ minHeight: 300 }}
      >
        <Widget
          src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"}
        />
      </div>
    )}
  </Container>
);
