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
    background: var(--theme-color) !important;
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
  padding: 2em;
  z-index: 999;
  overflow-y: auto;
  max-height: 85%;
  margin-top: 5%;
  width: 35%;
  border-radius: 20px;

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
  padding-bottom: 4px;
`;

const ModalFooter = styled.div`
  padding-top: 4px;
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

return { Modal, ModalBackdrop, ModalContent, ModalDialog, ModalHeader };