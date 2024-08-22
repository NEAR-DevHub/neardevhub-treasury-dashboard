const { readableDate } = VM.require(
  "${REPL_DEVHUB}/widget/core.lib.common"
) || { readableDate: () => {} };

const [transactionWithBalances, setTransactionWithBalance] = useState(null);
const [page, setPage] = useState(1);
// we have two cursors, one to update the iframe on "View More" and other one to store the value of cursor from API response
const [nextCursor, setCursor] = useState(null);
const [staleCursor, setStaleCursor] = useState(null);
const [showMoreLoading, setShowMoreLoading] = useState(false);
const [hideViewMore, setHideViewMore] = useState(false);

const totalTxnsPerPage = 15;
const treasuryAccount = "${REPL_TREASURY}";
const code = `
<!doctype html>
<html>
  <body>
    <script>
      let archiveNodeUrl = 'https://1rpc.io/near';
      const totalTxnsPerPage = ${totalTxnsPerPage};
      const treasuryAccount = "${REPL_TREASURY}";
      const nextCursor = "${nextCursor}";
      async function corsFetch(url) {
        return await fetch(url, {
          mode: "cors",
        }).then((r) => r.json());
      }

      async function getNearTxns() {
        const url = "https://api.nearblocks.io/v1/account/" + treasuryAccount + "/activities?per_page=" + totalTxnsPerPage + (nextCursor ? ("&cursor=" + nextCursor) : "" );
        const txns = await corsFetch(url);
        const parsedTxns = await Promise.all(
          (txns.activities ?? []).map(async (i) => {
            const txnHash = (
              await corsFetch(
                "https://api.nearblocks.io/v1/search?keyword=" + i.receipt_id,
              )
            ).receipts?.[0]?.originated_from_transaction_hash;
            const txnDetails = (
              await corsFetch("https://api.nearblocks.io/v1/txns/" + txnHash)
            ).txns?.[0];
            return {
              ...i,
              transaction_hash: txnHash,
              block_timestamp: txnDetails.block_timestamp,
              actions: txnDetails.actions,
            };
          }),
        );
        return { parsedTxns, cursor: txns.cursor };
      }

      async function getFtTxns() {
        const txns = await corsFetch("https://api.nearblocks.io/v1/account/" + treasuryAccount + "/ft-txns?page=" + ${page} + "&per_page=" + totalTxnsPerPage + "&order=desc");
        return txns.txns;
      }

      async function getAccountBalanceAfterTransaction(account_id, txhash) {
        const executionBlockIds = (
          await getTransactionStatus(txhash, account_id)
        ).receipts_outcome.map((outcome) => outcome.block_hash);
        const executionBlocksAccountStatus = await Promise.all(
          executionBlockIds.map((block_hash) => viewAccount(block_hash, account_id)),
        );
        executionBlocksAccountStatus.sort((a, b) => b.block_height - a.block_height);
        return executionBlocksAccountStatus[0].amount;
      }

      window.onload = async () => {
        const nearTxns = await getNearTxns();
        const ftTxns = await getFtTxns();
        const sortedArray = nearTxns.parsedTxns
          .concat(ftTxns)
          .sort((a, b) => b.block_timestamp - a.block_timestamp);
        window.parent.postMessage(
          {
            handler: "getTransactions",
            response: sortedArray,
            cursor: nearTxns.cursor,
          },
          "*",
        );
      };
    </script>
  </body>
</html>
`;

const loading = (
  <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
);

function groupByDate(items) {
  const groupedItems = transactionWithBalances
    ? [...transactionWithBalances]
    : [];

  items.forEach((item) => {
    const date = new Date(item.block_timestamp / 1000000);
    const dateKey = date.toISOString().split("T")[0]; // Extract the date part (YYYY-MM-DD)

    // Check if data exists for this date
    const existingDataForDate = groupedItems.find(
      (entry) => entry.date === dateKey
    );

    if (existingDataForDate) {
      // Push the item to txns array if existing data found
      existingDataForDate.txns.push(item);
    } else {
      // Create a new entry for this date if no existing data found
      groupedItems.push({
        date: dateKey,
        txns: [item],
      });
    }
  });
  return groupedItems;
}

const iframe = (
  <iframe
    style={{
      display: "none",
    }}
    srcDoc={code}
    message={{}}
    onMessage={(e) => {
      switch (e.handler) {
        case "getTransactions": {
          if (e.response < totalTxnsPerPage) {
            setHideViewMore(true);
          }
          setStaleCursor(e.cursor);
          setTransactionWithBalance(groupByDate(e.response));
          setShowMoreLoading(false);

          break;
        }
      }
    }}
  />
);

function convertBalanceToReadableFormat(amount, decimals) {
  return Big(amount ?? "0")
    .div(Big(10).pow(decimals ?? 24))
    .toFixed(6);
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

function getImage(actionKind) {
  switch (actionKind) {
    case "TRANSFER":
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

function getPrice(tokensNumber) {
  return Big(tokensNumber)
    .mul(Big(nearPrice ?? "1"))
    .toFixed(4);
}

const Container = styled.div`
  a {
    color: rgba(var(--bs-link-color-rgb), var(--bs-link-opacity, 1)) !important;
    &:hover {
      color: rgba(
        var(--bs-link-color-rgb),
        var(--bs-link-opacity, 1)
      ) !important;
    }
  }
`;

function formatString(str) {
  return str
    .split("_")
    .map((word) => {
      return (
        word.charAt(0).toUpperCase() +
        word.charAt(1).toLowerCase() +
        word.slice(2).toLowerCase()
      );
    })
    .join(" ");
}

return (
  <Container className="card card-body flex-1">
    <div className="h5">Transaction History</div>
    {iframe}
    <div className="">
      {transactionWithBalances === null ? (
        loader
      ) : (
        <div className="d-flex flex-column gap-2">
          {Array.isArray(transactionWithBalances) &&
            transactionWithBalances.map(({ date, txns }, groupIndex) => {
              // Check if it's the last group and only has single txn
              if (
                !hideViewMore &&
                groupIndex === transactionWithBalances.length - 1 &&
                txns.length === 1
              ) {
                return null;
              }
              return (
                <div className="d-flex flex-column gap-3" key={date}>
                  <div className={"text-md " + (groupIndex === 0 && " mt-3")}>
                    {formatRelativeDate(date)}
                  </div>
                  <div className="d-flex flex-column gap-2">
                    {txns.map((txn, i) => {
                      let balanceDiff = null;
                      let token = "NEAR";
                      let icon = "${REPL_NEAR_TOKEN_ICON}";
                      if (txn.delta_amount) {
                        const decimals = txn.ft.decimals;
                        token = txn.ft.symbol;
                        icon = txn.ft.icon;
                        balanceDiff = convertBalanceToReadableFormat(
                          txn.delta_amount,
                          decimals
                        );
                      } else {
                        if (i < txns.length - 1) {
                          const prevBalance =
                            txns[i + 1].absolute_nonstaked_amount;
                          balanceDiff = convertBalanceToReadableFormat(
                            txn.absolute_nonstaked_amount - prevBalance
                          );
                        } else if (
                          groupIndex <
                          transactionWithBalances.length - 1
                        ) {
                          const nextGroup =
                            transactionWithBalances[groupIndex + 1];
                          const nextBalance =
                            nextGroup.txns[0].absolute_nonstaked_amount;
                          balanceDiff = convertBalanceToReadableFormat(
                            txn.absolute_nonstaked_amount - nextBalance
                          );
                        }
                      }
                      // Check if it's the last transaction and there's no next group
                      if (
                        !hideViewMore &&
                        i === txns.length - 1 &&
                        groupIndex === transactionWithBalances.length - 1
                      ) {
                        return null;
                      }
                      return (
                        <div
                          className="d-flex gap-2 justify-content-between align-items-center"
                          key={txn.transaction_hash}
                        >
                          <div className="d-flex gap-2 align-items-center">
                            <img src={getImage(txn.cause)} height="50" />
                            <div className="text-sm text-muted">
                              <div className="fw-bold text-md mb-0">
                                {formatString(
                                  txn.actions?.[0]?.method ?? txn.cause
                                )}
                              </div>
                              <div>
                                with{" "}
                                {(txn.involved_account_id ?? "").substring(
                                  0,
                                  30
                                )}
                              </div>
                              <div>
                                {readableDate(txn.block_timestamp / 1000000)}
                              </div>
                              <div className="text-light-grey">
                                <Link
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  to={`https://nearblocks.io/txns/${txn.transaction_hash}`}
                                >
                                  {(txn.transaction_hash ?? "").substring(
                                    0,
                                    20
                                  )}
                                </Link>
                              </div>
                            </div>
                          </div>
                          <div className="text-align-end">
                            <div className="fw-bold d-flex gap-1 align-items-center justify-content-end">
                              {balanceDiff > 0 ? "+" : ""}
                              {balanceDiff}{" "}
                              <img src={icon} height={20} width={20} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          <div>
            {showMoreLoading ? (
              loader
            ) : (
              <div>
                {!hideViewMore && (
                  <div
                    onClick={() => {
                      setCursor(staleCursor);
                      setPage(page + 1);
                      setShowMoreLoading(true);
                    }}
                    className="fw-bold text-md pointer"
                  >
                    View More
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </Container>
);
