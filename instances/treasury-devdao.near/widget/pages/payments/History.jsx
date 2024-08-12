const {
  getTransferApproversAndThreshold,
  getFilteredProposalsByStatusAndkind,
} = VM.require("${REPL_DEPLOYMENT_ACCOUNT}/widget/lib.common") || {
  getTransferApproversAndThreshold: () => {},
};
const treasuryDaoID = "${REPL_TREASURY}";
const [rowsPerPage, setRowsPerPage] = useState(10);
const [currentPage, setPage] = useState(0);

const [proposals, setProposals] = useState(null);
const [totalLength, setTotalLength] = useState(null);
const [loading, setLoading] = useState(false);

useEffect(() => {
  setLoading(true);
  Near.asyncView(treasuryDaoID, "get_last_proposal_id").then((i) => {
    if (typeof getFilteredProposalsByStatusAndkind == "function") {
      getFilteredProposalsByStatusAndkind({
        resPerPage: rowsPerPage,
        reverse: true,
        filterKindArray: ["Transfer"],
        filterStatusArray: ["Approved", "Rejected", "Expired", "Failed"],
        offset: currentPage * rowsPerPage,
        lastProposalId: i,
      }).then((r) => {
        setLoading(false);
        setProposals(r.filteredProposals);
        setTotalLength(r.totalLength);
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
      }}
    />
    <div>
      <Widget
        src={`${REPL_DEPLOYMENT_ACCOUNT}/widget/components.Pagination`}
        props={{
          totalLength: totalLength,
          totalPages: Math.ceil(totalLength / rowsPerPage),
          onNextClick: () => setPage(currentPage + 1),
          onPrevClick: () => setPage(currentPage - 1),
          currentPage: currentPage,
          rowsPerPage: rowsPerPage,
          onRowsChange: (v) => setRowsPerPage(parseInt(v)),
        }}
      />
    </div>
  </div>
);
