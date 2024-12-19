const instance = props.instance;
if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const isOpen = props.isOpen;
const onCancelClick = props.onCancelClick;
const username = props.username;

const daoPolicy = Near.view(treasuryDaoID, "get_policy", {});
const deposit = daoPolicy?.proposal_bond || 100000000000000000000000;
const rolesMap = props.rolesMap;
const onConfirm = props.onConfirmClick ?? (() => {});
const onRefresh = props.onRefresh;

const [isTxnCreated, setTxnCreated] = useState(false);
const [lastProposalId, setLastProposalId] = useState(null);

function getLastProposalId() {
  return Near.asyncView(treasuryDaoID, "get_last_proposal_id").then(
    (result) => result
  );
}

useEffect(() => {
  getLastProposalId().then((i) => setLastProposalId(i));
}, []);

function getProposalData(id) {
  return Near.asyncView(treasuryDaoID, "get_proposal", { id: id - 1 }).then(
    (result) => result
  );
}

// refresh data after proposal is submitted
useEffect(() => {
  if (isTxnCreated && typeof onRefresh === "function") {
    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (lastProposalId !== id) {
          getProposalData(id).then((res) => {
            if (res.status === "Approved") {
              onRefresh();
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
}, [isTxnCreated, onRefresh]);

function updateDaoPolicy() {
  const updatedPolicy = { ...daoPolicy };
  if (Array.isArray(updatedPolicy.roles)) {
    updatedPolicy.roles = updatedPolicy.roles.map((role) => {
      if (rolesMap.has(role.name)) {
        let group = role.kind.Group;

        if (group.includes(username)) {
          group = group.filter((i) => i !== username);
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

function onConfirmClick() {
  setTxnCreated(true);
  const updatedPolicy = updateDaoPolicy();
  Near.call([
    {
      contractName: treasuryDaoID,
      methodName: "add_proposal",
      args: {
        proposal: {
          description: "Remove Member",
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
  onConfirm();
}

const Modal = styled.div`
  display: ${({ hidden }) => (hidden ? "none" : "flex")};
  position: fixed;
  inset: 0;
  justify-content: center;
  align-items: center;
  opacity: 1;
  z-index: 999;

  .black-btn {
    background-color: #000 !important;
    border: none;
    color: white;
    &:active {
      color: white;
    }
  }

  @media screen and (max-width: 768px) {
    h5 {
      font-size: 16px !important;
    }
  }

  .btn {
    font-size: 14px;
  }
`;

const ModalBackdrop = styled.div`
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  opacity: 0.4;
`;

const ModalDialog = styled.div`
  padding: 2em;
  z-index: 999;
  overflow-y: auto;
  max-height: 85%;
  margin-top: 5%;
  width: 35%;

  @media screen and (max-width: 768px) {
    margin: 2rem;
    width: 100%;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 4px;
`;

const ModalFooter = styled.div`
  padding-top: 4px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: items-center;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
  padding: 0.5em;
  border-radius: 6px;
  border: 0;
  color: #344054;

  &:hover {
    background-color: #d3d3d3;
  }
`;

const ModalContent = styled.div`
  flex: 1;
  font-size: 14px;
  margin-top: 4px;
  margin-bottom: 4px;
  overflow-y: auto;
  max-height: 50%;

  @media screen and (max-width: 768px) {
    font-size: 12px !important;
  }
`;

const NoButton = styled.button`
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  box-shadow: none;
`;

return (
  <>
    <Modal hidden={!isOpen}>
      <ModalBackdrop />
      <ModalDialog className="card">
        <ModalHeader>
          <h5 className="mb-0">Are you sure?</h5>
        </ModalHeader>
        <ModalContent>
          {username} will immediately lose their permissions to this treasury if
          you continue.
        </ModalContent>
        <div className="d-flex gap-2 align-items-center justify-content-end mt-2">
          <Widget
            src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
            props={{
              classNames: { root: "btn-outline shadow-none border-0" },
              label: "Cancel",
              onClick: onCancelClick,
            }}
          />
          <Widget
            src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
            props={{
              classNames: { root: "theme-btn" },
              label: "Remove",
              onClick: onConfirmClick,
            }}
          />
        </div>
      </ModalDialog>
    </Modal>
  </>
);
