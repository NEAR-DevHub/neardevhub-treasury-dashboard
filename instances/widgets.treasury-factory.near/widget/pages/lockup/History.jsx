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

const [proposals, setProposals] = useState(null);
const [totalLength, setTotalLength] = useState(null);
const [loading, setLoading] = useState(false);
const [firstRender, setFirstRender] = useState(true);
const [offset, setOffset] = useState(null);
const [isPrevPageCalled, setIsPrevCalled] = useState(false);

useEffect(() => {
  setLoading(true);
  Near.asyncView(treasuryDaoID, "get_last_proposal_id").then((i) => {
    const lastProposalId = i;

    getFilteredProposalsByStatusAndKind({
      treasuryDaoID,
      resPerPage: rowsPerPage,
      isPrevPageCalled: isPrevPageCalled,
      filterKindArray: ["FunctionCall"],
      filterStatusArray: ["Approved", "Rejected", "Expired", "Failed"],
      offset: typeof offset === "number" ? offset : lastProposalId,
      lastProposalId: lastProposalId,
      currentPage,
      isLockup: true,
    }).then((r) => {
      if (currentPage === 0 && !totalLength) {
        setTotalLength(r.totalLength);
      }
      setOffset(r.filteredProposals[r.filteredProposals.length - 1].id);
      setLoading(false);
      setProposals(r.filteredProposals);
    });
  });
}, [currentPage, rowsPerPage]);

const policy = treasuryDaoID
  ? Near.view(treasuryDaoID, "get_policy", {})
  : null;

const functionCallApproversGroup = getApproversAndThreshold(
  treasuryDaoID,
  "call",
  context.accountId
);

useEffect(() => {
  props.onSelectRequest(null);
}, [currentPage, rowsPerPage]);

return (
  <div className="d-flex flex-column flex-1 justify-content-between h-100">
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.lockup.Table`}
      props={{
        proposals,
        isPendingRequests: false,
        loading,
        policy,
        functionCallApproversGroup,
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
