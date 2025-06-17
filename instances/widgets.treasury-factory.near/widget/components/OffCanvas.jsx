const { isNearSocial } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  isNearSocial: false,
};

const showCanvas = props.showCanvas;
const onClose = props.onClose;
const title = props.title;
const children = props.children;
const disableScroll = props.disableScroll;

const Container = styled.div`
  opacity: 1 !important;

  .offcanvas.offcanvas-end {
    width: 30% !important;
    z-index: 1054; // 1055 is the confirmation modal z-index
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
    overflow: ${disableScroll ? "hidden" : "auto"};
  }

  .offcanvas-body {
    overflow-y: auto;
    flex: 1;
  }
`;

return (
  <Container>
    <div className={`fade ${showCanvas ? "modal-backdrop show" : ""}`} />
    <div
      className={`offcanvas offcanvas-end ${showCanvas ? "show" : ""}`}
      tabIndex="-1"
      data-bs-scroll="false"
      data-bs-backdrop="true"
    >
      <div
        className="p-3 d-flex gap-2 align-items-end pb-0"
        style={{ marginTop: isNearSocial ? "4rem" : "" }}
      >
        <button
          onClick={onClose}
          type="button"
          class="btn-close"
          style={{ opacity: 1, height: 20 }}
        ></button>
        <h5 class="offcanvas-title" id="offcanvasLabel">
          {title}
        </h5>
      </div>

      {showCanvas && (
        <div class="offcanvas-body d-flex flex-column gap-4 h-100 w-100">
          {children}
        </div>
      )}
    </div>
  </Container>
);
