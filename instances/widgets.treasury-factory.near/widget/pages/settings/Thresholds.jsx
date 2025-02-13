const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };

const {
  encodeToMarkdown,
  hasPermission,
  getRoleWiseData,
  getRolesThresholdDescription,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common") || {
  encodeToMarkdown: () => {},
  hasPermission: () => {},
  getRolesThresholdDescription: () => {},
};

const { instance } = props;
if (!instance) {
  return <></>;
}
const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

if (typeof getRoleWiseData !== "function") {
  return <></>;
}

const hasEditPermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "policy",
  "AddProposal"
);

const [selectedGroup, setSelectedGroup] = useState(null);
const [selectedVoteOption, setSelectedVoteOption] = useState(null);
const [selectedVoteValue, setSelectedVoteValue] = useState("");
const [isTxnCreated, setTxnCreated] = useState(false);
const [daoPolicy, setDaoPolicy] = useState(null);
const [lastProposalId, setLastProposalId] = useState(null);
const [showToastStatus, setToastStatus] = useState(false);
const [valueError, setValueError] = useState(null);
const [showConfirmModal, setConfirmModal] = useState(null);
const [rolesData, setRolesData] = useState(null);
const [showErrorToast, setShowErrorToast] = useState(false);

const hasCreatePermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "policy",
  "AddProposal"
);

useEffect(() => {
  if (Array.isArray(rolesData) && rolesData.length) {
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
  setRolesData([]);
  getRoleWiseData(treasuryDaoID).then((resp) => {
    // remove Create request and Treasury Creator permission group, since we don't need to set threshold for them
    setRolesData(
      resp.filter(
        (i) =>
          i.roleName !== "Create Requests" &&
          i.roleName !== "Requestor" &&
          i.roleName !== "Create requests"
      )
    );
  });
}, []);

useEffect(() => {
  getLastProposalId().then((i) => setLastProposalId(i));
  Near.asyncView(treasuryDaoID, "get_policy").then((policy) => {
    setDaoPolicy(policy);
  });
}, []);

useEffect(() => {
  if (isTxnCreated) {
    let checkTxnTimeout = null;
    let errorTimeout = null;

    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (typeof lastProposalId === "number" && lastProposalId !== id) {
          setToastStatus(true);
          setTxnCreated(false);
          clearTimeout(errorTimeout);
        } else {
          checkTxnTimeout = setTimeout(() => checkForNewProposal(), 1000);
        }
      });
    };
    checkForNewProposal();

    // if in 20 seconds there is no change, show error condition
    errorTimeout = setTimeout(() => {
      setShowErrorToast(true);
      setTxnCreated(false);
      clearTimeout(checkTxnTimeout);
    }, 25_000);

    return () => {
      clearTimeout(checkTxnTimeout);
      clearTimeout(errorTimeout);
    };
  }
}, [isTxnCreated, lastProposalId]);

function resetForm() {
  setSelectedVoteOption(selectedGroup.isRatio ? options[1] : options[0]);
  setSelectedVoteValue(parseInt(selectedGroup.threshold));
  setValueError(null);
}

useEffect(() => {
  if (selectedGroup) {
    resetForm();
  }
}, [selectedGroup]);

const Container = styled.div`
  font-size: 14px;

  .card-title {
    font-size: 18px;
    font-weight: 600;
    padding-block: 5px;
    border-bottom: 1px solid var(--border-color);
  }

  .selected-role {
    background-color: var(--grey-04);
    font-weight: 600;
  }

  .tag {
    background-color: var(--grey-04);
    font-size: 12px;
    padding-block: 5px;
  }

  label {
    color: rgba(153, 153, 153, 1);
    font-size: 12px;
  }

  .p-0 {
    padding: 0 !important;
  }

  .text-md {
    font-size: 13px;
  }

  .warning {
    background-color: rgba(255, 158, 0, 0.1);
    color: var(--other-warning);
    font-weight: 500;
  }

  .text-sm {
    font-size: 12px !important;
  }

  .dropdown-toggle:after {
    top: 30% !important;
  }
`;

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
  const deposit = daoPolicy?.proposal_bond || 0;
  const updatedPolicy = updateDaoPolicy();

  const description = {
    title: "Update policy - Voting Thresholds",
    summary: `${context.accountId} requested to change voting threshold from ${selectedGroup.requiredVotes} to ${requiredVotes}.`,
  };
  Near.call([
    {
      contractName: treasuryDaoID,
      methodName: "add_proposal",
      args: {
        proposal: {
          description: encodeToMarkdown(description),
          kind: {
            ChangePolicy: {
              policy: updatedPolicy,
            },
          },
        },
      },
      gas: 200000000000000,
      deposit,
    },
  ]);
}

const SubmitToast = () => {
  return (
    showToastStatus && (
      <div className="toast-container position-fixed bottom-0 end-0 p-3">
        <div className={`toast ${showToastStatus ? "show" : ""}`}>
          <div className="toast-header px-2">
            <strong className="me-auto">Just Now</strong>
            <i
              className="bi bi-x-lg h6 mb-0 cursor-pointer"
              onClick={() => setToastStatus(null)}
            ></i>
          </div>
          <div className="toast-body">
            <div className="d-flex align-items-center gap-3">
              <i class="bi bi-check2 h3 mb-0 success-icon"></i>
              <div>
                <div>Threshold change request submitted.</div>
                <a
                  className="text-underline"
                  href={href({
                    widgetSrc: `${instance}/widget/app`,
                    params: {
                      page: "settings",
                    },
                  })}
                >
                  View it
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  );
};

const isPercentageSelected = selectedVoteOption?.value === options[1].value;

function computeRequiredVotes(
  selectedGroup,
  selectedVoteOption,
  options,
  selectedVoteValue
) {
  if (!selectedGroup) return 0;

  const isPercentageSelected = selectedVoteOption?.value === options[1].value;

  if (isPercentageSelected) {
    // Parse the input percentage; if the value is not a number, default to 0
    const inputPercentage = parseInt(selectedVoteValue) || 0;
    const totalMembers = selectedGroup.members?.length || 0;

    // Calculate votes: (percentage of total members) and always require at least one extra vote.
    const calculatedVotes =
      Math.floor((inputPercentage / 100) * totalMembers) + 1;

    // Limit the required votes to the total number of group members.
    return Math.min(calculatedVotes, totalMembers);
  } else {
    // When a fixed number is required, simply use the provided value.
    return parseInt(selectedVoteValue);
  }
}

// threshold with be percentage based [1, 100] or a fixed number 1 vote
function PermissionGroupPercentage({ group }) {
  if (!group) return null;

  return (
    <ul>
      <li>Decision Based On: % of Members</li>
      <li>Permission Group Size: {group.members.length} members</li>
      <li>Proposal Approved If: {group.threshold[0]}% of Members Vote Yes</li>
      <li>Required Votes for Approval: {group.requiredVotes}</li>
    </ul>
  );
}

function PermissionGroupFixedNumber({ group }) {
  if (!group) return null;

  return (
    <ul>
      <li>Decision Based On: Number of Votes</li>
      <li>Proposal Approved If: {group.threshold} Members Vote Yes</li>
      <li>Required Votes for Approval: {group.requiredVotes}</li>
    </ul>
  );
}

const Table = ({ currentGroup, newGroup }) => {
  let data = [
    {
      label: "Permission Group Size",
      current: `${currentGroup.members.length} members`,
      new: `${newGroup.members.length} members`,
    },
    {
      label: "Based On",
      current:
        currentGroup.option === "number"
          ? "Number of Votes"
          : "Percentage of Members",
      new:
        newGroup.option === "number"
          ? "Number of Votes"
          : "Percentage of Members",
    },
    {
      label: "Selected Value",
      current: `${
        currentGroup.option === "percentage"
          ? currentGroup.threshold[0]
          : currentGroup.threshold
      } ${currentGroup.option === "percentage" ? "%" : ""}`,
      new: `${
        newGroup.option === "percentage"
          ? newGroup.threshold[0]
          : newGroup.threshold
      } ${newGroup.option === "percentage" ? "%" : ""}`,
    },
    {
      label: "Required Vote(s) for Approval",
      current: currentGroup.requiredVotes,
      new: newGroup.requiredVotes,
    },
  ];
  return (
    <table className="table">
      <thead className="">
        <tr className="">
          <th className="fw-bold"></th>
          <th className="fw-bold text-center ">Current Setup</th>
          <th className="fw-bold text-center ">New Setup</th>
        </tr>
      </thead>
      <tbody>
        {data.map((config, index) => (
          <tr key={index} className="proposal-that-will-expire">
            <td className="text-left fw-semibold">{config.label}</td>
            <td className="text-center">{config.current}</td>
            <td className="text-center">{config.new}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const requiredVotes = selectedGroup
  ? computeRequiredVotes(
      selectedGroup,
      selectedVoteOption,
      options,
      selectedVoteValue
    )
  : 0;

return (
  <Container>
    <SubmitToast />
    <TransactionLoader
      showInProgress={isTxnCreated}
      showError={showErrorToast}
      toggleToast={() => setShowErrorToast(false)}
    />
    {Array.isArray(rolesData) && rolesData.length && selectedGroup ? (
      <div className="card rounded-4 d-flex flex-row px-0 flex-wrap">
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
          props={{
            instance,
            heading: "Confirm Your Change",
            content: (
              <>
                {requiredVotes > 1 &&
                  parseInt(selectedGroup.threshold) === 1 && (
                    <div className="d-flex align-items-center gap-3 warning px-3 py-2 rounded-3">
                      <i className="bi bi-exclamation-triangle warning-icon h5"></i>
                      <div>
                        You will no longer be able to vote with a single vote.
                      </div>
                    </div>
                  )}
                <Table
                  currentGroup={
                    selectedGroup.isRatio
                      ? {
                          ...selectedGroup,
                          threshold: [selectedGroup.threshold, 100],
                          option: "percentage",
                        }
                      : {
                          ...selectedGroup,
                          option: "number",
                        }
                  }
                  newGroup={
                    selectedVoteOption.value === options[1].value
                      ? {
                          members: selectedGroup.members,
                          threshold: [selectedVoteValue, 100],
                          requiredVotes,
                          option: "percentage",
                        }
                      : {
                          members: selectedGroup.members,
                          option: "number",
                          threshold: requiredVotes,
                          requiredVotes,
                        }
                  }
                />
              </>
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
          <div className="card-title px-3 pb-3">
            Permission Groups{" "}
            <Widget
              src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
              props={{
                popup:
                  "Select the permission group you want to apply the voting threshold to.",
                children: <i className="bi bi-info-circle text-secondary"></i>,
                instance,
              }}
            />
          </div>
          <div className="d-flex flex-column gap-1 py-1">
            {rolesData.map((role) => {
              const name = role.roleName;
              const description = getRolesThresholdDescription(name);
              return (
                <div
                  onClick={() => setSelectedGroup(role)}
                  className={
                    "py-2 cursor-pointer " +
                    (name === selectedGroup.roleName && "selected-role")
                  }
                >
                  <span className="px-3">{name}</span>
                  {description && (
                    <div className="text-secondary px-3 text-sm">
                      {description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 py-3 border-right ">
          <div className="card-title px-3 pb-3">Voting Policy </div>
          <div className="d-flex flex-column gap-3 px-3 w-100 py-1">
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
                    setValueError(null);
                  },
                  disabled: !hasCreatePermission,
                }}
              />
            </div>
            <div className="d-flex flex-column gap-1">
              <label data-testid="threshold-value-label">
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
                      else if (number < 1)
                        setValueError("The minimum allowed percentage is 1%.");
                    } else {
                      if (number > selectedGroup.members.length)
                        setValueError(
                          `Maximum members allowed is ${selectedGroup.members.length}.`
                        );
                      if (number < 1)
                        setValueError("At least 1 member is required.");
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
                  <div className="text-secondary text-sm">
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
              selectedVoteValue &&
              selectedGroup.threshold != selectedVoteValue && (
                <div className="d-flex gap-3 warning px-3 py-2 rounded-3">
                  <i class="bi bi-exclamation-triangle warning-icon h5"></i>
                  <div>
                    <span className="fw-bolder">Warning! </span> <br />
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
                      root: "btn btn-outline-secondary shadow-none no-transparent",
                    },
                    label: "Cancel",
                    onClick: () => {
                      resetForm();
                    },
                    disabled: isTxnCreated || !hasCreatePermission,
                  }}
                />
                <Widget
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
                  props={{
                    ActionButton: () => (
                      <Widget
                        src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
                        props={{
                          classNames: { root: "theme-btn" },
                          disabled:
                            !selectedVoteValue ||
                            valueError ||
                            !hasCreatePermission ||
                            isTxnCreated,
                          label: "Submit Request",
                          loading: isTxnCreated,
                        }}
                      />
                    ),
                    checkForDeposit: true,
                    disabled:
                      !selectedVoteValue ||
                      valueError ||
                      !hasCreatePermission ||
                      isTxnCreated,
                    treasuryDaoID,
                    callbackAction: () => {
                      if (
                        !isPercentageSelected &&
                        selectedVoteValue > selectedGroup.members.length
                      ) {
                        setValueError(
                          `Maximum members allowed is ${selectedGroup.members.length}.`
                        );
                      } else {
                        setConfirmModal(true);
                      }
                    },
                  }}
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 py-3 ">
          <div className="card-title px-3 pb-3 d-flex align-items-center gap-2">
            <div>Who Can Vote</div>
            <span className="tag rounded-pill px-3">
              {selectedGroup.members.length}
            </span>
          </div>
          <div className="d-flex flex-column gap-1 py-1">
            {Array.isArray(selectedGroup.members) &&
              selectedGroup.members.map((member) => (
                <div
                  className="p-1 px-3 text-truncate"
                  style={{ width: "95%" }}
                >
                  <Widget
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
                    props={{
                      accountId: member,
                      showKYC: false,
                      instance,
                      width: "100%",
                    }}
                  />
                </div>
              ))}
          </div>
        </div>
      </div>
    ) : (
      <div
        className="card rounded-4 d-flex justify-content-center align-items-center w-100 h-100"
        style={{ minHeight: 300 }}
      >
        <Widget
          src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"}
        />
      </div>
    )}
  </Container>
);
