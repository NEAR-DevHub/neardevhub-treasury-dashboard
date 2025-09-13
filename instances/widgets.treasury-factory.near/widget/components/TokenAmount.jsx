const { NearToken } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };

const tokenDisplayLib = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.tokenDisplay"
);

const address = props.address ?? ""; // Empty string for NEAR
const symbol = props.symbol; // Optional symbol prop for non-contract tokens
const amountWithDecimals = props.amountWithDecimals ?? 0;
const amountWithoutDecimals = props.amountWithoutDecimals;
const showUSDValue = props.showUSDValue;

// If symbol is provided, it's a symbol-based token (like 1Click tokens)
// Otherwise, check if it's NEAR or wrap.near based on address
const isNEAR = !symbol && (address === "" || address.toLowerCase() === "near");
const isWrapNear = !symbol && address === "wrap.near";

const [tokenUSDValue, setTokenUSDValue] = useState(null);
const [tokenPrice, setTokenPrice] = useState(null);

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
if (symbol) {
  // If symbol is explicitly provided (for non-contract tokens like 1Click tokens)
  // Don't fetch metadata, just use the symbol
  ftMetadata = {
    symbol: symbol,
    decimals: 1, // We'll use amountWithDecimals directly, no conversion needed
    icon: null, // No icon for symbol-only tokens
  };
} else if (!isNEAR && !isWrapNear) {
  // For contract addresses, fetch metadata from the contract
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

function toReadableAmount(value, showAllDecimals) {
  // Use intelligent formatting if available and we have the price
  if (!showAllDecimals && tokenDisplayLib && tokenPrice) {
    try {
      const formatted = tokenDisplayLib.formatTokenAmount(value, tokenPrice);
      // Add thousand separators
      const parts = formatted.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return parts.join(".");
    } catch (e) {
      // Fall through to default formatting
    }
  }

  // Fallback to original behavior
  return Number(value).toLocaleString(
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
        ) : ftMetadata.icon ? (
          <img width="16" height="16" src={ftMetadata.icon} />
        ) : (
          // For token symbols without icons, show the symbol text
          ftMetadata.symbol && <span>{ftMetadata.symbol}</span>
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
  // For symbol-based tokens (1Click), fetch price from 1Click API
  if (symbol && !address) {
    asyncFetch("https://1click.chaindefuser.com/v0/tokens").then((res) => {
      if (res.body && Array.isArray(res.body)) {
        const tokenData = res.body.find((t) => t.symbol === symbol);
        if (tokenData && tokenData.price) {
          setTokenPrice(tokenData.price);
          if (showUSDValue) {
            setTokenUSDValue(Big(amount).mul(tokenData.price).toFixed(2));
          }
        }
      }
    });
  }
  // For address-based tokens, fetch from backend API
  else if (address || isNEAR) {
    const tokenAddress = isNEAR ? "" : address;
    asyncFetch(
      `${REPL_BACKEND_API}/ft-token-price?account_id=${tokenAddress}`
    ).then((res) => {
      const price = res.body?.price;
      if (price) {
        setTokenPrice(price);
        if (showUSDValue) {
          setTokenUSDValue(Big(amount).mul(price).toFixed(2));
        }
      }
    });
  }
}, [showUSDValue, address, symbol]);

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
