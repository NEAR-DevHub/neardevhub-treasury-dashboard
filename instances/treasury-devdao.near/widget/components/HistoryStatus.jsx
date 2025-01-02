const status = props.status;
const isPaymentsPage = props.isPaymentsPage;
const Container = styled.div`
  text-align: center;
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
    background-color: rgba(239, 56, 38, 0.1);
    color: var(--other-red);
  }
`;

return (
  <Container>
    {status === "Approved" ? (
      <div className="approve rounded-2 p-2 bold">
        {isPaymentsPage ? "Funded" : "Executed"}
      </div>
    ) : status === "Rejected" ? (
      <div className="reject rounded-2 p-2 bold">Rejected</div>
    ) : status === "Failed" ? (
      <div className="failed rounded-2 p-2 bold">Failed</div>
    ) : (
      <div className="expire rounded-2 p-2 bold">Expired</div>
    )}
  </Container>
);
