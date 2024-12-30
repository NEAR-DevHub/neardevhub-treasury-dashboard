const {
  selectedValue,
  onChange,
  options,
  defaultLabel,
  showSearch,
  searchInputPlaceholder,
  selectedWallet,
  disabled,
} = props;

const [searchTerm, setSearchTerm] = useState("");
const [filteredOptions, setFilteredOptions] = useState(options);
const [isOpen, setIsOpen] = useState(false);
const [selectedOption, setSelectedOption] = useState(selectedValue);

useEffect(() => {
  if (JSON.stringify(selectedOption) !== JSON.stringify(selectedValue)) {
    setSelectedOption(selectedValue);
  }
}, [selectedValue]);

useEffect(() => {
  setFilteredOptions(options);
}, [options]);

const handleSearch = (event) => {
  const term = event.target.value.toLowerCase();
  setSearchTerm(term);
  const filteredOptions = options.filter((option) => {
    return option.pool_id.toString().toLowerCase().includes(term);
  });

  setFilteredOptions(filteredOptions);
};

const toggleDropdown = () => {
  setIsOpen(!isOpen);
};

const handleOptionClick = (option) => {
  setSelectedOption(option);
  setIsOpen(false);
  onChange(option);
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
    right: 5%;
  }

  .dropdown-menu {
    width: 100%;
  }

  .custom-select {
    position: relative;
  }

  .scroll-box {
    max-height: 200px;
    overflow-y: scroll;
  }

  .selected {
    background-color: var(--grey-04);
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .text-wrap {
    overflow: hidden;
    white-space: normal;
  }

  .text-orange {
    color: rgba(255, 149, 0, 1) !important;
  }

  .disabled {
    background-color: rgba(244, 244, 244, 1) !important;
    color: #999999 !important;
    border-color: #e2e6ec;
    cursor: not-allowed !important;
    border-radius: 5px;
    opacity: inherit !important;
  }

  .text-green {
    color: #34c759;
  }
`;

let searchFocused = false;

function formatNearAmount(amount) {
  return Big(amount ?? "0")
    .div(Big(10).pow(24))
    .toFixed(2);
}

const BalanceDisplay = ({ balance, label }) => {
  if (balance <= 0 || balance <= 1) return null;

  return (
    <div className="d-flex align-items-center gap-1 text-sm">
      <div className="text-secondary">{label}</div>
      <div className="text-orange">{formatNearAmount(balance)} NEAR</div>
    </div>
  );
};

if (!Array.isArray(options) || !options?.length) {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center w-100 h-100">
      <Widget
        src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"}
      />
    </div>
  );
}

return (
  <Container>
    <div
      className="custom-select"
      tabIndex="0"
      onBlur={() => {
        setTimeout(() => {
          setIsOpen(searchFocused || false);
        }, 0);
      }}
    >
      <div
        className={
          "dropdown-toggle bg-dropdown border rounded-2 btn drop-btn " +
          (disabled && " disabled")
        }
        data-testid="validator-dropdown"
        onClick={!disabled && toggleDropdown}
      >
        <div
          className={`selected-option w-100 text-wrap ${
            selectedOption.pool_id === defaultLabel ? "text-secondary" : ""
          }`}
        >
          {selectedOption.pool_id ?? defaultLabel}
        </div>
      </div>

      {isOpen && (
        <div className="dropdown-menu dropdown-menu-end dropdown-menu-lg-start px-2 shadow show">
          {showSearch && (
            <input
              type="text"
              className="form-control mb-2"
              placeholder={searchInputPlaceholder ?? "Search options"}
              value={searchTerm}
              onChange={handleSearch}
              onFocus={() => {
                searchFocused = true;
              }}
              onBlur={() => {
                setTimeout(() => {
                  searchFocused = false;
                }, 0);
              }}
            />
          )}
          <div className="scroll-box">
            {filteredOptions.map((option) => {
              const { pool_id, fee, stakedBalance } = option;
              return (
                <div
                  key={pool_id}
                  className={`dropdown-item cursor-pointer w-100 text-wrap px-3 text-truncate d-flex flex-column gap-1 border-bottom ${
                    selectedOption.pool_id === pool_id ? "selected" : ""
                  }`}
                  style={{ paddingBlock: "0.8rem" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionClick(option);
                  }}
                >
                  <div className="d-flex align-items-center gap-2 text-sm">
                    <span className="text-secondary">{fee}% Fee </span>
                    <span className="text-green">Active</span>
                  </div>
                  <div className="h6 mb-0"> {pool_id} </div>
                  {stakedBalance?.[selectedWallet] && (
                    <div className="d-flex flex-column gap-1">
                      <BalanceDisplay
                        label="Staked:"
                        balance={stakedBalance?.[selectedWallet].stakedBalance}
                      />
                      <BalanceDisplay
                        label="Pending release:"
                        balance={
                          stakedBalance?.[selectedWallet].unstakedBalance
                        }
                      />
                      <BalanceDisplay
                        label="Available for withdrawal:"
                        balance={
                          stakedBalance?.[selectedWallet]
                            .availableToWithdrawBalance
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  </Container>
);
