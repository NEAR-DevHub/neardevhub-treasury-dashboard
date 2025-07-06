const { NearToken } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };

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
  amount = props.showAllDecimals ? amount.toString() : amount.toFixed(2);
}

useEffect(() => {
  if (showUSDValue) {
    asyncFetch(`${REPL_BACKEND_API}/ft-token-price?account_id=${address}`).then(
      (res) => {
        const price = res.body?.price;
        if (price) {
          setTokenUSDValue(Big(amount).mul(price).toFixed(2));
        }
      }
    );
  }
}, [showUSDValue]);

function toReadableAmount(amount) {
  if (props.showAllDecimals) {
    return Number(amount).toLocaleString("en-US", {});
  } else {
    return Number(amount).toLocaleString("en-US", {
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
        ~ {toReadableAmount(tokenUSDValue)} USD
      </div>
    )}
  </div>
);
