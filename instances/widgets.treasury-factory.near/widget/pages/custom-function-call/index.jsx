const { hasPermission } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  hasPermission: () => {},
};

const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const { tab, instance, id } = props;

if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const [showCreateRequest, setShowCreateRequest] = useState(false);
const [showToastStatus, setToastStatus] = useState(false);
const [currentTab, setCurrentTab] = useState({ title: "Pending Requests" });
const [voteProposalId, setVoteProposalId] = useState(null);

const proposalDetailsPageId =
  id || id === "0" || id === 0 ? parseInt(id) : null;

const [showProposalDetailsId, setShowProposalId] = useState(null);

const hasCreatePermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "call",
  "AddProposal"
);

const toggleCreatePage = () => {
  setShowCreateRequest(!showCreateRequest);
};

const handleTabChange = (tab) => {
  setCurrentTab(tab);
};

const ToastStatusContent = () => {
  let content = "";
  switch (showToastStatus) {
    case "InProgress":
      content =
        "Your vote is counted" +
        (typeof proposalDetailsPageId === "number"
          ? "."
          : ", the function call request is highlighted.");
      break;
    case "Approved":
      content = "The function call request has been successfully executed.";
      break;
    case "Rejected":
      content = "The function call request has been rejected.";
      break;
    case "Failed":
      content = "The function call execution has failed.";
      break;
    case "Removed":
      content = "The function call request has been successfully deleted.";
      break;
    case "ProposalAdded":
      content = "Function call request has been successfully created.";
      break;
    default:
      content = "Action completed successfully!";
  }
  return (
    <div className="toast-body">
      <div>
        {content}
        <br />
        {showToastStatus === "ProposalAdded" && (
          <a
            className="text-underline"
            href={href({
              widgetSrc: `${instance}/widget/app`,
              params: {
                page: "function-calls",
                id: voteProposalId,
              },
            })}
          >
            View Request
          </a>
        )}
      </div>
    </div>
  );
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
                <i class="bi bi-plus-lg h5 mb-0"></i>
                <span className="responsive-text">Create Request</span>
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
  <div className="w-100 h-100 flex-grow-1 d-flex flex-column">
    <Toast />
    {typeof proposalDetailsPageId === "number" ? (
      <Widget
        loading=""
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.custom-function-call.ProposalDetailsPage`}
        props={{
          ...props,
          id: proposalDetailsPageId,
          instance,
          setToastStatus,
          setVoteProposalId,
        }}
      />
    ) : (
      <div className="h-100 w-100 flex-grow-1 d-flex flex-column">
        <Widget
          loading=""
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OffCanvas`}
          props={{
            showCanvas: showCreateRequest,
            onClose: toggleCreatePage,
            title: "Create Function Call Request",
            children: (
              <div>
                <Widget
                  loading=""
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.custom-function-call.CreateCustomFunctionCallRequest`}
                  props={{
                    instance,
                    onCloseCanvas: toggleCreatePage,
                    setToastStatus,
                    setVoteProposalId,
                  }}
                />
              </div>
            ),
          }}
        />
        <div className="layout-flex-wrap flex-grow-1">
          <div className="layout-main">
            <Widget
              loading=""
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Tabs`}
              props={{
                ...props,
                currentTab,
                onTabChange: handleTabChange,
                page: "function-calls",
                tabs: [
                  {
                    title: "Pending Requests",
                    href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.custom-function-call.PendingRequests`,
                    props: {
                      ...props,
                      onSelectRequest: (id) => setShowProposalId(id),
                      highlightProposalId:
                        props.highlightProposalId ||
                        (typeof showProposalDetailsId === "number"
                          ? showProposalDetailsId
                          : voteProposalId),
                      setToastStatus,
                      setVoteProposalId,
                      selectedProposalDetailsId: showProposalDetailsId,
                    },
                  },
                  {
                    title: "History",
                    href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.custom-function-call.History`,
                    props: {
                      ...props,
                      onSelectRequest: (id) => setShowProposalId(id),
                      highlightProposalId:
                        props.highlightProposalId ||
                        (typeof showProposalDetailsId === "number"
                          ? showProposalDetailsId
                          : voteProposalId),
                      setToastStatus,
                      setVoteProposalId,
                      selectedProposalDetailsId: showProposalDetailsId,
                    },
                  },
                ],
                SidebarMenu: () => <SidebarMenu currentTab={currentTab} />,
              }}
            />
          </div>
          <div
            className={`layout-secondary ${
              typeof showProposalDetailsId === "number" ? "show" : ""
            }`}
          >
            {typeof showProposalDetailsId === "number" && (
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.custom-function-call.ProposalDetailsPage`}
                props={{
                  ...props,
                  id: showProposalDetailsId,
                  instance,
                  isCompactVersion: true,
                  onClose: () => setShowProposalId(null),
                  setToastStatus,
                  setVoteProposalId,
                  currentTab,
                }}
              />
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);
