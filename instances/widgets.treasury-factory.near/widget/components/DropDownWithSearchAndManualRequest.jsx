const {
  selectedValue,
  onChange,
  options,
  defaultLabel,
  showSearch,
  searchInputPlaceholder,
  searchByLabel,
  searchByValue,
  onSearch,
  showManualRequest,
  onClickOfManualRequest,
  isLoadingProposals,
  dataTestId,
  disabled,
  showCircularIcon,
} = props;

const [searchTerm, setSearchTerm] = useState("");
const [filteredOptions, setFilteredOptions] = useState(options);
const [isOpen, setIsOpen] = useState(false);
const [selectedOption, setSelectedOption] = useState({
  label:
    options?.find((item) => item.value === selectedValue)?.label ??
    defaultLabel,
  value: defaultLabel,
});

useEffect(() => {
  if (selectedOption.value !== selectedValue) {
    const option = options?.find((item) => item.value === selectedValue);
    setSelectedOption({
      label: option?.label ?? defaultLabel,
      icon: option?.icon,
      value: defaultLabel,
    });
  }
}, [selectedValue]);

useEffect(() => {
  setFilteredOptions(options);
}, [options]);

const handleSearch = (event) => {
  const term = event.target.value.toLowerCase();
  setSearchTerm(term);
  if (typeof onSearch === "function") {
    onSearch(term);
    return;
  }

  const filteredOptions = options.filter((option) => {
    if (searchByLabel) {
      return option.label.toLowerCase().includes(term);
    }
    if (searchByValue) {
      return option.value.toString().toLowerCase().includes(term);
    }
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

  .text-wrap {
    overflow: hidden;
    white-space: normal;
  }

  .dropdown-icon {
    width: 1.3em;
    height: 1.3em;
    margin-right: 0.3em;
    vertical-align: middle;
  }
`;
let searchFocused = false;
return (
  <Container>
    <div
      className="custom-select"
      tabIndex="0"
      onBlur={() => {
        setTimeout(
          () => {
            setIsOpen(searchFocused || false);
          },
          // The delay of 200ms is to allow the onClick event of the dropdown items to register before closing the dropdown
          200
        );
      }}
    >
      <div
        className="dropdown-toggle bg-dropdown border rounded-2 btn drop-btn"
        data-testid={`${dataTestId}-btn`}
      >
        <div
          className={`selected-option d-flex align-items-center w-100 text-wrap ${
            selectedOption.label === defaultLabel ? "text-secondary" : ""
          }`}
          onClick={!disabled && toggleDropdown}
        >
          {selectedOption.icon && (
            <img
              className={`dropdown-icon ${
                showCircularIcon ? "rounded-circle object-fit-cover" : ""
              }`}
              src={selectedOption.icon}
            />
          )}
          {selectedOption.label ?? defaultLabel}
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
          {isLoadingProposals ? (
            <div className="d-flex justify-content-center align-items-center w-100 h-100">
              <Widget
                loading=""
                src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"}
              />
            </div>
          ) : (
            <div className="scroll-box">
              {filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={`dropdown-item cursor-pointer w-100 text-wrap py-1 ${
                    selectedOption.value === option.value ? "selected" : ""
                  }`}
                  onClick={() => handleOptionClick(option)}
                >
                  <div className="d-flex align-items-start">
                    {option.icon && (
                      <img 
                        className={`dropdown-icon ${
                          showCircularIcon
                            ? "rounded-circle object-fit-cover"
                            : ""
                        }`}
                        src={option.icon} 
                      />
                    )}
                    <div className="flex-grow-1">
                      <div>{option.label}</div>
                      {option.subLabel && (
                        <small className="text-muted d-block">{option.subLabel}</small>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showManualRequest && (
            <div
              className="btn primary-text-color cursor-pointer btn-link d-flex gap-2 align-items-center text-decoration-none mt-1"
              onClick={() => {
                setSelectedOption(null);
                onClickOfManualRequest();
                setIsOpen(false);
              }}
            >
              <i class="bi bi-plus-lg h5 mb-0"></i>Add manual request
            </div>
          )}
        </div>
      )}
    </div>
  </Container>
);
