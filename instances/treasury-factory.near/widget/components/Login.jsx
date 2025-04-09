const { isNearSocial } = VM.require(
  "${REPL_DEVDAO_ACCOUNT}/widget/lib.common"
) || {
  isNearSocial: false,
};

const STATIC_IMAGES = {
  social:
    "https://ipfs.near.social/ipfs/bafkreicse7okbzvbsy2s6ykp7vj6sgwbkx4gnbsjlfeeepev3ams6ckbfa",
  near: "https://ipfs.near.social/ipfs/bafkreihfzqpk2t3663foue7bgarjpnpp75pfohr2f7isgm4h6izieqi6ui",
};

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

return <>{isNearSocial ? <SocalSignIn /> : <NearSignIn />}</>;
