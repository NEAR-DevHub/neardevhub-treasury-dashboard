const treasuryAccount = "${REPL_TREASURY}";
const TransactionHistory = () => {
  const transactions = fetch(
    `https://api3.nearblocks.io/v1/account/${treasuryAccount}/activities?per_page=25`
  );
  const loading = (
    <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
  );

  return (
    <div className="card card-body flex-1">
      <div className="h5">Transaction History</div>
      <div className="">
        {transactions === null ? (
          <div className="d-flex justify-content-center align-items-center w-100 h-100">
            {loading}
          </div>
        ) : (
          <div></div>
        )}
      </div>
    </div>
  );
};

return { TransactionHistory };
