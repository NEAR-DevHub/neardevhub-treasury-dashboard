const validatorId = props.validatorId;

const data = fetch(
  `${REPL_BACKEND_API}/validator-details?account_id=${validatorId}`
)?.body;

const fee = data?.fees?.numerator ?? 1 / data?.fees?.denominator ?? 100;
const isActive = !data?.is_slashed;

const Container = styled.div`
  .text-green {
    color: #34c759;
  }

  .text-sm {
    font-size: 12px;
  }
`;

return (
  <Container className="d-flex flex-column gap-1 bold">
    <div> {validatorId}</div>
    <div className="d-flex gap-2 align-items-center text-sm">
      <div className="text-secondary">{fee}% Fee</div>
      {isActive && <div className="text-green">Active</div>}
    </div>
  </Container>
);
