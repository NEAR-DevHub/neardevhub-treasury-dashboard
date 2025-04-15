function InfoBlock(props) {
  const { description, type } = props;

  const icon =
    type === "warning"
      ? "bi bi-exclamation-triangle"
      : type === "info"
      ? "bi bi-info-circle"
      : type === "success"
      ? "bi bi-check-circle"
      : type === "danger"
      ? "bi bi-exclamation-triangle"
      : "";

  const Container = styled.div`
    font-weight: 500;
    border-radius: 12px;
    padding: 12px;
    gap: 12px;

    div {
      font-size: 12px;
      line-height: 125%;
    }

    &.info {
      color: var(--other-primary);
      background-color: rgba(0, 64, 255, 0.1);
      a {
        color: var(--other-primary) !important;
        text-decoration: underline;
      }
    }

    &.warning {
      color: var(--other-warning);
      background-color: rgba(255, 158, 0, 0.1);
      a {
        color: var(--other-warning) !important;
        text-decoration: underline;
      }
    }

    &.success {
      color: var(--other-green);
      background-color: rgba(0, 255, 17, 0.1);
      a {
        color: var(--other-green) !important;
        text-decoration: underline;
      }
    }

    &.danger {
      color: var(--other-red);
      background-color: rgba(255, 0, 0, 0.1);
      a {
        color: var(--other-red) !important;
        text-decoration: underline;
      }
    }
  `;

  return (
    <Container className={`d-flex ${type}`}>
      <i className={`${icon} h5 mb-0`}></i>
      <div className="d-flex flex-column justify-content-center">
        {description}
      </div>
    </Container>
  );
}

return { InfoBlock };
