let { step, ...propsToSend } = props;

const widgetBasePath = `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.create-treasury`;

const [formFields, setFormFields] = useState({});
const [showCongratsModal, setShowCongratsModal] = useState(false);
const [currentPage, setCurrentPage] = useState(step);

const existingDrafts =
  JSON.parse(
    Storage.get(
      "TREASURY_DRAFTS",
      `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app`
    ) ?? "[]"
  ) ?? [];

const currentDraft =
  JSON.parse(
    Storage.get(
      "CURRENT_DRAFT",
      `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app`
    ) ?? "{}"
  ) ?? null;

function removeDeployedTreasuryFromDraft(accountName) {
  const updated = existingDrafts.filter((d) => d.accountName !== accountName);
  props.updateTreasuryDrafts(updated);
}

useEffect(() => {
  if (formFields.accountName) {
    const updatedDrafts = [
      ...existingDrafts.filter((d) => d.accountName !== formFields.accountName),
      formFields,
    ];
    props.updateTreasuryDrafts(updatedDrafts);
  }
  if (step !== currentPage) {
    setCurrentPage(step);
  }
}, [step]);

useEffect(() => {
  if (Object.keys(currentDraft ?? {}).length > 0) {
    setFormFields(currentDraft);
    props.updateCurrentDraft(null);
  }
}, [currentDraft]);

const STEPS = [
  <Widget
    loading=""
    src={`${widgetBasePath}.ConfirmWalletStep`}
    props={{ setCurrentPage }}
  />,
  <Widget
    loading=""
    src={`${widgetBasePath}.CreateAppAccountStep`}
    props={{ formFields, setFormFields, setCurrentPage }}
  />,
  <Widget
    loading=""
    src={`${widgetBasePath}.AddMembersStep`}
    props={{ formFields, setFormFields, setCurrentPage }}
  />,
  <Widget
    loading=""
    src={`${widgetBasePath}.SummaryStep`}
    props={{
      formFields,
      showCongratsModal: () => {
        Storage.set("TreasuryAccountName", formFields.accountName);
        removeDeployedTreasuryFromDraft(formFields.accountName);
        setShowCongratsModal(true);
      },
      setCurrentPage,
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
    <div className="position-relative d-flex flex-row align-items-center w-100 mt-3 pb-4">
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
          Near.asyncView(`${treasuryName}.near`, "web4_get", {
            request: { path: "/" },
          }).then((web4) => {
            if (web4) {
              Storage.set("TreasuryAccountName", treasuryName);
              removeDeployedTreasuryFromDraft(treasuryName);
              setShowCongratsModal(true);
            }
          });
        }
      }
    });
  }
}, [props.transactionHashes]);

return (
  <div>
    {showCongratsModal ? (
      <Widget
        loading=""
        src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.treasury.MyTreasuries"
        props={{
          ...propsToSend,
          showCongratsModal: showCongratsModal,
          formFields,
        }}
      />
    ) : (
      <Wrapper title={context.accountId ? "Treasury Creation" : "Sign In"}>
        {context.accountId ? (
          <div>
            <Widget
              loading=""
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.create-treasury.Stepper`}
              props={{
                steps: STEPS,
                activeStep: currentPage ?? 0,
              }}
            />
          </div>
        ) : (
          <Widget
            loading=""
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Login`}
          />
        )}
      </Wrapper>
    )}
  </div>
);
