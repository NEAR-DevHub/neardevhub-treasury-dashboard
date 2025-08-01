const currentPage = props.page;
const instance = props.instance;

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
