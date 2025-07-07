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
const [firstRender, setFirstRender] = useState(true);
const [offset, setOffset] = useState(null);
const [isPrevPageCalled, setIsPrevCalled] = useState(false);
const [sortDirection, setSortDirection] = useState("desc");

const fetchProposals = useCallback(
  (direction) => {
    if (direction === undefined) direction = sortDirection;
    if (!treasuryDaoID) return;
    setLoading(true);
    getProposalsFromIndexer({
      category: "payments",
      status: ["Approved", "Rejected", "Expired", "Failed"],
      page: currentPage,
      pageSize: rowsPerPage,
      daoId: treasuryDaoID,
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

const policy = treasuryDaoID
  ? Near.view(treasuryDaoID, "get_policy", {})
  : null;

const transferApproversGroup = getApproversAndThreshold(
  treasuryDaoID,
  "transfer",
  context.accountId
);

useEffect(() => {
  props.onSelectRequest(null);
}, [currentPage, rowsPerPage]);

return (
  <div className="d-flex flex-column flex-1 justify-content-between h-100">
    <Widget
      loading=""
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.Table`}
      props={{
        instance,
        proposals: proposals,
        isPendingRequests: false,
        transferApproversGroup,
        highlightProposalId,
        loading: loading,
        policy,
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
              setIsPrevCalled(false);
              setOffset(proposals[proposals.length - 1].id);
              setPage(currentPage + 1);
            },
            onPrevClick: () => {
              setIsPrevCalled(true);
              setOffset(proposals[0].id);
              setPage(currentPage - 1);
            },
            currentPage: currentPage,
            rowsPerPage: rowsPerPage,
            onRowsChange: (v) => {
              setIsPrevCalled(false);
              setOffset(null);
              setPage(0);
              setRowsPerPage(parseInt(v));
            },
          }}
        />
      </div>
    )}
  </div>
);
