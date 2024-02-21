const {
  selectedValue,
  onChange,
  label,
  options,
  defaultLabel,
  showSearch,
  searchInputPlaceholder,
  searchByLabel,
  searchByValue,
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
    setSelectedOption({
      label:
        options?.find((item) => item.value === selectedValue)?.label ??
        defaultLabel,
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

  const filteredOptions = options.filter((option) => {
    if (searchByLabel) {
      return option.label.toLowerCase().includes(term);
    }
    if (searchByValue) {
      return option.value.toLowerCase().includes(term);
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
  onChange(option.value);
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

  .dropdown-item.active,
  .dropdown-item:active {
    background-color: #f0f0f0 !important;
    color: black;
  }

  .custom-select {
    position: relative;
  }

  .scroll-box {
    max-height: 200px;
    overflow-y: scroll;
  }

  .selected {
    background-color: #f0f0f0;
  }

  input {
    background-color: #f8f9fa;
  }

  .cursor-pointer {
    cursor: pointer;
  }
`;

let searchFocused = false;
return (
  <Container>
    <label>{label}</label>
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
        className="dropdown-toggle bg-white border rounded-2 btn drop-btn"
        onClick={toggleDropdown}
      >
        <div
          className={`selected-option ${
            selectedOption.label === defaultLabel ? "text-grey" : ""
          }`}
        >
          {selectedOption.label}
        </div>
      </div>

      {isOpen && (
        <div className="dropdown-menu dropdown-menu-end dropdown-menu-lg-start px-2 shadow show">
          {showSearch && (
            <input
              type="text"
              className="form-control mb-2"
              placeholder="Search options"
              value={searchTerm}
              onChange={handleSearch}
              onFocus={() => {
                searchFocused = true;
              }}
              onBlur={() => {
                setTimeout(() => {
                  searchFocused = false;
                  // setIsOpen(false);
                }, 0);
              }}
              placeholder={searchInputPlaceholder ?? "Search options"}
            />
          )}
          <div className="scroll-box">
            {filteredOptions.map((option) => (
              <div
                key={option.value}
                className={`dropdown-item cursor-pointer ${
                  selectedOption.value === option.value ? "selected" : ""
                }`}
                onClick={() => handleOptionClick(option)}
              >
                {option.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </Container>
);
