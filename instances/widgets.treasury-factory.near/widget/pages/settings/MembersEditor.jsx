const { encodeToMarkdown } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);
const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };

const instance = props.instance;
if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const selectedMember = props.selectedMember;
const availableRoles = props.availableRoles ?? [];
const onCloseCanvas = props.onCloseCanvas ?? (() => {});
const setToastStatus = props.setToastStatus ?? (() => {});

const [username, setUsername] = useState(null);
const [roles, setRoles] = useState([]);
const [isTxnCreated, setTxnCreated] = useState(false);
const [lastProposalId, setLastProposalId] = useState(null);
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [showCancelModal, setShowCancelModal] = useState(false);
const [memberAlreadyExists, setMemberAlreadyExists] = useState(false);
const [showErrorToast, setShowErrorToast] = useState(false);

const daoPolicy = treasuryDaoID
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
  getLastProposalId().then((i) => setLastProposalId(i));
}, []);

// close canvas after proposal is submitted
useEffect(() => {
  if (isTxnCreated) {
    let checkTxnTimeout = null;
    let errorTimeout = null;

    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (typeof lastProposalId === "number" && lastProposalId !== id) {
          setToastStatus(true);
          onCloseCanvas();
          clearTimeout(errorTimeout);
          setTxnCreated(false);
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

function isAccountValid() {
  return (
    username.length === 64 ||
    (username ?? "").includes(".near") ||
    (username ?? "").includes(".tg")
  );
}

// check if user already exists
useEffect(() => {
  if (selectedMember) {
    return;
  }
  const timeoutId = setTimeout(() => {
    setMemberAlreadyExists(
      daoPolicy?.roles?.some((role) => role?.kind?.Group?.includes(username))
    );
  }, 500);

  return () => clearTimeout(timeoutId);
}, [username]);

return (
  <Container className="d-flex flex-column gap-2">
    <TransactionLoader
      showInProgress={isTxnCreated}
      showError={showErrorToast}
      toggleToast={() => setShowErrorToast(false)}
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
          instance,
        }}
      />
      {!selectedMember && memberAlreadyExists && (
        <div className="text-red text-sm">This user is already a member.</div>
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
        {(selectedMember || memberAlreadyExists) && (
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
            disabled: isTxnCreated,
          }}
        />

        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: { root: "theme-btn" },
            disabled:
              !username || !roles?.length || isTxnCreated || !isAccountValid(),
            label: "Submit",
            onClick: onSubmitClick,
            loading: isTxnCreated,
          }}
        />
      </div>
    </div>
  </Container>
);
