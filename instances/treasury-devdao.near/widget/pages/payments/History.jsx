const {
  getTransferApproversAndThreshold,
  getFilteredProposalsByStatusAndKind,
} = VM.require("${REPL_DEPLOYMENT_ACCOUNT}/widget/lib.common") || {
  getTransferApproversAndThreshold: () => {},
};
const treasuryDaoID = "${REPL_TREASURY}";
const [rowsPerPage, setRowsPerPage] = useState(10);
const [currentPage, setPage] = useState(0);

const [proposals, setProposals] = useState(null);
const [totalLength, setTotalLength] = useState(null);
const [loading, setLoading] = useState(false);
const [firstRender, setFirstRender] = useState(true);
const [offset, setOffset] = useState(null);
const [isPrevPageCalled, setIsPrevCalled] = useState(false);
const highlightProposalId = props.highlightProposalId
  ? parseFloat(props.highlightProposalId)
  : null;

useEffect(() => {
  setLoading(true);
  Near.asyncView(treasuryDaoID, "get_last_proposal_id").then((i) => {
    if (typeof getFilteredProposalsByStatusAndKind == "function") {
      const lastProposalId = i;
      getFilteredProposalsByStatusAndKind({
        resPerPage: rowsPerPage,
        isPrevPageCalled: isPrevPageCalled,
        filterKindArray: ["Transfer"],
        filterStatusArray: ["Approved", "Rejected", "Expired", "Failed"],
        offset: typeof offset === "number" ? offset : lastProposalId,
        lastProposalId: lastProposalId,
        currentPage,
      }).then((r) => {
        if (currentPage === 0 && !totalLength) {
          setTotalLength(r.totalLength);
        }
        setOffset(r.filteredProposals[r.filteredProposals.length - 1].id);
        if (typeof highlightProposalId === "number" && firstRender) {
          const proposalExists = r.filteredProposals.find(
            (i) => i.id === highlightProposalId
          );
          if (!proposalExists) {
            setPage(currentPage + 1);
          } else {
            setFirstRender(false);
            setLoading(false);
            setProposals(r.filteredProposals);
          }
        } else {
          setLoading(false);
          setProposals(r.filteredProposals);
        }
      });
    }
  });
}, [currentPage, rowsPerPage]);

const policy = Near.view(treasuryDaoID, "get_policy", {});

const transferApproversGroup = getTransferApproversAndThreshold();

if (
  loading ||
  proposals === null ||
  totalLength === null ||
  transferApproversGroup === null ||
  policy === null
) {
  return (
    <div className="d-flex justify-content-center align-items-center w-100 h-100">
      <Widget
        src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"}
      />
    </div>
  );
}

return (
  <div className="d-flex flex-column flex-1 justify-content-between">
    <Widget
      src={`${REPL_DEPLOYMENT_ACCOUNT}/widget/pages.payments.Table`}
      props={{
        proposals: proposals,
        isPendingRequests: false,
        transferApproversGroup,
        highlightProposalId,
      }}
    />
    {(proposals ?? [])?.length > 0 && (
      <div>
        <Widget
          src={`${REPL_DEPLOYMENT_ACCOUNT}/widget/components.Pagination`}
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
            onRowsChange: (v) => setRowsPerPage(parseInt(v)),
          }}
        />
      </div>
    )}
  </div>
);
