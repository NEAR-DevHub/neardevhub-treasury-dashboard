const isOpen = props.isOpen;
const heading = props.heading;
const content = props.content;
const cancelLabel = props.cancelLabel;
const confirmLabel = props.confirmLabel;
const onCancelClick = props.onCancelClick;
const onConfirmClick = props.onConfirmClick;
const wider = props.wider;
const testId = props["data-testid"];

const Modal = styled.div`
  display: ${({ hidden }) => (hidden ? "none" : "flex")};
  position: fixed;
  inset: 0;
  justify-content: center;
  align-items: center;
  opacity: 1;
  z-index: 999;

  .black-btn {
    background-color: #000 !important;
    border: none;
    color: white;
    &:active {
      color: white;
    }
  }

  @media screen and (max-width: 768px) {
    h5 {
      font-size: 16px !important;
    }
  }
`;

const ModalBackdrop = styled.div`
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 1);
  opacity: 0.7;
`;

const ModalDialog = styled.div`
  padding: 24px;
  z-index: 999;
  overflow-y: auto;
  max-height: 85%;
  margin-top: 5%;
  width: ${({ wider }) => (wider ? "800px" : "600px")};
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media screen and (max-width: 768px) {
    margin: 2rem;
    width: 100%;
    min-width: 250px;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const ModalFooter = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: items-center;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
  padding: 0.5em;
  border-radius: 6px;
  border: 0;
  color: #344054;

  &:hover {
    background-color: #d3d3d3;
  }
`;

const ModalContent = styled.div`
  flex: 1;
  font-size: 14px;
  margin-top: 4px;
  margin-bottom: 4px;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: 50%;
  text-align: left !important;
  @media screen and (max-width: 768px) {
    font-size: 12px !important;
  }
`;

const NoButton = styled.button`
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  box-shadow: none;
`;

return (
  <>
    <Modal hidden={!isOpen} data-testid={testId}>
      <ModalBackdrop />
      <ModalDialog className="card" wider={wider}>
        <ModalHeader>
          <h5 className="mb-0">{heading}</h5>
        </ModalHeader>
        <ModalContent>{content}</ModalContent>
        <div className="modalfooter d-flex gap-3 align-items-center justify-content-end mt-2">
          {typeof onCancelClick === "function" && (
            <Widget
              src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
              props={{
                classNames: {
                  root: "btn btn-outline-secondary shadow-none no-transparent",
                },
                label: cancelLabel ?? "Cancel",
                onClick: onCancelClick,
              }}
            />
          )}
          {typeof onConfirmClick === "function" && (
            <Widget
              src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
              props={{
                classNames: { root: "theme-btn" },
                label: confirmLabel ?? "Confirm",
                onClick: onConfirmClick,
              }}
            />
          )}
        </div>
      </ModalDialog>
    </Modal>
  </>
);
