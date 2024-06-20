const { Portfolio } = VM.require(
  "${REPL_TREASURY}/widget/pages.dashboard.Portfolio"
) || { Portfolio: () => <></> };

const treasuryAccount = "${REPL_TREASURY}";

const Wrapper = styled.div`
  min-height: 80vh;
  .flex-1 {
    flex: 1;
  }

  .text-sm {
    font-size: 12px;
  }

  .border-bottom {
    border-bottom: 1px solid var(--border-color);
  }

  .text-align-end {
    text-align: end !important;
  }

  .pointer {
    cursor: pointer;
  }

  .dashboard-item > div {
    min-width: 400px;
  }
`;

const balanceResp = fetch(
  `https://api3.nearblocks.io/v1/account/${treasuryAccount}`
);
const balance = Big(balanceResp?.body?.account?.[0]?.amount ?? "0")
  .div(Big(10).pow(24))
  .toFixed(4);

return (
  <Wrapper className="d-flex flex-column gap-3">
    <div className="d-flex justify-content-between gap-2 mt-3">
      <h4 className="page-header">Dashboard</h4>
      <div className="bg-black text-white p-1 px-2 h6 rounded-2">
        {treasuryAccount}
      </div>
    </div>
    <div className="card card-body" style={{ maxHeight: "100px" }}>
      <div className="h5">Total Balance</div>
      <div className="fw-bold h3">${balance} USD</div>
    </div>
    <div className="d-flex gap-2 flex-wrap dashboard-item">
      <Portfolio />
      <Widget
        src={"${REPL_TREASURY}/widget/pages.dashboard.TransactionHistory"}
      />
    </div>
  </Wrapper>
);
