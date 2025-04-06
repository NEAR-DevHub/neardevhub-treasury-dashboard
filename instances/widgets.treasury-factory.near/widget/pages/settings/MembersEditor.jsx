const { encodeToMarkdown } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);
const { Modal, ModalContent, ModalHeader, ModalFooter } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal"
);
const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };

const { InfoBlock } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InfoBlock`
) || { InfoBlock: () => <></> };

const isTreasuryFactory = props.isTreasuryFactory;
const instance = props.instance;
if (!instance && !isTreasuryFactory) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const selectedMember = props.selectedMember;
const availableRoles = props.availableRoles ?? [];
const onCloseCanvas = props.onCloseCanvas ?? (() => {});
const setToastStatus = props.setToastStatus ?? (() => {});

const [username, setUsername] = useState(null);
const [isUsernameValid, setIsUsernameValid] = useState(null);

const [roles, setRoles] = useState([]);
const [isTxnCreated, setTxnCreated] = useState(false);
const [lastProposalId, setLastProposalId] = useState(null);
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [showCancelModal, setShowCancelModal] = useState(false);
const [memberAlreadyExistRoles, setMemberAlreadyExistRoles] = useState(null);
const [showErrorToast, setShowErrorToast] = useState(false);
const [showConfirmModal, setShowConfirmModal] = useState(false);
const [otherPendingRequests, setOtherPendingRequests] = useState([]);
const [permissionsImpactions, setPermissionsImpactions] = useState([]);

const daoPolicy =
  treasuryDaoID && !isTreasuryFactory
    ? Near.view(treasuryDaoID, "get_policy", {})
    : null;

const deposit = daoPolicy?.proposal_bond || 0;

useEffect(() => {
  if (selectedMember && !username) {
    setUsername(selectedMember.member);
    setRoles(selectedMember.roles);
  }
}, [selectedMember]);

function getLastProposalId() {
  return Near.asyncView(treasuryDaoID, "get_last_proposal_id").then(
    (result) => result
  );
}

useEffect(() => {
  if (!isTreasuryFactory) {
    getLastProposalId().then((i) => setLastProposalId(i));
  }
}, [isTreasuryFactory]);

// close canvas after proposal is submitted
useEffect(() => {
  if (isTxnCreated) {
    let checkTxnTimeout = null;

    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (typeof lastProposalId === "number" && lastProposalId !== id) {
          setToastStatus(true);
          onCloseCanvas();
          clearTimeout(checkTxnTimeout);
          setTxnCreated(false);
        } else {
          checkTxnTimeout = setTimeout(() => checkForNewProposal(), 1000);
        }
      });
    };
    checkForNewProposal();

    return () => {
      clearTimeout(checkTxnTimeout);
    };
  }
}, [isTxnCreated, lastProposalId]);

function isInitialValues() {
  if (
    (selectedMember?.member === username || memberAlreadyExistRoles) &&
    JSON.stringify((roles ?? [])?.map((i) => i.value)) ===
      JSON.stringify(selectedMember?.roles ?? memberAlreadyExistRoles ?? "")
  ) {
    return true;
  }
  return false;
}

function updateDaoPolicy(rolesMap) {
  const updatedPolicy = { ...daoPolicy };
  const additions = new Set();
  const removals = new Set();

  if (Array.isArray(updatedPolicy.roles)) {
    updatedPolicy.roles = updatedPolicy.roles.map((role) => {
      if (role.name === "all" && role.kind === "Everyone") {
        return role;
      }

      let group = role.kind.Group;
      // Check if the role is in the rolesMap
      if (rolesMap.has(role.name)) {
        // Add the user if they are not already in the group
        if (Array.isArray(group) && !group.includes(username)) {
          group.push(username);
          additions.add(role.name);
        }
      }
      // If the role is NOT in the rolesMap but the username is in the group, remove the username
      else if (Array.isArray(group) && group.includes(username)) {
        group = group.filter((i) => i !== username);
        removals.add(role.name);
      }

      // Return the updated role with the modified group
      return {
        ...role,
        kind: {
          Group: group,
        },
      };
    });
  }

  // create summary of additions and removal of permisisons of a user
  const additionText =
    additions.size > 0
      ? `add "${username}" to ${[...additions]
          .map((role) => `"${role}"`)
          .join(" and ")}`
      : null;
  const removalText =
    removals.size > 0
      ? `remove "${username}" from ${[...removals]
          .map((role) => `"${role}"`)
          .join(" and ")}`
      : null;

  const summary = [additionText, removalText]
    .filter((text) => text !== null)
    .join(" and ");

  return {
    updatedPolicy,
    summary: `${context.accountId} requested to ${summary}.`,
  };
}

function onSubmitClick() {
  if (isTreasuryFactory) {
    props.onSubmit({
      accountId: username,
      permissions: roles.map((i) => i.value),
    });
  } else {
    setTxnCreated(true);
    const changes = updateDaoPolicy(
      new Map(roles.map((role) => [role.title, role.value]))
    );
    const updatedPolicy = changes.updatedPolicy;
    const summary = changes.summary;
    const description = {
      title: "Update policy - Members Permissions",
      summary: summary,
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
}

function cleanInputs() {
  setUsername("");
  setRoles([]);
}

function detectImpactedPermissions() {
  const { updatedPolicy } = updateDaoPolicy(
    new Map(roles.map((role) => [role.title, role.value]))
  );

  const permissionsImpactions = updatedPolicy.roles.map((role) => {
    const votersSize = role.kind.Group.length;
    const defaultVotersSize = daoPolicy.roles.find((r) => r.name === role.name)
      .kind.Group.length;

    const threshold = Object.values(role.vote_policy)[0].threshold;

    if (Array.isArray(threshold)) {
      const requiredVotersSize =
        Math.floor((threshold[0] / 100) * votersSize) + 1;
      const defaultRequiredVotersSize =
        Math.floor((threshold[0] / 100) * defaultVotersSize) + 1;

      if (requiredVotersSize !== defaultRequiredVotersSize) {
        return {
          name: role.name,
          old: defaultRequiredVotersSize,
          new: requiredVotersSize,
        };
      } else return null;
    } else {
      if (votersSize < parseInt(threshold)) {
        return {
          name: role.name,
          old: parseInt(threshold),
          new: votersSize,
        };
      } else return null;
    }
  });

  const filteredPermissionsImpactions = permissionsImpactions.filter((i) => i);
  setPermissionsImpactions(filteredPermissionsImpactions);
  return filteredPermissionsImpactions;
}

const Container = styled.div`
  font-size: 14px;

  .text-secondary a {
    color: inherit !important;
  }

  label {
    font-weight: 600;
    margin-bottom: 3px;
    font-size: 15px;
  }

  .text-red {
    color: red;
  }
`;

// check if user already exists
useEffect(() => {
  if (selectedMember || isTreasuryFactory) {
    return;
  }
  const timeoutId = setTimeout(() => {
    const roleNames = daoPolicy?.roles
      ?.filter((role) => role?.kind?.Group?.includes(username)) // Filter roles containing the username
      .map((role) => role.name); // Extract the role names
    const memberExists = roleNames.length > 0;
    if (memberExists) {
      setRoles(roleNames);
    }
    setMemberAlreadyExistRoles(memberExists ? roleNames : null);
  }, 500);

  return () => clearTimeout(timeoutId);
}, [username]);

return (
  <Container className="d-flex flex-column gap-2">
    <TransactionLoader
      showInProgress={isTxnCreated}
      cancelTxn={() => setTxnCreated(false)}
    />
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
      props={{
        instance,
        heading: "Are you sure you want to cancel?",
        content:
          "This action will clear all the information you have entered in the form and cannot be undone.",
        confirmLabel: "Yes",
        isOpen: showCancelModal,
        onCancelClick: () => setShowCancelModal(false),
        onConfirmClick: () => {
          cleanInputs();
          setShowCancelModal(false);
          onCloseCanvas();
        },
      }}
    />
    <div className="d-flex flex-column gap-1">
      <label>Username</label>
      <Widget
        src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.AccountInput"
        props={{
          maxWidth: "100%",
          value: username,
          placeholder: "treasury.near",
          onUpdate: setUsername,
          disabled: selectedMember,
          setParentAccountValid: setIsUsernameValid,
          instance,
          allowNonExistentImplicit: false,
        }}
      />
      {!selectedMember && memberAlreadyExistRoles && (
        <div className="text-red text-sm mt-1">
          This user is already a member.
        </div>
      )}
    </div>
    <div className="d-flex flex-column gap-1">
      <label>Permissions</label>
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.RoleSelector`}
        props={{
          selected: roles,
          onChange: (v) => setRoles(v),
          availableOptions: availableRoles,
        }}
      />
    </div>

    <div className="d-flex gap-3 align-items-center mt-2 justify-content-between">
      <div>
        {(selectedMember || memberAlreadyExistRoles) && !isTreasuryFactory && (
          <Widget
            src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
            props={{
              classNames: {
                root: "btn btn-outline-danger shadow-none",
              },
              label: "Delete",
              onClick: () => setShowDeleteModal(true),
              disabled: isTxnCreated || !username,
            }}
          />
        )}
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.DeleteModalConfirmation`}
          props={{
            instance,
            isOpen: showDeleteModal,
            onCancelClick: () => setShowDeleteModal(false),
            onConfirmClick: () => {
              setTxnCreated(true);
              setShowDeleteModal(false);
            },
            setToastStatus,
            username: username,
            rolesMap: new Map(
              (selectedMember.roles ?? roles ?? []).map((role) => [role, role])
            ),
          }}
        />
      </div>
      <div className="d-flex gap-3 justify-content-end">
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: {
              root: "btn btn-outline-secondary shadow-none no-transparent",
            },
            label: "Cancel",
            onClick: () => {
              setShowCancelModal(true);
            },
            disabled: isInitialValues() || isTxnCreated,
          }}
        />
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: { root: "theme-btn" },
            disabled:
              isInitialValues() ||
              !username ||
              !roles?.length ||
              isTxnCreated ||
              !isUsernameValid,
            label: "Submit",
            onClick: () => {
              const impactedPermissions = detectImpactedPermissions();
              if (impactedPermissions.length > 0) {
                setShowConfirmModal(true);
              } else {
                onSubmitClick();
              }
            },
            loading: isTxnCreated,
          }}
        />

        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
          props={{
            instance,
            heading: "Confirm Your Change",
            content: (
              <div className="d-flex flex-column gap-2">
                <span>
                  This action will result in significant changes to the system.
                </span>

                <InfoBlock
                  type="warning"
                  description={
                    <div>
                      <div>
                        Adding this member will change the required votes for
                        some permissions
                      </div>
                      {permissionsImpactions.map((i) => (
                        <div>
                          <b>{i.name}</b>: {i.old} vote{i.old > 1 ? "s" : ""} →{" "}
                          {i.new} vote{i.new > 1 ? "s" : ""}
                        </div>
                      ))}
                      <div>
                        <a
                          href={`app?page=settings&tab=voting-thresholds`}
                          target="_blank"
                          className="mt-2"
                        >
                          Open Settings
                        </a>
                      </div>
                    </div>
                  }
                />
              </div>
            ),
            confirmLabel: "Yes, proceed",
            isOpen: showConfirmModal,
            onCancelClick: () => setShowConfirmModal(false),
            onConfirmClick: () => {
              setShowConfirmModal(false);
              onSubmitClick();
            },
          }}
        />
      </div>
    </div>
  </Container>
);
