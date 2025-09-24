const { NearToken } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };

const tokenDisplayLib = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.tokenDisplay"
);

const address = props.address ?? ""; // Empty string for NEAR
const amountWithDecimals = props.amountWithDecimals ?? 0;
const amountWithoutDecimals = props.amountWithoutDecimals;
const isWrapNear = address === "wrap.near";
const isNEAR = address === "" || address.toLowerCase() === "near";
const showUSDValue = props.showUSDValue;

const [tokenUSDValue, setTokenUSDValue] = useState(null);

let ftMetadata = {
  symbol: "NEAR",
  decimals: 24,
};

if (isWrapNear) {
  ftMetadata = {
    symbol: "wNEAR",
    decimals: 24,
    icon: "${REPL_WRAP_NEAR_ICON}",
  };
}

if (!isNEAR && !isWrapNear) {
  ftMetadata = Near.view(address, "ft_metadata", {});
  if (ftMetadata === null) return <></>;
}

let amount = amountWithDecimals;
if (amountWithoutDecimals !== undefined) {
  amount = Big(amountWithoutDecimals).div(
    Big(10).pow(ftMetadata.decimals ?? 1)
  );
}

const [tokenPrice, setTokenPrice] = useState(null);

useEffect(() => {
  if (showUSDValue) {
    asyncFetch(`${REPL_BACKEND_API}/ft-token-price?account_id=${address}`).then(
      (res) => {
        const price = res.body?.price;
        if (price) {
          setTokenPrice(price);
          setTokenUSDValue(Big(amount).mul(price).toFixed(2));
        }
      }
    );
  }
}, [showUSDValue, amount]);

function toReadableAmount(value, isUSD) {
  isUSD = isUSD || false;
  // For USD values, always use 2 decimals
  if (isUSD) {
    return tokenDisplayLib?.formatUsdValue
      ? tokenDisplayLib.formatUsdValue(value, 1).replace("$", "")
      : Number(value).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  }

  // For token amounts, use intelligent formatting if available
  if (tokenDisplayLib?.formatTokenAmount && tokenPrice) {
    const formatted = tokenDisplayLib.formatTokenAmount(value, tokenPrice);
    // Add thousand separators
    const parts = formatted.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }

  // Fallback to original behavior
  if (props.showAllDecimals) {
    return Number(value).toLocaleString("en-US", { maximumFractionDigits: 6 });
  } else {
    return Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}

return (
  <div className="d-flex gap-1 align-items-center" style={{ fontSize: "18px" }}>
    {isNEAR ? (
      <NearToken width={20} height={20} />
    ) : (
      <img width="20" height="20" src={ftMetadata.icon} />
    )}
    <span className="bolder mb-0">{toReadableAmount(amount)}</span>
    {ftMetadata.symbol}
    {tokenUSDValue && (
      <div className="text-secondary text-sm">
        ~ {toReadableAmount(tokenUSDValue, true)} USD
      </div>
    )}
  </div>
);
