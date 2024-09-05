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
if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const [transactionWithBalances, setTransactionWithBalance] = useState(null);
const [page, setPage] = useState(1);
const [showMoreLoading, setShowMoreLoading] = useState(false);
const [hideViewMore, setHideViewMore] = useState(false);

const totalTxnsPerPage = 15;

const loading = (
  <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
);

function groupByDate(items) {
  const groupedItems = transactionWithBalances
    ? [...transactionWithBalances]
    : [];

  items.forEach((item) => {
    const date = new Date(item.timestamp / 1000000);
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

// use BOS open API for gateway and paid for web4
const pikespeakKey = isBosGateway()
  ? "${REPL_PIKESPEAK_KEY}"
  : props.pikespeakKey;

if (!pikespeakKey) {
  return <></>;
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
    Promise.all(promises).then((i) => {
      const nearResp = i[0]?.body;
      const ftResp = i[1]?.body;
      if (Array.isArray(nearResp) && Array.isArray(ftResp)) {
        if (
          nearResp.length < totalTxnsPerPage &&
          ftResp.length < totalTxnsPerPage
        ) {
          setHideViewMore(true);
        }
        setTransactionWithBalance(groupByDate(nearResp.concat(ftResp)));
        setShowMoreLoading(false);
      }
    });
  }
}, [page]);

function convertBalanceToReadableFormat(amount) {
  return Big(amount ?? "0").toFixed(6);
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
    case true:
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

function formatAccount(text) {
  return text.length > 30 ? text.substring(0, 30) + "..." : text;
}

return (
  <Container className="card card-body flex-1">
    <div className="h5">Transaction History</div>
    <div className="">
      {transactionWithBalances === null ? (
        loader
      ) : (
        <div className="d-flex flex-column gap-2">
          {Array.isArray(transactionWithBalances) &&
            transactionWithBalances.map(({ date, txns }, groupIndex) => {
              return (
                <div className="d-flex flex-column gap-3" key={date}>
                  <div className={"text-md " + (groupIndex === 0 && " mt-3")}>
                    {formatRelativeDate(date)}
                  </div>
                  <div className="d-flex flex-column gap-2">
                    {txns.map((txn, i) => {
                      let balanceDiff = "";
                      let token = "NEAR";
                      let icon = "${REPL_NEAR_TOKEN_ICON}";
                      const isDeposit = txn.deposit;
                      const isReceived = txn.receiver === treasuryDaoID;
                      if (txn.contract) {
                        const contractMetadata = Near.view(
                          txn.contract,
                          "ft_metadata"
                        );
                        token = contractMetadata?.symbol;
                        icon = contractMetadata?.icon;

                        balanceDiff = convertBalanceToReadableFormat(
                          txn.amount
                        );
                      } else {
                        balanceDiff = convertBalanceToReadableFormat(
                          txn.amount
                        );
                      }

                      return (
                        <div
                          className="d-flex gap-2 justify-content-between align-items-center"
                          key={txn.transaction_id}
                        >
                          <div className="d-flex gap-2 align-items-center">
                            <img src={getImage(isDeposit)} height="50" />
                            <div className="text-sm text-muted">
                              <div className="fw-bold text-md mb-0">
                                {isDeposit ? "Deposit" : "Transfer"}
                              </div>
                              <div>
                                {isReceived ? (
                                  <span>
                                    received from {formatAccount(txn.sender)}
                                  </span>
                                ) : (
                                  <span>
                                    transferred to {formatAccount(txn.receiver)}
                                  </span>
                                )}
                              </div>
                              <div>{readableDate(txn.timestamp / 1000000)}</div>
                              <div className="text-light-grey">
                                <Link
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  to={`https://nearblocks.io/txns/${txn.transaction_id}`}
                                >
                                  {(txn.transaction_id ?? "").substring(0, 20)}
                                  ...
                                </Link>
                              </div>
                            </div>
                          </div>
                          <div className="text-align-end">
                            <div className="fw-bold d-flex gap-1 align-items-center justify-content-end">
                              {isReceived ? "+" : "-"}
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
                      setPage(page + 1);
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
