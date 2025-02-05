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
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.create-treasury.SummaryStep`
);

if (alreadyCreatedATreasury) {
  step = 3;
}
const [formFields, setFormFields] = useState({});

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
  <Widget src={`${widgetBasePath}.SummaryStep`} props={{ formFields }} />,
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
  width: 560px;
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
    <div className="d-flex w-100 align-items-center mb-2">
      <div style={{ width: "150px" }}>
        <a
          className="btn btn-outline-plain w-100"
          href={`https://neartreasury.com/`}
        >
          Cancel Creation
        </a>
      </div>
      <div
        style={{ width: "calc(100% - 300px)" }}
        className="d-flex justify-content-center"
      >
        <h3 className="my-3 d-flex justify-content-center">{title}</h3>
      </div>
    </div>

    <PageWrapper className="d-flex flex-column justify-content-center">
      {children}
    </PageWrapper>
  </div>
);

const SocalSignIn = () => (
  <Container className="shadow-sm gap-3">
    <div className="d-flex flex-column gap-2">
      <h4>
        Click the 'Sign In' button at the top-right corner of the Near.Social
        gateway
      </h4>
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Info`}
        props={{
          type: "info",
          text: "This is the account that will be used to pay for creating the treasury and managing it at first",
        }}
      />
    </div>
    <img
      style={{ width: "252px", height: "183px" }}
      src={STATIC_IMAGES.social}
    />
  </Container>
);

const NearSignIn = () => (
  <Container className="shadow-sm gap-3">
    <div className="d-flex flex-column gap-2">
      <h4>
        Click the 'Sign-up or Login' button located at the bottom-left corner of
        the Near gateway
      </h4>
    </div>
    <img style={{ width: "252px", height: "183px" }} src={STATIC_IMAGES.near} />
  </Container>
);

const loading = (
  <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
);

return (
  <Wrapper title={context.accountId ? "Treasury Creation" : "Sign In"}>
    {context.accountId ? (
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.create-treasury.Stepper`}
        props={{
          steps: STEPS,
          activeStep: step ?? 0,
        }}
      />
    ) : (
      <>{isNearSocial ? <SocalSignIn /> : <NearSignIn />}</>
    )}
  </Wrapper>
);
