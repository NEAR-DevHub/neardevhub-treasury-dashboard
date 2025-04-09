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
const [showProposalDetailsId, setShowProposalId] = useState(null);
const [showToastStatus, setToastStatus] = useState(false);
const [voteProposalId, setVoteProposalId] = useState(null);
const hasCreatePermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "transfer",
  "AddProposal"
);
const [currentTab, setCurrentTab] = useState(null);

const proposalDetailsPageId =
  id || id === "0" || id === 0 ? parseInt(id) : null;

const SidebarMenu = ({ currentTab }) => {
  return (
    <div
      className="d-flex gap-2 align-items-center"
      style={{ paddingBottom: "16px" }}
    >
      {hasCreatePermission && (
        <Widget
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
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.SettingsDropdown`}
        props={{
          isPendingPage: currentTab.title === "Pending Requests",
          instance,
        }}
      />
    </div>
  );
};

function toggleCreatePage() {
  setShowCreateRequest(!showCreateRequest);
}

const Container = styled.div`
  .flex-1 {
    flex: 1;
  }

  .proposals-container {
    display: flex;
    gap: 8px;
    overflow: hidden;
    flex-wrap: wrap;
  }

  .flex-main-item {
    flex: 3;
    min-width: 0;
    overflow: auto;
    min-width: 300px;
  }

  .flex-secondary-item {
    flex: 1.7;
    min-width: 0;
    overflow: auto;
    position: absolute;
    right: 0;
    width: 40%;
    transform: translateX(100%);
    opacity: 0;
    transition: transform 0.2s ease-out, opacity 0.2s ease-out;
    min-width: 300px;
  }

  .flex-secondary-item.show {
    transform: translateX(0);
    opacity: 1;
    position: relative;
  }
`;

const ToastStatusContent = () => {
  let content = "";
  switch (showToastStatus) {
    case "InProgress":
      content =
        "Your vote is counted" +
        (typeof proposalDetailsPageId === "number"
          ? "."
          : ", the payment request is highlighted.");
      break;
    case "Approved":
      content = "The payment request has been successfully executed.";
      break;
    case "Rejected":
      content = "The payment request has been rejected.";
      break;
    case "Removed":
      content = "The payment request has been successfully deleted.";
      break;
    default:
      content = `The payment request is ${showToastStatus}.`;
      break;
  }
  return (
    <div className="toast-body">
      <div className="d-flex align-items-center gap-3">
        {showToastStatus === "Approved" && (
          <i class="bi bi-check2 h3 mb-0 success-icon"></i>
        )}
        <div>
          {content}
          <br />
          {showToastStatus !== "InProgress" &&
            showToastStatus !== "Removed" &&
            typeof proposalDetailsPageId !== "number" && (
              <a
                className="text-underline"
                href={href({
                  widgetSrc: `${instance}/widget/app`,
                  params: {
                    page: "payments",
                    tab: "History",
                    highlightProposalId: voteProposalId,
                  },
                })}
              >
                View in History
              </a>
            )}
        </div>
      </div>
    </div>
  );
};

const VoteSuccessToast = () => {
  return showToastStatus ? (
    <div className="toast-container position-fixed bottom-0 end-0 p-3">
      <div className={`toast ${showToastStatus ? "show" : ""}`}>
        <div className="toast-header px-2">
          <strong className="me-auto">Just Now</strong>
          <i
            className="bi bi-x-lg h6 mb-0 cursor-pointer"
            onClick={() => setToastStatus(null)}
          ></i>
        </div>
        <ToastStatusContent />
      </div>
    </div>
  ) : null;
};

return (
  <div>
    <VoteSuccessToast />
    {typeof proposalDetailsPageId === "number" ? (
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.ProposalDetailsPage`}
        props={{
          ...props,
          id: proposalDetailsPageId,
          instance,
          setToastStatus,
          setVoteProposalId,
        }}
      />
    ) : (
      <Container>
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OffCanvas`}
          props={{
            showCanvas: showCreateRequest,
            onClose: toggleCreatePage,
            title: "Create Payment Request",
            children: (
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.CreatePaymentRequest`}
                props={{
                  instance,
                  onCloseCanvas: toggleCreatePage,
                }}
              />
            ),
          }}
        />
        <div className="proposals-container">
          <div className="flex-main-item">
            <Widget
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Tabs`}
              props={{
                ...props,
                selectedProposalDetailsId: showProposalDetailsId,
                setCurrentTab,
                highlightProposalId:
                  props.highlightProposalId || voteProposalId,
                tabs: [
                  {
                    title: "Pending Requests",
                    href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.PendingRequests`,
                    props: {
                      ...props,
                      onSelectRequest: (id) => setShowProposalId(id),
                      setToastStatus,
                      setVoteProposalId,
                    },
                  },
                  {
                    title: "History",
                    href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.History`,
                    props: {
                      ...props,
                      onSelectRequest: (id) => setShowProposalId(id),
                      setToastStatus,
                      setVoteProposalId,
                    },
                  },
                ],
                SidebarMenu: SidebarMenu,
              }}
            />
          </div>
          <div
            className={`flex-secondary-item ${
              typeof showProposalDetailsId === "number" ? "show" : ""
            }`}
          >
            {typeof showProposalDetailsId === "number" && (
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.ProposalDetailsPage`}
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
      </Container>
    )}
  </div>
);
