const { Modal, ModalContent, ModalHeader, ModalFooter } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal"
);

const {
  modalTitle,
  options,
  onSelect,
  renderOption,
  dropdownLabel,
  selectedElement,
  searchPlaceholder,
  enableSearch,
  disabled,
  dataTestId,
} = props;

State.init({
  showModal: false,
  searchValue: "",
  filteredOptions: options || [],
});

const { showModal, searchValue, filteredOptions } = state;

useEffect(() => {
  if (!searchValue || !enableSearch) {
    State.update({ filteredOptions: options || [] });
  } else {
    const filtered = (options || []).filter((option) => {
      // If option is an object
      if (typeof option === "object" && option !== null) {
        return (option.name || option.label || option.id || option.value || "")
          .toString()
          .toLowerCase()
          .includes(searchValue.toLowerCase());
      }
      // If option is a string, search directly
      return option
        .toString()
        .toLowerCase()
        .includes(searchValue.toLowerCase());
    });
    State.update({ filteredOptions: filtered });
  }
}, [searchValue, options, enableSearch]);

return (
  <div>
    <div
      className={`d-flex align-items-center justify-content-between bg-dropdown border rounded-2 btn w-100 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
      onClick={() => !disabled && State.update({ showModal: true })}
      style={{ pointerEvents: disabled ? "none" : "auto" }}
      data-testid={dataTestId}
    >
      <div className="d-flex align-items-center gap-2">
        {selectedElement || dropdownLabel}
      </div>
      <i className="bi bi-chevron-down"></i>
    </div>
    {showModal && (
      <Modal props={{ maxHeight: "600px", minWidth: "500px" }}>
        <ModalHeader>
          <div className="d-flex align-items-center justify-content-between">
            <div className="h5 fw-bold mb-0">{modalTitle}</div>
            <i
              className="bi bi-x-lg h4 mb-0 cursor-pointer"
              onClick={() => State.update({ showModal: false })}
            ></i>
          </div>
        </ModalHeader>
        <ModalContent>
          <div className="d-flex flex-column gap-3">
            {enableSearch && (
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Input`}
                props={{
                  onChange: (e) => {
                    State.update({ searchValue: e.target.value });
                  },
                  placeholder: searchPlaceholder || "Search",
                  value: searchValue,
                  inputProps: {
                    type: "text",
                    prefix: <i className="bi bi-search"></i>,
                  },
                  debounceTimeout: 500,
                  style: { flex: 1 },
                  skipPaddingGap: true,
                }}
              />
            )}
            <div className="d-flex flex-column gap-1">
              {!Array.isArray(filteredOptions) ||
              filteredOptions.length === 0 ? (
                <div className="text-center">
                  {!Array.isArray(options) || options.length === 0 ? (
                    <div className="spinner-border spinner-border"></div>
                  ) : (
                    <div>No results found</div>
                  )}
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    className="dropdown-item p-2"
                    key={option}
                    onClick={() => {
                      onSelect(option);
                      State.update({ showModal: false });
                    }}
                  >
                    {renderOption(option)}
                  </div>
                ))
              )}
            </div>
          </div>
        </ModalContent>
      </Modal>
    )}
  </div>
);
