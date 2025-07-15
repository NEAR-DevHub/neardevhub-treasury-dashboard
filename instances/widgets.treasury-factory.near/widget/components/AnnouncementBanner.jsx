const { Modal, ModalContent, ModalHeader, ModalFooter } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal"
);
const data = fetch("${REPL_BACKEND_API}".replace("/api", "") + "/headers");
const currentGatewayOrigin = data?.body?.headers?.origin ?? "";
const instance = props.instance;

const showWeb4Gateway =
  currentGatewayOrigin.includes("near.social") ||
  currentGatewayOrigin.includes("near.org") ||
  currentGatewayOrigin.includes("localhost") ||
  currentGatewayOrigin.includes("127.0.0.1");

const [showModal, setShowModal] = useState(false);

const Container = styled.div`
  background-color: rgba(217, 92, 74, 0.1);
  font-size: 15px;
`;

if (showWeb4Gateway) {
  return (
    <Container>
      <div className="d-flex gap-2 px-3 py-2 rounded-3 align-items-center justify-content-center">
        <i class="bi bi-exclamation-triangle h5 mb-0 error-icon"></i>
        <div>For best experience, use the Web4 Gateway.</div>
        <Link className="text-underline" href={`https://${instance}.page/`}>
          Switch Now
        </Link>

        <i onClick={() => setShowModal(true)} className="bi bi-info-circle"></i>
      </div>
      {showModal && (
        <Modal>
          <ModalHeader>
            <div className="d-flex gap-3 justify-content-between">
              Try Web4 Gateway for a Smoother Experience
              <i
                className="bi bi-x-lg mb-0 cursor-pointer"
                onClick={() => setShowModal(false)}
              ></i>
            </div>
          </ModalHeader>
          <ModalContent>
            The Web4 Gateway provides the fastest and most reliable experience,
            with full support for the latest features, updates, and Ledger
            hardware wallets. NEAR Social is available as a fallback, but may
            not support all functionality. We recommend switching to Web4 to
            stay current and avoid issues.
          </ModalContent>
          <ModalFooter>
            <Link
              className={`btn theme-btn `}
              href={`https://${instance}.page/`}
              onClick={() => {
                setShowModal(false);
              }}
            >
              Switch to Web4
            </Link>
          </ModalFooter>
        </Modal>
      )}
    </Container>
  );
}

return null;
