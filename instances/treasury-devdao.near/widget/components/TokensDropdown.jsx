const { NearToken } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };

const { getNearBalances, isBosGateway } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);
const instance = props.instance;
if (!instance || typeof isBosGateway !== "function") {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const { selectedValue, onChange, disabled, setTokensAvailable } = props;

onChange = onChange || (() => {});

const pikespeakKey = isBosGateway()
  ? "${REPL_PIKESPEAK_KEY}"
  : props.pikespeakKey;

if (!pikespeakKey) {
  return (
    <div className="alert alert-danger">Pikespeak key is not provided</div>
  );
}
const pikespeakOptions = {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": pikespeakKey,
  },
};

const ftTokensResp = fetch(
  `https://api.pikespeak.ai/account/balance/${treasuryDaoID}`,
  pikespeakOptions
);

const nearBalances = getNearBalances(treasuryDaoID);

if (
  !ftTokensResp ||
  !Array.isArray(ftTokensResp?.body) ||
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

const tokensWithBalance =
  ftTokensResp?.body.filter(
    (i) => parseFloat(i.amount) > 0 && i.contract !== "Near"
  ) ?? [];

useEffect(() => {
  const tokens = [
    {
      icon: NearToken,
      title: "NEAR",
      value: "NEAR",
      tokenBalance: nearBalances.totalParsed,
    },
  ];

  if (
    tokensWithBalance.length > 0 &&
    options.length !== tokensWithBalance.length + 1
  ) {
    tokens = tokens.concat(
      tokensWithBalance.map((i) => {
        return {
          icon: i.icon,
          title: i.symbol,
          value: i.contract,
          tokenBalance: Big(i.amount ?? "0").toFixed(2),
        };
      })
    );
  }
  setOptions(tokens);
}, [tokensWithBalance]);

const [isOpen, setIsOpen] = useState(false);
const [selectedOptionValue, setSelectedValue] = useState(selectedValue);

function getNearAvailableBalance(tokenBalance) {
  return Big(tokenBalance)
    .minus(nearBalances.storageParsed ?? "0")
    .minus(nearStakedTokens ?? "0")
    .toFixed(2);
}
const toggleDropdown = () => {
  setIsOpen(!isOpen);
};

function sendTokensAvailable(value) {
  const balance = options.find((i) => i.value === value)?.tokenBalance;
  return setTokensAvailable(
    value === "NEAR" ? getNearAvailableBalance(balance) : balance
  );
}

useEffect(() => {
  if (selectedValue !== selectedOptionValue) {
    setSelectedValue(selectedValue);
    sendTokensAvailable(selectedValue);
  }
}, [selectedValue]);

useEffect(() => {
  if (selectedValue !== selectedOptionValue) {
    onChange(selectedOptionValue);
    sendTokensAvailable(selectedOptionValue);
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
    background-color: var(--grey-05);
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .text-wrap {
    overflow: hidden;
    white-space: normal;
  }

  .text-sm {
    font-size: 12px !important;
  }
`;

const Item = ({ option }) => {
  if (!option) {
    return <div className="text-secondary">Select</div>;
  }
  return (
    <div className="d-flex gap-3 align-items-center w-100">
      {typeof option.icon === "string" ? (
        <img src={option.icon} height={30} width={30} />
      ) : (
        <NearToken />
      )}
      <div className="d-flex flex-column gap-1 w-100 text-wrap">
        <div className="h6 mb-0"> {option.title}</div>
        {option.value === "NEAR" && (
          <div className="d-flex flex-column gap-1 w-100 text-wrap text-sm text-secondary">
            <div>Tokens locked for storage: {nearBalances.storageParsed}</div>
            {nearStakedTokens && <div>Tokens staked: {nearStakedTokens}</div>}
          </div>
        )}
        <div className="text-sm text-secondary w-100 text-wrap">
          Tokens available:{" "}
          {option.value === "NEAR"
            ? getNearAvailableBalance(option.tokenBalance)
            : option.tokenBalance}
        </div>
      </div>
    </div>
  );
};

const selectedOption =
  options.find((item) => item.value === selectedOptionValue) ?? null;

return (
  <Container>
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.StakedNearIframe`}
      props={{
        accountId: treasuryDaoID,
        setNearStakedTotalTokens: (v) => setNearStakedTokens(Big(v).toFixed(2)),
      }}
    />
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
