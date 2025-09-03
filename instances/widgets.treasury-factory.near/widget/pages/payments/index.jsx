const { hasPermission, getProposalsFromIndexer, getApproversAndThreshold } =
  VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common") || {
    hasPermission: () => {},
    getProposalsFromIndexer: () => {},
    getApproversAndThreshold: () => {},
  };

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

const { tab, instance, id } = props;

if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const [showCreateRequest, setShowCreateRequest] = useState(false);
const [showProposalDetailsId, setShowProposalId] = useState(null);
const [showToastStatus, setToastStatus] = useState(false);
const [voteProposalId, setVoteProposalId] = useState(null);
const hasCreatePermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "transfer",
  "AddProposal"
);
const [currentTab, setCurrentTab] = useState({ title: "Pending Requests" });
const [isBulkImport, setIsBulkImport] = useState(false);
const [bulkPreviewData, setBulkPreviewData] = useState(null);
const [search, setSearch] = useState("");
const [showFilters, setShowFilters] = useState(false);
const [activeFilters, setActiveFilters] = useState({});
const [proposals, setProposals] = useState([]);
const [totalLength, setTotalLength] = useState(0);
const [loading, setLoading] = useState(false);
const [currentPage, setCurrentPage] = useState(1);
const [rowsPerPage, setRowsPerPage] = useState(10);
const [sortDirection, setSortDirection] = useState("desc");
const [page, setPage] = useState(0);
const [proposalUrl, setProposalUrl] = useState(null);
const [amountValues, setAmountValues] = useState({
  min: "",
  max: "",
  equal: "",
  value: "between",
});
const [isSearchFocused, setIsSearchFocused] = useState(false);

useEffect(() => {
  if (tab === "history") {
    setCurrentTab({ title: "History" });
  }
}, [tab]);

const refreshTableData = Storage.get(
  "REFRESH_TABLE_DATA",
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.CreatePaymentRequest`
);

const refreshPaymentsTableData = Storage.get(
  "REFRESH_TABLE_DATA",
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.BulkImportPreviewTable`
);

const refreshProposalsTableData = Storage.get(
  "REFRESH_PAYMENTS_TABLE_DATA",
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.ProposalDetailsPage`
);

const proposalDetailsPageId =
  id || id === "0" || id === 0 ? parseInt(id) : null;

function fetchProposals({ customSortDirection, hardRefresh }) {
  setLoading(true);
  getProposalsFromIndexer({
    category: "payments",
    statuses:
      currentTab.title === "Pending Requests"
        ? ["InProgress"]
        : ["Approved", "Rejected", "Expired", "Failed"],
    page: page,
    pageSize: rowsPerPage,
    daoId: treasuryDaoID,
    sortDirection: customSortDirection || sortDirection,
    search: search,
    filters: activeFilters,
    amountValues: amountValues,
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
}, [search, amountValues]);

useEffect(() => {
  setPage(0);
  fetchProposals({ hardRefresh: true });
}, [
  currentTab,
  refreshTableData,
  refreshProposalsTableData,
  refreshPaymentsTableData,
]);

useEffect(() => {
  fetchProposals();
}, [page, rowsPerPage]);

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
                    onClick={() => {
                      setCurrentTab({ title });
                      // Clear filters when switching tabs since available filters change
                      setActiveFilters({});
                      setAmountValues({
                        min: "",
                        max: "",
                        equal: "",
                        value: "between",
                      });
                      setSearch("");
                      setShowFilters(false);
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

          {/* Export button for History tab */}
          {currentTab.title === "History" && (
            <div style={{ minWidth: "fit-content" }}>
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.ExportTransactions`}
                props={{
                  page: "payments",
                  instance: props.instance,
                  activeFilters,
                  amountValues,
                  search,
                }}
              />
            </div>
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-outline-secondary ${
              showFilters || Object.keys(activeFilters ?? {}).length > 0
                ? "active-filter"
                : ""
            }`}
          >
            <i class="bi bi-funnel"></i>
          </button>
          <Widget
            loading=""
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.SettingsDropdown`}
            props={{
              isPendingPage: currentTab.title === "Pending Requests",
              instance,
            }}
          />
          {hasCreatePermission && (
            <div style={{ minWidth: "fit-content" }}>
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
                props={{
                  ActionButton: () => (
                    <button className="btn primary-button d-flex align-items-center gap-2 mb-0">
                      <i class="bi bi-plus-lg h5 mb-0"></i>
                      <span className="responsive-text">Create Request</span>
                    </button>
                  ),
                  checkForDeposit: true,
                  treasuryDaoID,
                  callbackAction: () => setShowCreateRequest(true),
                }}
              />
            </div>
          )}
        </div>
      </div>
      {showFilters && (
        <div className="border-bottom">
          <Widget
            loading=""
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.Filters`}
            props={{
              isPendingRequests: currentTab.title === "Pending Requests",
              instance,
              activeFilters,
              setActiveFilters,
              treasuryDaoID,
              amountValues,
              setAmountValues,
              setShowFilters,
            }}
          />
        </div>
      )}
    </div>
  );
};

function toggleCreatePage() {
  setIsBulkImport(false);
  setShowCreateRequest(!showCreateRequest);
}

const ToastStatusContent = () => {
  let content = "";
  switch (showToastStatus) {
    case "InProgress":
      content =
        "Your vote is counted" +
        (typeof proposalDetailsPageId === "number"
          ? "."
          : ", the payment request is highlighted.");
      break;
    case "Approved":
      content = "The payment request has been successfully executed.";
      break;
    case "Rejected":
      content = "The payment request has been rejected.";
      break;
    case "Removed":
      content = "The payment request has been successfully deleted.";
      break;
    case "ProposalAdded":
      content = "Payment request has been successfully created.";
      break;

    default:
      if (showToastStatus.startsWith("BulkProposalAdded")) {
        content = `Successfully imported ${
          showToastStatus.split(":")[1]
        } payment requests.`;
      } else {
        content = `The payment request is ${showToastStatus}.`;
      }
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
          {showToastStatus === "ProposalAdded" && (
            <a
              className="text-underline"
              href={href({
                widgetSrc: `${instance}/widget/app`,
                params: {
                  page: "payments",
                  id: voteProposalId,
                },
              })}
            >
              View Request
            </a>
          )}
          {showToastStatus !== "InProgress" &&
            showToastStatus !== "Removed" &&
            showToastStatus !== "ProposalAdded" &&
            !showToastStatus.startsWith("BulkProposalAdded") &&
            typeof proposalDetailsPageId !== "number" && (
              <a
                className="text-underline"
                href={href({
                  widgetSrc: `${instance}/widget/app`,
                  params: {
                    page: "payments",
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

function updateVoteSuccess(status, proposalId) {
  setVoteProposalId(proposalId);
  setToastStatus(status);
}

function checkProposalStatus(proposalId) {
  Near.asyncView(treasuryDaoID, "get_proposal", {
    id: proposalId,
  })
    .then((result) => {
      updateVoteSuccess(result.status, proposalId);
    })
    .catch(() => {
      // deleted request (thus proposal won't exist)
      updateVoteSuccess("Removed", proposalId);
    });
}

useEffect(() => {
  if (props.transactionHashes) {
    asyncFetch("${REPL_RPC_URL}", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "dontcare",
        method: "tx",
        params: [props.transactionHashes, context.accountId],
      }),
    }).then((transaction) => {
      if (transaction !== null) {
        const transaction_method_name =
          transaction?.body?.result?.transaction?.actions[0].FunctionCall
            .method_name;

        if (transaction_method_name === "act_proposal") {
          const args =
            transaction?.body?.result?.transaction?.actions[0].FunctionCall
              .args;
          const decodedArgs = JSON.parse(atob(args ?? "") ?? "{}");
          if (decodedArgs.id) {
            const proposalId = decodedArgs.id;
            checkProposalStatus(proposalId);
          }
        } else if (transaction_method_name === "add_proposal") {
          const proposalId = atob(transaction.body.result.status.SuccessValue);
          setVoteProposalId(proposalId);
          setToastStatus("ProposalAdded");
        }
      }
    });
  }
}, [props.transactionHashes]);

const policy = treasuryDaoID
  ? Near.view(treasuryDaoID, "get_policy", {})
  : null;

const transferApproversGroup = getApproversAndThreshold(
  treasuryDaoID,
  "transfer",
  context.accountId
);

const deleteGroup = getApproversAndThreshold(
  treasuryDaoID,
  "transfer",
  context.accountId,
  true
);

const handleSortClick = () => {
  const newDirection = sortDirection === "desc" ? "asc" : "desc";
  setSortDirection(newDirection);
  fetchProposals({ customSortDirection: newDirection });
};

return (
  <div className="w-100 h-100 flex-grow-1 d-flex flex-column">
    <VoteSuccessToast />
    {typeof proposalDetailsPageId === "number" ? (
      <Widget
        loading=""
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.ProposalDetailsPage`}
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
        {bulkPreviewData && (
          <Widget
            loading=""
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.BulkImportPreviewTable`}
            props={{
              instance,
              proposals: bulkPreviewData,
              closePreviewTable: () => setBulkPreviewData(null),
              setToastStatus,
            }}
          />
        )}
        <Widget
          loading=""
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OffCanvas`}
          props={{
            showCanvas: showCreateRequest,
            onClose: toggleCreatePage,
            title: isBulkImport
              ? "Import Payment Requests"
              : "Create Payment Request",
            children: isBulkImport ? (
              <div>
                <div className="mb-3" style={{ fontSize: "13px" }}>
                  Create multiple payment requests at once by pasting data
                  copied from our spreadsheet template. Review and submit your
                  bulk requests with ease. You can add up to 10 requests at a
                  time.
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    className="primary-text-color cursor-pointer"
                    href="https://docs.neartreasury.com/payments/bulk-import"
                  >
                    View Step-by-Step Instructions
                  </a>
                </div>
                <Widget
                  loading=""
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.BulkImportForm`}
                  props={{
                    instance,
                    onCloseCanvas: toggleCreatePage,
                    showPreviewTable: (data) => {
                      setBulkPreviewData(data);
                      toggleCreatePage();
                      setIsBulkImport(false);
                    },
                  }}
                />
              </div>
            ) : (
              <div>
                <div className="mb-3" style={{ fontSize: "13px" }}>
                  Fill in the details to send a payment request to a recipient.
                  Need to send many?
                  <span
                    className="primary-text-color cursor-pointer"
                    onClick={() => setIsBulkImport(true)}
                  >
                    Import Multiple Payment Requests
                  </span>
                </div>
                <Widget
                  loading=""
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.CreatePaymentRequest`}
                  props={{
                    instance,
                    onCloseCanvas: toggleCreatePage,
                    setToastStatus,
                    setVoteProposalId,
                  }}
                />
              </div>
            ),
          }}
        />
        <div className="layout-flex-wrap flex-grow-1">
          <div className="layout-main">
            <div className="card py-3 d-flex flex-column w-100 h-100 flex-grow-1">
              {/* Sidebar Menu */}
              <SidebarMenu />

              {/* Content */}
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.Table`}
                props={{
                  proposals,
                  isPendingRequests: currentTab.title === "Pending Requests",
                  transferApproversGroup,
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
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.ProposalDetailsPage`}
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
