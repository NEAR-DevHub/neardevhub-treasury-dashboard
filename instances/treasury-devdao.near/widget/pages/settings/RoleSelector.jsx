const { getPermissionsText } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  getPermissionsText: () => {},
};

const { href } = VM.require(`${REPL_DEVHUB}/widget/core.lib.url`);
href || (href = () => {});

const { selected, onChange, disabled, availableOptions, hideDropdown } = props;

const [selectedOptions, setSelectedOptions] = useState([]);
const [isOpen, setIsOpen] = useState(false);
const [initialStateApplied, setInitialState] = useState(false);

const toggleDropdown = () => {
  setIsOpen(!isOpen);
};

useEffect(() => {
  if (JSON.stringify(selectedOptions) !== JSON.stringify(selected)) {
    if (availableOptions.length > 0) {
      if ((selected ?? []).some((i) => !i.value)) {
        setSelectedOptions(
          selected.map((i) => availableOptions.find((t) => t.value === i))
        );
      } else {
        setSelectedOptions(selected);
      }
      setInitialState(true);
    }
  } else {
    setInitialState(true);
  }
}, [selected, availableOptions]);

useEffect(() => {
  if (
    JSON.stringify(selectedOptions) !== JSON.stringify(selected) &&
    initialStateApplied
  ) {
    onChange(selectedOptions);
  }
}, [selectedOptions, initialStateApplied]);

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
    font-size: 13px;
  }
`;

const handleOptionClick = (option) => {
  if (!(selectedOptions ?? []).some((item) => item.value === option.value)) {
    setSelectedOptions([...selectedOptions, option]);
  }
  setIsOpen(false);
};

const Item = ({ option }) => {
  return (
    <div className="w-100 text-wrap">
      {option.title}
      <div className="text-muted text-sm">
        {getPermissionsText(option.title)}
      </div>
    </div>
  );
};

return (
  <Container className="d-flex flex-column gap-1">
    <div className="d-flex gap-2 align-items-center">
      {(selectedOptions ?? []).map((option) => {
        return (
          <div
            style={{
              width: "max-content",
              border: "1px solid #e2e6ec",
            }}
            className="d-flex gap-2 align-items-center rounded-pill px-2 py-1 mb-0 text-black"
          >
            {option.title}
            {!disabled && (
              <div
                className="cursor-pointer"
                onClick={() => {
                  const updatedOptions = selectedOptions.filter(
                    (item) => item.value !== option.value
                  );
                  setSelectedOptions(updatedOptions);
                }}
              >
                <i className="bi bi-trash3-fill"></i>
              </div>
            )}
          </div>
        );
      })}
    </div>
    <div>
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
          <div className={`selected-option`}>Select</div>
        </div>

        {isOpen && (
          <div className="dropdown-menu rounded-2 dropdown-menu-end dropdown-menu-lg-start px-2 shadow show w-100">
            <div>
              {(availableOptions ?? []).map((option) => (
                <div
                  key={option.value}
                  className={`dropdown-item cursor-pointer w-100 my-1 ${
                    (selectedOptions ?? []).find(
                      (item) => item.value === option.value
                    )
                      ? "selected"
                      : ""
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
    </div>
  </Container>
);
