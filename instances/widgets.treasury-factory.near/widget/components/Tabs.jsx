const normalize = (text) =>
  text
    ? text
        .replaceAll(/[- \.]/g, "_")
        .replaceAll(/[^\w]+/g, "")
        .replaceAll(/_+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "")
        .toLowerCase()
        .trim("-")
    : "";

const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const { hasPermission } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  hasPermission: () => {},
};

const { instance } = props;

if (!instance) {
  return <></>;
}

const { treasuryDaoID, cacheURL } = VM.require(
  `${instance}/widget/config.data`
);
console.log("cacheURL", cacheURL);
console.log("treasuryDaoID", treasuryDaoID);

if (!treasuryDaoID || !cacheURL) {
  return <></>;
}

// prop page = // payments, stake-delegation, asset-exchange, settings-history
// prop searchAndFilterHistory // true, false
const { selectedTab, tabs, page, searchAndFilterHistory } = props;

const [currentTabProps, setCurrentTabProps] = useState(null);

const Container = styled.div`
  .border-bottom {
    border-bottom: 1px solid var(--border-color) !important;
  }
`;

const NavUnderline = styled.ul`
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;

  .nav-link {
    color: var(--text-secondary-color) !important;
    padding-bottom: 24px;
  }
  .active {
    color: var(--text-color) !important;
    border-bottom: 3px solid var(--theme-color);
  }
  .nav-link:hover {
    color: var(--text-color) !important;
  }
`;

function findTab(tabTitle) {
  return tabs.find((i) => normalize(i.title) === tabTitle);
}

const [currentTab, setCurrentTab] = useState(null);

useEffect(() => {
  const defaultTab = tabs[0].title;
  let tab = findTab(
    selectedTab ? normalize(selectedTab ?? "") : normalize(defaultTab)
  );
  // in case selectedTab is not provided
  if (!tab) {
    tab = normalize(defaultTab);
  }
  setCurrentTab(tab);
  setCurrentTabProps({ ...tab.props, ...props });
}, [props]);

const hasCreatePermissionPayments = hasPermission(
  treasuryDaoID,
  context?.accountId,
  "transfer",
  "AddProposal"
);

// Proposal data
const [data, setData] = useState([]);
// Search
const [searchInput, setSearchInput] = useState("");
// Filters.
const [author, setAuthor] = useState("");
const [stage, setStage] = useState("");
const [sort, setSort] = useState("id_desc");
const [category, setCategory] = useState("");
const [input, setInput] = useState("");
const [loading, setLoading] = useState(false);
const [searchLoader, setSearchLoader] = useState(false);
const [makeMoreLoader, setMakeMoreLoader] = useState(false);
const [aggregatedCount, setAggregatedCount] = useState(null);
const [currentlyDisplaying, setCurrentlyDisplaying] = useState(0);

// TODO: dynamic
const endpointToCall =
  "https://testing-indexer-2.fly.dev/dao/proposals/testing-astradao.sputnik-dao.near";

function searchCacheApi(dao_id, searchTerm) {
  const uriEncodedSearchTerm = encodeURI(searchTerm);
  const searchURL = `${cacheURL}/dao/proposals/search/${dao_id}/${uriEncodedSearchTerm}`;

  console.log("searchURL", searchURL);
  return asyncFetch(searchURL, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  }).catch((error) => {
    console.log("Error searching cache api", error);
  });
}

function searchProposals(searchInput) {
  if (loading) return console.log("loading");
  setLoading(true);

  searchCacheApi(treasuryDaoID, searchInput).then((result) => {
    let body = result.body;
    console.log("body search result in SearchProposals", body);
    setLoading(false);
  });
}

function fetchCacheApi(variables) {
  const fetchUrl = endpointToCall;
  return asyncFetch(fetchUrl, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  }).catch((error) => {
    console.log("Error fetching cache api", error);
  });
}

function fetchProposals(offset) {
  if (!offset) {
    offset = 0;
  }
  if (loading) return console.log("loading");
  setLoading(true);
  const FETCH_LIMIT = 10;
  const variables = {
    order: sort,
    limit: FETCH_LIMIT,
    offset,
    category: category ? encodeURIComponent(category) : "",
    author_id: author ? encodeURIComponent(author) : "",
    stage: stage ? encodeURIComponent(stage) : "",
  };
  fetchCacheApi(variables).then((result) => {
    const body = result.body;
    console.log("fetchProposals body result after fetch", body.records);
    console.log({ body });
    setData(body?.records || []);
    setLoading(false);
  });
}

useEffect(() => {
  setSearchLoader(true);
  // fetchProposals(); getFilteredProposalsFromIndexer
}, [author, sort, category, stage]);

useEffect(() => {
  const handler = setTimeout(() => {
    if (searchInput) {
      searchProposals(searchInput);
    } else {
      // TODO: this is done in getFilteredProposalsFromIndexer
      // fetchProposals();
    }
  }, 1000);

  return () => {
    clearTimeout(handler);
  };
}, [searchInput]);

const PaymentsSidebarMenu = ({ currentTab }) => {
  return (
    <div
      className="d-flex gap-2 align-items-center"
      style={{ paddingBottom: "16px" }}
    >
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Input`}
        props={{
          className: "flex-grow-1 w-100 w-xs-100",
          key: `search-input`,
          value: searchInput,
          onChange: (e) => {
            console.log("onChange -> e", e);
            setSearchInput(e.target.value);
          },
          onKeyDown: (e) => {
            if (e.key == "Enter") {
              if (searchInput) {
                searchProposals(searchInput);
              } else {
                fetchProposals();
              }
            }
          },
          placeholder: "Search",
          inputProps: {
            suffix: <i class="bi bi-search m-auto"></i>,
          },
        }}
      />
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.FilterDropdown`}
        props={{
          instance,
        }}
      />
      {hasCreatePermissionPayments && (
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
          props={{
            ActionButton: () => (
              <button className="btn primary-button d-flex align-items-center gap-2 mb-0">
                <i class="bi bi-plus-lg h5 mb-0"></i>Create Request
              </button>
            ),
            checkForDeposit: true,
            treasuryDaoID,
            callbackAction: () => setShowCreateRequest(true),
          }}
        />
      )}
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.SettingsDropdown`}
        props={{
          isPendingPage: currentTab.title === "Pending Requests",
          instance,
        }}
      />
    </div>
  );
};

const hasCreatePermissionAssetExchange = hasPermission(
  treasuryDaoID,
  context?.accountId,
  "transfer",
  "AddProposal"
);

const AssetExchangeSidebarMenu = ({ currentTab }) => {
  return (
    <div
      className="d-flex gap-2 align-items-center"
      style={{ paddingBottom: "16px" }}
    >
      {hasCreatePermissionAssetExchange && (
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
          props={{
            ActionButton: () => (
              <button className="btn primary-button d-flex align-items-center gap-2 mb-0">
                <i class="bi bi-plus-lg h5 mb-0"></i>Create Request
              </button>
            ),
            checkForDeposit: true,
            treasuryDaoID,
            callbackAction: () => setShowCreateRequest(true),
          }}
        />
      )}
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.SettingsDropdown`}
        props={{
          isPendingPage: currentTab.title === "Pending Requests",
          instance,
        }}
      />
    </div>
  );
};

const StakeDelegationSidebarMenu = ({ currentTab }) => {
  return (
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.CreateButton`}
      props={{
        instance,
        isPendingPage: currentTab.title === "Pending Requests",
      }}
    />
  );
};

const SettingsHistorySidebarMenu = ({ currentTab }) => {
  return (
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.feed.SettingsDropdown`}
      props={{
        isPendingPage: currentTab.title === "Pending Requests",
      }}
    />
  );
};

return (
  <Container className="card py-3 d-flex flex-column">
    <div
      className="d-flex justify-content-between gap-2 align-items-center border-bottom flex-wrap"
      style={{ paddingRight: "10px" }}
    >
      <NavUnderline className="nav gap-2">
        {tabs.map(
          ({ title }) =>
            title && (
              <li key={title}>
                <div
                  onClick={() => {
                    setCurrentTab(findTab(normalize(title)));
                    setCurrentTabProps({ instance: props.instance });
                  }}
                  className={[
                    "d-inline-flex gap-2 nav-link",
                    normalize(currentTab.title) === normalize(title)
                      ? "active"
                      : "",
                  ].join(" ")}
                >
                  <span>{title}</span>
                </div>
              </li>
            )
        )}
      </NavUnderline>
      <div className="px-2">
        {/* TODO: pass the permission because these look like the */}
        {page === "payments" && <PaymentsSidebarMenu currentTab={currentTab} />}
        {page === "asset-exchange" && (
          <AssetExchangeSidebarMenu currentTab={currentTab} />
        )}
        {/* TODO: these also look like the same component */}
        {page === "stake-delegation" && (
          <StakeDelegationSidebarMenu currentTab={currentTab} />
        )}
        {page === "settings-history" && (
          <SettingsHistorySidebarMenu currentTab={currentTab} />
        )}
      </div>
    </div>
    {currentTab && (
      <div className="w-100 h-100" key={currentTab.title}>
        <Widget src={currentTab.href} props={currentTabProps} />
      </div>
    )}
  </Container>
);
