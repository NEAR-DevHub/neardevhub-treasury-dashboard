const {
  label,
  options,
  setSelected,
  selected,
  type,
  instance,
  onIncludeChange,
  multiple,
  setAmountValues,
  amountValues,
  removeFilter,
  include,
  isPendingRequests,
} = props;

const [search, setSearch] = useState("");
const [isOpen, setIsOpen] = useState(false);
const [tokenDropdownOpen, setTokenDropdownOpen] = useState(false);
const [amountTypeDropdownOpen, setAmountTypeDropdownOpen] = useState(false);
const [includeDropdownOpen, setIncludeDropdownOpen] = useState(false);
const hideInclude = type === "vote" || type === "date";

const Container = styled.div`
  font-size: 14px;

  .form-check-input[type="checkbox"] {
    min-width: 18px;
    min-height: 18px;
  }

  label {
    font-size: 12px;
    margin-bottom: 5px;
  }

  .hide-border {
    border: none !important;
  }

  .dropdown-item {
    padding: 8px 12px !important;
  }

  /* Custom styles not available in Tailwind */
  .search-input-container {
    position: relative;
    padding: 4px 12px;
  }

  .search-input {
    padding-left: 2.5rem;
    font-size: 14px !important;
  }

  .search-icon {
    position: absolute;
    left: 25px;
    top: 50%;
    transform: translateY(-50%);
    color: #6c757d;
  }

  .scrollable-options {
    max-height: 200px;
    overflow-y: auto;
  }

  .token-dropdown-container {
    padding-inline: 12px;
  }

  .date-dropdown-container {
    padding: 0px 8px 12px;
  }
`;

const statusOptions = ["Approved", "Rejected", "Failed", "Expired"];
const voteOptions = [
  "Approved",
  "Rejected",
  isPendingRequests ? "Awaiting Decision" : "Not Voted",
];
const includeOptions = [
  { value: true, label: multiple ? "is any" : "is" },
  { value: false, label: multiple ? "is not all" : "is not" },
];
const amountOptions = [
  { label: "Is", value: "is" },
  { label: "Between", value: "between" },
  { label: "More than", value: ">" },
  { label: "Less than", value: "<" },
];

const handleSelection = (item, e) => {
  if (multiple) {
    e.stopPropagation();
    const newValues = selected.includes(item)
      ? selected.filter((v) => v !== item)
      : [...selected, item];
    setSelected(newValues);
  } else {
    setSelected(selected.includes(item) ? [] : [item]);
    setIsOpen(false);
  }
};

const handleDateChange = (index, value) => {
  const newValues = [...selected];
  newValues[index] = value;
  setSelected(newValues);
};

const handleAmountTypeChange = (option) => {
  setAmountValues({
    min: "",
    max: "",
    equal: "",
    value: option.value,
  });
  setAmountTypeDropdownOpen(false);
};

const handleAmountValueChange = (field, value) => {
  setAmountValues({
    ...amountValues,
    [field]: value,
  });
};

// Render different filter types
const OptionRender = () => {
  switch (type) {
    case "account":
      const filteredAccounts = options.filter((account) =>
        (account || "")?.toLowerCase().includes(search.toLowerCase())
      );

      return (
        <div>
          <div className="search-input-container">
            <input
              type="text"
              className="form-control search-input"
              placeholder="Search by account address"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <i className="bi bi-search search-icon" />
          </div>
          <div className="scrollable-options">
            {filteredAccounts.map((account) => (
              <div
                key={account}
                className="d-flex align-items-center gap-2 dropdown-item cursor-pointer"
                onClick={(e) => handleSelection(account, e)}
              >
                <input
                  type="checkbox"
                  className="form-check-input"
                  role="switch"
                  checked={selected.includes(account)}
                />
                <div className="text-truncate">
                  <Widget
                    loading=""
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
                    props={{
                      accountId: account,
                      showKYC: false,
                      displayImage: true,
                      displayName: true,
                      instance,
                      profileClass: "text-secondary text-sm",
                      displayHoverCard: false,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "token":
      const filteredTokens = options.filter((token) =>
        (token || "").toLowerCase().includes(search.toLowerCase())
      );

      return (
        <div
          className="pb-2 d-flex flex-column gap-2 token-dropdown-container"
          onClick={(e) => e.stopPropagation()}
          onBlur={() => {
            setTimeout(() => setTokenDropdownOpen(false), 200);
          }}
        >
          <div className="dropdown w-100">
            <button
              className="btn btn-sm btn-outline-secondary dropdown-toggle w-100 text-start d-flex align-items-center justify-content-between"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTokenDropdownOpen(!tokenDropdownOpen);
              }}
            >
              <div className="d-flex align-items-center">
                {selected.length > 0 ? (
                  <div style={{ width: "fit-content" }}>
                    <Widget
                      loading=""
                      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenIcon`}
                      props={{ address: selected[0] }}
                    />
                  </div>
                ) : (
                  "Select Token"
                )}
              </div>
            </button>
            {tokenDropdownOpen && (
              <div className="dropdown-menu show w-100">
                {filteredTokens.map((token) => (
                  <div
                    key={token}
                    className="dropdown-item cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelection(token, e);
                      setTokenDropdownOpen(false);
                    }}
                  >
                    <div style={{ width: "fit-content" }}>
                      <Widget
                        loading=""
                        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenIcon`}
                        props={{ address: token }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selected.length > 0 && include && (
            <div className="d-flex flex-column">
              <div className="d-flex align-items-center gap-2">
                <div className="text-secondary text-sm">Amount</div>
                <div
                  onBlur={() => {
                    setTimeout(() => setAmountTypeDropdownOpen(false), 200);
                  }}
                >
                  <div className="dropdown">
                    <button
                      className="btn btn-sm btn-outline-secondary dropdown-toggle hide-border"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAmountTypeDropdownOpen(!amountTypeDropdownOpen);
                      }}
                    >
                      {
                        amountOptions.find(
                          (option) => option.value === amountValues.value
                        )?.label
                      }
                    </button>
                    {amountTypeDropdownOpen && (
                      <div className="dropdown-menu show">
                        {amountOptions.map((option) => (
                          <div
                            key={option.value}
                            className="dropdown-item cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAmountTypeChange(option);
                            }}
                          >
                            {option.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {amountValues.value && (
                <div className="d-flex align-items-center gap-2">
                  {amountValues.value === "between" ? (
                    <div className="d-flex align-items-center gap-2">
                      <div>
                        <label>From</label>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          placeholder="0"
                          value={amountValues.min}
                          onChange={(e) =>
                            handleAmountValueChange("min", e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div>
                        <label>To</label>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          placeholder="0"
                          value={amountValues.max}
                          onChange={(e) =>
                            handleAmountValueChange("max", e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  ) : (
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      placeholder="0"
                      value={
                        amountValues.value === ">"
                          ? amountValues.min
                          : amountValues.value === "<"
                          ? amountValues.max
                          : amountValues.equal
                      }
                      onChange={(e) => {
                        const field =
                          amountValues.value === ">"
                            ? "min"
                            : amountValues.value === "<"
                            ? "max"
                            : "equal";
                        handleAmountValueChange(field, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );

    case "status":
      const filteredStatuses = statusOptions.filter((status) =>
        (status || "").toLowerCase().includes(search.toLowerCase())
      );

      return (
        <div>
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {filteredStatuses.map((status) => (
              <div
                key={status}
                className="dropdown-item"
                onClick={(e) => handleSelection(status, e)}
              >
                <div style={{ width: "fit-content" }}>
                  <Widget
                    loading=""
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.HistoryStatus`}
                    props={{
                      instance,
                      isVoteStatus: false,
                      status: status,
                      isPaymentsPage: true,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "vote":
      const filteredVotes = voteOptions.filter((vote) =>
        (vote || "").toLowerCase().includes(search.toLowerCase())
      );

      return (
        <div>
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {filteredVotes.map((vote) => (
              <div
                key={vote}
                className="d-flex align-items-center gap-2 dropdown-item"
                onClick={(e) => handleSelection(vote, e)}
              >
                <span>{vote}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "date":
      return (
        <div className="d-flex flex-column gap-2 date-dropdown-container">
          <div className="d-flex align-items-center gap-2">
            <div>
              <label className="text-secondary text-sm">From Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={selected[0] || ""}
                max={selected[1] || undefined}
                onChange={(e) => handleDateChange(0, e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div>
              <label className="text-secondary text-sm">To Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                min={selected[0] || undefined}
                value={selected[1] || ""}
                onChange={(e) => handleDateChange(1, e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="p-2">
          <span>No options available for this filter type</span>
        </div>
      );
  }
};

const getDisplayValue = () => {
  if (selected.length === 0) return "";

  if (type === "account") {
    return (
      <div className="d-flex align-items-center">
        {selected.map((accountId, index) => (
          <div
            key={accountId}
            style={{ marginLeft: index > 0 ? "-15px" : "0px" }}
          >
            <Widget
              loading=""
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
              props={{
                accountId: accountId,
                showKYC: false,
                displayImage: true,
                displayName: false,
                displayAddress: false,
                instance,
                imageSize: { width: 30, height: 30 },
              }}
            />
          </div>
        ))}
      </div>
    );
  } else if (type === "token") {
    if (amountValues.value) {
      let amountDisplay = "";

      if (
        amountValues.value === "between" &&
        amountValues.min &&
        amountValues.max
      ) {
        amountDisplay = `${amountValues.min}-${amountValues.max}`;
      } else if (amountValues.value === ">" && amountValues.min) {
        amountDisplay = `> ${amountValues.min}`;
      } else if (amountValues.value === "<" && amountValues.max) {
        amountDisplay = `< ${amountValues.max}`;
      } else if (amountValues.value === "is" && amountValues.equal) {
        amountDisplay = `${amountValues.equal}`;
      }

      if (amountDisplay) {
        return (
          <Widget
            loading=""
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenIcon`}
            props={{ address: selected[0], number: amountDisplay }}
          />
        );
      }
    }

    return (
      <Widget
        loading=""
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenIcon`}
        props={{ address: selected[0] }}
      />
    );
  } else if (type === "date") {
    if (selected[0] || selected[1]) {
      if (selected[0] && selected[1]) {
        return `${selected[0]} to ${selected[1]}`;
      } else if (selected[0]) {
        return `From ${selected[0]}`;
      } else if (selected[1]) {
        return `Until ${selected[1]}`;
      }
    }
    return "";
  } else if (type === "status") {
    return selected[0] === "Approved" ? "Funded" : selected[0];
  } else {
    return selected.join(", ");
  }
};

return (
  <Container className="dropdown">
    <button
      className="btn btn-outline-secondary dropdown-toggle d-flex align-items-center gap-2 justify-content-between"
      type="button"
      data-bs-toggle="dropdown"
      aria-haspopup="true"
      aria-expanded="true"
      style={{ backgroundColor: "var(--grey-05)" }}
    >
      <div className="d-flex align-items-center gap-2 text-start">
        <span className="text-secondary">{label}</span>
        {selected.length > 0 && (
          <div className="d-flex align-items-center gap-2 text-start">
            {!include && (
              <span
                style={{
                  display: hideInclude ? "none" : "inline",
                }}
              >
                {includeOptions[1]?.label}
              </span>
            )}
            <span className="text-secondary">:</span>
            <span>{getDisplayValue()}</span>
          </div>
        )}
      </div>
    </button>

    <div
      className="dropdown-menu rounded-2 dropdown-menu-start shadow w-100 p-0"
      style={{ maxWidth: "320px", minWidth: "320px" }}
    >
      <div
        className="d-flex align-items-center gap-1"
        onBlur={() => {
          setTimeout(() => setIncludeDropdownOpen(false), 200);
        }}
        style={{ padding: hideInclude ? "8px 12px" : "4px 12px" }}
      >
        <span className="text-secondary" style={{ fontSize: "14px" }}>
          {label}
        </span>
        <div className="dropdown">
          <button
            className="btn btn-sm btn-outline-secondary dropdown-toggle hide-border"
            type="button"
            data-bs-toggle="dropdown"
            data-bs-auto-close="false"
            aria-expanded="false"
            onClick={(e) => {
              e.stopPropagation();
              setIncludeDropdownOpen(!includeDropdownOpen);
            }}
            style={{
              display: hideInclude ? "none" : "block",
            }}
          >
            {includeOptions.find((option) => option.value === include)?.label}
          </button>
          {includeDropdownOpen && (
            <ul className="dropdown-menu show">
              {includeOptions.map((option) => (
                <li key={option.value}>
                  <button
                    className={`dropdown-item ${
                      include === option.value ? "active" : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onIncludeChange(option.value);
                      setIncludeDropdownOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div
          className="text-red cursor-pointer ms-auto"
          onClick={(e) => {
            e.stopPropagation();
            removeFilter();
          }}
        >
          <i className="bi bi-trash"></i>
        </div>
      </div>
      <OptionRender />
    </div>
  </Container>
);
