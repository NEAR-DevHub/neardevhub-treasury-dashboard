const { isNearSocial } = VM.require(
  "${REPL_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  isNearSocial: false,
};

const showCanvas = props.showCanvas;
const onClose = props.onClose;
const title = props.title;
const children = props.children;

const Container = styled.div`
  opacity: 1 !important;
  .offcanvas.offcanvas-end {
    width: 30% !important;
  }

  @media screen and (max-width: 1200px) {
    .offcanvas.offcanvas-end {
      width: 50% !important;
    }
  }

  @media screen and (max-width: 768px) {
    .offcanvas.offcanvas-end {
      width: 100% !important;
    }
  }

  .offcanvas {
    border-top-left-radius: 1rem !important;
    border-bottom-left-radius: 1rem !important;
  }
`;

return (
  <Container>
    <div
      className={`offcanvas offcanvas-end ${showCanvas ? "show" : ""}`}
      tabIndex="-1"
      data-bs-scroll="false"
      data-bs-backdrop="true"
    >
      <div
        className="p-3 d-flex gap-2 align-items-center pb-0"
        style={{ marginTop: isNearSocial ? "4rem" : "" }}
      >
        <button
          onClick={onClose}
          type="button"
          class="btn-close"
          style={{ opacity: 1 }}
        ></button>
        <h5 class="offcanvas-title" id="offcanvasLabel">
          {title}
        </h5>
      </div>

      <div class="offcanvas-body d-flex flex-column gap-4">{children}</div>
    </div>
  </Container>
);
