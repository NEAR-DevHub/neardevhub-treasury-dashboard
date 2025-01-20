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
  <div className="d-flex gap-1 align-items-center amount mb-0 justify-content-center">
    {isNEAR ? (
      <NearToken width={24} height={24} />
    ) : (
      <img width="24" height="24" src={ftMetadata.icon} />
    )}
    {ftMetadata.symbol}
  </div>
);
