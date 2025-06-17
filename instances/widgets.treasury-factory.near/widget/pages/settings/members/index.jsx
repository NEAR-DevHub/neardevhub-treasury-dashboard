const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };
const {
  getMembersAndPermissions,
  getDaoRoles,
  getPolicyApproverGroup,
  hasPermission,
  getRolesDescription,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common") || {
  getDaoRoles: () => {},
  getPolicyApproverGroup: () => {},
  hasPermission: () => {},
  getRolesDescription: () => {},
};

const instance = props.instance;
const { TableSkeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
);
if (
  !instance ||
  !TableSkeleton ||
  typeof getMembersAndPermissions !== "function"
) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const policyApproverGroup = getPolicyApproverGroup(treasuryDaoID);
const roles = getDaoRoles(treasuryDaoID);
const [lastProposalId, setLastProposalId] = useState(null);
const [rowsPerPage, setRowsPerPage] = useState(10);
const [currentPage, setPage] = useState(0);
const [data, setData] = useState([]);
const [allMembers, setAllMembers] = useState([]);
const [selectedRows, setSelectedRows] = useState([]);
const [selectedMembers, setSelectedMembers] = useState([]);
const [showEditor, setShowEditor] = useState(false);
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [showToastStatus, setToastStatus] = useState(false);
const [loading, setLoading] = useState(false);

const [isTxnCreated, setTxnCreated] = useState(false);

useEffect(() => {
  setLoading(true);
  if (typeof getMembersAndPermissions === "function") {
    setAllMembers([]);
    getMembersAndPermissions(treasuryDaoID).then((res) => {
      setAllMembers(res);
      setLoading(false);
    });
  }
}, []);

useEffect(() => {
  if (allMembers.length > 0) {
    setData(
      allMembers.slice(
        currentPage * rowsPerPage,
        currentPage * rowsPerPage + rowsPerPage
      )
    );
  }
}, [currentPage, rowsPerPage, allMembers]);

const hasCreatePermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "policy",
  "AddProposal"
);

function getImage(acc) {
  return `https://i.near.social/magic/large/https://near.social/magic/img/account/${acc}`;
}

const Container = styled.div`
  font-size: 13px;
  min-height: 75vh;

  td {
    padding: 0.7rem;
    color: inherit;
    vertical-align: middle;
  }

  table {
    overflow-x: auto;
  }

  .flex-1 {
    flex: 1;
  }

  .nav-link {
    font-size: 22px;
    font-weight: bolder;
    color: var(--text-color) !important;
  }

  .card-title {
    font-size: 20px;
    font-weight: 600;
  }

  .form-check-input[type="checkbox"] {
    width: 18px;
    height: 18px;
  }
`;

const Tag = styled.div`
  border: 1px solid var(--border-color);
`;

const SubmitToast = () => {
  return (
    showToastStatus && (
      <div className="toast-container position-fixed bottom-0 end-0 p-3">
        <div className={`toast ${showToastStatus ? "show" : ""}`}>
          <div className="toast-header px-2">
            <strong className="me-auto">Just Now</strong>
            <i
              className="bi bi-x-lg h6 mb-0 cursor-pointer"
              onClick={() => setToastStatus(null)}
            ></i>
          </div>
          <div className="toast-body">
            <div className="d-flex align-items-center gap-3">
              <i className="bi bi-check2 h3 mb-0 success-icon"></i>
              <div>
                <div>Your request has been submitted.</div>
                <a
                  className="text-underline"
                  href={href({
                    widgetSrc: `${instance}/widget/app`,
                    params: {
                      page: "settings",
                      id: lastProposalId,
                    },
                  })}
                >
                  View it
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  );
};

const Members = () => {
  return (
    <tbody style={{ overflowX: "auto" }}>
      {data?.map((group, index) => {
        const account = group.member;
        const profile = Social.getr(`${account}/profile`);
        const imageSrc = getImage(account);
        return (
          <tr key={index} className="fw-semi-bold">
            <td>
              <input
                type="checkbox"
                className="form-check-input"
                role="switch"
                disabled={isTxnCreated || showEditor || showDeleteModal}
                checked={selectedRows.includes(account)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedRows([...selectedRows, account]);
                  } else {
                    setSelectedRows(
                      selectedRows.filter((id) => id !== account)
                    );
                  }
                }}
              />
            </td>
            <td>
              <div className="d-flex gap-2 align-items-center">
                <img
                  src={imageSrc}
                  height={30}
                  width={30}
                  className="rounded-circle"
                />
                {profile.name ?? (
                  <span className="text-truncate" style={{ maxWidth: "300px" }}>
                    {account}
                  </span>
                )}
              </div>
            </td>
            <td>
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
                props={{
                  accountId: account,
                  showKYC: false,
                  displayImage: false,
                  displayName: false,
                  instance,
                }}
              />
            </td>
            <td>
              <div className="d-flex gap-3 align-items-center">
                {(group.roles ?? []).map((i) => {
                  const description = getRolesDescription(i);
                  const tag = <Tag className="rounded-pill px-2 py-1">{i}</Tag>;
                  if (!description) return tag;
                  return (
                    <Widget
                      src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                      props={{
                        popup: description,
                        children: tag,
                        instance,
                      }}
                    />
                  );
                })}
              </div>
            </td>
          </tr>
        );
      })}
    </tbody>
  );
};

function getLastProposalId() {
  return Near.asyncView(treasuryDaoID, "get_last_proposal_id").then(
    (result) => result
  );
}

useEffect(() => {
  getLastProposalId().then((r) => setLastProposalId(r));
}, []);

useEffect(() => {
  if (isTxnCreated) {
    let checkTxnTimeout = null;

    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (typeof lastProposalId === "number" && lastProposalId !== id) {
          setLastProposalId(lastProposalId);
          setToastStatus(true);
          setTxnCreated(false);
          clearTimeout(checkTxnTimeout);
        } else {
          checkTxnTimeout = setTimeout(() => checkForNewProposal(), 1000);
        }
      });
    };

    checkForNewProposal();
    return () => clearTimeout(checkTxnTimeout);
  }
}, [isTxnCreated]);

return (
  <Container className="d-flex flex-column">
    <SubmitToast />
    <TransactionLoader
      showInProgress={isTxnCreated}
      cancelTxn={() => setTxnCreated(false)}
    />
    {showDeleteModal && selectedMembers?.length && (
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.DeleteModalConfirmation`}
        props={{
          instance,
          isOpen: showDeleteModal && selectedMembers,
          onCancelClick: () => setShowDeleteModal(false),
          onConfirmClick: (proposal) => {
            Near.call(proposal);
            setTxnCreated(true);
            setShowDeleteModal(false);
          },
          selectedMembers: selectedMembers,
        }}
      />
    )}
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.members.MembersForm`}
      props={{
        instance,
        availableRoles: (roles ?? [])
          .filter((i) => i !== "all")
          .map((i) => ({ title: i, value: i })),
        setToastStatus,
        isEdit: selectedMembers.length,
        selectedMembers: selectedMembers,
        allMembers: allMembers,
        showEditor: showEditor,
        setShowEditor: setShowEditor,
      }}
    />

    <div className="card rounded-4 py-3 d-flex flex-column flex-1 w-100">
      <div className="d-flex justify-content-between gap-2 align-items-center border-bottom px-3 pb-3">
        <div className="card-title mb-0">All Members</div>
        {hasCreatePermission &&
          (selectedRows.length === 0 ? (
            <Widget
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
              props={{
                ActionButton: () => (
                  <button className="btn primary-button d-flex align-items-center gap-2">
                    <i className="bi bi-plus-lg h5 mb-0"></i>Add Members
                  </button>
                ),
                checkForDeposit: true,
                treasuryDaoID,
                callbackAction: () => {
                  setSelectedMembers([]);
                  setShowEditor(true);
                },
                disabled: showEditor || showDeleteModal || isTxnCreated,
              }}
            />
          ) : (
            <div className="d-flex gap-3">
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
                props={{
                  ActionButton: () => (
                    <button className="btn btn-outline-secondary d-flex gap-1 align-items-center">
                      <i className="bi bi-pencil" />
                      Edit
                    </button>
                  ),
                  checkForDeposit: true,
                  treasuryDaoID,
                  callbackAction: () => {
                    const members = allMembers.filter((m) =>
                      selectedRows.includes(m.member)
                    );
                    setSelectedMembers(members);
                    setShowEditor(true);
                  },
                  disabled: showEditor || showDeleteModal || isTxnCreated,
                }}
              />
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
                props={{
                  ActionButton: () => (
                    <button className="btn btn-outline-danger d-flex gap-1 align-items-center">
                      <i className="bi bi-trash3" />
                      Delete
                    </button>
                  ),
                  checkForDeposit: true,
                  treasuryDaoID,
                  callbackAction: () => {
                    const members = allMembers.filter((m) =>
                      selectedRows.includes(m.member)
                    );
                    setSelectedMembers(members);
                    setShowDeleteModal(true);
                  },
                  disabled: showEditor || showDeleteModal || isTxnCreated,
                }}
              />
            </div>
          ))}
      </div>
      {loading ? (
        <TableSkeleton
          numberOfCols={6}
          numberOfRows={3}
          numberOfHiddenRows={4}
        />
      ) : (
        <div
          className="d-flex flex-column flex-1 justify-content-between"
          style={{ overflow: "auto" }}
        >
          <table className="table">
            <thead>
              <tr className="text-secondary">
                <td>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    role="switch"
                    disabled={isTxnCreated || showEditor || showDeleteModal}
                    checked={
                      selectedRows.length === data.length && data.length > 0
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRows(data.map((item) => item.member));
                      } else {
                        setSelectedRows([]);
                      }
                      setSelectedMembers([]);
                    }}
                  />
                </td>
                <td>Name</td>
                <td>User name</td>
                <td>
                  Permission Group(s){" "}
                  <Widget
                    src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                    props={{
                      popup: (
                        <span>
                          Refer to{" "}
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-underline"
                            href={"https://docs.neartreasury.com/permissions"}
                          >
                            Permission Group(s)
                          </a>{" "}
                          to learn more about each group.
                        </span>
                      ),
                      children: (
                        <i className="bi bi-info-circle text-secondary"></i>
                      ),
                      instance,
                    }}
                  />
                </td>
              </tr>
            </thead>
            <Members />
          </table>
          <div>
            <Widget
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Pagination`}
              props={{
                totalLength: allMembers?.length,
                totalPages: Math.ceil(allMembers?.length / rowsPerPage),
                onNextClick: () => setPage(currentPage + 1),
                onPrevClick: () => setPage(currentPage - 1),
                currentPage: currentPage,
                rowsPerPage: rowsPerPage,
                onRowsChange: (v) => {
                  setPage(0);
                  setRowsPerPage(parseInt(v));
                },
              }}
            />
          </div>
        </div>
      )}
    </div>
  </Container>
);
