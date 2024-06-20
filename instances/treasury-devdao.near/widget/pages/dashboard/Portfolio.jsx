const treasuryAccount = "${REPL_TREASURY}";

const Item = ({ icon, symbol, tokenPrice, tokensNumber, currentAmount }) => {
  return (
    <div
      className={"py-2 d-flex gap-2 align-items-center justify-content-between"}
    >
      <div className="d-flex gap-2 align-items-center">
        <img src={icon} height={35} />
        <div>
          <div className="h6 mb-0">{symbol}</div>
          <div className="d-flex gap-2 text-sm text-muted">
            <div>{tokensNumber}</div>
            <div>･ ${tokenPrice}</div>
          </div>
        </div>
      </div>
      <div className="fw-bold">${currentAmount}</div>
    </div>
  );
};

const Portfolio = () => {
  // this API doesn't include NEAR token and price
  const tokensAPI = fetch(
    `https://api3.nearblocks.io/v1/account/${treasuryAccount}/inventory`
  );

  function convertBalanceToReadableFormat(amount, decimals) {
    return Big(amount ?? "0")
      .div(Big(10).pow(decimals))
      .toFixed(4);
  }

  function getPrice(tokensNumber, tokenPrice) {
    return Big(tokensNumber).mul(tokenPrice).toFixed(2);
  }

  const nearBalanceResp = fetch(
    `https://api3.nearblocks.io/v1/account/${treasuryAccount}`
  );
  const balance = convertBalanceToReadableFormat(
    nearBalanceResp?.body?.account?.[0]?.amount,
    24
  );
  const nearPrice = useCache(
    () =>
      asyncFetch(`https://api3.nearblocks.io/v1/charts/latest`).then((res) => {
        return res.body.charts?.[0].near_price;
      }),
    "price",
    { subscribe: false }
  );

  const loading = (
    <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
  );

  const tokens = tokensAPI?.body?.inventory?.fts ?? [];

  return (
    <div className="card card-body flex-1">
      <div className="h5">Portfolio</div>
      <div className="">
        {tokensAPI === null ||
        nearPrice === null ||
        nearBalanceResp === null ? (
          <div className="d-flex justify-content-center align-items-center w-100 h-100">
            {loading}
          </div>
        ) : (
          <div className="mt-2">
            {!tokens.length && !nearBalanceResp ? (
              <div className="fw-bold">
                {treasuryAccount} doesn't own any FTs.
              </div>
            ) : (
              <div className="d-flex flex-column">
                <div className={"border-bottom"}>
                  <Item
                    icon={
                      "https://ipfs.near.social/ipfs/bafkreiazt7rdkgmz2rpvloo3gjoahgxe6dtgicrgzujarf3rbmwuyk2iby"
                    }
                    symbol={"NEAR"}
                    tokenPrice={nearPrice}
                    tokensNumber={balance}
                    currentAmount={getPrice(balance, nearPrice)}
                  />
                </div>
                {tokens.map((item, index) => {
                  const { ft_meta, amount } = item;
                  const { decimals, symbol, icon, price } = ft_meta;
                  const tokensNumber = convertBalanceToReadableFormat(
                    amount,
                    decimals
                  );
                  const tokenPrice = price ?? 0;
                  const currentAmount = getPrice(tokensNumber, tokenPrice);
                  return (
                    <div
                      className={
                        index !== tokens.length - 1 && " border-bottom"
                      }
                    >
                      <Item
                        icon={icon}
                        symbol={symbol}
                        tokenPrice={tokenPrice}
                        tokensNumber={tokensNumber}
                        currentAmount={currentAmount}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

return { Portfolio };
