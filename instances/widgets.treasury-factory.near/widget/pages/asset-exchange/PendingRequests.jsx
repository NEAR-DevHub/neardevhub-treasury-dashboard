const { getApproversAndThreshold, getProposalsFromIndexer } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  getApproversAndThreshold: () => {},
};
const instance = props.instance;
if (!instance || typeof getProposalsFromIndexer !== "function") {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const [rowsPerPage, setRowsPerPage] = useState(10);
const [currentPage, setPage] = useState(0);
const [proposals, setProposals] = useState(null);
const [totalLength, setTotalLength] = useState(null);
const [loading, setLoading] = useState(false);
const [sortDirection, setSortDirection] = useState("desc");

const refreshTableData = Storage.get(
  "REFRESH_ASSET_TABLE_DATA",
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.CreateRequest`
);

const refreshProposalsTableData = Storage.get(
  "REFRESH_ASSET_TABLE_DATA",
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.ProposalDetailsPage`
);

const fetchProposals = useCallback(
  (direction) => {
    if (direction === undefined) direction = sortDirection;
    if (!treasuryDaoID) return;
    setLoading(true);
    getProposalsFromIndexer({
      category: "asset-exchange",
      daoId: treasuryDaoID,
      page: currentPage,
      pageSize: rowsPerPage,
      statuses: ["InProgress"],
      sortDirection: direction,
    }).then((r) => {
      setProposals(r.proposals);
      setTotalLength(r.total);
      setLoading(false);
    });
  },
  [rowsPerPage, currentPage, treasuryDaoID, sortDirection]
);

const handleSortClick = () => {
  const newDirection = sortDirection === "desc" ? "asc" : "desc";
  setSortDirection(newDirection);
  fetchProposals(newDirection);
};

useEffect(() => {
  fetchProposals();
}, [currentPage, rowsPerPage]);

useEffect(() => {
  // need to clear all pagination related filters to fetch correct result
  setPage(0);
  fetchProposals();
}, [refreshTableData, refreshProposalsTableData]);

const policy = treasuryDaoID
  ? Near.view(treasuryDaoID, "get_policy", {})
  : null;

const functionCallApproversGroup = getApproversAndThreshold(
  treasuryDaoID,
  "call",
  context.accountId
);

const deleteGroup = getApproversAndThreshold(
  treasuryDaoID,
  "call",
  context.accountId,
  true
);

useEffect(() => {
  props.onSelectRequest(null);
}, [currentPage, rowsPerPage]);

return (
  <div className="d-flex flex-column flex-1 justify-content-between h-100">
    <Widget
      loading=""
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.Table`}
      props={{
        proposals,
        isPendingRequests: true,
        functionCallApproversGroup,
        deleteGroup,
        loading: loading,
        policy,
        refreshTableData: fetchProposals,
        sortDirection,
        handleSortClick,
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
              setPage(currentPage + 1);
            },
            onPrevClick: () => {
              setPage(currentPage - 1);
            },
            currentPage: currentPage,
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
);
