let { step } = props;

const widgetBasePath = `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.create-treasury`;
const alreadyCreatedATreasury = Storage.get(
  "TreasuryAccountName",
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.treasury.Create`
);

const [formFields, setFormFields] = useState({});
const [showCongratsModal, setShowCongratsModal] = useState(false);

useEffect(() => {
  if (alreadyCreatedATreasury && !showCongratsModal) {
    setShowCongratsModal(true);
  }
}, [alreadyCreatedATreasury]);

const STEPS = [
  <Widget src={`${widgetBasePath}.ConfirmWalletStep`} />,
  <Widget
    src={`${widgetBasePath}.CreateAppAccountStep`}
    props={{ formFields, setFormFields }}
  />,
  <Widget
    src={`${widgetBasePath}.AddMembersStep`}
    props={{ formFields, setFormFields }}
  />,
  <Widget
    src={`${widgetBasePath}.SummaryStep`}
    props={{
      formFields,
      showCongratsModal: () => {
        Storage.set("TreasuryAccountName", formFields.accountName);
        setShowCongratsModal(true);
      },
    }}
  />,
];

const PageWrapper = styled.div`
  max-width: 560px;
  width: 100%;
  font-size: 14px;

  p {
    font-size: 14px;
    line-height: 18px;
    margin-bottom: 0;
  }

  input::placeholder {
    color: #1b1b18;
    opacity: 0.3;
  }

  h3 {
    font-size: 24px;
    font-weight: 600;
  }

  h4 {
    font-size: 18px;
    font-weight: 600;
  }
`;

const Wrapper = ({ title, children }) => (
  <div className="d-flex flex-column align-items-center w-100 mb-4">
    <div className="position-relative d-flex flex-row align-items-center w-100 pt-2 pb-4">
      <div className="position-absolute left-0" style={{ width: "150px" }}>
        <a
          className="btn btn-outline-plain w-100"
          href={`https://neartreasury.com/`}
        >
          Cancel Creation
        </a>
      </div>
      <div className="d-flex flex-row w-100 align-items-center justify-content-md-center justify-content-end">
        <h3 className="mb-0">{title}</h3>
      </div>
    </div>

    <PageWrapper className="d-flex flex-column justify-content-center">
      {children}
    </PageWrapper>
  </div>
);

const loading = (
  <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
);

useEffect(() => {
  if (props.transactionHashes) {
    asyncFetch("${REPL_RPC_URL}", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "dontcare",
        method: "tx",
        params: [props.transactionHashes, context.accountId],
      }),
    }).then((transaction) => {
      if (transaction !== null) {
        const transaction_method_name =
          transaction?.body?.result?.transaction?.actions[0].FunctionCall
            .method_name;
        if (transaction_method_name === "create_instance") {
          const args =
            transaction?.body?.result?.transaction?.actions[0].FunctionCall
              .args;
          const decodedArgs = JSON.parse(atob(args ?? "") ?? "{}");
          const treasuryName = decodedArgs?.name;
          Storage.set("TreasuryAccountName", treasuryName);
          setShowCongratsModal(true);
        }
      }
    });
  }
}, [props.transactionHashes]);

return (
  <div>
    {showCongratsModal ? (
      <PageWrapper style={{ margin: "auto" }}>
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.SuccessPage`}
          props={{
            formFields,
            clearStorage: () => Storage.set("TreasuryAccountName", null),
          }}
        />
      </PageWrapper>
    ) : (
      <Wrapper title={context.accountId ? "Treasury Creation" : "Sign In"}>
        {context.accountId ? (
          <div>
            <Widget
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.create-treasury.Stepper`}
              props={{
                steps: STEPS,
                activeStep: step ?? 0,
              }}
            />
          </div>
        ) : (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Login`}
          />
        )}
      </Wrapper>
    )}
  </div>
);
