const instance = props.instance;
if (!instance) {
  return <></>;
}

const Container = styled.div`
  font-size: 14px;

  .card-title {
    font-size: 18px;
    font-weight: 600;
    padding-block: 5px;
    border-bottom: 1px solid var(--border-color);
  }

  label {
    color: var(--text-secondary);
    font-size: 12px;
  }
`;

return (
  <Container>
    <div className="card rounded-4 py-3" style={{ maxWidth: "50rem" }}>
      <div className="card-title px-3 pb-3">System upgrade</div>
      <div className="px-3 py-1 d-flex flex-column gap-2">
        <div className="fw-semi-bold text-lg">Web4 updates</div>
      </div>
    </div>
  </Container>
);
