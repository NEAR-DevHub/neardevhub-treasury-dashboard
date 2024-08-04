const address = props.address ?? ""; // Empty string for NEAR
const amountWithDecimals = props.amountWithDecimals ?? 0;
const amountWithoutDecimals = props.amountWithoutDecimals; // Automatically converted to the correct value

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

const Wrapper = styled.div`
  .amount {
    font-size: 14px;
    font-weight: 500;
    line-height: 1.15;
  }
`;
return (
  <Wrapper className="d-flex gap-1 align-items-center">
    <div>
      <img
        width="14px"
        height="14px"
        src={isNEAR ? "${REPL_NEAR_TOKEN_ICON}" : ftMetadata.icon}
      />
    </div>
    <div className="d-flex gap-1 align-items-center">
      <span className="amount">{amount}</span>
    </div>
  </Wrapper>
);
