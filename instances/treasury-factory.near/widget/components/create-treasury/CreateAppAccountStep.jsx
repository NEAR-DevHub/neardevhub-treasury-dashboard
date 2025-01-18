const { formFields, setFormFields } = props;

const [alertMsg, setAlertMsg] = useState(null);

const AccountDisplay = ({ label, prefix, tooltipInfo, noBorder }) => {
  return (
    <div className="d-flex flex-column">
      <div className={!noBorder && "border-bottom"}>
        <div className="py-2 d-flex gap-2 align-items-center justify-content-between px-3">
          <div className="h6 mb-0">
            {label}
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="tooltip">{tooltipInfo}</Tooltip>}
            >
              <i className="mx-1 bi bi-info-circle text-secondary" />
            </OverlayTrigger>
          </div>
          <div className="h6 mb-0 d-flex align-items-center">
            <div>{formFields.accountName}</div>
            <div>{prefix}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

return (
  <>
    <div>
      <h3>Create Application Account</h3>
      <p>
        Enter a name for your treasury application. This name will be used for
        the application's URL and other management purposes, not the actual
        account where the funds will be held.
      </p>
    </div>

    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.NewAccountInput`}
      props={{
        alertMsg,
        setAlertMsg,
        defaultValue: formFields.accountName,
        onChange: (v) =>
          setFormFields({
            ...formFields,
            accountName: v,
          }),
        placeholder: "app-account",
      }}
    />

    <div className="d-flex flex-column gap-1 border border-1 rounded-3">
      <AccountDisplay
        label={"NEAR"}
        prefix=".near"
        tooltipInfo="Treasury account"
      />
      <AccountDisplay
        label={"Sputnik DAO"}
        prefix=".sputnik-dao.near"
        tooltipInfo="The funds for your treasury will be held there"
        noBorder
      />
    </div>

    {(alertMsg[".near"] || alertMsg[".sputnik-dao.near"]) && (
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Info`}
        props={{
          type: "alert",
          text: alertMsg[".near"] || alertMsg[".sputnik-dao.near"],
        }}
      />
    )}

    <div className="d-flex gap-2">
      <Link
        className="btn w-100"
        href={`/${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app?page=create-treasury&step=0`}
      >
        Back
      </Link>
      <Link
        className={`btn btn-primary w-100 ${
          !(alertMsg[".near"] || alertMsg[".sputnik-dao.near"]) &&
          formFields.accountName
            ? ""
            : "disabled"
        }`}
        href={`/${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app?page=create-treasury&step=2`}
      >
        Next
      </Link>
    </div>
  </>
);
