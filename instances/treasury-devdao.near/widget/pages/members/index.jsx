const Wrapper = styled.div`
  min-height: 80vh;

  .text-sm {
    font-size: 12px;
  }

  .border-bottom {
    border-bottom: 1px solid var(--border-color);
  }
`;

return (
  <Wrapper className="d-flex flex-column gap-2 container-md">
    <div className="d-flex justify-content-between gap-2 mt-3">
      <h3 className="page-header fw-bold">Members</h3>
      <button className="primary p-2 rounded-2 h6 fw-bold d-flex align-items-center gap-2">
        <i class="bi bi-plus-circle-fill"></i>New Member
      </button>
    </div>
    <div className="card card-body"></div>
  </Wrapper>
);
