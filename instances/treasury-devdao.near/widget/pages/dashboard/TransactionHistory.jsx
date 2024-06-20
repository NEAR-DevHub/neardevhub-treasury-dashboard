const { readableDate } = VM.require(
  "${REPL_DEVHUB}/widget/core.lib.common"
) || { readableDate: () => {} };

const [transactionWithBalances, setTransactionWithBalance] = useState(null);
const [page, setPage] = useState(1);
const [showMoreLoading, setShowMoreLoading] = useState(false);
const [hideViewMore, setHideViewMore] = useState(false);
const totalTxnsPerPage = 20;
const code = `
<!doctype html>
<html>
  <head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/highlight.js/latest/styles/github.min.css">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-rbsA2VBKQhggwzxH7pPCaAqO46MgnOM80zW1RWuH61DGLwZJEdK2Kadq2F9CUG65" crossorigin="anonymous">
</head>
<body>
<script>
let archiveNodeUrl = 'https://archival-rpc.mainnet.near.org';
const totalTxnsPerPage = ${totalTxnsPerPage};
const treasuryAccount = "${REPL_TREASURY}";
 async function getAccountChanges(block_id, account_ids) {
  return (await fetch(archiveNodeUrl, {
      method: 'POST',
      headers: {
          'content-type': 'application/json'
      },
      body: JSON.stringify({
          "jsonrpc": "2.0",
          "id": "dontcare",
          "method": "EXPERIMENTAL_changes",
          "params": {
              "changes_type": "account_changes",
              "account_ids": account_ids,
              "block_id": block_id === 'final' ? undefined : block_id,
              "finality": block_id === 'final' ? block_id : undefined
          }
      }
      )
  }).then(r => r.json())).result;
}

 async function viewAccount(block_id, account_id) {
  return (await fetch(archiveNodeUrl, {
      method: 'POST',
      headers: {
          'content-type': 'application/json'
      },
      body: JSON.stringify({
          "jsonrpc": "2.0",
          "id": "dontcare",
          "method": "query",
          "params": {
              "request_type": "view_account",
              "account_id": account_id,
              "block_id": block_id === 'final' ? undefined : block_id,
              "finality": block_id === 'final' ? block_id : undefined
          }
      }
      )
  }).then(r => r.json())).result;
}

 async function getNearblocksAccountHistory(account_id) {
  const url = "https://api.nearblocks.io/v1/account/" + account_id + "/txns?page=" + ${page} + "&per_page=" + totalTxnsPerPage + "&order=desc";
      try {
          const result = (await fetch(url, {
              mode: 'cors'
          }).then(r => r.json())).txns.map(tx => (
              {
                  "block_hash": tx.included_in_block_hash,
                  "block_timestamp": tx.block_timestamp,
                  "hash": tx.transaction_hash,
                  "signer_id": tx.predecessor_account_id,
                  "receiver_id": tx.receiver_account_id,
                  "action_kind": tx.actions? tx.actions[0].action : null,
                  "args": {
                      "method_name": tx.actions? tx.actions[0].method : null
                  }
              }
          ));
          return result;
      } catch (e) {
          console.error('error', e, 'retry in 30 seconds');
          await new Promise(resolve => setTimeout(() => resolve(), 30_000));
  }
}

async function retry(func, max_retries = 10, pause_millis = 30000) {
  let err;
  for (let n = 0;n<max_retries;n++) {
      try {
          return await func();
      } catch(e) {
          err = e;
          console.error('error', e, 'retrying in ', pause_millis, 'milliseconds');
          setProgressbarValue('indeterminate', "error" +  e +  "retrying in" + (pause_millis / 1000).toFixed(0) + "seconds");
          await new Promise(r => setTimeout(r, pause_millis));
      }
  }
  setProgressbarValue(null);
  console.error('max retries reached');
  throw (err);
}

async function getTransactionsToDate(account, offset_timestamp, transactions = []) {
  let accountHistory = await getNearblocksAccountHistory(account);
  let insertIndex = 0;
  let transactionsFetched = 0;
  while (transactionsFetched < totalTxnsPerPage) {
      for (let n = 0; n < accountHistory.length; n++) {
          const historyLine = accountHistory[n];
              const existingTransaction = transactions.find(t => t.hash == historyLine.hash);
              if (!existingTransaction) {
                  historyLine.balance = await retry(() => getAccountBalanceAfterTransaction(account, historyLine.hash));
                  transactions.splice(insertIndex++, 0, historyLine);
                  offset_timestamp = BigInt(historyLine.block_timestamp) + 1n;
              }
          }
          transactionsFetched++;
  }
  return {txnsWithBalance : transactions, accountHistoryLength: accountHistory?.length};
}

 async function getTransactionStatus(txhash, account_id) {
  return (await fetch(archiveNodeUrl, {
      method: 'POST',
      headers: {
          'content-type': 'application/json'
      },
      body: JSON.stringify({
          "jsonrpc": "2.0",
          "id": "dontcare",
          "method": "tx",
          "params": [txhash, account_id]
      }
      )
  }).then(r => r.json())).result;
}

 async function getAccountBalanceAfterTransaction(account_id, txhash) {
  const executionBlockIds = (await getTransactionStatus(txhash, account_id)).receipts_outcome.map(outcome => outcome.block_hash);
  const executionBlocksAccountStatus = await Promise.all(executionBlockIds.map(block_hash => viewAccount(block_hash, account_id)));
  executionBlocksAccountStatus.sort((a, b) => b.block_height - a.block_height);
  return executionBlocksAccountStatus[0].amount;
}

window.onload = async () => {
  const response = await getTransactionsToDate(treasuryAccount);
  window.parent.postMessage({ handler: "getTransactionsToDate", response }, "*");
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
        case "getTransactionsToDate":
          if (e.response.accountHistoryLength < totalTxnsPerPage) {
            setHideViewMore(true);
          }
          setTransactionWithBalance(groupByDate(e.response.txnsWithBalance));
          setShowMoreLoading(false);
          break;
      }
    }}
  />
);

function convertBalanceToReadableFormat(amount) {
  return Big(amount ?? "0")
    .div(Big(10).pow(24))
    .toFixed(4);
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
    return targetDate.toLocaleDateString(); // Customize format as needed
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
  <div className="d-flex justify-content-center align-items-center w-100 h-100">
    {loading}
  </div>
);
return (
  <div className="card card-body flex-1">
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
                      const balance = convertBalanceToReadableFormat(
                        txn.balance
                      );
                      let balanceDiff = balance;
                      if (i < txns.length - 1) {
                        const prevBalance = txns[i + 1].balance;
                        balanceDiff = convertBalanceToReadableFormat(
                          txn.balance - prevBalance
                        );
                      } else if (
                        groupIndex <
                        transactionWithBalances.length - 1
                      ) {
                        const nextGroup =
                          transactionWithBalances[groupIndex + 1];
                        const nextBalance = nextGroup.txns[0].balance;
                        balanceDiff = convertBalanceToReadableFormat(
                          txn.balance - nextBalance
                        );
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
                          key={txn.hash}
                        >
                          <div className="d-flex gap-2 align-items-center">
                            <img src={getImage(txn.action_kind)} height="50" />
                            <div className="text-sm text-muted">
                              <div className="fw-bold text-md mb-0">
                                {txn.action_kind}
                              </div>
                              <div> with {txn.receiver_id}</div>
                              <div>
                                {readableDate(txn.block_timestamp / 1000000)}
                              </div>
                              <div className="text-light-grey">
                                {(txn.block_hash ?? "").substring(0, 20)}
                              </div>
                            </div>
                          </div>
                          <div className="text-align-end">
                            <div className="fw-bold">
                              {balanceDiff > 0 ? "+" : ""} {balanceDiff} USD
                            </div>
                            <div className="text-light-grey text-md">
                              Total Balance : ${balance}
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
  </div>
);
