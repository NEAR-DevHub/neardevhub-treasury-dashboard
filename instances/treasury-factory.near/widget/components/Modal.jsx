const { onClose, isOpen, heading, content } = props;

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

  .btn {
    font-size: 14px;
  }

  .theme-btn {
    background-color: var(--theme-color) !important;
    color: white;
  }
`;

const ModalBackdrop = styled.div`
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  opacity: 0.4;
`;

const ModalDialog = styled.div`
  padding: 1.5em;
  z-index: 999;
  overflow-y: auto;
  max-height: 85%;
  margin-top: 5%;
  width: 35%;

  @media screen and (max-width: 768px) {
    margin: 2rem;
    width: 100%;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  h5 {
    font-size: 24px;
    font-weight: 600;
    line-height: 29.05px;
    letter-spacing: -0.02em;
    text-align: left;
  }
`;

const ModalContent = styled.div`
  flex: 1;
  font-size: 14px;
  margin-top: 4px;
  margin-bottom: 4px;
  overflow-y: auto;
  max-height: 50%;
  text-align: left !important;
  @media screen and (max-width: 768px) {
    font-size: 12px !important;
  }
`;

return (
  <Modal hidden={!isOpen}>
    <ModalBackdrop />
    <ModalDialog className="card d-flex flex-column gap-2">
      <ModalHeader className="d-flex justify-content-between align-items-center">
        <h5 className="m-0">{heading}</h5>
        {typeof onClose === "function" && (
          <i role="button" className="bi bi-x-lg" onClick={onClose} />
        )}
      </ModalHeader>
      <ModalContent>{content}</ModalContent>
    </ModalDialog>
  </Modal>
);
