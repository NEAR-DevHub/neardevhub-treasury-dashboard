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

const fetchProposals = useCallback(() => {
  setLoading(true);
  Near.asyncView(treasuryDaoID, "get_last_proposal_id").then((i) => {
    const lastProposalId = i;
    getFilteredProposalsByStatusAndKind({
      treasuryDaoID,
      resPerPage: rowsPerPage,
      isPrevPageCalled: isPrevPageCalled,
      filterKindArray: [
        "ChangeConfig",
        "ChangePolicy",
        "AddMemberToRole",
        "RemoveMemberFromRole",
        "ChangePolicyAddOrUpdateRole",
        "ChangePolicyRemoveRole",
        "ChangePolicyUpdateDefaultVotePolicy",
        "ChangePolicyUpdateParameters",
      ],
      filterStatusArray: ["InProgress"],
      offset: typeof offset === "number" ? offset : lastProposalId,
      lastProposalId: lastProposalId,
      currentPage,
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

const policy = treasuryDaoID
  ? Near.view(treasuryDaoID, "get_policy", {})
  : null;

const settingsApproverGroup = getApproversAndThreshold(
  treasuryDaoID,
  "policy",
  context.accountId
);

const deleteGroup = getApproversAndThreshold(
  treasuryDaoID,
  "transfer",
  context.accountId,
  true
);

return (
  <div className="d-flex flex-column flex-1 justify-content-between">
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.feed.Table`}
      props={{
        proposals: proposals,
        isPendingRequests: true,
        settingsApproverGroup,
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
