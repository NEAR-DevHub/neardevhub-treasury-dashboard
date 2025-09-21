const { NearToken } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };

const { getNearBalances, getIntentsBalances } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const { CardSkeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
) || { CardSkeleton: () => <></> };

const {
  selectedValue,
  onChange,
  disabled,
  setTokensAvailable,
  setSelectedTokenBlockchain,
  setSelectedTokenIsIntent,
  lockupNearBalances,
  selectedWallet,
  lockupContract,
  daoAccount,
} = props;

onChange = onChange || (() => {});

const getWalletConfig = (selectedWallet) => {
  if (selectedWallet === "intents.near") {
    return {
      account: daoAccount,
      showIntentsTokens: true,
      ftTokensResp: { body: { fts: [] } },
      nearBalances: { availableParsed: "0" },
    };
  } else if (selectedWallet === lockupContract) {
    return {
      account: lockupContract,
      showNear: true,
      showLockedNear: true,
      ftTokensResp: { body: { fts: [] } },
      nearBalances: lockupNearBalances,
      isLockup: true,
    };
  } else {
    // SputnikDAO (default)
    return {
      account: daoAccount,
      showNear: true,
      showFTTokens: true,
      ftTokensResp: fetch(
        `${REPL_BACKEND_API}/ft-tokens?account_id=${daoAccount}`
      ),
      nearBalances: getNearBalances(daoAccount),
    };
  }
};

const walletConfig = getWalletConfig(selectedWallet);
const account = walletConfig.account;
const ftTokensResp = walletConfig.ftTokensResp;
const nearBalances = walletConfig.nearBalances;

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
  let tokens = [];

  // Add NEAR token if configured to show
  if (walletConfig.showNear) {
    tokens.push({
      icon: NearToken,
      title: "NEAR",
      value: "NEAR",
      tokenBalance: nearBalances.availableParsed,
      blockchain: null,
    });
  }

  // Add FT tokens if configured to show
  if (walletConfig.showFTTokens) {
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
  }

  // Add Intents tokens if configured to show
  if (walletConfig.showIntentsTokens) {
    tokens = tokens.concat(intentsTokens);
  }

  setOptions(tokens);
}, [tokensWithBalance, intentsTokens, selectedWallet, walletConfig]);

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
    sendTokensAvailable(
      selectedToken ? selectedToken.value : selectedOptionValue
    );
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
    sendTokensAvailable(
      selectedToken ? selectedToken.value : selectedOptionValue
    );
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

const stakedTokens = walletConfig.isLockup
  ? lockupStakedTokens
  : nearStakedTokens;

const Item = ({ option }) => {
  if (!option) {
    return <div className="text-secondary">Select</div>;
  }
  return (
    <div className="d-flex gap-3 align-items-center w-100">
      {typeof option.icon === "string" ? (
        <img
          src={option.icon}
          height={30}
          width={30}
          className="rounded-circle"
        />
      ) : typeof option.icon === "function" ? (
        <option.icon />
      ) : (
        option.icon
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
          Tokens available: {option.tokenBalance}{" "}
          {option.isIntent &&
            "through " + (option.blockchain || "").toUpperCase()}
        </div>
      </div>
    </div>
  );
};

const selectedOption =
  options.find((item) => item.value === selectedOptionValue) ?? null;

useEffect(() => {
  if (
    typeof getIntentsBalances === "function" &&
    account &&
    walletConfig.showIntentsTokens &&
    !intentsTokens?.length
  ) {
    getIntentsBalances(account).then((balances) => {
      const formattedIntentsTokens = balances.map((token) => ({
        icon: token.ft_meta?.icon ? (
          <img
            src={token.ft_meta.icon}
            height={30}
            width={30}
            className="rounded-circle"
          />
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
        title: token.ft_meta.symbol,
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
}, [daoAccount, walletConfig.showIntentsTokens]);

const Loader = (
  <div className="d-flex gap-4 w-100 align-items-center px-3 py-2">
    <div className="rounded-circle" style={{ width: 40, height: 40 }}>
      <CardSkeleton />
    </div>
    <div className="d-flex flex-column gap-2 w-100">
      <div className="rounded-2 " style={{ width: "80%", height: 20 }}>
        <CardSkeleton />
      </div>
      <div className="rounded-2" style={{ width: "80%", height: 20 }}>
        <CardSkeleton />
      </div>
    </div>
  </div>
);
return (
  <Container>
    {walletConfig.showNear && (
      <Widget
        loading=""
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.StakedNearIframe`}
        props={{
          accountId: account,
          setNearStakedTotalTokens: (v) =>
            setNearStakedTokens(Big(v).toFixed(2)),
        }}
      />
    )}
    {walletConfig.showLockedNear && (
      <Widget
        loading=""
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.StakedNearIframe`}
        props={{
          accountId: account,
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
          {!Array.isArray(options) || options?.length === 0
            ? Loader
            : options.map((option) => (
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
      )}
    </div>
  </Container>
);
