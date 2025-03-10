const { NearToken } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };

const address = props.address ?? ""; // Empty string for NEAR
const amountWithDecimals = props.amountWithDecimals ?? 0;
const amountWithoutDecimals = props.amountWithoutDecimals;

const isNEAR = address === "" || address.toLowerCase() === "near";
const isWrapNear = address === "wrap.near";

let ftMetadata = {
  symbol: "NEAR",
  decimals: 24,
};
// ft_metadata for wrap.near doesn't provide icon, so hardcoding the icon here
if (isWrapNear) {
  ftMetadata = {
    symbol: "wNEAR",
    decimals: 24,
    icon: "data:image/png;base64,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",
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
    .toFixed(2);
}

return (
  <div className="text-center">
    <div className="d-flex gap-1 align-items-center justify-content-end">
      <span className="amount bolder mb-0">
        {Number(amount).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
      {isNEAR ? (
        <NearToken width={16} height={16} />
      ) : (
        <img width="16" height="16" src={ftMetadata.icon} />
      )}
    </div>
    {/* TODO later */}
    {/* <div className="text-secondary">~1000 USD</div> */}
  </div>
);
