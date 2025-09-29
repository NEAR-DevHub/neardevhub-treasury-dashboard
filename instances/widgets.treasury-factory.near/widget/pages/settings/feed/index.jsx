const { getProposalsFromIndexer, getApproversAndThreshold } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  getProposalsFromIndexer: () => {},
  getApproversAndThreshold: () => {},
};

const { tab, instance, id } = props;
const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

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
if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const [showProposalDetailsId, setShowProposalId] = useState(null);
const [showToastStatus, setToastStatus] = useState(false);
const [voteProposalId, setVoteProposalId] = useState(null);
const [currentTab, setCurrentTab] = useState({ title: "Pending Requests" });
const [search, setSearch] = useState("");
const [showFilters, setShowFilters] = useState(false);
const [activeFilters, setActiveFilters] = useState({});

const [proposals, setProposals] = useState([]);
const [totalLength, setTotalLength] = useState(0);
const [loading, setLoading] = useState(false);
const [page, setPage] = useState(0);
const [rowsPerPage, setRowsPerPage] = useState(10);
const [sortDirection, setSortDirection] = useState("desc");
const [proposalUrl, setProposalUrl] = useState(null);
const [isSearchFocused, setIsSearchFocused] = useState(false);

// Clear filters when switching tabs
const handleTabChange = (title) => {
  setCurrentTab({ title });
  setActiveFilters({});
  setSearch("");
  setShowFilters(false);
};

const mapProposalTypeFilters = (activeFilters) => {
  const proposalTypeMapping = {
    "Members Permissions": {
      proposalTypes: [
        "ChangePolicy",
        "AddMemberToRole",
        "RemoveMemberFromRole",
      ],
      searchTerm: "members",
    },
    "Voting Thresholds": {
      proposalTypes: ["ChangePolicy"],
      searchTerm: "voting threshold",
    },
    "Voting Duration": {
      proposalTypes: ["ChangePolicyUpdateParameters"],
      searchTerm: "",
    },
    "Theme & logo": {
      proposalTypes: ["ChangeConfig"],
      searchTerm: "",
    },
  };

  let finalProposalTypes = [
    "ChangeConfig",
    "ChangePolicy",
    "AddMemberToRole",
    "RemoveMemberFromRole",
    "ChangePolicyAddOrUpdateRole",
    "ChangePolicyRemoveRole",
    "ChangePolicyUpdateDefaultVotePolicy",
    "ChangePolicyUpdateParameters",
    "UpgradeSelf",
  ];

  let additionalSearchTerms = [];

  // Check if proposal_type filter is active
  if (
    activeFilters.proposal_type &&
    activeFilters.proposal_type.values &&
    activeFilters.proposal_type.values.length > 0
  ) {
    const selectedTypes = activeFilters.proposal_type.values;
    const include = activeFilters.proposal_type.include !== false; // default to true if not specified
    const mappedTypes = [];
    const allMappedTypes = [];

    // First, collect all possible mapped types for exclusion logic
    Object.values(proposalTypeMapping).forEach((mapping) => {
      allMappedTypes.push(...mapping.proposalTypes);
    });

    selectedTypes.forEach((type) => {
      if (proposalTypeMapping[type]) {
        if (include) {
          // Include mode: add the mapped types
          mappedTypes.push(...proposalTypeMapping[type].proposalTypes);
          // Add search terms if they exist
          if (proposalTypeMapping[type].searchTerm) {
            additionalSearchTerms.push(proposalTypeMapping[type].searchTerm);
          }
        }
      }
    });

    // Remove duplicate search terms
    additionalSearchTerms = [...new Set(additionalSearchTerms)];

    // If we have multiple proposal types selected, remove all search terms to avoid conflicts
    if (selectedTypes.length > 1) {
      additionalSearchTerms = [];
    }

    if (include) {
      // Include mode: use only the mapped types
      if (mappedTypes.length > 0) {
        // Remove duplicates from mapped types
        finalProposalTypes = [...new Set(mappedTypes)];
      }
    } else {
      // Exclude mode: start with all types and remove the excluded ones
      const excludedTypes = [];
      selectedTypes.forEach((type) => {
        if (proposalTypeMapping[type]) {
          excludedTypes.push(...proposalTypeMapping[type].proposalTypes);
        }
      });
      finalProposalTypes = finalProposalTypes.filter(
        (type) => !excludedTypes.includes(type)
      );

      // For exclude mode, we don't use search terms since we're filtering out specific types
      additionalSearchTerms = [];
    }
  }
  return {
    proposalTypes: finalProposalTypes,
    additionalSearchTerms: additionalSearchTerms,
  };
};

// Fetch proposals function
function fetchProposals({ customSortDirection, hardRefresh }) {
  setLoading(true);

  const { proposalTypes, additionalSearchTerms } =
    mapProposalTypeFilters(activeFilters);

  // Combine search terms
  let finalSearch = search;
  if (additionalSearchTerms.length > 0) {
    const additionalSearch = additionalSearchTerms.join(" ");
    finalSearch = search ? `${search} ${additionalSearch}` : additionalSearch;
  }

  getProposalsFromIndexer({
    daoId: treasuryDaoID,
    page: page,
    pageSize: rowsPerPage,
    statuses:
      currentTab?.title === "Pending Requests"
        ? ["InProgress"]
        : ["Approved", "Rejected", "Expired", "Failed"],
    proposalType: proposalTypes,
    sortDirection: customSortDirection || sortDirection,
    search: finalSearch,
    filters: activeFilters,
    accountId: context.accountId,
    existingQuery: hardRefresh ? null : proposalUrl,
    existingProposals: proposals,
  })
    .then((r) => {
      setProposalUrl(r.url);
      setProposals(r.proposals || []);
      setTotalLength(r.total || 0);
      setLoading(false);
    })
    .catch((error) => {
      console.error("Error fetching proposals:", error);
      setProposals([]);
      setTotalLength(0);
      setLoading(false);
    });
}

// Handle sort click
const handleSortClick = () => {
  const newDirection = sortDirection === "desc" ? "asc" : "desc";
  setSortDirection(newDirection);
  fetchProposals({ customSortDirection: newDirection });
};

// Refresh table data
const refreshTableData = Storage.get(
  "REFRESH_SETTINGS_TABLE_DATA",
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.feed.ProposalDetailsPage`
);

useEffect(() => {
  setPage(0);
  const timeout = setTimeout(() => {
    fetchProposals();
  }, 500);
  return () => clearTimeout(timeout);
}, [activeFilters]);

useEffect(() => {
  setPage(0);
  const timeout = setTimeout(() => {
    fetchProposals();
  }, 1000);
  return () => clearTimeout(timeout);
}, [search]);

useEffect(() => {
  setPage(0);
  fetchProposals({ hardRefresh: true });
}, [currentTab, refreshTableData]);

useEffect(() => {
  fetchProposals();
}, [page, rowsPerPage]);

const policy = treasuryDaoID
  ? Near.view(treasuryDaoID, "get_policy", {})
  : null;

const settingsApproverGroup = getApproversAndThreshold(
  treasuryDaoID,
  "policy",
  context.accountId
);

const deleteGroup = getApproversAndThreshold(
  treasuryDaoID,
  "policy",
  context.accountId,
  true
);

const proposalDetailsPageId =
  id || id === "0" || id === 0 ? parseInt(id) : null;

const ToastStatusContent = () => {
  let content = "";
  switch (showToastStatus) {
    case "InProgress":
      content =
        "Your vote is counted" +
        (typeof proposalDetailsPageId === "number"
          ? "."
          : ", the request is highlighted.");
      break;
    case "Approved":
      content = "The request has been successfully executed.";
      break;
    case "Rejected":
      content = "The request has been rejected.";
      break;
    case "Removed":
      content = "The request has been successfully deleted.";
      break;
    default:
      content = `The request has ${showToastStatus}.`;
      break;
  }
  return (
    <div className="toast-body">
      <div className="d-flex align-items-center gap-3">
        {showToastStatus === "Approved" && (
          <i class="bi bi-check2 h3 mb-0 success-icon"></i>
        )}
        <div>
          {content}
          <br />
          {showToastStatus !== "InProgress" &&
            showToastStatus !== "Removed" &&
            typeof proposalDetailsPageId !== "number" && (
              <a
                className="text-underline"
                href={href({
                  widgetSrc: `${instance}/widget/app`,
                  params: {
                    page: "settings",
                    id: voteProposalId,
                  },
                })}
              >
                View in History
              </a>
            )}
        </div>
      </div>
    </div>
  );
};

const VoteSuccessToast = () => {
  return showToastStatus ? (
    <div className="toast-container position-fixed bottom-0 end-0 p-3">
      <div className={`toast ${showToastStatus ? "show" : ""}`}>
        <div className="toast-header px-2">
          <strong className="me-auto">Just Now</strong>
          <i
            className="bi bi-x-lg h6 mb-0 cursor-pointer"
            onClick={() => setToastStatus(null)}
          ></i>
        </div>
        <ToastStatusContent />
      </div>
    </div>
  ) : null;
};

const SidebarMenu = () => {
  return (
    <div>
      {/* Tabs */}
      <div
        className="d-flex justify-content-between border-bottom gap-2 align-items-center flex-wrap flex-md-nowrap"
        style={{ paddingRight: "10px" }}
      >
        <ul className="custom-tabs nav gap-2 flex-shrink-0">
          {[{ title: "Pending Requests" }, { title: "History" }].map(
            ({ title }) =>
              title && (
                <li key={title}>
                  <div
                    onClick={() => handleTabChange(title)}
                    className={[
                      "d-inline-flex gap-2 nav-link",
                      normalize(currentTab?.title) === normalize(title)
                        ? "active"
                        : "",
                    ].join(" ")}
                  >
                    <span>{title}</span>
                  </div>
                </li>
              )
          )}
        </ul>

        <div className="d-flex gap-2 align-items-center flex-wrap flex-sm-nowrap pb-2 pb-md-0 ps-2 ps-md-0 flex-grow-1 justify-content-start justify-content-md-end">
          {/* Search and Filters */}
          <div className="input-responsive">
            <div className="input-group flex-grow-1">
              <span className="input-group-text bg-transparent">
                <i class="bi bi-search text-secondary"></i>
              </span>
              <input
                type="text"
                className={`form-control border-start-0 ${
                  search ? "border-end-0" : ""
                }`}
                placeholder={
                  isSearchFocused ? "Search by id, title or summary" : "Search"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
              {search && (
                <span className="input-group-text bg-transparent border-start-0">
                  <i
                    class="bi bi-x-lg cursor-pointer text-secondary"
                    onClick={() => setSearch("")}
                  ></i>
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-outline-secondary ${
              showFilters || Object.keys(activeFilters ?? {}).length > 0
                ? "active-filter"
                : ""
            }`}
          >
            <i className="bi bi-funnel"></i>
          </button>
          <Widget
            loading=""
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.feed.SettingsDropdown`}
            props={{
              isPendingPage: currentTab?.title === "Pending Requests",
            }}
          />
        </div>
      </div>

      {showFilters && (
        <div className="border-bottom">
          <Widget
            loading=""
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.feed.Filters`}
            props={{
              isPendingRequests: currentTab?.title === "Pending Requests",
              instance,
              activeFilters,
              setActiveFilters,
              treasuryDaoID,
              setShowFilters,
            }}
          />
        </div>
      )}
    </div>
  );
};

return (
  <div className="w-100 h-100 flex-grow-1 d-flex flex-column">
    <VoteSuccessToast />
    {typeof proposalDetailsPageId === "number" ? (
      <Widget
        loading=""
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.feed.ProposalDetailsPage`}
        props={{
          ...props,
          id: proposalDetailsPageId,
          instance,
          setToastStatus,
          setVoteProposalId,
        }}
      />
    ) : (
      <div className="h-100 w-100 flex-grow-1 d-flex flex-column">
        <div className="layout-flex-wrap flex-grow-1">
          <div className="layout-main">
            <div className="card py-3 d-flex flex-column w-100 h-100 flex-grow-1">
              {/* Sidebar Menu */}
              <SidebarMenu />

              {/* Content */}
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.feed.Table`}
                props={{
                  proposals,
                  isPendingRequests: currentTab?.title === "Pending Requests",
                  settingsApproverGroup,
                  deleteGroup,
                  loading: loading,
                  policy,
                  refreshTableData: () => fetchProposals({ hardRefresh: true }),
                  sortDirection,
                  handleSortClick,
                  onSelectRequest: (id) => setShowProposalId(id),
                  highlightProposalId:
                    props.highlightProposalId ||
                    (typeof showProposalDetailsId === "number"
                      ? showProposalDetailsId
                      : voteProposalId),
                  setToastStatus,
                  setVoteProposalId,
                  selectedProposalDetailsId: showProposalDetailsId,
                  ...props,
                }}
              />
              {(proposals ?? [])?.length > 0 && (
                <div>
                  <Widget
                    loading=""
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Pagination`}
                    props={{
                      totalLength: totalLength,
                      totalPages: Math.ceil(totalLength / rowsPerPage),
                      onNextClick: () => {
                        setPage(page + 1);
                      },
                      onPrevClick: () => {
                        setPage(page - 1);
                      },
                      currentPage: page,
                      rowsPerPage: rowsPerPage,
                      onRowsChange: (v) => {
                        setPage(0);
                        setRowsPerPage(parseInt(v));
                      },
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          <div
            className={`layout-secondary ${
              typeof showProposalDetailsId === "number" ? "show" : ""
            }`}
          >
            {typeof showProposalDetailsId === "number" && (
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.feed.ProposalDetailsPage`}
                props={{
                  ...props,
                  id: showProposalDetailsId,
                  instance,
                  isCompactVersion: true,
                  onClose: () => setShowProposalId(null),
                  setToastStatus,
                  setVoteProposalId,
                  currentTab,
                }}
              />
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);
