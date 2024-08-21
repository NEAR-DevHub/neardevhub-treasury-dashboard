const {
  getMembersAndPermissions,
  getDaoRoles,
  getPolicyApproverGroup,
  hasPermission,
} = VM.require("${REPL_DEPLOYMENT_ACCOUNT}/widget/lib.common") || {
  getDaoRoles: () => {},
  getPolicyApproverGroup: () => {},
  hasPermission: () => {},
};

const refreshTable = Storage.get(
  "REFRESH_MEMBERS_TABLE_DATA",
  `${REPL_DEPLOYMENT_ACCOUNT}/widget/pages.members.Editor`
);

const [refetch, setRefetch] = useState(false);
const policyApproverGroup = getPolicyApproverGroup();
const roles = getDaoRoles();

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
    color: var(--theme-color) !important;
  }

  .text-delete {
    color: #ff3b30;
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .theme-btn {
    background-color: var(--theme-color) !important;
    color: white;
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

useEffect(() => {
  setLoading(true);
  if (!loading && typeof getMembersAndPermissions === "function") {
    getMembersAndPermissions().then((res) => {
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
                src="mob.near/widget/Profile.OverlayTrigger"
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
                  <Tag className="rounded-pill px-2 py-1">{i}</Tag>
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

const hasCreatePermission = hasPermission(context.accountId, "policy", "vote");

return (
  <Container className="d-flex flex-column gap-2">
    <Widget
      src={`${REPL_DEPLOYMENT_ACCOUNT}/widget/pages.members.DeleteModalConfirmation`}
      props={{
        isOpen: showDeleteModal && selectedMember,
        onCancelClick: () => setShowDeleteModal(false),
        onConfirmClick: () => {
          setTxnCreated(true);
          setShowDeleteModal(false);
        },
        username: selectedMember.member,
        rolesMap:
          selectedMember &&
          new Map(selectedMember.roles.map((role) => [role, role])),
        onRefresh: () => setRefetch(!refetch),
      }}
    />
    <Widget
      src={`${REPL_DEPLOYMENT_ACCOUNT}/widget/components.OffCanvas`}
      props={{
        showCanvas: showEditor,
        onClose: toggleEditor,
        title: selectedMember ? "Edit Member" : "Add Member",
        children: (
          <Widget
            src={`${REPL_DEPLOYMENT_ACCOUNT}/widget/pages.members.Editor`}
            props={{
              onCloseCanvas: toggleEditor,
              availableRoles: (roles ?? []).map((i) => {
                return { title: i, value: i };
              }),
              selectedMember: selectedMember,
            }}
          />
        ),
      }}
    />

    <div
      className="card rounded-3 py-3 d-flex flex-column gap-2 flex-1"
      style={{ overflowX: "auto" }}
    >
      <div className="d-flex justify-content-between gap-2 align-items-center border-bottom px-2">
        <div className="nav-link">All Members</div>
        {hasCreatePermission && (
          <button
            className="primary p-2 rounded-2 h6 d-flex align-items-center gap-2"
            onClick={() => setShowEditor(true)}
          >
            <i class="bi bi-plus-circle-fill"></i>New Member
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
        <div className="d-flex flex-column flex-1 justify-content-between px-2">
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
              src={`${REPL_DEPLOYMENT_ACCOUNT}/widget/components.Pagination`}
              props={{
                totalLength: allMembers?.length,
                totalPages: Math.ceil(allMembers?.length / rowsPerPage),
                onNextClick: () => setPage(currentPage + 1),
                onPrevClick: () => setPage(currentPage - 1),
                currentPage: currentPage,
                rowsPerPage: rowsPerPage,
                onRowsChange: (v) => setRowsPerPage(parseInt(v)),
              }}
            />
          </div>
        </div>
      )}
    </div>
  </Container>
);
