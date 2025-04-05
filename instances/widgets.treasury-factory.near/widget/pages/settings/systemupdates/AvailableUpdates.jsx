const { instance } = props;
const { Modal, ModalContent, ModalHeader, ModalFooter } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal"
);

const [showUpdateModal, setShowUpdateModal] = useState(false);
const [web4isUpToDate, setWeb4isUpToDate] = useState(true);

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

async function checkForWeb4ContractUpdate() {
  asyncFetch(`${REPL_RPC_URL}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "dontcare",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: "treasury-factory.near",
        method_name: "get_web4_contract_bytes",
        args_base64: "",
      },
    }),
  }).then((response) => {
    const web4_contract_bytes_from_treasury_factory = new Uint8Array(
      response.body.result.result
    );
    asyncFetch(`${REPL_RPC_URL}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "dontcare",
        method: "query",
        params: {
          request_type: "view_code",
          finality: "final",
          account_id: instance,
        },
      }),
    }).then((response) => {
      const instance_contract_code_base64 = response.body.result.code_base64;
      const instance_contract_bytes = Buffer.from(
        instance_contract_code_base64,
        "base64"
      );
      if (
        web4_contract_bytes_from_treasury_factory.length ===
          instance_contract_bytes.length &&
        web4_contract_bytes_from_treasury_factory.every(
          (byte, index) => byte === instance_contract_bytes[index]
        )
      ) {
        console.log("The contract bytes are identical.");
        setWeb4isUpToDate(true);
      } else {
        console.log("The contract bytes are different.");
        setWeb4isUpToDate(false);
      }
    });
  });
}

checkForWeb4ContractUpdate();

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
          {web4isUpToDate ? (
            <></>
          ) : (
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
          )}
        </tbody>
      </table>
    </div>
    {updateModal()}
  </Container>
);
