const { formFields, setFormFields } = props;

const [alertMsg, setAlertMsg] = useState(null);

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
        postfix: ".near",
        onChange: (v) =>
          setFormFields({
            ...formFields,
            accountName: v,
          }),
      }}
    />

    {alertMsg && (
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Info`}
        props={{
          type: "alert",
          text: alertMsg,
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
          !alertMsg && formFields.accountName ? "" : "disabled"
        }`}
        href={`/${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app?page=create-treasury&step=2`}
      >
        Next
      </Link>
    </div>
  </>
);
