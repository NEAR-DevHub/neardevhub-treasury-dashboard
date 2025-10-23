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
const setVoteProposalId = props.setVoteProposalId ?? (() => {});

const instance = props.instance;
if (!instance || typeof accountToLockup !== "function") {
  return <></>;
}

const { treasuryDaoID, proposalAPIEndpoint } = VM.require(
  `${instance}/widget/config.data`
);

const lockupContract = accountToLockup(treasuryDaoID);

const [contractId, setContractId] = useState("");
const [actions, setActions] = useState([
  {
    methodName: "",
    argumentsJson: "",
    gas: "",
    deposit: "",
  },
]);
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

// Add a new action
const addAction = () => {
  setActions([
    ...actions,
    {
      methodName: "",
      argumentsJson: "",
      gas: "",
      deposit: "",
    },
  ]);
};

// Remove an action
const removeAction = (index) => {
  if (actions.length === 1) return; // Keep at least one action
  setActions(actions.filter((_, i) => i !== index));

  // Clear validation errors for removed action
  const newErrors = { ...validationErrors };
  delete newErrors[`methodName_${index}`];
  delete newErrors[`arguments_${index}`];
  delete newErrors[`gas_${index}`];
  delete newErrors[`deposit_${index}`];
  setValidationErrors(newErrors);
};

// Update an action field
const updateAction = (index, field, value) => {
  const newActions = [...actions];
  newActions[index][field] = value;
  setActions(newActions);
};

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
            setVoteProposalId(lastProposalId);
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

    // Validate each action
    actions.forEach((action, index) => {
      const methodNameError = validateMethodName(action.methodName);
      if (methodNameError) errors[`methodName_${index}`] = methodNameError;

      const argumentsError = validateArguments(action.argumentsJson);
      if (argumentsError) errors[`arguments_${index}`] = argumentsError;

      const gasError = validateGas(action.gas);
      if (gasError) errors[`gas_${index}`] = gasError;

      const depositError = validateDeposit(action.deposit);
      if (depositError) errors[`deposit_${index}`] = depositError;
    });

    setValidationErrors(errors);
    setShowValidationErrors(true);
    return Object.keys(errors).length === 0;
  });
};

const cleanInputs = () => {
  setContractId("");
  setActions([
    {
      methodName: "",
      argumentsJson: "",
      gas: "",
      deposit: "",
    },
  ]);
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

    // Build actions array
    const builtActions = actions.map((action) => {
      // Parse arguments if provided
      let parsedArguments = "";
      if (action.argumentsJson.trim()) {
        const jsonArgs = JSON.parse(action.argumentsJson);
        parsedArguments = Buffer.from(JSON.stringify(jsonArgs)).toString(
          "base64"
        );
      }

      // Convert gas from Tgas to gas units (1 Tgas = 10^12 gas)
      const gasInUnits = Big(action.gas).mul(Big(10).pow(12)).toFixed();

      // Convert deposit from NEAR to yoctoNEAR (1 NEAR = 10^24 yoctoNEAR)
      const depositInYoctoNEAR = Big(action.deposit)
        .mul(Big(10).pow(24))
        .toFixed();

      return {
        method_name: action.methodName,
        args: parsedArguments,
        gas: gasInUnits,
        deposit: depositInYoctoNEAR,
      };
    });

    // Create the proposal data
    const proposalData = {
      description: encodeToMarkdown({
        notes: notes,
      }),
      kind: {
        FunctionCall: {
          receiver_id: contractId,
          actions: builtActions,
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
  font-size: 14px;

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
  .warning-box {
    background: rgba(255, 158, 0, 0.1);
    color: var(--other-warning) !important;
    font-weight: 500;
    font-size: 13px;
    i {
      color: var(--other-warning) !important;
    }

    a {
      color: var(--other-warning) !important;
    }
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
      <div className="warning-box d-flex align-items-start gap-2 px-3 py-2 rounded-2">
        <i className="bi bi-exclamation-triangle h5 mb-0 text-warning"></i>
        <div>
          <strong>Heads Up: Advanced Feature</strong>
          <div className="mt-2">
            You are about to create a custom transaction request that will
            interact directly with a smart contract. This is a powerful action,
            and mistakes can be irreversible.
          </div>
          <div className="mt-2">
            <strong>Please triple-check the following details:</strong>
            <ul className="mb-1">
              <li>Contract ID is correct and trusted.</li>
              <li>Method Name & Arguments are accurate.</li>
              <li>Gas & Deposit amounts are appropriate.</li>
            </ul>
          </div>
          <div className="mt-2">
            <a
              href="https://docs.neartreasury.com/advanced/function_calls"
              target="_blank"
              rel="noopener noreferrer"
              className="text-decoration-underline fw-bold"
            >
              Learn more
            </a>
          </div>
        </div>
      </div>
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
            placeholder="e.g., wrap.near"
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

      {/* Actions */}
      {actions.map((action, index) => (
        <div key={index} className="border rounded-3 overflow-hidden">
          <div
            className="d-flex justify-content-between align-items-center px-3 py-2"
            style={{
              backgroundColor: "var(--bg-system-color)",
            }}
          >
            <h6 className="mb-0">Action {index + 1}</h6>
            {actions.length > 1 && (
              <div
                type="button"
                className="cursor-pointer text-red px-2 py-1"
                onClick={() => removeAction(index)}
                data-testid={`remove-action-${index}`}
              >
                <i className="bi bi-trash"></i>
              </div>
            )}
          </div>

          <div className="px-3 py-2 border-top rounded-top-3">
            {/* Method Name */}
            <div className="mb-3">
              <label className="form-label">
                Method Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control ${
                  showValidationErrors &&
                  validationErrors[`methodName_${index}`]
                    ? "is-invalid"
                    : ""
                }`}
                placeholder="e.g., ft_transfer"
                value={action.methodName}
                onChange={(e) => {
                  updateAction(index, "methodName", e.target.value);
                  clearFieldError(`methodName_${index}`);
                }}
                data-testid={`method-name-input-${index}`}
              />
              {showValidationErrors &&
                validationErrors[`methodName_${index}`] && (
                  <div className="invalid-feedback">
                    {validationErrors[`methodName_${index}`]}
                  </div>
                )}
            </div>

            {/* Arguments (JSON) */}
            <div className="mb-3">
              <label className="form-label">Arguments (Optional)</label>
              <textarea
                className={`form-control ${
                  showValidationErrors && validationErrors[`arguments_${index}`]
                    ? "is-invalid"
                    : ""
                }`}
                rows="4"
                placeholder={`{
  "receiver_id": "alice.near",
  "amount": "10000000000000"
}`}
                value={action.argumentsJson}
                onChange={(e) => {
                  updateAction(index, "argumentsJson", e.target.value);
                  clearFieldError(`arguments_${index}`);
                }}
                data-testid={`arguments-input-${index}`}
              />
              {showValidationErrors &&
                validationErrors[`arguments_${index}`] && (
                  <div className="invalid-feedback">
                    {validationErrors[`arguments_${index}`]}
                  </div>
                )}
              <div className="form-text">
                Enter method arguments as valid JSON.
              </div>
            </div>

            {/* Gas and Deposit Row */}
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">
                  Gas (Tgas) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  className={`form-control ${
                    showValidationErrors && validationErrors[`gas_${index}`]
                      ? "is-invalid"
                      : ""
                  }`}
                  placeholder="e.g., 30"
                  value={action.gas}
                  onChange={(e) => {
                    updateAction(index, "gas", e.target.value);
                    clearFieldError(`gas_${index}`);
                  }}
                  min="0"
                  max="300"
                  step="0.1"
                  data-testid={`gas-input-${index}`}
                />
                {showValidationErrors && validationErrors[`gas_${index}`] && (
                  <div className="invalid-feedback">
                    {validationErrors[`gas_${index}`]}
                  </div>
                )}
                <div className="form-text">Range: 0-300 Tgas</div>
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">
                  Deposit (NEAR) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  className={`form-control ${
                    showValidationErrors && validationErrors[`deposit_${index}`]
                      ? "is-invalid"
                      : ""
                  }`}
                  placeholder="e.g., 0.1"
                  value={action.deposit}
                  onChange={(e) => {
                    updateAction(index, "deposit", e.target.value);
                    clearFieldError(`deposit_${index}`);
                  }}
                  min="0"
                  step="0.000000000000000000000001"
                  data-testid={`deposit-input-${index}`}
                />
                {showValidationErrors &&
                  validationErrors[`deposit_${index}`] && (
                    <div className="invalid-feedback">
                      {validationErrors[`deposit_${index}`]}
                    </div>
                  )}
                <div className="form-text">NEAR to attach</div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Add Action Button */}
      <div>
        <button
          type="button"
          className="btn btn-outline-secondary w-100"
          onClick={addAction}
        >
          <i className="bi bi-plus-lg"></i> Add Another Action
        </button>
      </div>

      {/* Notes */}
      <div>
        <label className="form-label">Notes (Optional)</label>
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
