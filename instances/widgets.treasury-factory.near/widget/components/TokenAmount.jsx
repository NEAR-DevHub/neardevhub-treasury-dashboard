const { NearToken } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };

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
