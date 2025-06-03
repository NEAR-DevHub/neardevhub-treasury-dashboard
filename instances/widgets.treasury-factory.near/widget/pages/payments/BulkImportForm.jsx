const { getNearBalances } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);
const instance = props.instance;
const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const nearBalances = getNearBalances(treasuryDaoID);

const onCloseCanvas = props.onCloseCanvas ?? (() => {});
const showPreviewTable = props.showPreviewTable;

const [csvData, setCsvData] = useState(null);
const [showCancelModal, setShowCancelModal] = useState(false);
const [isValidating, setIsValidating] = useState(false);
const [dataWarnings, setDataWarnings] = useState(null);
const [dataErrors, setDataErrors] = useState(null);
const [validatedData, setValidatedData] = useState(null);

const isHex64 = (str) => /^[0-9a-fA-F]{64}$/.test(str);

const isValidRecipientFormat = (recipient) =>
  typeof recipient === "string" &&
  (recipient.endsWith(".near") ||
    recipient.endsWith(".aurora") ||
    recipient.endsWith(".tg") ||
    isHex64(recipient));

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

const NEAR_CONTRACT = "near";

function isValidToken(token) {
  if (token?.toLowerCase() === "near") {
    return Promise.resolve({
      contract: NEAR_CONTRACT,
      name: "NEAR",
      symbol: "NEAR",
      decimals: 24,
      icon: null,
      reference: null,
    });
  }

  return asyncFetch(`${REPL_BACKEND_API}/search-ft?query=${token}`).then(
    (resp) => {
      if (resp.ok && resp.body) {
        return resp.body;
      }
      return null;
    }
  );
}

function getAllTreasuryBalances() {
  return asyncFetch(
    `${REPL_BACKEND_API}/ft-tokens/?account_id=${treasuryDaoID}`
  ).then((res) => {
    const balances = {};
    balances[NEAR_CONTRACT] = nearBalances.available;

    if (res.ok && res.body?.fts) {
      res.body.fts.forEach((t) => {
        balances[t.contract] = t.amount || 0;
      });
    }

    return balances;
  });
}

function validateCsvInput() {
  const errors = [];
  const warnings = [];
  const tokensSum = [];
  const validData = [];

  const rows = csvData
    .trim()
    .split("\n")
    .map((line) => line.split("\t"));
  const headers = rows[0];

  const colIdx = (name) =>
    headers.findIndex((h) =>
      h.trim().toLowerCase().startsWith(name.toLowerCase())
    );

  const titleIdx = colIdx("Title");
  const summaryIdx = colIdx("Summary");
  const recipientIdx = colIdx("Recipient");
  const requestedTokenIdx = colIdx("Requested Token");
  const fundingAskIdx = colIdx("Funding Ask");
  const notesIdx = colIdx("Notes");

  if (rows.length - 1 > 10) {
    warnings.push({
      message:
        "You have added more than 10 requests. You can continue, but only the first 10 will be added to list.",
    });
  }

  const rowPromises = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i;

    const processRow = () => {
      const rowErrors = [];
      const data = {};

      const title = row[titleIdx]?.trim();
      if (!title) {
        rowErrors.push("Title is missing.");
      } else {
        data["Title"] = title;
      }

      const summary = row[summaryIdx]?.trim() || "";
      data["Summary"] = summary;

      const recipient = row[recipientIdx]?.trim();
      let recipientCheckPromise;

      if (!recipient) {
        rowErrors.push("Recipient is missing.");
        recipientCheckPromise = Promise.resolve(null); // Skip account exists check
      } else {
        if (!isValidRecipientFormat(recipient)) {
          rowErrors.push("Invalid recipient address.");
          recipientCheckPromise = Promise.resolve(null); // Skip account exists check
        } else {
          recipientCheckPromise = isNearAccountExists(recipient).then(
            (exists) => {
              if (!exists) {
                rowErrors.push("Recipient account does not exist.");
                return null;
              } else {
                data["Recipient"] = recipient;
                return true;
              }
            }
          );
        }
      }

      return recipientCheckPromise.then((recipientValid) => {
        const token = row[requestedTokenIdx]?.trim();

        if (!token) {
          rowErrors.push("Requested Token is missing.");
          return { rowErrors, data };
        }

        return isValidToken(token).then((tokenMeta) => {
          if (!tokenMeta) {
            rowErrors.push("Invalid token address.");
          }

          const amountStr = row[fundingAskIdx]?.trim();
          if (!amountStr) {
            rowErrors.push("Funding Ask is missing.");
          } else {
            const value = parseFloat(amountStr.replace(/,/g, ""));
            if (isNaN(value) || value < 0) {
              rowErrors.push("Funding Ask should be a non-negative number.");
            } else if (tokenMeta) {
              const adjustedAmount = Big(value)
                .times(Big(10).pow(tokenMeta.decimals))
                .toFixed();

              data["Requested Token"] = tokenMeta.contract;
              data["Funding Ask"] = adjustedAmount.toString();

              const existing = tokensSum.find(
                (t) => t.contract === tokenMeta.contract
              );
              if (existing) {
                existing.ask = Big(existing.ask).plus(adjustedAmount).toFixed();
              } else {
                tokensSum.push({
                  contract: tokenMeta.contract,
                  symbol: tokenMeta.symbol || "",
                  ask: adjustedAmount,
                  balance: 0,
                });
              }
            }
          }

          const notes = row[notesIdx]?.trim() || "";
          data["Notes"] = notes;

          return { rowErrors, data };
        });
      });
    };

    rowPromises.push(
      processRow().then(({ rowErrors, data }) => {
        if (rowErrors && rowErrors.length) {
          for (const msg of rowErrors) {
            errors.push({ row: rowNum, message: msg });
          }
        } else if (data) {
          validData.push(data);
        }
      })
    );
  }

  return Promise.all(rowPromises)
    .then(() => {
      if (errors.length === 0 && tokensSum.length > 0) {
        return getAllTreasuryBalances().then((balancesMap) => {
          const results = tokensSum.map(({ contract, ask, symbol }) => {
            const balance = balancesMap[contract] || 0;
            return { contract, symbol, ask, balance };
          });

          const insufficient = results.filter(({ ask, balance }) =>
            Big(balance).lt(ask)
          );

          if (insufficient.length > 0) {
            const tokens = insufficient.map(({ symbol }) => symbol).join(", ");
            warnings.push({
              message: `Treasury balance for ${tokens} is too low for the payments in this batch. Requests can be created but may not be approved until balances are refilled.`,
            });
          }

          return null;
        });
      }

      return null;
    })
    .then(() => {
      if (!errors.length) {
        setValidatedData(validData);
      }
      setDataErrors(errors);
      setDataWarnings(warnings);
      setIsValidating(false);
    })
    .catch((err) => {
      console.error("getAllTreasuryBalances failed:", err);
    });
}

function formatCsvErrors(dataErrors) {
  if (!dataErrors || dataErrors.length === 0) return null;

  const rowErrors = {};
  dataErrors.forEach(({ row, message }) => {
    if (!rowErrors[row]) rowErrors[row] = [];
    rowErrors[row].push(message);
  });

  const errorCount = Object.keys(rowErrors).length;
  const errorLines = Object.entries(rowErrors).map(([row, msgs]) => (
    <div key={row}>{`Row #${row} - ${msgs.join(" ")}`}</div>
  ));

  return (
    <div>
      <div>{`Please correct the following ${errorCount} issue${
        errorCount > 1 ? "s" : ""
      } in your file and paste the data again:`}</div>
      {errorLines}
    </div>
  );
}

const Container = styled.div`
  font-size: 14px;
  .warning-box {
    overflow-x: auto;
    word-break: break-word;
    background: rgba(255, 158, 0, 0.1);
    color: var(--other-warning);
    padding-inline: 0.8rem;
    padding-block: 0.5rem;
    font-weight: 500;
    font-size: 13px;
    i {
      color: var(--other-warning);
    }
  }

  .error-box {
    overflow-x: auto;
    word-break: break-word;
    background-color: rgba(217, 92, 74, 0.1);
    color: var(--other-red);
    padding-inline: 0.8rem;
    padding-block: 0.5rem;
    font-weight: 500;
    font-size: 13px;

    i {
      color: var(--other-red) !important;
    }
  }
`;

return (
  <Container className="d-flex flex-column gap-3">
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
          setShowCancelModal(false);
          onCloseCanvas();
        },
      }}
    />
    <div className="d-flex flex-column gap-2">
      <h6 className="mb-0 fw-bold">Step 1</h6>
      <div>Get the template and fill out the required payment details</div>
      <button
        className="btn btn-outline-secondary d-flex align-items-center gap-2"
        style={{ width: "fit-content" }}
      >
        <i class="bi bi-download h6 mb-0"></i> Get the Template
      </button>
    </div>
    <div className="d-flex flex-column gap-2">
      <h6 className="mb-0 fw-bold">Step 2</h6>
      <div>
        Copy all the filled data from file and paste it into the field below
      </div>
      <div className="text-sm">Paste Data Below</div>
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Input`}
        props={{
          className: "flex-grow-1",
          key: `csv-data`,
          onChange: (e) => {
            setValidatedData(null);
            setCsvData(e.target.value);
          },
          value: csvData ?? "",
          multiline: true,
          inputProps: { rows: 10 },
          skipPaddingGap: true,
        }}
      />
    </div>
    {dataErrors?.length > 0 && (
      <div className="d-flex gap-3 error-box px-3 py-2 rounded-3 align-items-start">
        <i className="bi bi-exclamation-octagon h5 mb-0"></i>
        {formatCsvErrors(dataErrors)}
      </div>
    )}

    {dataWarnings?.length > 0 && (
      <div className="d-flex flex-column gap-2">
        {dataWarnings.map((w, i) => (
          <div
            key={i}
            className="d-flex gap-3 warning-box px-3 py-2 rounded-3 align-items-start mb-2"
          >
            <i className="bi bi-exclamation-triangle h5 mb-0"></i>
            <div>{w.message}</div>
          </div>
        ))}
      </div>
    )}

    <div className="d-flex mt-2 gap-3 justify-content-end">
      <Widget
        src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
        props={{
          classNames: {
            root: "btn btn-outline-secondary shadow-none no-transparent",
          },
          label: "Cancel",
          onClick: () => setShowCancelModal(true),
          disabled: isValidating,
        }}
      />
      {validatedData ? (
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: { root: "theme-btn" },
            label: "Show Preview",
            onClick: () => {
              showPreviewTable(validatedData);
            },
          }}
        />
      ) : (
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: { root: "theme-btn" },
            disabled: !csvData || isValidating,
            loading: isValidating,
            label: "Validate Data",
            onClick: () => {
              setIsValidating(true);
              validateCsvInput();
            },
          }}
        />
      )}
    </div>
  </Container>
);
