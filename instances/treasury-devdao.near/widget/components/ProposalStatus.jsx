const status = props.status;
const Container = styled.div`
  .reject {
    background-color: rgba(220, 102, 102, 0.16);
    color: #d20000;
  }

  .approve {
    background-color: rgba(0, 202, 134, 0.16);
    color: #089968;
  }
`;

return (
  <Container>
    {status === "Approve" ? (
      <div className="d-flex gap-2 align-items-center approve rounded-2 p-2 bold">
        <i class="bi bi-check2"></i>
        You Approved
      </div>
    ) : (
      <div className="d-flex gap-2 align-items-center reject rounded-2 p-2 bold">
        <i class="bi bi-x"></i>
        You Rejected
      </div>
    )}
  </Container>
);
