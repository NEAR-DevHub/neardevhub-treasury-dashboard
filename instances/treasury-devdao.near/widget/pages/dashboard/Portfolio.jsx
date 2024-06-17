const treasuryAccount = "${REPL_TREASURY}";
const Portfolio = () => {
  const tokensAPI = fetch(
    `https://api3.nearblocks.io/v1/account/${treasuryAccount}/inventory`
  );
  const loading = (
    <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
  );
  const tokens = tokensAPI?.body?.inventory?.fts ?? [];
  return (
    <div className="card card-body flex-1">
      <div className="h5">Portfolio</div>
      <div className="">
        {tokensAPI === null ? (
          <div className="d-flex justify-content-center align-items-center w-100 h-100">
            {loading}
          </div>
        ) : (
          <div className="mt-2">
            {!tokens.length ? (
              <div className="fw-bold">
                {treasuryAccount} doesn't own any FTs.
              </div>
            ) : (
              <div className="d-flex flex-column">
                {tokens.map((item, index) => {
                  const { ft_meta, amount } = item;
                  const { decimals, symbol, icon, price } = ft_meta;
                  const tokensNumber = Big(amount)
                    .div(Big(10).pow(decimals))
                    .toFixed(2);
                  const tokenPrice = price ?? 0;
                  const currentAmount = Big(tokensNumber)
                    .mul(tokenPrice)
                    .toFixed(2);
                  return (
                    <div
                      className={
                        "py-2 d-flex gap-2 align-items-center justify-content-between " +
                        (index !== tokens.length - 1 && " border-bottom")
                      }
                    >
                      <div className="d-flex gap-2 align-items-center">
                        <img src={icon} height={40} />
                        <div className="">
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
