const { formFields, setFormFields, setCurrentPage } = props;

const { nearAccountValidation } = VM.require(
  "${REPL_DEVDAO_ACCOUNT}/widget/lib.common"
) || {
  nearAccountValidation: () => ({ isValid: true, error: null }),
};

const [alertMsg, setAlertMsg] = useState({});
const [isValidating, setIsValidating] = useState(false);

// Check if form is valid for submission
const isFormValid = !(alertMsg?.[".near"] || alertMsg?.[".sputnik-dao.near"]);

const checkAccountAvailability = async (accountId, postfix) => {
  if (!accountId || accountId.length === 0) return;
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
        account_id: `${accountId}${postfix}`,
      },
    }),
  })
    .then((resp) => {
      if (!resp) {
        return;
      }

      const err = resp.body?.error?.cause;
      let errMsg = null;

      if (!err) errMsg = `Account name already exists`;
      else if (err.name !== "UNKNOWN_ACCOUNT")
        errMsg = err?.info?.error_message;

      const newAlertMsg = alertMsg ?? {};
      newAlertMsg[postfix] = errMsg;
      setAlertMsg(newAlertMsg);
      return !errMsg;
    })
    .catch(() => {
      return false;
    });
};

const validateInput = () => {
  setAlertMsg({ ".near": null });

  const validation = nearAccountValidation(
    formFields.accountName,
    "Name",
    true
  );
  if (!validation.isValid) {
    setAlertMsg({ ".near": validation.error });
    return Promise.resolve(false);
  }

  // Check account availability
  return Promise.all([
    checkAccountAvailability(formFields.accountName, ".near"),
    checkAccountAvailability(formFields.accountName, ".sputnik-dao.near"),
  ])
    .then((isValid) => {
      return isValid.every((isValid) => isValid);
    })
    .catch(() => {
      return false;
    });
};

const handleContinue = () => {
  setIsValidating(true);
  validateInput().then((isValid) => {
    setIsValidating(false);
    if (isValid) {
      setCurrentPage(2);
    }
  });
};

const handleInputChange = (v) => {
  setFormFields({
    ...formFields,
    accountName: v,
  });

  setAlertMsg({});
};

const AccountDisplay = ({ label, prefix, tooltipInfo, noBorder }) => {
  return (
    <div className="d-flex flex-column">
      <div className={!noBorder && "border-bottom"}>
        <div className="py-2 d-flex gap-2 align-items-center justify-content-between flex-wrap px-3">
          <div className="h6 mb-0">
            {label}
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="tooltip">{tooltipInfo}</Tooltip>}
            >
              <i className="mx-1 bi bi-info-circle text-secondary" />
            </OverlayTrigger>
          </div>
          <span className="h6 mb-0 align-items-center">
            <span className="text-primary">{formFields.accountName}</span>
            <span style={{ marginLeft: "-5px" }}>{prefix}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

return (
  <>
    <div>
      <h3>Create Treasury Accounts</h3>
      <p>
        Enter a name for your treasury. This will be used for both the
        application's URL and your treasury's Sputnik DAO account.
      </p>
    </div>

    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Info`}
      props={{
        type: "info",
        text: (
          <span>
            We currently only support creating new SputnikDAO accounts. To
            import an existing account,{" "}
            <a
              rel="noopener noreferrer"
              href="https://support.neartreasury.com/"
              target="_blank"
            >
              contact our team
            </a>
            .
          </span>
        ),
      }}
    />

    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.NewAccountInput`}
      props={{
        id: "treasury-account",
        label: "Treasury Name",
        defaultValue: formFields.accountName,
        onChange: handleInputChange,
        placeholder: "my-treasury",
      }}
    />

    <div className="d-flex flex-column gap-1 border border-1 rounded-3">
      <AccountDisplay
        label={"NEAR"}
        prefix=".near"
        tooltipInfo="This NEAR account name will be used for the application's URL and other management purposes, not the actual account where the funds will be held."
      />
      <AccountDisplay
        label={"Sputnik DAO"}
        prefix=".sputnik-dao.near"
        tooltipInfo="This is the name of your treasury's account on the Sputnik DAO platform, where your funds will be held."
        noBorder
      />
    </div>

    {(alertMsg?.[".near"] || alertMsg?.[".sputnik-dao.near"]) && (
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Info`}
        props={{
          type: "alert",
          text: alertMsg[".near"] || alertMsg[".sputnik-dao.near"],
        }}
      />
    )}

    <div className="d-flex gap-2">
      <Widget
        src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
        props={{
          classNames: {
            root: "btn w-100 shadow-none no-transparent",
          },
          label: "Back",
          onClick: () => {
            setCurrentPage(0);
          },
        }}
      />
      <Widget
        src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
        props={{
          classNames: {
            root: `btn btn-primary w-100`,
          },
          disabled: !isFormValid || isValidating,
          label: "Continue",
          onClick: handleContinue,
          loading: isValidating,
        }}
      />
    </div>
  </>
);
