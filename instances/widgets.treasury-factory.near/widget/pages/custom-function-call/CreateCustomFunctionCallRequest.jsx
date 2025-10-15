const { getLinkUsingCurrentGateway } = VM.require(
  "${REPL_DEVHUB}/widget/core.lib.url"
) || { getLinkUsingCurrentGateway: () => {} };

const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };

const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const {
  encodeToMarkdown,
  LOCKUP_MIN_BALANCE_FOR_STORAGE,
  accountToLockup,
  getIntentsBalances,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common");

const onCloseCanvas = props.onCloseCanvas ?? (() => {});
const setToastStatus = props.setToastStatus ?? (() => {});

const instance = props.instance;
if (!instance || typeof accountToLockup !== "function") {
  return <></>;
}

const { treasuryDaoID, proposalAPIEndpoint } = VM.require(
  `${instance}/widget/config.data`
);

const lockupContract = accountToLockup(treasuryDaoID);

const [contractId, setContractId] = useState("");
const [methodName, setMethodName] = useState("");
const [argumentsJson, setArgumentsJson] = useState("");
const [gas, setGas] = useState("");
const [deposit, setDeposit] = useState("");
const [notes, setNotes] = useState("");
const [isTxnCreated, setTxnCreated] = useState(false);
const [showCancelModal, setShowCancelModal] = useState(false);
const [validationErrors, setValidationErrors] = useState({});
const [showValidationErrors, setShowValidationErrors] = useState(false);
const [lastProposalId, setLastProposalId] = useState(null);
const [daoPolicy, setDaoPolicy] = useState(null);
const [contractIdValidating, setContractIdValidating] = useState(false);

// Get last proposal ID
function getLastProposalId() {
  return Near.asyncView(treasuryDaoID, "get_last_proposal_id").then(
    (result) => result
  );
}

// Helper function to check if string is hex64
function isHex64(str) {
  return /^[0-9a-fA-F]{64}$/.test(str);
}

// Helper function to check if account format is valid
const isValidAccountFormat = (accountId) => {
  if (!accountId || typeof accountId !== "string") {
    return false;
  }

  return (
    accountId.endsWith(".near") ||
    accountId.endsWith(".aurora") ||
    accountId.endsWith(".tg") ||
    isHex64(accountId)
  );
};

// Helper function to check if account exists
function isNearAccountExists(accountId) {
  return asyncFetch(`${REPL_RPC_URL}`, {
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
        request_type: "view_account",
        finality: "final",
        account_id: accountId,
      },
    }),
  }).then((resp) => {
    return !(
      resp.body?.error?.cause.name === "UNKNOWN_ACCOUNT" || resp?.status === 400
    );
  });
}

// Initialize last proposal ID and DAO policy
useEffect(() => {
  getLastProposalId().then((id) => setLastProposalId(id));
  Near.asyncView(treasuryDaoID, "get_policy").then((policy) => {
    setDaoPolicy(policy);
  });
}, []);

function refreshData() {
  Storage.set("REFRESH_TABLE_DATA", Math.random());
}

// Check for new proposal when transaction is created
useEffect(() => {
  if (isTxnCreated) {
    let checkTxnTimeout = null;

    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (typeof lastProposalId === "number" && lastProposalId !== id) {
          setTimeout(() => {
            cleanInputs();
            clearTimeout(checkTxnTimeout);
            setToastStatus("ProposalAdded");
            refreshData();
            setTxnCreated(false);
            onCloseCanvas();
          }, 1000);
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

// Validation functions
const validateContractId = (contractId) => {
  if (!contractId || contractId.trim() === "") {
    return Promise.resolve("Contract ID is required");
  }

  // First check format
  if (!isValidAccountFormat(contractId)) {
    return Promise.resolve(
      "Invalid account format. Must be a .near, .aurora, .tg account or 64-character hex"
    );
  }

  // Then check if account exists
  setContractIdValidating(true);
  return isNearAccountExists(contractId)
    .then((exists) => {
      setContractIdValidating(false);
      if (!exists) {
        return "Account does not exist on NEAR network";
      }
      return null;
    })
    .catch((error) => {
      setContractIdValidating(false);
      return "Failed to verify account existence";
    });
};

const validateMethodName = (methodName) => {
  if (!methodName || methodName.trim() === "") {
    return "Method Name is required";
  }
  // Single word validation (no spaces, special chars except underscore)
  const methodRegex = /^[a-zA-Z0-9_]+$/;
  if (!methodRegex.test(methodName)) {
    return "Method name must be a single word (letters, numbers, underscore only)";
  }
  return null;
};

const validateArguments = (argumentsJson) => {
  if (!argumentsJson || argumentsJson.trim() === "") {
    return null; // Arguments are optional
  }
  try {
    const parsed = JSON.parse(argumentsJson);
    // BOS VM returns null for invalid JSON instead of throwing
    if (parsed === null && argumentsJson.trim() !== "null") {
      return "Invalid JSON format";
    }
    // Check if it's a valid JSON object or array, not just a string
    if (typeof parsed === "string") {
      return "Arguments must be a JSON object or array, not a string";
    }
    return null;
  } catch (error) {
    return "Invalid JSON format";
  }
};

const validateGas = (gas) => {
  if (!gas || gas.trim() === "") {
    return "Gas (Tgas) is required";
  }
  const gasNumber = parseFloat(gas);
  if (isNaN(gasNumber) || gasNumber <= 0) {
    return "Gas must be a positive number";
  }
  if (gasNumber > 300) {
    return "Gas must be between 0 and 300 Tgas";
  }
  return null;
};

const validateDeposit = (deposit) => {
  if (!deposit || deposit.trim() === "") {
    return "Deposit (NEAR) is required";
  }
  const depositNumber = parseFloat(deposit);
  if (isNaN(depositNumber) || depositNumber < 0) {
    return "Deposit must be a non-negative number";
  }
  return null;
};

const validateForm = () => {
  const errors = {};

  return validateContractId(contractId).then((contractIdError) => {
    if (contractIdError) errors.contractId = contractIdError;

    const methodNameError = validateMethodName(methodName);
    if (methodNameError) errors.methodName = methodNameError;

    const argumentsError = validateArguments(argumentsJson);
    if (argumentsError) errors.arguments = argumentsError;

    const gasError = validateGas(gas);
    if (gasError) errors.gas = gasError;

    const depositError = validateDeposit(deposit);
    if (depositError) errors.deposit = depositError;

    setValidationErrors(errors);
    setShowValidationErrors(true);
    return Object.keys(errors).length === 0;
  });
};

const cleanInputs = () => {
  setContractId("");
  setMethodName("");
  setArgumentsJson("");
  setGas("");
  setDeposit("");
  setNotes("");
  setValidationErrors({});
  setShowValidationErrors(false);
};

const clearFieldError = (fieldName) => {
  if (showValidationErrors && validationErrors[fieldName]) {
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }
};

const handleSubmit = () => {
  validateForm().then((isValid) => {
    if (!isValid) {
      return;
    }

    setTxnCreated(true);

    // Parse arguments if provided
    let parsedArguments = "";
    if (argumentsJson.trim()) {
      const jsonArgs = JSON.parse(argumentsJson);
      parsedArguments = Buffer.from(JSON.stringify(jsonArgs)).toString(
        "base64"
      );
    }

    // Convert gas from Tgas to gas units (1 Tgas = 10^12 gas)
    const gasInUnits = Math.floor(parseFloat(gas) * Math.pow(10, 12));

    // Convert deposit from NEAR to yoctoNEAR (1 NEAR = 10^24 yoctoNEAR)
    const depositInYoctoNEAR = Math.floor(
      parseFloat(deposit) * Math.pow(10, 24)
    );

    // Create the proposal data
    const proposalData = {
      description: encodeToMarkdown({
        notes: notes,
      }),
      kind: {
        FunctionCall: {
          receiver_id: contractId,
          actions: [
            {
              method_name: methodName,
              args: parsedArguments,
              gas: Big(gasInUnits).toFixed(),
              deposit: Big(depositInYoctoNEAR).toFixed(),
            },
          ],
        },
      },
    };

    // Get proposal bond from DAO policy
    const proposalBond = daoPolicy?.proposal_bond || 0;

    // Submit the proposal using Near.call
    const calls = [
      {
        contractName: treasuryDaoID,
        methodName: "add_proposal",
        args: {
          proposal: proposalData,
        },
        gas: "300000000000000", // 300 Tgas
        deposit: proposalBond, // Use proposal bond from DAO policy
      },
    ];

    Near.call(calls);
  });
};

const handleCancel = () => {
  const hasChanges =
    contractId || methodName || argumentsJson || gas || deposit || notes;
  if (hasChanges) {
    setShowCancelModal(true);
  } else {
    onCloseCanvas();
  }
};

const Container = styled.div`
  .form-label {
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .form-control.is-invalid {
    border-color: #dc3545;
  }

  .invalid-feedback {
    display: block;
    color: #dc3545;
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }
`;

return (
  <Container>
    <TransactionLoader
      showInProgress={isTxnCreated}
      cancelTxn={() => setTxnCreated(false)}
    />
    <Widget
      loading=""
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

    <div className="d-flex flex-column gap-3">
      {/* Contract ID */}
      <div>
        <label className="form-label">
          Contract ID <span className="text-danger">*</span>
        </label>
        <div className="position-relative">
          <input
            type="text"
            className={`form-control ${
              showValidationErrors && validationErrors.contractId
                ? "is-invalid"
                : ""
            }`}
            placeholder="e.g., example.near"
            value={contractId}
            onChange={(e) => {
              setContractId(e.target.value);
              clearFieldError("contractId");
            }}
            disabled={contractIdValidating}
            data-testid="contract-id-input"
          />
          {contractIdValidating && (
            <div className="position-absolute top-50 end-0 translate-middle-y me-3">
              <div
                className="spinner-border spinner-border-sm text-primary"
                role="status"
              >
                <span className="visually-hidden">Validating...</span>
              </div>
            </div>
          )}
        </div>
        {showValidationErrors && validationErrors.contractId && (
          <div className="invalid-feedback">{validationErrors.contractId}</div>
        )}
      </div>

      {/* Method Name */}
      <div>
        <label className="form-label">
          Method Name <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          className={`form-control ${
            showValidationErrors && validationErrors.methodName
              ? "is-invalid"
              : ""
          }`}
          placeholder="e.g., transfer"
          value={methodName}
          onChange={(e) => {
            setMethodName(e.target.value);
            clearFieldError("methodName");
          }}
          data-testid="method-name-input"
        />
        {showValidationErrors && validationErrors.methodName && (
          <div className="invalid-feedback">{validationErrors.methodName}</div>
        )}
      </div>

      {/* Arguments (JSON) */}
      <div>
        <label className="form-label">Arguments (JSON)</label>
        <textarea
          className={`form-control ${
            showValidationErrors && validationErrors.arguments
              ? "is-invalid"
              : ""
          }`}
          rows="4"
          placeholder='{"receiver_id": "alice.near", "amount": "1000000000000000000000000"}'
          value={argumentsJson}
          onChange={(e) => {
            setArgumentsJson(e.target.value);
            clearFieldError("arguments");
          }}
          data-testid="arguments-input"
        />
        {showValidationErrors && validationErrors.arguments && (
          <div className="invalid-feedback">{validationErrors.arguments}</div>
        )}
        <div className="form-text">
          Optional. Enter method arguments as valid JSON.
        </div>
      </div>

      {/* Gas */}
      <div>
        <label className="form-label">
          Gas (Tgas) <span className="text-danger">*</span>
        </label>
        <input
          type="number"
          className={`form-control ${
            showValidationErrors && validationErrors.gas ? "is-invalid" : ""
          }`}
          placeholder="e.g., 30"
          value={gas}
          onChange={(e) => {
            setGas(e.target.value);
            clearFieldError("gas");
          }}
          min="0"
          max="300"
          step="0.1"
          data-testid="gas-input"
        />
        {showValidationErrors && validationErrors.gas && (
          <div className="invalid-feedback">{validationErrors.gas}</div>
        )}
        <div className="form-text">
          Gas limit in Tgas (1 Tgas = 10^12 gas units). Range: 0-300 Tgas.
        </div>
      </div>

      {/* Deposit */}
      <div>
        <label className="form-label">
          Deposit (NEAR) <span className="text-danger">*</span>
        </label>
        <input
          type="number"
          className={`form-control ${
            showValidationErrors && validationErrors.deposit ? "is-invalid" : ""
          }`}
          placeholder="e.g., 0.1"
          value={deposit}
          onChange={(e) => {
            setDeposit(e.target.value);
            clearFieldError("deposit");
          }}
          min="0"
          step="0.000000000000000000000001"
          data-testid="deposit-input"
        />
        {showValidationErrors && validationErrors.deposit && (
          <div className="invalid-feedback">{validationErrors.deposit}</div>
        )}
        <div className="form-text">
          NEAR tokens to attach to the function call.
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="form-label">Notes (optional)</label>
        <textarea
          className="form-control"
          rows="3"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          data-testid="notes-input"
        />
      </div>

      {/* Action Buttons */}
      <div className="d-flex gap-2 justify-content-end mt-4">
        <button
          type="button"
          className="btn btn-outline-secondary shadow-none no-transparent"
          onClick={handleCancel}
          disabled={isTxnCreated}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn theme-btn"
          onClick={handleSubmit}
          disabled={isTxnCreated}
          data-testid="submit-button"
        >
          {isTxnCreated ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  </Container>
);
