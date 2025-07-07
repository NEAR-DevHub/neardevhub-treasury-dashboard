const {
  getApproversAndThreshold,
  getFilteredProposalsByStatusAndKind,
  getProposalsFromIndexer,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common") || {
  getApproversAndThreshold: () => {},
};
const instance = props.instance;
if (!instance || typeof getProposalsFromIndexer !== "function") {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const [rowsPerPage, setRowsPerPage] = useState(10);
const [currentPage, setPage] = useState(1);
const [offset, setOffset] = useState(null);
const [proposals, setProposals] = useState(null);
const [totalLength, setTotalLength] = useState(null);
const [loading, setLoading] = useState(false);
const [isPrevPageCalled, setIsPrevCalled] = useState(false);

const refreshTableData = Storage.get(
  "REFRESH_TABLE_DATA",
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.CreatePaymentRequest`
);

const refreshPaymentsTableData = Storage.get(
  "REFRESH_TABLE_DATA",
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.BulkImportPreviewTable`
);

const refreshProposalsTableData = Storage.get(
  "REFRESH_TABLE_DATA",
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.ProposalDetailsPage`
);

const fetchProposals = useCallback(() => {
  if (!treasuryDaoID) return;
  setLoading(true);
  getProposalsFromIndexer({
    category: "payments",
    status: ["InProgress"],
    page: currentPage,
    pageSize: rowsPerPage,
    daoId: treasuryDaoID,
  }).then((r) => {
    setProposals(r.proposals);
    setTotalLength(r.total);
    setLoading(false);
  });
}, [rowsPerPage, isPrevPageCalled, currentPage, treasuryDaoID]);

useEffect(() => {
  fetchProposals();
}, [currentPage, rowsPerPage]);

useEffect(() => {
  // need to clear all pagination related filters to fetch correct result
  setIsPrevCalled(false);
  setOffset(null);
  setPage(0);
  fetchProposals();
}, [refreshTableData, refreshProposalsTableData, refreshPaymentsTableData]);

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

useEffect(() => {
  props.onSelectRequest(null);
}, [currentPage, rowsPerPage]);

return (
  <div className="d-flex flex-column flex-1 justify-content-between h-100">
    <Widget
      loading=""
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.Table`}
      props={{
        proposals: proposals,
        isPendingRequests: true,
        transferApproversGroup,
        deleteGroup,
        loading: loading,
        policy,
        refreshTableData: fetchProposals,
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
