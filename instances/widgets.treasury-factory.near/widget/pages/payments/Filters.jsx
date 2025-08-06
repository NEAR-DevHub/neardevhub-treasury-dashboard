const {
  activeFilters,
  setActiveFilters,
  treasuryDaoID,
  instance,
  isPendingRequests,
  amountValues,
  setAmountValues,
} = props;

// Available filters configuration
const [availableFilters] = useState([
  ...(!isPendingRequests
    ? [
        {
          key: "created_date",
          label: "Created Date",
          type: "date",
          multiple: false,
        },
        {
          key: "status",
          label: "Status",
          type: "status",
          multiple: false,
        },
      ]
    : []),
  { key: "recipients", label: "Recipient", type: "account", multiple: true },
  { key: "token", label: "Token", type: "token", multiple: false },
  { key: "proposers", label: "Created by", type: "account", multiple: true },
  { key: "approvers", label: "Approver", type: "account", multiple: true },
  ...(context.accountId
    ? [
        {
          key: "votes",
          label: "My Vote Status",
          type: "vote",
          multiple: false,
        },
      ]
    : []),
]);

const [approverOptions, setApproverOptions] = useState([]);
const [recipientOptions, setRecipientOptions] = useState([]);
const [tokenOptions, setTokenOptions] = useState([]);
const [proposerOptions, setProposerOptions] = useState([]);

const fetchOptions = (endpoint, setter, key) => {
  asyncFetch(`${REPL_SPUTNIK_INDEXER}/proposals/${treasuryDaoID}/${endpoint}`)
    .then((response) => {
      if (response.status === 200) {
        setter(response.body?.[key]);
      } else {
        console.error(`Error fetching ${key} options:`, response.status);
        setter([]);
      }
    })
    .catch((error) => {
      console.error(`Error fetching ${key} options:`, error);
      setter([]);
    });
};

useEffect(() => {
  if (treasuryDaoID) {
    fetchOptions("approvers", setApproverOptions, "approvers");
    fetchOptions("recipients", setRecipientOptions, "recipients");
    fetchOptions("requested-tokens", setTokenOptions, "requested_tokens");
    fetchOptions("proposers", setProposerOptions, "proposers");
  }
}, [treasuryDaoID]);

const getOptionsForFilter = (filterKey) => {
  const optionsMap = {
    approvers: approverOptions,
    recipients: recipientOptions,
    token: tokenOptions,
    proposers: proposerOptions,
  };
  return optionsMap[filterKey] || [];
};

const addFilter = (filterKey) => {
  setActiveFilters((prev) => ({
    ...prev,
    [filterKey]: {
      include: true,
      values: [],
    },
  }));
};

const removeFilter = (filterKey) => {
  setActiveFilters((prev) => {
    const newFilters = { ...prev };
    delete newFilters[filterKey];
    return newFilters;
  });
};

const updateFilterInclude = (filterKey, include) => {
  setActiveFilters((prev) => ({
    ...prev,
    [filterKey]: {
      ...prev[filterKey],
      include,
    },
  }));
};

const handleFilterSelection = (filterKey, selectedValues, include) => {
  setActiveFilters((prev) => ({
    ...prev,
    [filterKey]: {
      include: include !== undefined ? include : prev[filterKey]?.include,
      values: selectedValues,
    },
  }));
};

const clearAllFilters = () => {
  setActiveFilters({});
};

const getFilterLabel = (key) => {
  return availableFilters.find((f) => f.key === key)?.label || key;
};

const getFilterType = (key) => {
  return availableFilters.find((f) => f.key === key)?.type || "text";
};

const getFilterMultiple = (key) => {
  return availableFilters.find((f) => f.key === key)?.multiple || false;
};

const availableFiltersToAdd = availableFilters.filter(
  (filter) => !activeFilters[filter.key]
);

return (
  <div
    className="d-flex align-items-center p-3 flex-wrap"
    style={{ gap: "12px" }}
  >
    {/* Clear All Button */}
    <button
      className="btn btn-sm btn-outline-secondary"
      onClick={clearAllFilters}
      title="Clear all filters"
    >
      <i className="bi bi-x-lg"></i>
    </button>

    {/* Separator */}
    {Object.entries(activeFilters).length > 0 && (
      <div
        style={{
          height: "42px",
          marginBlock: "auto",
          minWidth: "1px",
          backgroundColor: "var(--border-color)",
        }}
      />
    )}

    {/* Active Filters */}
    {Object.entries(activeFilters).map(([filterKey, filterData]) => (
      <div key={filterKey} className="d-flex gap-2">
        <Widget
          loading=""
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.FiltersDropdown`}
          props={{
            label: getFilterLabel(filterKey),
            type: getFilterType(filterKey),
            selected: filterData.values || [],
            include: filterData.include,
            setSelected: (values) => handleFilterSelection(filterKey, values),
            onIncludeChange: (include) =>
              updateFilterInclude(filterKey, include),
            options: getOptionsForFilter(filterKey),
            instance,
            multiple: getFilterMultiple(filterKey),
            setAmountValues,
            amountValues,
            removeFilter: () => removeFilter(filterKey),
            isPendingRequests,
          }}
        />
      </div>
    ))}
    {/* Add Filter Dropdown */}
    {availableFiltersToAdd.length > 0 && (
      <div className="dropdown">
        <button
          className="btn btn-outline-secondary"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          <i className="bi bi-plus-lg"></i> Add Filter
        </button>
        <ul className="dropdown-menu">
          {availableFiltersToAdd.map((filter) => (
            <li key={filter.key}>
              <button
                className="dropdown-item"
                onClick={() => addFilter(filter.key)}
              >
                {filter.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);
