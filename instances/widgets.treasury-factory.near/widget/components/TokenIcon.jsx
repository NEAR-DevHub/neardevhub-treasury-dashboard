const { NearToken } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };

const address = props.address ?? ""; // Empty string for NEAR

const isNEAR = address === "" || address.toLowerCase() === "near";
const isWrapNear = address === "wrap.near";
const number = props.number ?? false;

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

return (
  <div className="d-flex gap-1 align-items-center amount mb-0 justify-content-center">
    {isNEAR ? (
      <NearToken width={24} height={24} />
    ) : (
      <img width="24" height="24" src={ftMetadata.icon} />
    )}
    {number && number}
    {ftMetadata.symbol}
  </div>
);
