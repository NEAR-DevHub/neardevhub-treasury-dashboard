const { NearToken } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };

const address = props.address ?? ""; // Empty string for NEAR
const amountWithDecimals = props.amountWithDecimals ?? 0;
const amountWithoutDecimals = props.amountWithoutDecimals;
const showUSDValue = props.showUSDValue;

const isNEAR = address === "" || address.toLowerCase() === "near";
const isWrapNear = address === "wrap.near";

const [tokenUSDValue, setTokenUSDValue] = useState(null);

let ftMetadata = {
  symbol: "NEAR",
  decimals: 24,
};
// ft_metadata for wrap.near doesn't provide icon, so hardcoding the icon here
if (isWrapNear) {
  ftMetadata = {
    symbol: "wNEAR",
    decimals: 24,
    icon: "${REPL_WRAP_NEAR_ICON}",
  };
}
if (!isNEAR && !isWrapNear) {
  ftMetadata = Near.view(address, "ft_metadata", {});
  if (ftMetadata === null) return null;
}
let amount = amountWithDecimals;
if (amountWithoutDecimals !== undefined) {
  amount = Big(amountWithoutDecimals)
    .div(Big(10).pow(ftMetadata.decimals ?? 1))
    .toString(); // Keep full precision, don't round here
}

function toReadableAmount(amount) {
  return Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
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

return (
  <div className="text-center">
    <div className="d-flex gap-1 align-items-center justify-content-end">
      <span className="amount bolder mb-0">{toReadableAmount(amount)}</span>
      {isNEAR ? (
        <NearToken width={16} height={16} />
      ) : (
        <img width="16" height="16" src={ftMetadata.icon} />
      )}
    </div>
    {tokenUSDValue && (
      <div className="text-secondary d-flex justify-content-end">
        ~{toReadableAmount(tokenUSDValue)} USD
      </div>
    )}
  </div>
);
