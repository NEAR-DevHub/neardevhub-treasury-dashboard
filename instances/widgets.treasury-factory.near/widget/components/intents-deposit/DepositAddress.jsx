const { address, warningMessage, instance } = props;

const Container = styled.div`
  .warning-box {
    background: rgba(255, 158, 0, 0.1);
    color: var(--other-warning);
    font-weight: 500;
    font-size: 13px;
  }
`;
return (
  <Container className="d-flex flex-column gap-3">
    <div className="card card-body">
      <div className="d-flex gap-3">
        <Widget
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.QRCodeGenerator"
          props={{
            text: address,
            instance,
          }}
        />
        <div className="w-75 text-truncate d-flex flex-column gap-2">
          <div className="mb-0 h6 text-secondary">Address</div>
          <div className="d-flex pe-1">
            <div className="text-truncate">{address}</div>
            <div style={{ flexShrink: 0 }}>
              <Widget
                src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Copy"
                props={{
                  label: "",
                  clipboardText: address,
                  className: "px-2",
                  showLogo: true,
                  logoDimensions: { height: 20, width: 20 },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div className="px-3 py-2 warning-box rounded-3 d-flex flex-column gap-1">
      <div className="fw-bolder">{warningMessage}</div>
      <div>
        Deposits of other networks will be lost. We recommend starting with a
        small test transaction to ensure everything works correctly before
        sending the full amount.
      </div>
    </div>
  </Container>
);
