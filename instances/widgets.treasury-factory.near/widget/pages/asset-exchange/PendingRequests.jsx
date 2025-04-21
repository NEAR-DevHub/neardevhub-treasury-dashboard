const { getApproversAndThreshold, getFilteredProposalsByStatusAndKind } =
  VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common") || {
    getApproversAndThreshold: () => {},
  };
const instance = props.instance;
if (!instance || typeof getFilteredProposalsByStatusAndKind !== "function") {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const [rowsPerPage, setRowsPerPage] = useState(10);
const [currentPage, setPage] = useState(0);
const [offset, setOffset] = useState(null);
const [proposals, setProposals] = useState(null);
const [totalLength, setTotalLength] = useState(null);
const [loading, setLoading] = useState(false);
const [isPrevPageCalled, setIsPrevCalled] = useState(false);

const refreshTableData = Storage.get(
  "REFRESH_ASSET_TABLE_DATA",
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.CreateRequest`
);

const refreshProposalsTableData = Storage.get(
  "REFRESH_ASSET_TABLE_DATA",
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.ProposalDetailsPage`
);

const fetchProposals = useCallback(() => {
  setLoading(true);
  Near.asyncView(treasuryDaoID, "get_last_proposal_id").then((i) => {
    const lastProposalId = i;
    getFilteredProposalsByStatusAndKind({
      treasuryDaoID,
      resPerPage: rowsPerPage,
      isPrevPageCalled: isPrevPageCalled,
      filterKindArray: ["FunctionCall"],
      filterStatusArray: ["InProgress"],
      offset: typeof offset === "number" ? offset : lastProposalId,
      lastProposalId: lastProposalId,
      currentPage,
      isAssetExchange: true,
    }).then((r) => {
      setOffset(r.filteredProposals[r.filteredProposals.length - 1].id);
      if (currentPage === 0 && !totalLength) {
        setTotalLength(r.totalLength);
      }
      setLoading(false);
      setProposals(r.filteredProposals);
    });
  });
}, [rowsPerPage, isPrevPageCalled, currentPage]);

useEffect(() => {
  fetchProposals();
}, [currentPage, rowsPerPage]);

useEffect(() => {
  // need to clear all pagination related filters to fetch correct result
  setIsPrevCalled(false);
  setOffset(null);
  setPage(0);
  fetchProposals();
}, [refreshTableData]);

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
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.Table`}
      props={{
        proposals: proposals,
        isPendingRequests: true,
        functionCallApproversGroup,
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
