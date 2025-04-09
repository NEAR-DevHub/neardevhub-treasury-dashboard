const status = props.status;
const Container = styled.div`
  .reject {
    background-color: rgba(220, 102, 102, 0.16);
    color: var(--other-red);
  }

  .approve {
    background-color: rgba(0, 202, 134, 0.16);
    color: var(--other-green);
  }
`;

return (
  <Container className="w-100">
    {status === "Approve" ? (
      <div className="d-flex gap-2 align-items-center approve rounded-2 p-2 bold w-100">
        <i class="bi bi-check2"></i>
        You Approved
      </div>
    ) : (
      <div className="d-flex gap-2 align-items-center reject rounded-2 p-2 bold w-100">
        <i class="bi bi-x"></i>
        You {status === "Reject" ? "Rejected" : "Deleted"}
      </div>
    )}
  </Container>
);
