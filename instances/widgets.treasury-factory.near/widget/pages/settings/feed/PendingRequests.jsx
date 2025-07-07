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
const [offset, setOffset] = useState(null);
const [proposals, setProposals] = useState(null);
const [totalLength, setTotalLength] = useState(null);
const [loading, setLoading] = useState(false);
const [isPrevPageCalled, setIsPrevCalled] = useState(false);

const refreshProposalsTableData = Storage.get(
  "REFRESH_SETTINGS_TABLE_DATA",
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.feed.ProposalDetailsPage`
);

const fetchProposals = ({ fromStart }) => {
  if (!treasuryDaoID) return;
  setLoading(true);
  getProposalsFromIndexer({
    daoId: treasuryDaoID,
    page: currentPage,
    pageSize: rowsPerPage,
    status: ["InProgress"],
    proposalType: [
      "ChangeConfig",
      "ChangePolicy",
      "AddMemberToRole",
      "RemoveMemberFromRole",
      "ChangePolicyAddOrUpdateRole",
      "ChangePolicyRemoveRole",
      "ChangePolicyUpdateDefaultVotePolicy",
      "ChangePolicyUpdateParameters",
      "UpgradeSelf",
    ],
  }).then((r) => {
    setProposals(r.proposals);
    setTotalLength(r.total);
    setLoading(false);
  });
};

useEffect(() => {
  fetchProposals();
}, [currentPage, rowsPerPage, isPrevPageCalled, treasuryDaoID]);

useEffect(() => {
  // need to clear all pagination related filters to fetch correct result
  setIsPrevCalled(false);
  setOffset(null);
  setPage(0);
  // sometimes fetchProposals is called but offset is still older one
  fetchProposals();
}, [refreshProposalsTableData]);

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
  "policy",
  context.accountId,
  true
);

return (
  <div className="d-flex flex-column flex-1 justify-content-between h-100">
    <Widget
      loading=""
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
