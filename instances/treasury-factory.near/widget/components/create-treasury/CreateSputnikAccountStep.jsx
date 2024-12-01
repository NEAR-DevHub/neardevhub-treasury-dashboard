const { formFields, setFormFields } = props;

const LEARN_MORE_LINK = "https://github.com/near-daos/sputnik-dao-contract";

const [alertMsg, setAlertMsg] = useState(null);

if (!formFields.sputnikAccountName)
  setFormFields({
    ...formFields,
    sputnikAccountName: formFields.accountName,
  });

return (
  <>
    <div>
      <h3>Create Sputnik DAO Account</h3>
      <p>
        Enter the name for your treasury's Sputnik DAO account. This is where
        the funds for your treasury will be held.
      </p>
    </div>

    <div className="d-flex flex-column gap-3">
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.NewAccountInput`}
        props={{
          alertMsg,
          setAlertMsg,
          defaultValue: formFields.sputnikAccountName,
          postfix: ".sputnik-dao.near",
          onChange: (v) =>
            setFormFields({
              ...formFields,
              sputnikAccountName: v,
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

      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Info`}
        props={{
          type: "info",
          text: (
            <>
              Sputnik DAO is a decentralized platform within the NEAR ecosystem
              that allows communities to organize, manage governance, and make
              collective decisions on-chain.
              <a className="link-primary" href={LEARN_MORE_LINK}>
                Learn more
              </a>
            </>
          ),
        }}
      />
    </div>

    <div className="d-flex gap-2">
      <Link
        className="btn w-100"
        href={`/${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app?page=create-treasury&step=1`}
      >
        Back
      </Link>
      <Link
        className={`btn btn-primary w-100 ${
          !alertMsg && formFields.sputnikAccountName ? "" : "disabled"
        }`}
        href={`/${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app?page=create-treasury&step=3`}
      >
        Next
      </Link>
    </div>
  </>
);
