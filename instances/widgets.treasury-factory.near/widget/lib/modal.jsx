const ModalDiv = styled.div`
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
  padding: 16px;
  z-index: 999;
  overflow-y: auto;
  max-height: 85%;
  margin-top: 5%;
  width: ${(props) => props.width || "35%"};
  min-width: 400px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media screen and (max-width: 768px) {
    margin: 2rem;
    width: 100%;
  }
`;

const ModalHeaderDiv = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
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
  overflow-y: auto;
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

const ModalHeader = ({ children }) => (
  <ModalHeaderDiv>
    <h5 className="mb-0 w-100">{children}</h5>
  </ModalHeaderDiv>
);

const ModalFooter = ({ children }) => (
  <div className="modalfooter d-flex gap-3 align-items-center justify-content-end mt-2">
    {children}
  </div>
);

const Modal = ({ children, props, width }) => (
  <ModalDiv>
    <ModalBackdrop />
    <ModalDialog
      width={width}
      className="card"
      style={{ minWidth: props.minWidth }}
    >
      {children}
    </ModalDialog>
  </ModalDiv>
);

return { Modal, ModalContent, ModalHeader, ModalFooter };
