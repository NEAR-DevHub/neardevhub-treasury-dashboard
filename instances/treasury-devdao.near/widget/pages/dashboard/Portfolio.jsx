const { getNearBalances } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const nearBalances = getNearBalances();

const instance = props.instance;
if (!instance || typeof getNearBalances !== "function") {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

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
          <img src={icon} height={30} width={30} />
          <div>
            <div className="h6 mb-0">{symbol}</div>
            <div className="d-flex gap-md-2 text-sm text-muted flex-wrap">
              <div>{formatToReadableDecimals(tokensNumber)}</div>
              <div>･ ${Big(tokenPrice ?? "0").toFixed(4)}</div>
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
    .div(Big(10).pow(decimals ?? "1"))
    .toFixed();
}

function getPrice(tokensNumber, tokenPrice) {
  return Big(tokensNumber ?? "0")
    .mul(tokenPrice ?? "1")
    .toFixed(2);
}

const loading = (
  <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
);

return (
  <div className="card card-body flex-1">
    <div className="h5">Portfolio</div>
    <div>
      {ftTokens === null ||
      nearStakedTokens === null ||
      nearBalances === null ||
      nearPrice === null ? (
        <div className="d-flex justify-content-center align-items-center w-100 h-100">
          {loading}
        </div>
      ) : (
        <div className="mt-2">
          {!ftTokens.length && !nearBalances?.total ? (
            <div className="fw-bold">{treasuryDaoID} doesn't own any FTs.</div>
          ) : (
            <div className="d-flex flex-column">
              {nearStakedTokens && nearStakedTokens !== "0" ? (
                <div className="d-flex flex-column">
                  <Item
                    showBorderBottom={true}
                    icon={nearTokenIcon}
                    symbol={"NEAR"}
                    tokenPrice={nearPrice}
                    tokensNumber={nearBalances.total}
                    currentAmount={getPrice(nearBalances.total, nearPrice)}
                  />
                  <Item
                    isStakedToken={true}
                    showBorderBottom={true}
                    icon={nearTokenIcon}
                    symbol={"NEAR"}
                    tokenPrice={nearPrice}
                    tokensNumber={nearBalances.available}
                    currentAmount={getPrice(
                      nearBalances.available,
                      nearPrice
                    )}
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
                  tokensNumber={nearBalances.total}
                  currentAmount={getPrice(nearBalances.total, nearPrice)}
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
