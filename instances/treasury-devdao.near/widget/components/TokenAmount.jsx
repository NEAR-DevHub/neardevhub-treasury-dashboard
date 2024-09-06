const address = props.address ?? ""; // Empty string for NEAR
const amountWithDecimals = props.amountWithDecimals ?? 0;
const amountWithoutDecimals = props.amountWithoutDecimals;

const isNEAR = address === "" || address.toLowerCase() === "near";

let ftMetadata = {
  symbol: "NEAR",
  decimals: 24,
};
if (!isNEAR) {
  ftMetadata = Near.view(address, "ft_metadata", {});
  if (ftMetadata === null) return null;
}
let amount = amountWithDecimals;
if (amountWithoutDecimals !== undefined) {
  amount = Big(amountWithoutDecimals)
    .div(Big(10).pow(ftMetadata.decimals ?? 1))
    .toString();
}

return (
  <div className="text-center">
    <div className="d-flex gap-1 align-items-center justify-content-end">
      <span className="amount h6 bolder mb-0">
        {amount.toLocaleString("en-US")}
      </span>
      <img
        width="17px"
        height="17px"
        src={isNEAR ? "${REPL_NEAR_TOKEN_ICON}" : ftMetadata.icon}
      />
    </div>
    {/* TODO later */}
    {/* <div className="text-muted">~1000 USD</div> */}
  </div>
);
