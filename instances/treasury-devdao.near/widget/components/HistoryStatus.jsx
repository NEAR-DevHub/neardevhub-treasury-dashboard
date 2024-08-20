const status = props.status;
const Container = styled.div`
  text-align: center;
  .reject {
    background-color: rgba(0, 0, 0, 0.08);
    color: #1b1b18;
  }

  .approve {
    background-color: rgba(0, 202, 134, 0.16);
    color: #089968;
  }

  .expire {
    background-color: rgba(255, 122, 0, 0.16);
    color: #de6a00;
  }
`;

return (
  <Container>
    {status === "Approved" ? (
      <div className="approve rounded-2 p-2 bold">Funded</div>
    ) : status === "Rejected" ? (
      <div className="reject rounded-2 p-2 bold">Rejected</div>
    ) : (
      <div className="expire rounded-2 p-2 bold">Expired</div>
    )}
  </Container>
);