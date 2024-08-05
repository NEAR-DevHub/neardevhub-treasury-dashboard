const treasuryAccount = "megha19.near";
const nearTokenIcon = "${REPL_NEAR_TOKEN_ICON}";
const { selectedValue, onChange, disabled } = props;

onChange = onChange || (() => {});

const ftTokensResp = fetch(
  `https://api3.nearblocks.io/v1/account/${treasuryAccount}/inventory`
);

const nearBalanceResp = fetch(
  `https://api3.nearblocks.io/v1/account/${treasuryAccount}`
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

const [options, setOptions] = useState([]);

const tokensWithBalance =
  ftTokensResp?.body?.inventory?.fts.filter((i) => parseFloat(i.amount) > 0) ??
  [];

useEffect(() => {
  if (tokensWithBalance.length > 0) {
    const tokens = [
      {
        icon: nearTokenIcon,
        title: "NEAR",
        value: "NEAR",
        tokenBalance: nearBalance,
      },
    ];
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
    setOptions(tokens);
  }
}, [tokensWithBalance]);

const [isOpen, setIsOpen] = useState(false);
const [selectedOptionValue, setSelectedValue] = useState(selectedValue);

const toggleDropdown = () => {
  setIsOpen(!isOpen);
};

useEffect(() => {
  if (selectedValue && selectedValue !== selectedOptionValue) {
    setSelectedValue(selectedValue);
  }
}, [selectedValue]);

useEffect(() => {
  if (selectedValue !== selectedOptionValue) {
    onChange(selectedOptionValue);
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
        <div className="text-sm text-muted w-100 text-wrap">
          Tokens available: {option.tokenBalance}
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
