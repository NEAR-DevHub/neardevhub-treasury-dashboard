const { generateFilteredProposalsQuery } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common`
);

const currentPage = props.page;
const instance = props.instance;
const activeFilters = props.activeFilters;
const amountValues = props.amountValues;
const search = props.search;

if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const [csvUrl, setCsvUrl] = useState("");

const generateCsvUrl = () => {
  let endpoint = `${REPL_SPUTNIK_INDEXER}/csv/proposals/${treasuryDaoID}`;
  switch (currentPage) {
    case "payments": {
      endpoint += `?category=payments`;
      break;
    }
    case "stake-delegation": {
      endpoint += `?category=stake-delegation`;
      break;
    }
    case "asset-exchange": {
      endpoint += `?category=asset-exchange`;
      break;
    }
    case "lockup": {
      endpoint += `?category=lockup`;
      break;
    }
    default: {
      break;
    }
  }
  setCsvUrl(endpoint);
};

useEffect(() => {
  generateCsvUrl();
}, [currentPage]);

const options = [
  {
    label: "All Requests",
    value: "all",
  },
  { label: "Filtered Requests Only", value: "filtered" },
];

if (Object.keys(activeFilters || {}).length > 0 || search) {
  return (
    <div className="dropdown">
      <button
        type="button"
        data-bs-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
        className="btn btn-outline-secondary d-flex gap-1 align-items-center"
      >
        <i class="bi bi-download h6 mb-0"></i>
        <span className="responsive-text">Export as CSV</span>
      </button>
      <ul className="dropdown-menu">
        {options.map(({ label, value }) => (
          <a
            key={value}
            data-testid={`export-${value}`}
            href={
              value === "all"
                ? csvUrl
                : `${csvUrl}&${generateFilteredProposalsQuery(
                    activeFilters,
                    context.accountId,
                    amountValues,
                    search
                  )}`
            }
            download="proposals.csv"
            target="_blank"
            rel="noopener noreferrer"
            className="dropdown-item cursor-pointer"
          >
            {label}
          </a>
        ))}
      </ul>
    </div>
  );
}
return (
  <div>
    {csvUrl && (
      <a
        href={csvUrl}
        download="proposals.csv"
        target="_blank"
        rel="noopener noreferrer"
      >
        <button className="btn btn-outline-secondary d-flex gap-1 align-items-center">
          <i class="bi bi-download h6 mb-0"></i>
          <span className="responsive-text">Export as CSV</span>
        </button>
      </a>
    )}
  </div>
);
