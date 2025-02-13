const { NearToken } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };

const { readableDate } = VM.require(
  "${REPL_DEVHUB}/widget/core.lib.common"
) || { readableDate: () => {} };

const { isBosGateway } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

if (!isBosGateway) {
  return <></>;
}

const instance = props.instance;

const { treasuryDaoID, lockupContract } = VM.require(
  `${instance}/widget/config.data`
);
const { TableSkeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
);

if (!instance || !treasuryDaoID || !TableSkeleton) {
  return <></>;
}

const [error, setError] = useState(null);
const [transactionWithBalances, setTransactionWithBalance] = useState([]);
const [page, setPage] = useState(1);
const [showMoreLoading, setShowMoreLoading] = useState(false);
const [hideViewMore, setHideViewMore] = useState(false);

const totalTxnsPerPage = 15;

const loading = (
  <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
);

// use BOS open API for gateway and paid for web4
const pikespeakKey = isBosGateway()
  ? "${REPL_GATEWAY_PIKESPEAK_KEY}"
  : props.pikespeakKey ?? "${REPL_INDIVIDUAL_PIKESPEAK_KEY}";

if (!pikespeakKey) {
  return <></>;
}

function setAPIError() {
  setShowMoreLoading(false);
  setError("Failed to fetch the transaction history, please try again later.");
}

useEffect(() => {
  if (!showMoreLoading) {
    setShowMoreLoading(true);
    asyncFetch(
      `${REPL_BACKEND_API}/transactions-transfer-history?treasuryDaoID=${treasuryDaoID}&lockupContract=${lockupContract}&page=${page}`
    ).then((res) => {
      if (!res.body.data) {
        setAPIError();
      } else {
        if (res.body.data.length < page * totalTxnsPerPage) {
          setHideViewMore(true);
        }
        setError(null);
        setTransactionWithBalance(res.body.data);
        setShowMoreLoading(false);
      }
    });
  }
}, [page]);

function convertBalanceToReadableFormat(amount) {
  return Big(amount ?? "0").toFixed(2);
}

function formatRelativeDate(date) {
  const today = new Date();
  const targetDate = new Date(date);

  const todayDateOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const targetDateOnly = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  );

  const diffTime = todayDateOnly - targetDateOnly;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else {
    return targetDate.toISOString().split("T")[0];
  }
}

function formatCurrency(amount) {
  return Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getImage(actionKind) {
  switch (actionKind) {
    case "Staked":
      return "https://ipfs.near.social/ipfs/bafkreica3gyix6i4pqt7nfolcmdpsi2hfgqnj6iwp2jkwixdhm3zl4if6u";
    case "Deposit":
      return "https://ipfs.near.social/ipfs/bafkreiazt7rdkgmz2rpvloo3gjoahgxe6dtgicrgzujarf3rbmwuyk2iby";
    default:
      return "https://ipfs.near.social/ipfs/bafkreigty6dicbjdlbm6ezepuzl63tkdqebyf2rclzbwxfnd2yvkqmllda";
  }
}

const loader = (
  <TableSkeleton numberOfCols={5} numberOfRows={3} numberOfHiddenRows={4} />
);

const Container = styled.div`
  td {
    color: inherit;
    padding: inherit;
    vertical-align: middle;
  }

  .text-center {
    text-align: center;
  }

  .text-right {
    text-align: end;
  }

  .text-left {
    text-align: left;
  }

  .txn-link {
    color: var(--text-color) !important;
    text-decoration: underline;

    &:hover {
      color: inherit !important;
    }
  }

  table {
    overflow-x: auto;
  }

  .account-cell {
    min-width: 180px;
    max-width: 180px;
  }
`;

function formatAccount(text) {
  return text.length > 30 ? text.substring(0, 15) + "..." : text;
}

return (
  <Container className="card flex-1 w-100">
    <div className="h5 fw-bold p-3">Transaction History</div>
    <div className="">
      {error ? (
        <div class="alert alert-danger mb-2 mx-3" role="alert">
          {error}
        </div>
      ) : transactionWithBalances === null ? (
        <div className="mb-3"> {loader}</div>
      ) : (
        <div className="d-flex flex-column gap-2 overflow-auto">
          {Array.isArray(transactionWithBalances) && (
            <table className="table">
              <thead>
                <tr className="text-secondary px-3 py-3 border-top">
                  <td>Type</td>
                  <td className="account-cell">From</td>
                  <td className="account-cell">To</td>
                  <td className="text-right">Transaction</td>
                  <td className="text-right">Amount</td>
                </tr>
              </thead>
              <tbody style={{ overflowX: "auto" }}>
                {transactionWithBalances.map((txn, groupIndex) => {
                  let balanceDiff = "";
                  let token = "NEAR";
                  let iconSrc = "";
                  const isDeposit = txn.deposit;
                  const isStaked =
                    isDeposit && txn.receiver.includes("poolv1.near");

                  const isReceived =
                    txn.receiver === treasuryDaoID || lockupContract;
                  if (txn.contract) {
                    const contractMetadata = Near.view(
                      txn.contract,
                      "ft_metadata"
                    );
                    token = contractMetadata?.symbol;
                    iconSrc = contractMetadata?.icon;

                    balanceDiff = convertBalanceToReadableFormat(txn.amount);
                  } else {
                    balanceDiff = convertBalanceToReadableFormat(txn.amount);
                  }
                  const txnType = isStaked
                    ? "Staked"
                    : isDeposit
                    ? "Deposit"
                    : "Transfer";
                  const txnLink = `https://nearblocks.io/txns/${txn.transaction_id}`;
                  return (
                    <tr key={txn.transaction_id} className="px-3 py-3">
                      <td style={{ minWidth: 250 }}>
                        <div className="d-flex gap-2 align-items-center">
                          <img src={getImage(txnType)} height="40" />
                          <div className="text-sm">
                            <div className="fw-semi-bold text-md mb-0">
                              {txnType}
                            </div>
                            <div>{readableDate(txn.timestamp / 1000000)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="fw-semi-bold account-cell">
                        <Widget
                          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
                          props={{
                            accountId: txn.sender,
                            showKYC: false,
                            instance,
                            displayImage: false,
                            displayName: false,
                            width: 150,
                          }}
                        />
                      </td>
                      <td className="fw-semi-bold account-cell">
                        <Widget
                          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
                          props={{
                            accountId: txn.receiver,
                            showKYC: false,
                            instance,
                            displayImage: false,
                            displayName: false,
                            width: 150,
                          }}
                        />
                      </td>
                      <td className="text-right" style={{ minWidth: 100 }}>
                        <div className="d-flex gap-2 align-items-center fw-semi-bold justify-content-center">
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            href={txnLink}
                            className="txn-link"
                          >
                            {txn.transaction_id?.substring(0, 4)}...
                            {txn.transaction_id?.substring(
                              txn.transaction_id.length - 4
                            )}
                          </a>
                          <i
                            class="bi bi-copy h5 mb-0 cursor-pointer"
                            onClick={() => clipboard.writeText(txnLink)}
                          ></i>
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            href={txnLink}
                            className="txn-link"
                          >
                            <i class="bi bi-box-arrow-up-right h5 mb-0"></i>
                          </a>
                        </div>
                      </td>
                      <td>
                        <div
                          className="text-align-end"
                          style={{ minWidth: "130px" }}
                        >
                          <div className="fw-bold d-flex gap-1 align-items-center justify-content-end">
                            {isReceived ? "+" : "-"}
                            {formatCurrency(balanceDiff)}{" "}
                            {iconSrc ? (
                              <img src={iconSrc} height={20} width={20} />
                            ) : (
                              <NearToken width={20} height={20} />
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div>
            {showMoreLoading ? (
              loader
            ) : (
              <div className="w-100 h-100 mb-3">
                {!hideViewMore && (
                  <button
                    onClick={() => {
                      setPage(page + 1);
                    }}
                    className="btn btn-outline-secondary w-100"
                  >
                    Show More
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </Container>
);
