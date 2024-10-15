const instance = props.instance;
if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const selectedMember = props.selectedMember;
const availableRoles = props.availableRoles ?? [];
const onCloseCanvas = props.onCloseCanvas ?? (() => {});

const [username, setUsername] = useState(null);
const [roles, setRoles] = useState([]);
const [isTxnCreated, setTxnCreated] = useState(false);
const [lastProposalId, setLastProposalId] = useState(null);
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [showCancelModal, setShowCancelModal] = useState(false);

const daoPolicy = Near.view(treasuryDaoID, "get_policy", {});
const deposit = daoPolicy?.proposal_bond || 100000000000000000000000;

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

function refreshData() {
  Storage.set("REFRESH_MEMBERS_TABLE_DATA", Math.random());
}

function getProposalData(id) {
  return Near.asyncView(treasuryDaoID, "get_proposal", { id: id - 1 }).then(
    (result) => result
  );
}

// close canvas after proposal is submitted and approved
useEffect(() => {
  if (isTxnCreated) {
    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (lastProposalId !== id) {
          getProposalData(id).then((res) => {
            if (res.status === "Approved") {
              onCloseCanvas();
              refreshData();
              setTxnCreated(false);
            } else {
              setTimeout(() => checkForNewProposal(id), 1000);
            }
          });
        } else {
          setTimeout(() => checkForNewProposal(), 1000);
        }
      });
    };
    checkForNewProposal();
  }
}, [isTxnCreated]);

function updateDaoPolicy(rolesMap) {
  const updatedPolicy = { ...daoPolicy };
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
        }
      }
      // If the role is NOT in the rolesMap but the username is in the group, remove the username
      else if (Array.isArray(group) && group.includes(username)) {
        console.log("Removing", username, "from", role.name);
        group = group.filter((i) => i !== username);
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

  return updatedPolicy;
}

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

function onSubmitClick() {
  const updatedPolicy = updateDaoPolicy(
    new Map(roles.map((role) => [role.title, role.value]))
  );
  console.log(updatedPolicy, roles);
  // setTxnCreated(true);
  // Near.call([
  //   {
  //     contractName: treasuryDaoID,
  //     methodName: "add_proposal",
  //     args: {
  //       proposal: {
  //         description: "Change policy",
  //         kind: {
  //           ChangePolicy: {
  //             policy: updatedPolicy,
  //           },
  //         },
  //       },
  //     },
  //     gas: 200000000000000,
  //   },
  //   getApproveTxn(),
  // ]);
}

function cleanInputs() {
  setUsername("");
  setRoles([]);
}

const Container = styled.div`
  font-size: 14px;
  .text-grey {
    color: #b9b9b9 !important;
  }

  .text-grey a {
    color: inherit !important;
  }

  label {
    font-weight: 600;
    margin-bottom: 3px;
    font-size: 15px;
  }
`;

function isAccountValid() {
  return (
    username.length === 64 ||
    (username ?? "").includes(".near") ||
    (username ?? "").includes(".tg")
  );
}

return (
  <Container className="d-flex flex-column gap-2">
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
        src="${REPL_DEVHUB}/widget/devhub.entity.proposal.AccountInput"
        props={{
          maxWidth: "100%",
          value: username,
          placeholder: "treasury.near",
          onUpdate: setUsername,
        }}
      />
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
        {selectedMember && (
          <Widget
            src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
            props={{
              classNames: {
                root: "btn-outline shadow-none border-0 text-delete",
              },
              label: (
                <span className="d-flex gap-1 align-items-center">
                  <i class="bi bi-trash3 h4 mb-0"></i>
                  Delete
                </span>
              ),
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
              root: "btn-outline shadow-none border-0",
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
