const { hasPermission } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  hasPermission: () => {},
};

const { tab, instance } = props;

if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const [showCreateRequest, setShowCreateRequest] = useState(false);
const [showToastStatus, setToastStatus] = useState(false);
const [currentTab, setCurrentTab] = useState({ title: "Pending Requests" });

const hasCreatePermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "call",
  "AddProposal"
);

const Container = styled.div`
  .flex-1 {
    flex: 1;
  }
`;

const toggleCreatePage = () => {
  setShowCreateRequest(!showCreateRequest);
};

const handleTabChange = (tab) => {
  setCurrentTab(tab);
};

const ToastStatusContent = () => {
  let content = "";
  switch (showToastStatus) {
    case "ProposalAdded":
      content = "Custom function call proposal created successfully!";
      break;
    default:
      content = "Proposal created successfully!";
  }
  return <div className="toast-body">{content}</div>;
};

const Toast = () => {
  return showToastStatus ? (
    <div className="toast-container position-fixed bottom-0 end-0 p-3">
      <div className={`toast ${showToastStatus ? "show" : ""}`}>
        <div className="toast-header px-2">
          <strong className="me-auto">Just Now</strong>
          <i
            className="bi bi-x-lg h6 mb-0 cursor-pointer"
            onClick={() => setToastStatus(false)}
          ></i>
        </div>
        <ToastStatusContent />
      </div>
    </div>
  ) : null;
};

const SidebarMenu = ({ currentTab }) => {
  return (
    <div
      className="d-flex gap-2 align-items-center"
      style={{ paddingBottom: "16px" }}
    >
      {hasCreatePermission && (
        <Widget
          loading=""
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
          props={{
            ActionButton: () => (
              <button className="btn primary-button d-flex align-items-center gap-2 mb-0">
                <i class="bi bi-plus-lg h5 mb-0"></i>Create Request
              </button>
            ),
            checkForDeposit: true,
            treasuryDaoID,
            callbackAction: () => setShowCreateRequest(true),
          }}
        />
      )}
      <Widget
        loading=""
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.custom-function-call.SettingsDropdown`}
        props={{
          isPendingPage: currentTab.title === "Pending Requests",
          instance,
        }}
      />
    </div>
  );
};

return (
  <Container className="h-100 w-100 flex-grow-1 d-flex flex-column">
    <Widget
      loading=""
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Tabs`}
      props={{
        ...props,
        currentTab,
        onTabChange: handleTabChange,
        page: "custom-function-call",
        tabs: [
          {
            title: "Pending Requests",
            href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.custom-function-call.PendingRequests`,
            props: props,
          },
          {
            title: "History",
            href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.custom-function-call.History`,
            props: props,
          },
        ],
        SidebarMenu: () => <SidebarMenu currentTab={currentTab} />,
      }}
    />

    {/* Toast Notification */}
    <Toast />

    {/* Offcanvas for Create Request */}
    <Widget
      loading=""
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OffCanvas`}
      props={{
        showCanvas: showCreateRequest,
        onClose: toggleCreatePage,
        title: "Create Custom Function Call Request",
        children: (
          <div>
            <Widget
              loading=""
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.custom-function-call.CreateCustomFunctionCallRequest`}
              props={{
                instance,
                onCloseCanvas: toggleCreatePage,
                setToastStatus,
              }}
            />
          </div>
        ),
      }}
    />
  </Container>
);
