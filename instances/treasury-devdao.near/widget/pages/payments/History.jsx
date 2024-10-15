const { getApproversAndThreshold, getFilteredProposalsByStatusAndKind } =
  VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common") || {
    getApproversAndThreshold: () => {},
  };
const instance = props.instance;
if (!instance) {
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
const highlightProposalId = props.highlightProposalId
  ? parseFloat(props.highlightProposalId)
  : null;

useEffect(() => {
  setLoading(true);
  Near.asyncView(treasuryDaoID, "get_last_proposal_id").then((i) => {
    if (typeof getFilteredProposalsByStatusAndKind == "function") {
      const lastProposalId = i;
      getFilteredProposalsByStatusAndKind({
        treasuryDaoID,
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

const transferApproversGroup = getApproversAndThreshold(
  treasuryDaoID,
  "transfer"
);

return (
  <div className="d-flex flex-column flex-1 justify-content-between">
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.Table`}
      props={{
        instance,
        proposals: proposals,
        isPendingRequests: false,
        transferApproversGroup,
        highlightProposalId,
        loading: loading,
        policy,
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
