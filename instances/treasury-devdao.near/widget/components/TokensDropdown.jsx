const instance = props.instance;
if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const nearTokenIcon = "${REPL_NEAR_TOKEN_ICON}";
const { selectedValue, onChange, disabled, setTokensAvailable } = props;

onChange = onChange || (() => {});

const ftTokensResp = fetch(
  `https://api3.nearblocks.io/v1/account/${treasuryDaoID}/inventory`
);

const nearBalanceResp = fetch(
  `https://api3.nearblocks.io/v1/account/${treasuryDaoID}`
);

if (
  !ftTokensResp ||
  !Array.isArray(ftTokensResp?.body?.inventory?.fts) ||
  !nearBalanceResp
) {
  return <></>;
}

const nearBalance = Big(nearBalanceResp?.body?.account?.[0]?.amount ?? "0")
  .div(Big(10).pow(24))
  .toFixed(4);
const lockedStorageAmt = Big(
  nearBalanceResp?.body?.account?.[0]?.storage_usage ?? "0"
)
  .div(Big(10).pow(5))
  .toFixed(5);
const [options, setOptions] = useState([]);

const tokensWithBalance =
  ftTokensResp?.body?.inventory?.fts.filter((i) => parseFloat(i.amount) > 0) ??
  [];

useEffect(() => {
  const tokens = [
    {
      icon: nearTokenIcon,
      title: "NEAR",
      value: "NEAR",
      tokenBalance: nearBalance,
    },
  ];

  if (tokensWithBalance.length > 0 && !options.length) {
    tokens = tokens.concat(
      tokensWithBalance.map((i) => {
        return {
          icon: i.ft_meta.icon,
          title: i.ft_meta.symbol,
          value: i.contract,
          tokenBalance: Big(i.amount ?? "0")
            .div(Big(10).pow(i.ft_meta.decimals ?? "1"))
            .toFixed(4),
        };
      })
    );
  }
  setOptions(tokens);
}, [tokensWithBalance]);

const [isOpen, setIsOpen] = useState(false);
const [selectedOptionValue, setSelectedValue] = useState(selectedValue);

function getNearAvailableBalance(tokenBalance) {
  return Big(tokenBalance ?? "0")
    .minus(lockedStorageAmt ?? "0")
    .toFixed(4);
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

  .dropdown-item.active,
  .dropdown-item:active {
    background-color: #f0f0f0 !important;
    color: black;
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
    background-color: #f0f0f0;
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
    return <div className="text-muted">Select</div>;
  }
  return (
    <div className="d-flex gap-3 align-items-center w-100">
      <img src={option.icon} height={30} width={30} />
      <div className="d-flex flex-column gap-1 w-100 text-wrap">
        <div className="h6 mb-0"> {option.title}</div>
        {option.value === "NEAR" && (
          <div className="text-sm text-muted w-100 text-wrap">
            Tokens locked for storage: {lockedStorageAmt}
          </div>
        )}
        <div className="text-sm text-muted w-100 text-wrap">
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
    <div
      className="custom-select w-100"
      tabIndex="0"
      onBlur={() => setIsOpen(false)}
      data-testid="tokens-dropdown"
    >
      <div
        className={
          "dropdown-toggle bg-white border rounded-2 btn drop-btn w-100 " +
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
