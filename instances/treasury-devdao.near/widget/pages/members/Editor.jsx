const treasuryDaoID = "${REPL_TREASURY}";

const selectedMember = props.selectedMember;
const availableRoles = props.availableRoles ?? [];
const onCloseCanvas = props.onCloseCanvas ?? (() => {});

const [username, setUsername] = useState(null);
const [roles, setRoles] = useState([]);
const [isTxnCreated, setTxnCreated] = useState(false);
const [lastProposalId, setLastProposalId] = useState(null);
const [showDeleteModal, setShowDeleteModal] = useState(false);

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

// close canvas after proposal is submitted
useEffect(() => {
  if (isTxnCreated) {
    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (lastProposalId !== id) {
          onCloseCanvas();
          refreshData();
          setTxnCreated(false);
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
      if (rolesMap.has(role.name)) {
        let group = role.kind.Group;
        if (!group.includes(username)) {
          group.push(username);
        }
        // Modify the role's group
        return {
          ...role,
          kind: {
            Group: group,
          },
        };
      }
      return role;
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

  setTxnCreated(true);
  Near.call([
    {
      contractName: treasuryDaoID,
      methodName: "add_proposal",
      args: {
        proposal: {
          description: "Change policy",
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
    getApproveTxn(),
  ]);
}

function cleanInputs() {
  setUsername(null);
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

return (
  <Container className="d-flex flex-column gap-2">
    <div className="d-flex flex-column gap-1">
      <label>Username</label>
      <Widget
        src="${REPL_DEVHUB}/widget/devhub.entity.proposal.AccountInput"
        props={{
          value: username,
          placeholder: "treasury.near",
          onUpdate: setUsername,
        }}
      />
    </div>
    <div className="d-flex flex-column gap-1">
      <label>Permissions</label>
      <Widget
        src={`${REPL_DEPLOYMENT_ACCOUNT}/widget/pages.members.RoleSelector`}
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
          src={`${REPL_DEPLOYMENT_ACCOUNT}/widget/pages.members.DeleteModalConfirmation`}
          props={{
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
              cleanInputs();
              onCloseCanvas();
            },
            disabled: isTxnCreated,
          }}
        />

        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: { root: "theme-btn" },
            disabled: !username || !roles?.length || isTxnCreated,
            label: "Submit",
            onClick: onSubmitClick,
            loading: isTxnCreated,
          }}
        />
      </div>
    </div>
  </Container>
);
