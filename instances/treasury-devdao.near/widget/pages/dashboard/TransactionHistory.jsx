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

if (!instance || !treasuryDaoID) {
  return <></>;
}

const [error, setError] = useState(null);
const [transactionWithBalances, setTransactionWithBalance] = useState(null);
const [page, setPage] = useState(1);
const [showMoreLoading, setShowMoreLoading] = useState(false);
const [hideViewMore, setHideViewMore] = useState(false);

const totalTxnsPerPage = 15;

const loading = (
  <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
);

function sortByDate(items) {
  const groupedItems = items ? [...items] : [];

  // Sort by timestamp in descending order
  const sortedItems = groupedItems.sort((a, b) => {
    const timestampA = parseInt(a.timestamp, 10);
    const timestampB = parseInt(b.timestamp, 10);

    return timestampB - timestampA;
  });

  return sortedItems;
}

// use BOS open API for gateway and paid for web4
const pikespeakKey = isBosGateway()
  ? "${REPL_PIKESPEAK_KEY}"
  : props.pikespeakKey;

if (!pikespeakKey) {
  return <></>;
}

function setAPIError() {
  setShowMoreLoading(false);
  setError("Failed to fetch the transaction history, please try again later.");
}

useEffect(() => {
  if (!showMoreLoading) {
    const options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": pikespeakKey,
      },
    };
    const promises = [];
    setShowMoreLoading(true);
    promises.push(
      asyncFetch(
        `https://api.pikespeak.ai/account/near-transfer/${treasuryDaoID}?limit=${totalTxnsPerPage}&offset=${
          totalTxnsPerPage * (page - 1)
        }`,
        options
      )
    );

    promises.push(
      asyncFetch(
        `https://api.pikespeak.ai/account/ft-transfer/${treasuryDaoID}?limit=${totalTxnsPerPage}&offset=${
          totalTxnsPerPage * (page - 1)
        }`,
        options
      )
    );

    if (lockupContract) {
      promises.push(
        asyncFetch(
          `https://api.pikespeak.ai/account/near-transfer/${lockupContract}?limit=${totalTxnsPerPage}&offset=${
            totalTxnsPerPage * (page - 1)
          }`,
          options
        )
      );

      promises.push(
        asyncFetch(
          `https://api.pikespeak.ai/account/ft-transfer/${lockupContract}?limit=${totalTxnsPerPage}&offset=${
            totalTxnsPerPage * (page - 1)
          }`,
          options
        )
      );
    }
    Promise.all(promises).then((i) => {
      if (!i[0].ok || !i[1].ok) {
        setAPIError();
        return;
      }
      if (lockupContract && (!i[2].ok || !i[3].ok)) {
        setAPIError();
        return;
      }
      const nearResp = lockupContract
        ? i[0]?.body.concat(i[2]?.body)
        : i[0]?.body;
      const ftResp = lockupContract
        ? i[1]?.body.concat(i[3]?.body)
        : i[1]?.body;
      if (Array.isArray(nearResp) && Array.isArray(ftResp)) {
        if (
          nearResp.length < totalTxnsPerPage &&
          ftResp.length < totalTxnsPerPage
        ) {
          setHideViewMore(true);
        }
        setError(null);
        setTransactionWithBalance(sortByDate(nearResp.concat(ftResp)));
        setShowMoreLoading(false);
      }
    });
  }
}, [page]);

function convertBalanceToReadableFormat(amount) {
  return Big(amount ?? "0").toFixed(4);
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
  return Number(amount)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
  <div className="d-flex flex-column justify-content-center align-items-center w-100 h-100">
    {loading}
  </div>
);

const Container = styled.div`
  .text-muted {
    color: rgba(226, 230, 236, 1);
  }

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

  .fw-semi-bold {
    font-weight: 500;
  }

  .txn-link {
    color: black !important;
    text-decoration: underline;

    &:hover {
      color: black !important;
    }
  }

  .cursor-pointer {
    cursor: pointer;
  }

  table {
    overflow-x: auto;
  }

  .show-more-btn {
    border: 1px solid rgba(226, 230, 236, 1) !important;
    text-align: center;
    background: none;
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
                <tr className="text-muted px-3 py-3 border-top">
                  <td>Type</td>
                  <td>From</td>
                  <td>To</td>
                  <td className="text-center">Transaction</td>
                  <td className="text-right">Amount</td>
                </tr>
              </thead>
              <tbody style={{ overflowX: "auto" }}>
                {transactionWithBalances.map((txn, groupIndex) => {
                  let balanceDiff = "";
                  let token = "NEAR";
                  let icon = "${REPL_NEAR_TOKEN_ICON}";
                  const isDeposit = txn.deposit;
                  const isStaked =
                    isDeposit && txn.receiver.includes("poolv1.near");

                  const isReceived = txn.receiver === treasuryDaoID;
                  if (txn.contract) {
                    const contractMetadata = Near.view(
                      txn.contract,
                      "ft_metadata"
                    );
                    token = contractMetadata?.symbol;
                    icon = contractMetadata?.icon;

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
                      <td className="fw-semi-bold" style={{ minWidth: 200 }}>
                        <Widget
                          src="${REPL_MOB}/widget/Profile.OverlayTrigger"
                          props={{
                            accountId: txn.sender,
                            children: (
                              <div className="text-truncate">
                                {formatAccount(txn.sender)}
                              </div>
                            ),
                          }}
                        />
                      </td>
                      <td className="fw-semi-bold" style={{ minWidth: 200 }}>
                        <Widget
                          src="${REPL_MOB}/widget/Profile.OverlayTrigger"
                          props={{
                            accountId: txn.sender,
                            children: (
                              <div className="text-truncate">
                                {formatAccount(txn.receiver)}
                              </div>
                            ),
                          }}
                        />
                      </td>
                      <td className="text-center" style={{ minWidth: 200 }}>
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
                            <img src={icon} height={20} width={20} />
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
              <div className="w-100 h-100 m-2">
                {!hideViewMore && (
                  <button
                    onClick={() => {
                      setPage(page + 1);
                    }}
                    className="show-more-btn py-3 w-100 fw-semi-bold rounded-3"
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
