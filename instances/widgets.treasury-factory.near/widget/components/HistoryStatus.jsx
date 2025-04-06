const proposalStatus = props.status;
const isPaymentsPage = props.isPaymentsPage;
const Container = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;

  .reject {
    background-color: rgba(217, 92, 74, 0.16);
    color: var(--other-red);
  }

  .approve {
    background-color: rgba(0, 202, 134, 0.16);
    color: var(--other-green);
  }

  .expire {
    background-color: var(--grey-04);
    color: var(--grey-02);
  }

  .failed {
    background-color: rgba(255, 122, 0, 0.16);
    color: var(--other-warning);
  }

  .active {
    background-color: rgba(0, 202, 134, 0.16);
    color: var(--other-green);
  }

  div {
    padding: 6px 8px;
    border-radius: 8px;
    width: fit-content;
  }
`;

return (
  <Container>
    {proposalStatus === "Approved" ? (
      <div className="approve bold">
        {isPaymentsPage ? "Funded" : "Executed"}
      </div>
    ) : proposalStatus === "Rejected" ? (
      <div className="reject bold">Rejected</div>
    ) : proposalStatus === "Failed" ? (
      <div className="failed bold">Failed</div>
    ) : proposalStatus === "Active" ? (
      <div className="active bold">Active</div>
    ) : (
      <div className="expire bold">Expired</div>
    )}
  </Container>
);
