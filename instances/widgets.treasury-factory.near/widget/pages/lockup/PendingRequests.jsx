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

const refreshWithdrawTableData = Storage.get(
  "REFRESH_STAKE_TABLE_DATA",
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.lockup.CreateWithdrawRequest`
);

const fetchProposals = useCallback(() => {
  setLoading(true);

  Near.asyncView("rubycop.multisignature.near", "list_request_ids").then(
    (requestIds) => {
      Promise.all(
        requestIds.map((requestId) =>
          Near.asyncView("rubycop.multisignature.near", "get_request", {
            request_id: requestId,
          })
        )
      ).then((list) => {
        const proposals = list.map((item, index) => {
          const details = JSON.parse(
            Buffer.from(item.actions[0].args, "base64").toString()
          );
          return {
            id: requestIds[index],
            ...item,
            ...details,
          };
        });

        setProposals(proposals);
        setLoading(false);
      });
    }
  );
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
}, [refreshWithdrawTableData]);

return (
  <div className="d-flex flex-column flex-1 justify-content-between">
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.lockup.Table`}
      props={{
        proposals,
        isPendingRequests: true,
        loading: loading,
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
