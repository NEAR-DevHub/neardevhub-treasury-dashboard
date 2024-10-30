const { formFields, setFormFields } = props;

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

    <input
      type="text"
      placeholder="app-account.near"
      value={formFields.accountName}
      onChange={(e) =>
        setFormFields({
          ...formFields,
          accountName: e.target.value,
        })
      }
    />

    <div className="d-flex gap-2">
      <Link
        className="btn text-black btn-outline-plain w-100"
        href={`/${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app?page=create-treasury&step=0`}
      >
        Back
      </Link>
      <Link
        className={`btn btn-primary w-100 ${
          formFields.accountName ? "" : "disabled"
        }`}
        href={
          formFields.accountName
            ? `/${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app?page=create-treasury&step=2`
            : ""
        }
      >
        Next
      </Link>
    </div>
  </>
);
