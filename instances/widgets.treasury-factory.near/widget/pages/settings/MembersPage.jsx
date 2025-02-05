const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const {
  getMembersAndPermissions,
  getDaoRoles,
  getPolicyApproverGroup,
  hasPermission,
  getPermissionsText,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common") || {
  getDaoRoles: () => {},
  getPolicyApproverGroup: () => {},
  hasPermission: () => {},
  getPermissionsText: () => {},
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

const [refreshTable, setRefreshTable] = useState(0);

const [refetch, setRefetch] = useState(false);
const policyApproverGroup = getPolicyApproverGroup(treasuryDaoID);
const roles = getDaoRoles(treasuryDaoID);

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
`;

const [rowsPerPage, setRowsPerPage] = useState(10);
const [currentPage, setPage] = useState(0);
const [data, setData] = useState([]);
const [allMembers, setAllMembers] = useState([]);
const [showEditor, setShowEditor] = useState(false);
const [selectedMember, setSelectedMember] = useState(null);
const [loading, setLoading] = useState(false);
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [showToastStatus, setToastStatus] = useState(false);

useEffect(() => {
  setLoading(true);
  if (typeof getMembersAndPermissions === "function") {
    setAllMembers([]);
    getMembersAndPermissions(treasuryDaoID).then((res) => {
      setAllMembers(res);
    });
  }
}, [refreshTable, refetch]);

useEffect(() => {
  if (allMembers.length > 0) {
    setLoading(false);
    setData(
      allMembers.slice(
        currentPage * rowsPerPage,
        currentPage * rowsPerPage + rowsPerPage
      )
    );
  }
}, [currentPage, rowsPerPage, allMembers]);

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
              <i class="bi bi-check2 h3 mb-0 success-icon"></i>
              <div>
                <div>New members policy request is submitted.</div>
                <a
                  className="text-underline"
                  href={href({
                    widgetSrc: `${instance}/widget/app`,
                    params: {
                      page: "settings",
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

function getImage(acc) {
  return `https://i.near.social/magic/large/https://near.social/magic/img/account/${acc}`;
}

const Tag = styled.div`
  border: 1px solid var(--border-color);
`;

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
                src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                props={{
                  popup: (
                    <Widget
                      src="${REPL_MOB}/widget/Profile.Popover"
                      props={{ accountId: account }}
                    />
                  ),
                  children: (
                    <div
                      className="text-truncate"
                      style={{ maxWidth: "300px" }}
                    >
                      {account}
                    </div>
                  ),
                  instance,
                }}
              />
            </td>
            <td>
              <div className="d-flex gap-3 align-items-center">
                {(group.roles ?? []).map((i) => {
                  const description = getPermissionsText(i);
                  if (!description) {
                    return <Tag className="rounded-pill px-2 py-1">{i}</Tag>;
                  } else {
                    return (
                      <Widget
                        src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                        props={{
                          popup: description,
                          children: (
                            <Tag className="rounded-pill px-2 py-1">{i}</Tag>
                          ),
                          instance,
                        }}
                      />
                    );
                  }
                })}
              </div>
            </td>
            {hasCreatePermission && (
              <td className="text-right">
                <div className="d-flex align-items-center gap-2 justify-content-end">
                  <Widget
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
                    props={{
                      ActionButton: () => (
                        <i class="bi bi-pencil-square h4 mb-0 cursor-pointer"></i>
                      ),
                      checkForDeposit: true,
                      treasuryDaoID,
                      callbackAction: () => {
                        setSelectedMember(group);
                        setShowEditor(true);
                      },
                    }}
                  />
                  <Widget
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
                    props={{
                      ActionButton: () => (
                        <i class="bi bi-trash3 h4 mb-0 text-red cursor-pointer"></i>
                      ),
                      checkForDeposit: true,
                      treasuryDaoID,
                      callbackAction: () => {
                        setSelectedMember(group);
                        setShowDeleteModal(true);
                      },
                    }}
                  />
                </div>
              </td>
            )}
          </tr>
        );
      })}
    </tbody>
  );
};

function toggleEditor() {
  setShowEditor(!showEditor);
  setSelectedMember(null);
}

const hasCreatePermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "policy",
  "vote"
);

return (
  <Container className="d-flex flex-column">
    <SubmitToast />
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.DeleteModalConfirmation`}
      props={{
        instance,
        isOpen: showDeleteModal && selectedMember,
        onCancelClick: () => setShowDeleteModal(false),
        onConfirmClick: () => {
          setShowDeleteModal(false);
        },
        setToastStatus,
        username: selectedMember.member,
        rolesMap:
          selectedMember &&
          new Map(selectedMember.roles.map((role) => [role, role])),
        onRefresh: () => setRefetch(!refetch),
      }}
    />
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OffCanvas`}
      props={{
        showCanvas: showEditor,
        onClose: toggleEditor,
        title: selectedMember ? "Edit Member" : "Add Member",
        children: (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.MembersEditor`}
            props={{
              instance,
              refreshMembersTableData: () => {
                setRefreshTable(refreshTable + 1);
              },
              onCloseCanvas: toggleEditor,
              availableRoles: (roles ?? []).map((i) => {
                return { title: i, value: i };
              }),
              selectedMember: selectedMember,
              setToastStatus,
            }}
          />
        ),
      }}
    />

    <div className="card rounded-4 py-3 d-flex flex-column flex-1 w-100">
      <div className="d-flex justify-content-between gap-2 align-items-center border-bottom px-3 pb-3">
        <div className="card-title mb-0">All Members</div>
        {hasCreatePermission && (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
            props={{
              ActionButton: () => (
                <button className="btn primary-button d-flex align-items-center gap-2">
                  <i class="bi bi-plus-lg h5 mb-0"></i>New Member
                </button>
              ),
              checkForDeposit: true,
              treasuryDaoID,
              callbackAction: () => {
                setShowEditor(true);
              },
            }}
          />
        )}
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
                <td>Name</td>
                <td>User name</td>
                <td>Permissions</td>
                {hasCreatePermission && <td className="text-right">Actions</td>}
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
