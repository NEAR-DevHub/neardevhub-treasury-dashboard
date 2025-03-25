const { isNearSocial } = VM.require(
  "${REPL_DEVDAO_ACCOUNT}/widget/lib.common"
) || {
  isNearSocial: false,
};

let { step } = props;

const STATIC_IMAGES = {
  social:
    "https://ipfs.near.social/ipfs/bafkreicse7okbzvbsy2s6ykp7vj6sgwbkx4gnbsjlfeeepev3ams6ckbfa",
  near: "https://ipfs.near.social/ipfs/bafkreihfzqpk2t3663foue7bgarjpnpp75pfohr2f7isgm4h6izieqi6ui",
};
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

const Container = styled.div`
  display: flex;
  flex-direction: row;
  border-radius: 15px;
  padding: 20px;
  gap: 15px;
  background: white;
  border: 1px solid #e2e6ec;
  justify-content: center;
  align-items: center;
  color: #1b1b18;
`;

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

const SocalSignIn = () => (
  <Container className="d-flex shadow-sm flex-column flex-sm-row gap-3">
    <div className="d-flex flex-1 flex-column gap-2">
      <h4>Click the 'Sign In' button at the top-right corner</h4>
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Info`}
        props={{
          type: "info",
          text: "This account will be used to pay for creating the treasury and managing it at first.",
        }}
      />
    </div>
    <div className="flex-1">
      <img
        style={{ width: "100%", height: "100%" }}
        src={STATIC_IMAGES.social}
      />
    </div>
  </Container>
);

const NearSignIn = () => (
  <Container className="d-flex shadow-sm flex-column flex-sm-row gap-3">
    <div className="d-flex flex-1 flex-column gap-2">
      <h4>
        Click the 'Sign-up or Login' button located at the bottom-left corner of
        the Near gateway
      </h4>
    </div>
    <div className="flex-1">
      <img style={{ width: "100%", height: "100%" }} src={STATIC_IMAGES.near} />
    </div>
  </Container>
);

const loading = (
  <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
);

return (
  <div>
    {showCongratsModal ? (
      <PageWrapper style={{ margin: "auto" }}>
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.SuccessPage`}
          props={{
            formFields,
            clearStorage: Storage.set("TreasuryAccountName", null),
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
          <>{isNearSocial ? <SocalSignIn /> : <NearSignIn />}</>
        )}
      </Wrapper>
    )}
  </div>
);
