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
if (!instance || typeof getMembersAndPermissions !== "function") {
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
  
    .text-grey {
      color: #b9b9b9 !important;
    }
  
    .text-size-2 {
      font-size: 15px;
    }
  
    .text-dark-grey {
      color: #687076;
    }
  
    .text-grey-100 {
      background-color: #f5f5f5;
    }
  
    td {
      padding: 0.7rem;
      color: inherit;
      vertical-align: middle;
    }
  
    .max-w-100 {
      max-width: 100%;
    }
  
    table {
      overflow-x: auto;
    }
  
    .bold {
      font-weight: 500;
    }
  
    .text-right {
      text-align: end;
    }
  
    .text-left {
      text-align: left;
    }
    .text-underline {
      text-decoration: underline !important;
    }
  
    .flex-1 {
      flex: 1;
    }
  
    .nav-link {
      font-size: 22px;
      font-weight: bolder;
      color: #1B1B18 !important;
    }
  
    .text-delete {
      color: #ff3b30;
    }
  
    .cursor-pointer {
      cursor: pointer;
    }
  
    .theme-btn {
      background: var(--theme-color) !important;
      color: white;
    }
  
    .custom-tooltip {
      position: relative;
      cursor: pointer;
    }
  
    .custom-tooltip .tooltiptext {
      display: none;
      width: 300px;
      background-color: white;
      color: black
      text-align: center;
      border-radius: 5px;
      padding: 5px;
      position: absolute;
      z-index: 10000;
      top:110%;
      right:80%;
      opacity: 0;
      box-shadow: 0 6px 10px rgba(0, 0, 0, 0.3);
      transition: opacity 0.3s;
    }
  
    .custom-tooltip:hover .tooltiptext {
      display: block;
      opacity: 1;
    }
  

  .toast {
    background: white !important;
  }

  .toast-header {
    background-color: #2c3e50 !important;
    color: white !important;
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

const ToastContainer = styled.div`
  a {
    color: black !important;
    text-decoration: underline !important;
    &:hover {
      color: black !important;
    }
  }
`;

const SubmitToast = () => {
  return (
    showToastStatus && (
      <ToastContainer className="toast-container position-fixed bottom-0 end-0 p-3">
        <div className={`toast ${showToastStatus ? "show" : ""}`}>
          <div className="toast-header px-2">
            <strong className="me-auto">Just Now</strong>
            <i
              className="bi bi-x-lg h6"
              onClick={() => setToastStatus(null)}
            ></i>
          </div>
          <div className="toast-body">
            <div>New members policy request is submitted.</div>
            <a
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
      </ToastContainer>
    )
  );
};

function getImage(acc) {
  return `https://i.near.social/magic/large/https://near.social/magic/img/account/${acc}`;
}

const Tag = styled.div`
  border: 1px solid #e2e6ec;
`;

const Members = () => {
  return (
    <tbody style={{ overflowX: "auto" }}>
      {data?.map((group, index) => {
        const account = group.member;
        const profile = Social.getr(`${account}/profile`);
        const imageSrc = getImage(account);
        return (
          <tr key={index} className="bold">
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
                src="${REPL_MOB}/widget/Profile.OverlayTrigger"
                props={{
                  accountId: account,
                  children: (
                    <div
                      className="text-truncate"
                      style={{ maxWidth: "300px" }}
                    >
                      {account}
                    </div>
                  ),
                }}
              />
            </td>
            <td>
              <div className="d-flex gap-3 align-items-center">
                {(group.roles ?? []).map((i) => (
                  <Tag className="rounded-pill px-2 py-1 custom-tooltip">
                    {i}
                    <div className="tooltiptext p-2">
                      {getPermissionsText(i)}
                    </div>
                  </Tag>
                ))}
              </div>
            </td>
            {hasCreatePermission && (
              <td className="text-right">
                <div className="d-flex align-items-center gap-2 justify-content-end">
                  <i
                    class="bi bi-pencil-square h4 mb-0 cursor-pointer"
                    onClick={() => {
                      setSelectedMember(group);
                      setShowEditor(true);
                    }}
                  ></i>
                  <i
                    class="bi bi-trash3 h4 mb-0 text-delete cursor-pointer"
                    onClick={() => {
                      setSelectedMember(group);
                      setShowDeleteModal(true);
                    }}
                  ></i>
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

    <div className="card rounded-3 py-3 d-flex flex-column gap-2 flex-1 w-100">
      <div className="d-flex justify-content-between gap-2 align-items-center border-bottom px-2">
        <div className="nav-link">All Members</div>
        {hasCreatePermission && (
          <button
            className="primary py-1 px-3 rounded-2 h6 fw-bold d-flex align-items-center gap-2 "
            onClick={() => setShowEditor(true)}
          >
            <i class="bi bi-plus-lg h5 mb-0"></i>New Member
          </button>
        )}
      </div>
      {loading ? (
        <div className="d-flex justify-content-center align-items-center w-100 h-100">
          <Widget
            src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"}
          />
        </div>
      ) : (
        <div
          className="d-flex flex-column flex-1 justify-content-between px-2"
          style={{ overflow: "auto" }}
        >
          <table className="table">
            <thead>
              <tr className="text-grey">
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
