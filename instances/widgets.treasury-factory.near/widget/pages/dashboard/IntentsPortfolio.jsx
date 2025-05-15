const { Skeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
);
const { NearToken } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };

function formatCurrency(amount) {
  const formattedAmount = Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return "$" + formattedAmount;
}

function convertBalanceToReadableFormat(amount, decimals) {
  return Big(amount ?? "0")
    .div(Big(10).pow(decimals ?? "1"))
    .toFixed(2);
}

function formatPrice(price) {
  const numAmount = Number(price ?? 0);
  if (numAmount > 0 && numAmount < 0.01) {
    return "< $0.01";
  }
  return "$" + Big(price ?? "0").toFixed(2);
}

const Loading = () => (
  <div className="d-flex align-items-center gap-2 w-100 mx-2 mb-2">
    <div style={{ width: "40px" }}>
      <Skeleton
        style={{ height: "40px", width: "40px" }}
        className="rounded-circle"
      />
    </div>
    <div className="d-flex flex-column gap-1 w-75">
      <Skeleton
        style={{ height: "24px", width: "100%" }}
        className="rounded-1"
      />
      <Skeleton
        style={{ height: "16px", width: "100%" }}
        className="rounded-2"
      />
    </div>
    <div className="d-flex flex-column gap-1 w-25">
      <Skeleton
        style={{ height: "24px", width: "100%" }}
        className="rounded-1"
      />
      <Skeleton
        style={{ height: "16px", width: "100%" }}
        className="rounded-2"
      />
    </div>
  </div>
);

const TokenCard = ({ token }) => {
  const { ft_meta, amount } = token;
  const { symbol, icon, decimals, price } = ft_meta;
  const tokensNumber = convertBalanceToReadableFormat(amount, decimals);
  return (
    <div className="d-flex flex-column border-bottom">
      <div className="py-2 d-flex gap-2 align-items-center justify-content-between px-3">
        <div className="d-flex align-items-center gap-2">
          {icon ? (
            <img src={icon} height={30} width={30} />
          ) : (
            <NearToken height={30} width={30} />
          )}
          <div>
            <div
              style={{ maxWidth: "240px" }}
              className="h6 mb-0 text-truncate"
            >
              {symbol}
            </div>
            <div className="text-sm text-secondary">{formatPrice(price)}</div>
          </div>
        </div>
        <div className="d-flex gap-2 align-items-center justify-content-end">
          <div className="d-flex flex-column align-items-end">
            <div className="h6 mb-0">{tokensNumber}</div>
            <div className="text-sm text-secondary">
              {formatCurrency(
                Big(tokensNumber)
                  .mul(price ?? 0)
                  .toFixed(2)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

return (
  <div className="card card-body">
    {props.heading}
    {props.tokens === null ? (
      <Loading />
    ) : props.tokens.filter((token) => token.amount && Big(token.amount).gt(0))
        .length === 0 ? (
      <div className="text-secondary px-3 py-2">No Intents balances found.</div>
    ) : (
      props.tokens
        .filter((token) => token.amount && Big(token.amount).gt(0))
        .map((token, idx) => <TokenCard key={idx} token={token} />)
    )}
  </div>
);
