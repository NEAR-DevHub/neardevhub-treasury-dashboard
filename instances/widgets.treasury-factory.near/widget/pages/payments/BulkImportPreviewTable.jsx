const { Modal, ModalContent, ModalHeader, ModalFooter } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal"
);
const instance = props.instance;
const closePreviewTable = props.closePreviewTable;
const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const { encodeToMarkdown, toBase64 } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);
const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };

if (!Modal) return <></>;

const proposals = props.proposals || [];
const [proposalList, setProposalList] = useState([]);
const [selectedMap, setSelectedMap] = useState({});
const [isTxnCreated, setTxnCreated] = useState(false);
const [isCreatingRequest, setIsCreatingRequest] = useState(false);
const [showCancelModal, setShowCancelModal] = useState(false);
const [daoPolicy, setDaoPolicy] = useState(null);
const [lastProposalId, setLastProposalId] = useState(null);

useEffect(() => {
  const initialMap = {};
  proposals.forEach((_, idx) => {
    initialMap[idx] = true;
  });
  setProposalList(proposals);
  setSelectedMap(initialMap);
}, [proposals]);

useEffect(() => {
  Near.asyncView(treasuryDaoID, "get_last_proposal_id").then(setLastProposalId);
  Near.asyncView(treasuryDaoID, "get_policy").then(setDaoPolicy);
}, []);

function getLastProposalId() {
  return Near.asyncView(treasuryDaoID, "get_last_proposal_id");
}

function refreshData() {
  const count = Object.values(selectedMap).filter((v) => v === true).length;
  props.setToastStatus(`BulkProposalAdded: ${count}`);
  Storage.set("REFRESH_TABLE_DATA", Math.random());
}

useEffect(() => {
  if (isTxnCreated) {
    let checkTxnTimeout = null;

    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (typeof lastProposalId === "number" && lastProposalId !== id) {
          closePreviewTable();
          clearTimeout(checkTxnTimeout);
          refreshData();
        } else {
          checkTxnTimeout = setTimeout(() => checkForNewProposal(), 1000);
        }
      });
    };
    checkForNewProposal();

    return () => clearTimeout(checkTxnTimeout);
  }
}, [isTxnCreated, lastProposalId]);

const handleToggleRow = (idx) => {
  setSelectedMap((prev) => ({
    ...prev,
    [idx]: !prev[idx],
  }));
};

const handleToggleAll = () => {
  const allSelected = Object.values(selectedMap).every((v) => v);
  const newMap = {};
  Object.keys(selectedMap).forEach((key) => {
    newMap[key] = !allSelected;
  });
  setSelectedMap(newMap);
};

function isReceiverRegistered(tokenId, receiver) {
  return Near.asyncView(tokenId, "storage_balance_of", {
    account_id: receiver,
  });
}

function createPaymentTx() {
  const gas = 270000000000000;
  const deposit = daoPolicy?.proposal_bond || 0;
  const isNEAR = (token) => token.toLowerCase() === "near";
  const selected = proposalList.filter((_, idx) => selectedMap[idx]);

  if (selected.length === 0) return;

  const storageDepositOps = [];
  const proposalOps = [];

  const proposalPromises = selected.map((proposal) => {
    const Title = proposal.Title;
    const Summary = proposal.Summary;
    const Notes = proposal.Notes;
    const Recipient = proposal.Recipient;
    const tokenId = proposal["Requested Token"];
    const amount = proposal["Funding Ask"];
    const isTokenNEAR = isNEAR(tokenId);
    const receiver = Recipient;
    const parsedAmount = Big(amount).toFixed();

    const description = {
      title: Title,
      summary: Summary,
      notes: Notes,
    };

    const addProposalCall = {
      contractName: treasuryDaoID,
      methodName: "add_proposal",
      args: {
        proposal: {
          description: encodeToMarkdown(description),
          kind: {
            Transfer: {
              token_id: isTokenNEAR ? "" : tokenId,
              receiver_id: receiver,
              amount: parsedAmount,
            },
          },
        },
      },
      gas,
      deposit,
    };

    if (isTokenNEAR) {
      // No storage deposit needed
      proposalOps.push(addProposalCall);
      return Promise.resolve();
    }

    // Check registration and add storage deposit if needed
    return isReceiverRegistered(tokenId, receiver).then((isRegistered) => {
      if (!isRegistered) {
        const depositInYocto = Big(0.125).mul(Big(10).pow(24)).toFixed();
        storageDepositOps.push({
          contractName: tokenId,
          methodName: "storage_deposit",
          args: {
            account_id: receiver,
            registration_only: true,
          },
          gas,
          deposit: depositInYocto,
        });
      }
      proposalOps.push(addProposalCall);
    });
  });

  Promise.all(proposalPromises)
    .then(() => {
      const calls = storageDepositOps.concat(proposalOps);
      setIsCreatingRequest(false);
      setTxnCreated(true);
      Near.call(calls);
    })
    .catch((err) => {
      console.error("Failed to process proposals:", err);
    });
}

const columns = [
  "Title",
  "Summary",
  "Recipient",
  "Requested Token",
  "Funding Ask",
  "Notes",
];

return (
  <Modal width="70%">
    <TransactionLoader
      showInProgress={isTxnCreated}
      cancelTxn={() => setTxnCreated(false)}
    />
    <Widget
      loading=""
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
      props={{
        instance,
        heading: "Are you sure?",
        content:
          "If you close now, all current progress, including any pasted data, will be discarded.",
        confirmLabel: "Yes",
        isOpen: showCancelModal,
        onCancelClick: () => setShowCancelModal(false),
        onConfirmClick: () => {
          setShowCancelModal(false);
          closePreviewTable();
        },
        "data-testid": "preview-cancel",
      }}
    />
    <ModalHeader>
      <div className="d-flex align-items-center justify-content-between mx-3">
        Import Payment Requests
        <i
          className="bi bi-x-lg h4 mb-0 cursor-pointer"
          onClick={() => setShowCancelModal(true)}
        ></i>
      </div>
    </ModalHeader>
    <ModalContent>
      <div style={{ overflowX: "auto" }}>
        <table className="table" data-testid="preview-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  role="switch"
                  className="form-check-input"
                  checked={
                    proposalList.length > 0 &&
                    Object.values(selectedMap).every((v) => v)
                  }
                  onChange={handleToggleAll}
                  aria-label="Select all proposals"
                />
              </th>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {proposalList.map((item, index) => (
              <tr key={index}>
                <td>
                  <input
                    type="checkbox"
                    role="switch"
                    className="form-check-input"
                    checked={!!selectedMap[index]}
                    onChange={() => handleToggleRow(index)}
                    aria-label={`Select row ${index + 1}`}
                  />
                </td>
                <td>{item["Title"]}</td>
                <td>{item["Summary"]}</td>
                <td className="fw-semi-bold">
                  <Widget
                    loading=""
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
                    props={{
                      accountId: item["Recipient"],
                      showKYC,
                      instance,
                    }}
                  />
                </td>
                <td className="text-center">
                  <Widget
                    loading=""
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenIcon`}
                    props={{ address: item["Requested Token"] }}
                  />
                </td>
                <td className="text-right">
                  <Widget
                    loading=""
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmount`}
                    props={{
                      instance,
                      amountWithoutDecimals: item["Funding Ask"],
                      address: item["Requested Token"],
                    }}
                  />
                </td>
                <td className="text-sm text-left">{item["Notes"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModalContent>
    <ModalFooter>
      <Widget
        loading=""
        src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
        props={{
          classNames: {
            root: "btn btn-outline-secondary shadow-none no-transparent",
          },
          label: "Cancel",
          onClick: () => setShowCancelModal(true),
        }}
      />
      <Widget
        loading=""
        src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
        props={{
          classNames: { root: "theme-btn" },
          label: `Submit ${
            proposalList.filter((_, idx) => selectedMap[idx]).length
          } Requests`,
          disabled:
            !proposalList.filter((_, idx) => selectedMap[idx]).length ||
            isCreatingRequest ||
            isTxnCreated,
          loading: isCreatingRequest || isTxnCreated,
          onClick: () => {
            setIsCreatingRequest(true);
            createPaymentTx();
          },
        }}
      />
    </ModalFooter>
  </Modal>
);
