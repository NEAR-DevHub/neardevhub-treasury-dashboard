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
  isMulti,
} = props;

// Set default value explicitly instead of in the destructuring pattern
const multiSelect = isMulti === true;

const [searchTerm, setSearchTerm] = useState("");
const [filteredOptions, setFilteredOptions] = useState(options);
const [isOpen, setIsOpen] = useState(false);

const [selectedOption, setSelectedOption] = useState({
  label:
    options?.find((item) => item.value === selectedValue)?.label ??
    defaultLabel,
  value: selectedValue || defaultLabel,
});

const [selectedOptions, setSelectedOptions] = useState(
  multiSelect
    ? Array.isArray(selectedValue)
      ? selectedValue.map(
          (value) =>
            options?.find((item) => item.value === value) || {
              label: value,
              value,
            }
        )
      : selectedValue
      ? [
          options?.find((item) => item.value === selectedValue) || {
            label: selectedValue,
            value: selectedValue,
          },
        ]
      : []
    : []
);

useEffect(() => {
  if (!multiSelect && selectedOption.value !== selectedValue) {
    setSelectedOption({
      label:
        options?.find((item) => item.value === selectedValue)?.label ??
        defaultLabel,
      value: selectedValue || defaultLabel,
    });
  }
}, [selectedValue, multiSelect]);

useEffect(() => {
  if (multiSelect && Array.isArray(selectedValue)) {
    setSelectedOptions(
      selectedValue.map(
        (value) =>
          options?.find((item) => item.value === value) || {
            label: value,
            value,
          }
      )
    );
  }
}, [selectedValue, multiSelect, options]);

useEffect(() => {
  setFilteredOptions(options);
}, [options]);

const addItem = (option) => {
  if (!selectedOptions.some((item) => item.value === option.value)) {
    const newSelectedOptions = [...selectedOptions, option];
    setSelectedOptions(newSelectedOptions);
    if (onChange) {
      onChange(multiSelect ? newSelectedOptions : option);
    }
  }
};

const removeItem = (optionValue) => {
  const newSelectedOptions = selectedOptions.filter(
    (item) => item.value !== optionValue
  );
  setSelectedOptions(newSelectedOptions);
  if (onChange) {
    onChange(
      multiSelect
        ? newSelectedOptions
        : newSelectedOptions.length > 0
        ? newSelectedOptions[0]
        : null
    );
  }
};

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
  if (multiSelect) {
    if (selectedOptions.some((item) => item.value === option.value)) {
      removeItem(option.value);
    } else {
      addItem(option);
    }
  } else {
    setSelectedOption(option);
    setIsOpen(false);
    if (onChange) {
      onChange(option);
    }
  }
};

const Container = styled.div`
  .drop-btn {
    width: 100%;
    text-align: left;
    padding-inline: 10px;
    position: relative;
    min-height: 38px; /* Standard height for inputs */
    display: flex;
    align-items: center;
  }

  .dropdown-toggle:after {
    position: absolute;
    top: 46%;
    right: 10px;
  }

  .dropdown-menu {
    width: 100%;
  }

  .custom-select {
    position: relative;
    width: 100%;
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

  .multi-select-container {
    position: relative;
    width: 100%;
    overflow: hidden;
    padding-right: 20px; /* Space for dropdown arrow */
  }

  .selected-tags-wrapper {
    width: 100%;
    overflow-x: auto;
    white-space: nowrap;
    scrollbar-width: thin;
    -ms-overflow-style: none;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  }

  .selected-tags-wrapper::-webkit-scrollbar {
    height: 4px;
  }

  .selected-tags-wrapper::-webkit-scrollbar-track {
    background: transparent;
  }

  .selected-tags-wrapper::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .selected-tags {
    display: inline-flex;
    flex-wrap: nowrap;
    gap: 5px;
    padding: 2px 0;
    min-height: 30px;
  }

  .selected-tag {
    background-color: var(--grey-04);
    border-radius: 4px;
    padding: 2px 8px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
  }

  .remove-tag {
    cursor: pointer;
    font-size: 12px;
  }
`;
let searchFocused = false;
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
      <div className="dropdown-toggle bg-dropdown border rounded-2 btn drop-btn">
        {multiSelect ? (
          <div className="multi-select-container">
            {selectedOptions.length > 0 ? (
              <div className="selected-tags-wrapper" onClick={toggleDropdown}>
                <div className="selected-tags">
                  {selectedOptions.map((option) => (
                    <div key={option.value} className="selected-tag">
                      <span>{option.label}</span>
                      <span
                        className="remove-tag"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(option.value);
                        }}
                      >
                        ×
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-secondary" onClick={toggleDropdown}>
                {defaultLabel}
              </div>
            )}
          </div>
        ) : (
          <div
            className={`selected-option w-100 text-wrap ${
              selectedOption.label === defaultLabel ? "text-secondary" : ""
            }`}
            onClick={toggleDropdown}
          >
            {selectedOption.label ?? defaultLabel}
          </div>
        )}
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
                src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"}
              />
            </div>
          ) : (
            <div className="scroll-box">
              {filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={`dropdown-item cursor-pointer w-100 text-wrap ${
                    multiSelect
                      ? selectedOptions.some(
                          (item) => item.value === option.value
                        )
                        ? "selected"
                        : ""
                      : selectedOption.value === option.value
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => handleOptionClick(option)}
                >
                  {option.label}
                </div>
              ))}
            </div>
          )}
          {showManualRequest && (
            <div
              className="btn primary-text-color cursor-pointer btn-link d-flex gap-2 align-items-center text-decoration-none mt-1"
              onClick={() => {
                if (multiSelect) {
                  setSelectedOptions([]);
                } else {
                  setSelectedOption(null);
                }
                onClickOfManualRequest();
                setIsOpen(false);
              }}
            >
              <i className="bi bi-plus-lg h5 mb-0"></i>Add manual request
            </div>
          )}
        </div>
      )}
    </div>
  </Container>
);
