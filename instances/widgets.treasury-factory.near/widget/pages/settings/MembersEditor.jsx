const { encodeToMarkdown, getFilteredProposalsByStatusAndKind } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  getFilteredProposalsByStatusAndKind: () => {},
};

const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };

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
const [proposals, setProposals] = useState([]);
const [rowsPerPage, setRowsPerPage] = useState(10);
const [currentPage, setPage] = useState(0);
const [offset, setOffset] = useState(null);
const [totalLength, setTotalLength] = useState(null);
const [isPrevPageCalled, setIsPrevCalled] = useState(false);

const fetchProposals = async () =>
  getFilteredProposalsByStatusAndKind({
    treasuryDaoID,
    resPerPage: rowsPerPage,
    isPrevPageCalled: isPrevPageCalled,
    filterKindArray: ["ChangePolicy"],
    filterStatusArray: ["InProgress"],
    offset: typeof offset === "number" ? offset : lastProposalId,
    lastProposalId: lastProposalId,
    currentPage,
  }).then((r) => {
    setOffset(r.filteredProposals[r.filteredProposals.length - 1].id);
    if (currentPage === 0 && !totalLength) {
      setTotalLength(r.totalLength);
    }

    return r.filteredProposals;
  });

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

const submissionTimeMillis = (proposal) =>
  Number(
    proposal.submission_time.substr(0, proposal.submission_time.length - 6)
  );

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
            onClick: async () => {
              fetchProposals().then((proposals) => {
                if (proposals.length > 0) {
                  setProposals(proposals);
                  setShowConfirmModal(true);
                } else {
                  onSubmitClick();
                }
              });
            },
            loading: isTxnCreated,
          }}
        />

        {proposals.length > 0 && (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
            props={{
              instance,
              heading: "Confirm Your Change",
              wider: true,
              content: (
                <Widget
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.WarningTable`}
                  props={{
                    proposals,
                    warningText:
                      "This action will override your previous pending proposals. Complete exsisting one before creating a new to avoid conflicting or incomplete updates.",
                  }}
                />
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
        )}
      </div>
    </div>
  </Container>
);
