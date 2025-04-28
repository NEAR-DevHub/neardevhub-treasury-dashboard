const { instance } = props;
const [showReviewModalForUpdate, setShowReviewModalForUpdate] = useState(null);
const [web4isUpToDate, setWeb4isUpToDate] = useState(false);
const [widgetIsUpToDate, setWidgetIsUpToDate] = useState(false);

const { Modal, ModalContent, ModalHeader, ModalFooter } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal"
);
const {
  updatesNotApplied,
  finishedUpdates,
  setFinishedUpdates,
  UPDATE_TYPE_WEB4_CONTRACT,
  UPDATE_TYPE_WIDGET,
  UPDATE_TYPE_POLICY,
  UPDATE_TYPE_DAO_CONTRACT,
} = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.system-updates.UpdateNotificationTracker"
) ?? { updatesNotApplied: [], setFinishedUpdates: () => {} };

const { checkIfPolicyIsUpToDate, applyPolicyUpdate } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.system-updates.PolicyUpdate"
) ?? { checkIfPolicyIsUpToDate: () => {} };

checkIfPolicyIsUpToDate(instance);

const { checkIfDAOContractIsUpToDate, applyDAOContractUpdate } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.system-updates.DAOContractUpdate"
) ?? { checkIfDAOContractIsUpToDate: () => {} };

checkIfDAOContractIsUpToDate(instance);

if (web4isUpToDate) {
  updatesNotApplied
    .filter((update) => update.type === UPDATE_TYPE_WEB4_CONTRACT)
    .forEach((update) => (finishedUpdates[update.id] = true));
  setFinishedUpdates(finishedUpdates);
}
if (widgetIsUpToDate) {
  updatesNotApplied
    .filter((update) => update.type === UPDATE_TYPE_WIDGET)
    .forEach((update) => (finishedUpdates[update.id] = true));
  setFinishedUpdates(finishedUpdates);
}

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

async function checkForWidgetUpdate() {
  const BOOTSTRAP_WIDGET_ACCOUNT = "bootstrap.treasury-factory.near";
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
        account_id: "social.near",
        method_name: "get",
        args_base64: btoa(
          JSON.stringify({
            keys: [`${BOOTSTRAP_WIDGET_ACCOUNT}/widget/app`],
          })
        ),
      },
    }),
  }).then((response) => {
    const bootstrap_widget_content = Buffer.from(
      new Uint8Array(response.body.result.result)
    ).toString("utf-8");

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
          account_id: "social.near",
          method_name: "get",
          args_base64: btoa(
            JSON.stringify({
              keys: [`${instance}/widget/app`],
            })
          ),
        },
      }),
    }).then((response) => {
      const instance_widget_content = Buffer.from(
        new Uint8Array(response.body.result.result)
      ).toString("utf-8");
      if (
        instance_widget_content ===
        bootstrap_widget_content.replaceAll(BOOTSTRAP_WIDGET_ACCOUNT, instance)
      ) {
        console.log("The widget content is identical.");
        setWidgetIsUpToDate(true);
      } else {
        console.log("The widget content is different.");
        setWidgetIsUpToDate(false);
      }
    });
  });
}

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

if (
  updatesNotApplied.find((update) => update.type === UPDATE_TYPE_WEB4_CONTRACT)
) {
  checkForWeb4ContractUpdate();
}

if (updatesNotApplied.find((update) => update.type === UPDATE_TYPE_WIDGET)) {
  checkForWidgetUpdate();
}

function applyWeb4ContractUpdate() {
  setShowReviewModalForUpdate(null);
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

function applyWidgetUpdate() {
  setShowReviewModalForUpdate(null);
  Near.call([
    {
      contractName: instance,
      methodName: "update_app_widget",
      args: {},
      gas: 300_000_000_000_000,
    },
  ]);
}

function cancelUpdate() {
  setShowReviewModalForUpdate(null);
}

function updateModal(update) {
  if (!update) {
    return <></>;
  }
  return (
    <Modal>
      <ModalHeader>
        <i class="bi bi-exclamation-triangle text-warning"></i>
        System Update: {update.type}
      </ModalHeader>
      <ModalContent>
        {update.type === UPDATE_TYPE_WEB4_CONTRACT && (
          <p>
            Applying Web4 contract updates will always update your web4 contract
            to the latest version. All pending web4 contract updates will be
            applied.
          </p>
        )}
        <h6>Summary</h6>
        <p>{update.summary}</p>
        {update.details && (
          <>
            <h6>Details</h6>
            <p>{update.details}</p>
          </>
        )}
        <h6>Voting required</h6>
        <p>{update.votingRequired ? "Yes" : "No"}</p>
        <h6>Created Date</h6>
        <p>{update.createdDate}</p>
        <h6>Version</h6>
        <p>{update.version}</p>
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
            onClick:
              update.type === UPDATE_TYPE_WEB4_CONTRACT
                ? applyWeb4ContractUpdate
                : update.type === UPDATE_TYPE_WIDGET
                ? applyWidgetUpdate
                : update.type === UPDATE_TYPE_POLICY
                ? () => {
                    setShowReviewModalForUpdate(null);
                    applyPolicyUpdate(instance, update);
                  }
                : update.type === UPDATE_TYPE_DAO_CONTRACT
                ? () => {
                    setShowReviewModalForUpdate(null);
                    applyDAOContractUpdate(instance, update);
                  }
                : () => {
                    console.log(
                      "No action defined for this update type",
                      update.type
                    );
                  },
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
          {updatesNotApplied.map((update) => (
            <tr key={update.id}>
              <td className="px-3">{update.id}</td>
              <td>{update.createdDate}</td>
              <td>{update.version}</td>
              <td>{update.type}</td>
              <td>{update.summary}</td>
              <td>{update.votingRequired ? "Yes" : "No"}</td>
              <td>
                <Widget
                  src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
                  props={{
                    classNames: {
                      root: "btn btn-success shadow-none",
                    },
                    disabled: update.hasActiveProposal,
                    label: "Review",
                    onClick: () => {
                      setShowReviewModalForUpdate(update);
                    },
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {updateModal(showReviewModalForUpdate)}
  </Container>
);
