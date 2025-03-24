const status = props.status;
const isPaymentsPage = props.isPaymentsPage;
const Container = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;

  .reject {
    background-color: var(--grey-04);
    color: var(--text-color);
  }

  .approve {
    background-color: rgba(0, 202, 134, 0.16);
    color: var(--other-green);
  }

  .expire {
    background-color: rgba(255, 122, 0, 0.16);
    color: var(--other-warning);
  }

  .failed {
    background-color: rgba(255, 122, 0, 0.16);
    color: var(--other-warning);
  }

  div {
    padding: 6px 8px;
    border-radius: 8px;
    width: fit-content;
  }
`;

return (
  <Container>
    {status === "Approved" ? (
      <div className="approve bold">
        {isPaymentsPage ? "Funded" : "Executed"}
      </div>
    ) : status === "Rejected" ? (
      <div className="reject bold">Rejected</div>
    ) : status === "Failed" ? (
      <div className="failed bold">Failed</div>
    ) : (
      <div className="expire bold">Expired</div>
    )}
  </Container>
);
