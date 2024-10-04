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
const [isPrevPageCalled, setIsPrevCalled] = useState(false);

const refreshTableData = Storage.get(
  "REFRESH_TABLE_DATA",
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.CreatePaymentRequest`
);
const refreshVoteTableData = Storage.get(
  "REFRESH__VOTE_ACTION_TABLE_DATA",
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.VoteActions`
);

useEffect(() => {
  setLoading(true);
  Near.asyncView(treasuryDaoID, "get_last_proposal_id").then((i) => {
    if (typeof getFilteredProposalsByStatusAndKind == "function") {
      const lastProposalId = i;
      const offset = currentPage === 0 ? i : proposals[proposals.length - 1].id;
      getFilteredProposalsByStatusAndKind({
        treasuryDaoID,
        resPerPage: rowsPerPage,
        isPrevPageCalled: isPrevPageCalled,
        filterKindArray: ["FunctionCall"],
        filterStatusArray: ["InProgress"],
        offset: typeof offset === "number" ? offset : lastProposalId,
        lastProposalId: lastProposalId,
        currentPage,
        isStakeDelegation: true,
      }).then((r) => {
        if (currentPage === 0 && !totalLength) {
          setTotalLength(r.totalLength);
        }
        setLoading(false);
        setProposals(r.filteredProposals);
      });
    }
  });
}, [currentPage, rowsPerPage, refreshTableData, refreshVoteTableData]);

const policy = Near.view(treasuryDaoID, "get_policy", {});

const functionCallApproversGroup = getApproversAndThreshold(
  treasuryDaoID,
  "call"
);

return (
  <div className="d-flex flex-column flex-1 justify-content-between">
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.Table`}
      props={{
        proposals: proposals,
        isPendingRequests: true,
        functionCallApproversGroup,
        loading: loading,
        policy,
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
