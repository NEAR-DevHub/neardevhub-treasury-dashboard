const { Skeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
);
const { NearToken } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };

const props = typeof props !== "undefined" ? props : {};
const treasuryDaoID = props.treasuryDaoID;
const heading = props.heading;
const instance = props.instance;
const onTotalBalanceChange = props.onTotalBalanceChange;

const [tokens, setTokens] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(false);
const [expandedTokens, setExpandedTokens] = useState({});

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

// Function to aggregate tokens by symbol
function aggregateTokensBySymbol(tokens) {
  const aggregated = {};

  tokens.forEach((token) => {
    const { symbol, icon, decimals, price } = token.ft_meta;
    const amount = token.amount;

    if (!aggregated[symbol]) {
      aggregated[symbol] = {
        symbol,
        icon,
        decimals,
        price,
        totalAmount: "0",
        tokens: [],
      };
    }

    const readableAmount = convertBalanceToReadableFormat(amount, decimals);
    aggregated[symbol].totalAmount = Big(aggregated[symbol].totalAmount)
      .plus(Big(readableAmount))
      .toFixed(2);
    aggregated[symbol].tokens.push({
      ...token,
      readableAmount,
    });
  });

  return Object.values(aggregated);
}

useEffect(() => {
  if (!treasuryDaoID) return;
  setLoading(true);
  setError(false); // Reset error state on new fetch
  if (typeof onTotalBalanceChange === "function") {
    onTotalBalanceChange("0"); // Initialize to "0" or signal loading
  }

  asyncFetch("https://api-mng-console.chaindefuser.com/api/tokens")
    .then((resp) => {
      if (!resp.ok) {
        console.error("Failed to fetch tokens from Chaindefuser", resp);
        setError(true);
        setLoading(false);
        setTokens([]);
        return;
      }
      const initialTokens = resp.body?.items || [];
      if (initialTokens.length === 0) {
        setTokens([]);
        setLoading(false);
        return;
      }

      const tokenIds = initialTokens.map((t) => t.defuse_asset_id);
      Near.asyncView("intents.near", "mt_batch_balance_of", {
        account_id: treasuryDaoID,
        token_ids: tokenIds,
      })
        .then((balances) => {
          if (balances === null || typeof balances === "undefined") {
            console.error(
              "Failed to fetch balances from intents.near",
              balances
            );
            setError(true);
            setLoading(false);
            setTokens([]);
            return;
          }

          const tokensWithBalances = initialTokens.map((t, i) => ({
            ...t, // Spread original token data
            amount: balances[i],
          }));

          const filteredTokensWithBalances = tokensWithBalances.filter(
            (token) => token.amount && Big(token.amount).gt(0)
          );

          if (filteredTokensWithBalances.length === 0) {
            setTokens([]);
            setLoading(false);
            return;
          }

          const iconPromises = filteredTokensWithBalances.map((token) => {
            let iconPromise = Promise.resolve(token.icon); // Default to original icon
            if (
              token.defuse_asset_id &&
              token.defuse_asset_id.startsWith("nep141:")
            ) {
              const parts = token.defuse_asset_id.split(":");
              if (parts.length > 1) {
                const contractId = parts[1];
                iconPromise = Near.asyncView(contractId, "ft_metadata")
                  .then((metadata) => metadata?.icon || token.icon)
                  .catch(() => token.icon); // Fallback to original icon on error
              }
            }
            return iconPromise;
          });

          Promise.all(iconPromises)
            .then((resolvedIcons) => {
              const finalTokens = filteredTokensWithBalances.map((t, i) => ({
                ft_meta: {
                  symbol: t.symbol,
                  icon: resolvedIcons[i], // Use icon from ft_metadata or original
                  decimals: t.decimals,
                  price: t.price,
                },
                amount: t.amount, // Amount is already on 't' from filteredTokensWithBalances
                blockchain: t.blockchain,
              }));

              // Aggregate tokens by symbol
              const aggregatedTokens = aggregateTokensBySymbol(finalTokens);
              setTokens(aggregatedTokens);
              setLoading(false);

              // Calculate and pass up the total USD balance
              if (typeof onTotalBalanceChange === "function") {
                const totalUsd = aggregatedTokens.reduce((acc, token) => {
                  const usdValue = Big(token.totalAmount).mul(token.price || 0);
                  return acc.plus(usdValue);
                }, Big(0));
                onTotalBalanceChange(totalUsd.toFixed(2));
              }
            })
            .catch((iconError) => {
              console.error(
                "Error fetching some token icons, using defaults.",
                iconError
              );
              // Fallback to original icons if Promise.all fails for ft_metadata calls
              const fallbackTokens = filteredTokensWithBalances.map((t) => ({
                ft_meta: {
                  symbol: t.symbol,
                  icon: t.icon,
                  decimals: t.decimals,
                  price: t.price,
                },
                amount: t.amount,
                blockchain: t.blockchain,
              }));

              // Aggregate tokens by symbol
              const aggregatedTokens = aggregateTokensBySymbol(fallbackTokens);
              setTokens(aggregatedTokens);
              setLoading(false); // Ensure loading is set to false
              // Calculate and pass up the total USD balance even on icon error
              if (typeof onTotalBalanceChange === "function") {
                const totalUsd = aggregatedTokens.reduce((acc, token) => {
                  const usdValue = Big(token.totalAmount).mul(token.price || 0);
                  return acc.plus(usdValue);
                }, Big(0));
                onTotalBalanceChange(totalUsd.toFixed(2));
              }
            });
        })
        .catch((balanceError) => {
          console.error("Error fetching balances:", balanceError);
          setError(true);
          setLoading(false);
          setTokens([]);
          if (typeof onTotalBalanceChange === "function") {
            onTotalBalanceChange("0"); // Signal error or zero balance
          }
        });
    })
    .catch((fetchError) => {
      console.error("Error fetching initial tokens:", fetchError);
      setError(true);
      setLoading(false);
      setTokens([]);
      if (typeof onTotalBalanceChange === "function") {
        onTotalBalanceChange("0"); // Signal error or zero balance
      }
    });
}, [treasuryDaoID, onTotalBalanceChange]);

const Loading = () => (
  <div className="d-flex align-items-center gap-2 w-100 mx-2 mb-2">
    <div style={{ width: "40px" }}>
      <Skeleton
        style={{ height: "40px", width: "40px" }}
        className="rounded-circle"
      />
    </div>
    <div className="d-flex flex-column gap-1" style={{ width: "60%" }}>
      <Skeleton
        style={{ height: "24px", width: "100%" }}
        className="rounded-1"
      />
      <Skeleton
        style={{ height: "16px", width: "100%" }}
        className="rounded-2"
      />
    </div>
    <div className="d-flex flex-column gap-1" style={{ width: "20%" }}>
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

const TokenCard = ({ token, id }) => {
  const { symbol, icon, price, totalAmount } = token;
  const individualTokens = token.tokens;
  const isExpanded = expandedTokens[symbol] || false;

  const toggleExpanded = () => {
    setExpandedTokens((prev) => ({
      ...prev,
      [symbol]: !prev[symbol],
    }));
  };

  return (
    <div
      className={
        "d-flex flex-column " + (id !== tokens.length - 1 && " border-bottom")
      }
    >
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
            <div className="h6 mb-0">{totalAmount}</div>
            <div className="text-sm text-secondary">
              {formatCurrency(
                Big(totalAmount)
                  .mul(price ?? 0)
                  .toFixed(2)
              )}
            </div>
          </div>
          <div
            style={{
              width: 20,
            }}
          >
            {individualTokens.length > 1 && (
              <i
                onClick={toggleExpanded}
                className={
                  (isExpanded ? "bi bi-chevron-up" : "bi bi-chevron-down") +
                  " text-secondary h6 mb-0"
                }
              ></i>
            )}
          </div>
        </div>
      </div>

      {isExpanded && individualTokens.length > 1 && (
        <div
          className="d-flex flex-column"
          style={{ backgroundColor: "var(--bg-system-color)" }}
        >
          {individualTokens.map((individualToken, idx) => (
            <div
              key={idx}
              className={
                "d-flex align-items-center justify-content-between px-4 py-2 " +
                (idx !== individualTokens.length && "border-top")
              }
            >
              <div style={{ paddingLeft: "5px" }}>
                {(individualToken.blockchain || "").toUpperCase() || "Unknown"}
              </div>
              <div className="d-flex justify-content-end">
                <div className="d-flex flex-column align-items-end">
                  <div className="d-flex gap-1">
                    <div style={{ marginTop: "-5px" }}>
                      {icon ? (
                        <img src={icon} height={16} width={16} />
                      ) : (
                        <NearToken height={16} width={16} />
                      )}
                    </div>
                    <div className="h6 mb-0">
                      {individualToken.readableAmount}
                    </div>
                  </div>

                  <div className="text-sm text-secondary">
                    {formatCurrency(
                      Big(individualToken.readableAmount)
                        .mul(price ?? 0)
                        .toFixed(2)
                    )}
                  </div>
                </div>
                <div
                  style={{
                    width: 20,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

if (loading)
  return (
    <div className="card flex-1 overflow-hidden border-bottom">
      {heading}
      <Loading />
    </div>
  );
if (error)
  return (
    <div className="card flex-1 overflow-hidden border-bottom">
      {heading}
      <div className="text-danger px-3 py-2">
        Failed to load Intents balances.
      </div>
    </div>
  );

const filtered = (tokens || []).filter(
  (token) => token.totalAmount && Big(token.totalAmount).gt(0)
);

return filtered.length > 0 ? (
  <div data-testid="intents-portfolio" className="card flex-1 overflow-hidden">
    {heading}
    {filtered.map((token, idx) => (
      <TokenCard key={idx} token={token} id={idx} />
    ))}
  </div>
) : (
  <></>
);
