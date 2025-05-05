const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const { tab, instance, id } = props;

if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const [currentTab, setCurrentTab] = useState(null);
const [showStakeRequest, setShowStakeRequest] = useState(false);
const [showUnStakeRequest, setShowUnStakeRequest] = useState(false);
const [showWithdrawRequest, setShowWithdrawRequest] = useState(false);
const createBtnOption = {
  STAKE: "CreateStakeRequest",
  UNSTAKE: "CreateUnstakeRequest",
  WITHDRAW: "CreateWithdrawRequest",
};
const [isCreateBtnOpen, setCreateBtnOpen] = useState(false);
const [selectedCreatePage, setSelectedCreatePage] = useState(
  createBtnOption.STAKE
);

const proposalDetailsPageId =
  id || id === "0" || id === 0 ? parseInt(id) : null;

const [showProposalDetailsId, setShowProposalId] = useState(null);
const [showToastStatus, setToastStatus] = useState(false);
const [voteProposalId, setVoteProposalId] = useState(null);

const ToastStatusContent = () => {
  let content = "";
  switch (showToastStatus) {
    case "InProgress":
      content =
        "Your vote is counted" +
        (typeof proposalDetailsPageId === "number"
          ? "."
          : ", the request is highlighted.");
      break;
    case "Approved":
      content = "The request has been successfully executed.";
      break;
    case "Rejected":
      content = "The request has been rejected.";
      break;
    case "Removed":
      content = "The request has been successfully deleted.";
      break;
    default:
      content = `The request has ${showToastStatus}.`;
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
                    page: "stake-delegation",
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
  <div className="w-100 h-100 flex-grow-1 d-flex flex-column">
    <VoteSuccessToast />
    {typeof proposalDetailsPageId === "number" ? (
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.ProposalDetailsPage`}
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
        <div className="layout-flex-wrap flex-grow-1">
          <div className="layout-main">
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
                    href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.PendingRequests`,
                    props: {
                      ...props,
                      onSelectRequest: (id) => setShowProposalId(id),
                      setToastStatus,
                      setVoteProposalId,
                    },
                  },
                  {
                    title: "History",
                    href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.History`,
                    props: {
                      ...props,
                      onSelectRequest: (id) => setShowProposalId(id),
                      setToastStatus,
                      setVoteProposalId,
                    },
                  },
                ],
                SidebarMenu: ({ currentTab }) => (
                  <Widget
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.CreateButton`}
                    props={{
                      instance,
                      isPendingPage: currentTab.title === "Pending Requests",
                    }}
                  />
                ),
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
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.ProposalDetailsPage`}
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
