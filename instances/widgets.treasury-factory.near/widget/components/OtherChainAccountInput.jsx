// OtherChainAccountInput.jsx
// Widget for validating recipient addresses for various blockchains

const { blockchain, value, setValue, setIsValid, instance } = props;

let placeholder = "Enter recipient account/address";
let regex = null;

// Ethereum-like chains
const ethLike = ["eth", "arb", "gnosis", "bera", "base", "pol", "bsc"];

if (blockchain === "btc") {
  placeholder = "Enter BTC Address (e.g., bc1... or 1...)";
  regex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/i;
} else if (blockchain === "zec") {
  placeholder = "Enter ZEC Address (t1..., t3..., zc...)";
  regex = /^(t1|t3)[a-zA-HJ-NP-Z0-9]{33}$|^zc[a-z0-9]{76}$/i;
} else if (blockchain === "sol") {
  placeholder = "Enter Solana Address";
  regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
} else if (blockchain === "doge") {
  placeholder = "Enter Dogecoin Address (D... or A...)";
  regex = /^[DA][a-km-zA-HJ-NP-Z1-9]{33}$/;
} else if (blockchain === "xrp") {
  placeholder = "Enter XRP Address (r...)";
  regex = /^r[1-9A-HJ-NP-Za-km-z]{33}$/;
} else if (blockchain === "tron") {
  placeholder = "Enter Tron Address (T...)";
  regex = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
} else if (ethLike.includes(blockchain)) {
  placeholder = `Enter ${blockchain.toUpperCase()} Address (0x...)`;
  regex = /^0x[a-fA-F0-9]{40}$/;
}

function handleChange(e) {
  const val = e.target.value;
  setValue(val);
  if (regex) {
    setIsValid(regex.test(val));
  } else {
    setIsValid(!!val);
  }
}

return (
  <Widget
    loading=""
    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Input`}
    props={{
      value,
      placeholder,
      onChange: handleChange,
      key: `${blockchain || "generic"}-recipient`,
      instance,
    }}
  />
);
