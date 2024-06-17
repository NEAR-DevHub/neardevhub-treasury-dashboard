const { Portfolio } = VM.require(
  "${REPL_TREASURY}/widget/pages.dashboard.Portfolio"
) || { Portfolio: () => <></> };

const treasuryAccount = "${REPL_TREASURY}";
const { TransactionHistory } = VM.require(
  "${REPL_TREASURY}/widget/pages.dashboard.TransactionHistory"
) || { TransactionHistory: () => <></> };

const Wrapper = styled.div`
  min-height: 80vh;
  .flex-1 {
    flex: 1;
  }

  .text-sm {
    font-size: 12px;
  }

  .page-header {
    color: var(--page-header-color);
  }

  .border-bottom {
    border-bottom: 1px solid rgba(226, 230, 236, 1);
  }
`;

return (
  <Wrapper className="d-flex flex-column gap-3">
    <div className="d-flex justify-content-between gap-2 mt-3">
      <h4 className="page-header mb-0 fw-bold">Dashboard</h4>
      <div className="bg-black text-white p-1 px-2 h6 rounded-2">
        {treasuryAccount}
      </div>
    </div>
    <div className="d-flex gap-2">
      <Portfolio />
      <TransactionHistory />
    </div>
  </Wrapper>
);
