const { NearToken } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };

const { getNearBalances, getIntentsBalances } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);
const daoAccount = props.daoAccount;

const {
  selectedValue,
  onChange,
  disabled,
  setTokensAvailable,
  setSelectedTokenBlockchain,
  setSelectedTokenIsIntent,
  lockupNearBalances,
} = props;

onChange = onChange || (() => {});

const isLockupContract = daoAccount.includes("lockup.near");

const ftTokensResp = isLockupContract
  ? { body: { fts: [] } }
  : fetch(`${REPL_BACKEND_API}/ft-tokens?account_id=${daoAccount}`);

const nearBalances = isLockupContract
  ? lockupNearBalances
  : getNearBalances(daoAccount);

if (
  !ftTokensResp ||
  !Array.isArray(ftTokensResp?.body?.fts) ||
  typeof getNearBalances !== "function"
) {
  return (
    <div className="alert alert-danger">
      There has been some issue in fetching FT tokens data.
    </div>
  );
}

const [options, setOptions] = useState([]);
const [nearStakedTokens, setNearStakedTokens] = useState(null);
const [lockupStakedTokens, setLockupStakedTokens] = useState(null);
const [intentsTokens, setIntentsTokens] = useState([]);

// remove near storage, spam tokens
const tokensWithBalance =
  ftTokensResp?.body?.fts?.filter(
    (i) =>
      parseFloat(i.amount) > 0 &&
      i.contract !== "Near" &&
      i.ft_meta.symbol.length < 30
  ) ?? [];

useEffect(() => {
  let tokens = [
    {
      icon: NearToken,
      title: "NEAR",
      value: "NEAR",
      tokenBalance: nearBalances.availableParsed,
      blockchain: null,
    },
  ];

  tokens = tokens.concat(
    tokensWithBalance.map((i) => {
      return {
        icon: i.ft_meta.icon,
        title: i.ft_meta.symbol,
        value: i.contract,
        blockchain: null,
        tokenBalance: Big(i.amount ?? "0")
          .div(Big(10).pow(i.ft_meta.decimals))
          .toFixed(2),
      };
    })
  );

  tokens = tokens.concat(intentsTokens);
  setOptions(tokens);
}, [tokensWithBalance, isLockupContract, intentsTokens]);

const [isOpen, setIsOpen] = useState(false);
const [selectedOptionValue, setSelectedValue] = useState(selectedValue);

const toggleDropdown = () => {
  setIsOpen(!isOpen);
};

function sendTokensAvailable(value) {
  const balance = options.find((i) => i.value === value)?.tokenBalance;
  return setTokensAvailable(balance);
}

useEffect(() => {
  if (selectedValue !== (selectedOptionValue ?? "").replace(/^intents\_/, "")) {
    setSelectedValue(selectedValue);
    sendTokensAvailable(selectedValue);
  }
}, [selectedValue]);

useEffect(() => {
  if (selectedValue !== selectedOptionValue) {
    const selectedToken = options.find((i) => i.value === selectedOptionValue);

    onChange(
      selectedToken?.isIntent ? selectedToken.tokenId : selectedOptionValue
    );

    setSelectedValue(selectedToken ? selectedToken.value : null);
    setSelectedTokenBlockchain(selectedToken ? selectedToken.blockchain : null);
    setSelectedTokenIsIntent(selectedToken ? selectedToken.isIntent : false);
    sendTokensAvailable(selectedValue);
  }
}, [selectedOptionValue]);

const handleOptionClick = (option) => {
  setSelectedValue(option.value);
  setIsOpen(false);
};

const Container = styled.div`
  .drop-btn {
    width: 100%;
    text-align: left;
    padding-inline: 10px;
  }

  .dropdown-toggle:after {
    position: absolute;
    top: 46%;
    right: 2%;
  }

  .dropdown-menu {
    width: 100%;
  }

  .disabled {
    background-color: #f8f8f8 !important;
    cursor: not-allowed !important;
    border-radius: 5px;
    opacity: inherit !important;
  }

  .disabled.dropdown-toggle::after {
    display: none !important;
  }

  .custom-select {
    position: relative;
  }

  .selected {
    background-color: var(--grey-04);
  }

  .text-wrap {
    overflow: hidden;
    white-space: normal;
  }

  .text-sm {
    font-size: 12px !important;
  }
`;

const stakedTokens = isLockupContract ? lockupStakedTokens : nearStakedTokens;

const Item = ({ option }) => {
  if (!option) {
    return <div className="text-secondary">Select</div>;
  }
  return (
    <div className="d-flex gap-3 align-items-center w-100">
      {typeof option.icon === "string" ? (
        <img src={option.icon} height={30} width={30} />
      ) : (
        option.icon // Allow rendering component icons directly
      )}
      <div className="d-flex flex-column gap-1 w-100 text-wrap">
        <div className="h6 mb-0"> {option.title}</div>
        {option.value === "NEAR" && (
          <div className="d-flex flex-column gap-1 w-100 text-wrap text-sm text-secondary">
            <div>Tokens locked for storage: {nearBalances.storageParsed}</div>

            {stakedTokens && <div>Tokens staked: {stakedTokens}</div>}
          </div>
        )}
        <div className="text-sm text-secondary w-100 text-wrap">
          Tokens available: {option.tokenBalance}
        </div>
      </div>
    </div>
  );
};

const selectedOption =
  options.find((item) => item.value === selectedOptionValue) ?? null;

useEffect(() => {
  if (typeof getIntentsBalances === "function" && daoAccount) {
    getIntentsBalances(daoAccount).then((balances) => {
      const formattedIntentsTokens = balances.map((token) => ({
        icon: token.ft_meta?.icon ? (
          <img src={token.ft_meta.icon} height={30} width={30} />
        ) : (
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "#ccc",
            }}
          /> // Placeholder icon
        ),
        title: `${token.ft_meta.symbol} (NEAR Intents)`,
        tokenId: token.contract_id,
        value: `intents_${token.contract_id}`,
        tokenBalance: Big(token.amount ?? "0")
          .div(Big(10).pow(token.ft_meta.decimals))
          .toFixed(2),
        blockchain: token.blockchain,
        isIntent: true,
      }));
      setIntentsTokens(formattedIntentsTokens);
    });
  }
}, [daoAccount]);

return (
  <Container>
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.StakedNearIframe`}
      props={{
        accountId: daoAccount,
        setNearStakedTotalTokens: (v) => setNearStakedTokens(Big(v).toFixed(2)),
      }}
    />
    {isLockupContract && (
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.StakedNearIframe`}
        props={{
          accountId: daoAccount,
          setNearStakedTokens: (v) => setLockupStakedTokens(Big(v).toFixed(2)),
        }}
      />
    )}
    <div
      className="custom-select w-100"
      tabIndex="0"
      onBlur={() => setIsOpen(false)}
      data-testid="tokens-dropdown"
    >
      <div
        className={
          "dropdown-toggle bg-overlay border rounded-2 btn drop-btn w-100 " +
          (disabled ? "disabled" : "")
        }
        onClick={!disabled && toggleDropdown}
      >
        <div className={`selected-option`}>
          <Item option={selectedOption} />
        </div>
      </div>

      {isOpen && (
        <div className="dropdown-menu rounded-2 dropdown-menu-end dropdown-menu-lg-start px-2 shadow show w-100">
          <div>
            {options.map((option) => (
              <div
                key={option.value}
                className={`dropdown-item cursor-pointer w-100 my-1 ${
                  selectedOption.value === option.value ? "selected" : ""
                }`}
                onClick={() => handleOptionClick(option)}
              >
                <Item option={option} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </Container>
);
