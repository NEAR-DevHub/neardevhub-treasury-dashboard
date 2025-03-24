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

const { treasuryDaoID, sputnikIndexerURL } = VM.require(
  `${instance}/widget/config.data`
);

if (!treasuryDaoID || !sputnikIndexerURL) {
  return <></>;
}

const { selectedTab, tabs, page } = props;

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

function searchCacheApi(dao_id, searchTerm) {
  const uriEncodedSearchTerm = encodeURI(searchTerm);
  return asyncFetch(
    `${sputnikIndexerURL}/dao/proposals/search/${dao_id}/${uriEncodedSearchTerm}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    }
  ).catch((error) => {
    console.log("Error searching cache api", error);
  });
}

function searchProposals(searchInput) {
  // TODO: move this to common.jsx
  if (loading) return console.log("loading");
  setLoading(true);

  searchCacheApi(treasuryDaoID, searchInput).then((result) => {
    setData(result?.body?.records || []);
    setLoading(false);
  });
}

function fetchCacheApi(variables) {
  // TODO: use filters
  return asyncFetch(`${sputnikIndexerURL}/dao/proposals/${treasuryDaoID}`, {
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
    setData(result?.body?.records || []);
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
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.FilterDropdown`}
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
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Input`}
        props={{
          className: "flex-grow-1 w-100 w-xs-100",
          key: `search-input`,
          value: searchInput,
          onChange: (e) => {
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
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.FilterDropdown`}
        props={{
          instance,
        }}
      />
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
    <div
      className="d-flex gap-2 align-items-center flex-direction-column"
      style={{ paddingBottom: "16px" }}
    >
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Input`}
        props={{
          className: "flex-grow-1 w-100 w-xs-100",
          key: `search-input`,
          value: searchInput,
          onChange: (e) => {
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
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.FilterDropdown`}
        props={{
          instance,
        }}
      />
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.CreateButton`}
        props={{
          instance,
          isPendingPage: currentTab.title === "Pending Requests",
        }}
      />
    </div>
  );
};

const SettingsHistorySidebarMenu = ({ currentTab }) => {
  // TODO: styling to the root div here
  return (
    <div
      className="d-flex gap-2 align-items-center flex-direction-row"
      style={{ paddingBottom: "16px" }}
    >
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Input`}
        props={{
          className: "flex-grow-1 w-100 w-xs-100",
          key: `search-input`,
          value: searchInput,
          onChange: (e) => {
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
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.FilterDropdown`}
        props={{
          instance,
        }}
      />
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.feed.SettingsDropdown`}
        props={{
          isPendingPage: currentTab.title === "Pending Requests",
        }}
      />
    </div>
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
