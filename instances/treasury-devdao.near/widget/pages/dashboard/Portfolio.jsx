const treasuryAccount = "${REPL_TREASURY}";
const archiveNodeUrl = "https://archival-rpc.mainnet.near.org";
const nearTokenIcon = "${REPL_NEAR_TOKEN_ICON}";

function formatToReadableDecimals(number) {
  return Big(number ?? "0").toFixed(4);
}
const Item = ({
  icon,
  symbol,
  tokenPrice,
  tokensNumber,
  currentAmount,
  showBorderBottom,
  isStakedToken,
}) => {
  if (symbol === "wNEAR") {
    icon = nearTokenIcon;
  }
  return (
    <div className={showBorderBottom && " border-bottom"}>
      <div
        style={{ paddingLeft: isStakedToken ? "2.2rem" : "" }}
        className={
          "py-2 d-flex gap-2 align-items-center justify-content-between "
        }
      >
        <div className="d-flex align-items-center" style={{ gap: "0.7rem" }}>
          <img src={icon} height={30} />
          <div>
            <div className="h6 mb-0">{symbol}</div>
            <div className="d-flex gap-2 text-sm text-muted">
              <div>{formatToReadableDecimals(tokensNumber)}</div>
              <div>･ ${tokenPrice}</div>
            </div>
          </div>
        </div>
        <div className="fw-bold">
          ${formatToReadableDecimals(currentAmount)}
        </div>
      </div>
    </div>
  );
};

const { ftTokens, nearStakedTokens, nearBalance, nearPrice } = props;

function convertBalanceToReadableFormat(amount, decimals) {
  return Big(amount ?? "0")
    .div(Big(10).pow(decimals))
    .toFixed();
}

function getPrice(tokensNumber, tokenPrice) {
  return Big(tokensNumber).mul(tokenPrice).toFixed(2);
}

const loading = (
  <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
);

const totalNearTokens = Big(nearBalance ?? "0")
  .plus(Big(nearStakedTokens ?? "0"))
  .toFixed();

return (
  <div className="card card-body flex-1">
    <div className="h5">Portfolio</div>
    <div>
      {ftTokens === null ||
      nearStakedTokens === null ||
      nearBalance === null ||
      nearPrice === null ? (
        <div className="d-flex justify-content-center align-items-center w-100 h-100">
          {loading}
        </div>
      ) : (
        <div className="mt-2">
          {!ftTokens.length && !nearBalance ? (
            <div className="fw-bold">
              {treasuryAccount} doesn't own any FTs.
            </div>
          ) : (
            <div className="d-flex flex-column">
              {nearStakedTokens && nearStakedTokens !== "0" ? (
                <div className="d-flex flex-column">
                  <Item
                    showBorderBottom={true}
                    icon={nearTokenIcon}
                    symbol={"NEAR"}
                    tokenPrice={nearPrice}
                    tokensNumber={totalNearTokens}
                    currentAmount={getPrice(totalNearTokens, nearPrice)}
                  />
                  <Item
                    isStakedToken={true}
                    showBorderBottom={true}
                    icon={nearTokenIcon}
                    symbol={"NEAR"}
                    tokenPrice={nearPrice}
                    tokensNumber={nearBalance}
                    currentAmount={getPrice(nearBalance, nearPrice)}
                  />
                  <Item
                    isStakedToken={true}
                    showBorderBottom={true}
                    icon={nearTokenIcon}
                    symbol={"Staked NEAR"}
                    tokenPrice={nearPrice}
                    tokensNumber={nearStakedTokens}
                    currentAmount={getPrice(nearStakedTokens, nearPrice)}
                  />
                </div>
              ) : (
                <Item
                  showBorderBottom={ftTokens.length}
                  icon={nearTokenIcon}
                  symbol={"NEAR"}
                  tokenPrice={nearPrice}
                  tokensNumber={nearBalance}
                  currentAmount={getPrice(nearBalance, nearPrice)}
                />
              )}

              {Array.isArray(ftTokens) &&
                ftTokens.map((item, index) => {
                  const { ft_meta, amount } = item;
                  const { decimals, symbol, icon, price } = ft_meta;
                  const tokensNumber = convertBalanceToReadableFormat(
                    amount,
                    decimals
                  );
                  const tokenPrice = price ?? 0;
                  const currentAmount = getPrice(tokensNumber, tokenPrice);
                  return (
                    <Item
                      showBorderBottom={index !== ftTokens.length - 1}
                      icon={icon}
                      symbol={symbol}
                      tokenPrice={tokenPrice}
                      tokensNumber={tokensNumber}
                      currentAmount={currentAmount}
                    />
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);
