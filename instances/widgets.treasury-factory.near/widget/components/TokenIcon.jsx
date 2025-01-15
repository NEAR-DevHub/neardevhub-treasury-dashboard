const { NearToken } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };

const address = props.address ?? ""; // Empty string for NEAR

const isNEAR = address === "" || address.toLowerCase() === "near";

let ftMetadata = {
  symbol: "NEAR",
  decimals: 24,
};
if (!isNEAR) {
  ftMetadata = Near.view(address, "ft_metadata", {});
  if (ftMetadata === null) return null;
}

return (
  <div className="d-flex gap-1 align-items-center h6 mb-0 justify-content-center">
    {isNEAR ? (
      <NearToken width={18} height={18} />
    ) : (
      <img width="18px" height="18px" src={ftMetadata.icon} />
    )}
    {ftMetadata.symbol}
  </div>
);
