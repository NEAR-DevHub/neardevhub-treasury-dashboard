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
let originalAmount = amountWithDecimals;
if (amountWithoutDecimals !== undefined) {
  originalAmount = Big(amountWithoutDecimals).div(
    Big(10).pow(ftMetadata.decimals ?? 1)
  );
  amount = originalAmount.toFixed();
}

function toReadableAmount(amount, showAllDecimals) {
  return Number(amount).toLocaleString(
    "en-US",
    showAllDecimals
      ? { maximumFractionDigits: 10 }
      : {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
  );
}

const TokenAmount = ({ showAllDecimals, showTilde }) => {
  return (
    <div className="text-center">
      <div className="d-flex gap-1 align-items-center justify-content-end">
        <span className="amount bolder mb-0">
          {(showTilde ? "~" : "") + toReadableAmount(amount, showAllDecimals)}
        </span>
        {isNEAR ? (
          <NearToken width={16} height={16} />
        ) : (
          <img width="16" height="16" src={ftMetadata.icon} />
        )}
      </div>
      {tokenUSDValue && (
        <div className="text-secondary d-flex justify-content-end">
          ~{toReadableAmount(tokenUSDValue, showAllDecimals)} USD
        </div>
      )}
    </div>
  );
};

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

// Check if there are more than 2 decimals in the original amount
let needsTilde = false;
if (originalAmount !== null && amountWithoutDecimals !== undefined) {
  const decimals = originalAmount.toString().split(".")[1];
  needsTilde = decimals && decimals.length > 2;
}

return needsTilde ? (
  <Widget
    loading=""
    src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
    props={{
      popup: <TokenAmount showAllDecimals={true} />,
      children: <TokenAmount showAllDecimals={false} showTilde={true} />,
      instance: props.instance,
    }}
  />
) : (
  <TokenAmount showAllDecimals={false} />
);
