const { formFields, setFormFields } = props;

const LEARN_MORE_LINK = "";

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
      <input
        type="text"
        placeholder="sputnik-dao-account.near"
        value={formFields.sputnikAccountName}
        onChange={(e) =>
          setFormFields({
            ...formFields,
            sputnikAccountName: e.target.value,
          })
        }
      />
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
        className="btn text-black btn-outline-plain w-100"
        href={`/${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app?page=create-treasury&step=1`}
      >
        Back
      </Link>
      <Link
        className={`btn btn-primary w-100 ${
          formFields.sputnikAccountName ? "" : "disabled"
        }`}
        href={
          formFields.sputnikAccountName
            ? `/${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app?page=create-treasury&step=3`
            : ""
        }
      >
        Next
      </Link>
    </div>
  </>
);
