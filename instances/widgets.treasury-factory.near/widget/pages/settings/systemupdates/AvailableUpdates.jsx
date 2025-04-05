const { instance } = props;
const { Modal, ModalContent, ModalHeader, ModalFooter } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal"
);

const [showUpdateModal, setShowUpdateModal] = useState(false);

const Container = styled.div`
  font-size: 13px;
  min-height: 60vh;
  display: flex;

  td {
    padding: 0.5rem;
    color: inherit;
    vertical-align: middle;
    background: inherit;
  }

  thead td {
    text-wrap: nowrap;
  }

  table {
    overflow-x: auto;
  }
`;

function applyWeb4ContractUpdate() {
  setShowUpdateModal(false);
  Near.call([
    {
      contractName: instance,
      methodName: "self_upgrade",
      args: {},
      gas: 300_000_000_000_000,
      deposit: 0,
    },
  ]);
}

function cancelUpdate() {
  setShowUpdateModal(false);
}

function updateModal() {
  if (!showUpdateModal) {
    return <></>;
  }
  return (
    <Modal>
      <ModalHeader>
        <i class="bi bi-exclamation-triangle text-warning"></i>
        System update
      </ModalHeader>
      <ModalContent>
        <p>Update the Web4 contract</p>
      </ModalContent>
      <ModalFooter>
        <Widget
          src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
          props={{
            classNames: {
              root: "btn btn-outline-secondary shadow-none no-transparent",
            },
            label: "Cancel",
            onClick: cancelUpdate,
          }}
        />
        <Widget
          src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
          props={{
            classNames: { root: "theme-btn" },
            label: "Yes, proceed",
            onClick: applyWeb4ContractUpdate,
          }}
        />
      </ModalFooter>
    </Modal>
  );
}

return (
  <Container style={{ overflowX: "auto" }}>
    <div className="w-100">
      <table className="table">
        <thead>
          <tr className="text-secondary">
            <td className="px-3">#</td>
            <td>Created Date</td>
            <td>Version</td>
            <td>Type</td>
            <td>Summary</td>
            <td>Voting required</td>
            <td>Actions</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-3">1</td>
            <td>2023-10-01</td>
            <td>1.0</td>
            <td>Web4 Contract</td>
            <td>contract update</td>
            <td>No</td>
            <td>
              <Widget
                src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
                props={{
                  classNames: {
                    root: "btn btn-success shadow-none",
                  },
                  label: "Review",
                  onClick: () => {
                    setShowUpdateModal(true);
                  },
                }}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    {updateModal()}
  </Container>
);
