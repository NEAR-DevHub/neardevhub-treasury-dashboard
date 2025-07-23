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
const [isBulkImport, setIsBulkImport] = useState(false);
const [bulkPreviewData, setBulkPreviewData] = useState(null);

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
  setIsBulkImport(false);
  setShowCreateRequest(!showCreateRequest);
}

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
    case "ProposalAdded":
      content = "Payment request has been successfully created.";
      break;

    default:
      if (showToastStatus.startsWith("BulkProposalAdded")) {
        content = `Successfully imported ${
          showToastStatus.split(":")[1]
        } payment requests.`;
      } else {
        content = `The payment request is ${showToastStatus}.`;
      }
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
            showToastStatus !== "ProposalAdded" &&
            !showToastStatus.startsWith("BulkProposalAdded") &&
            typeof proposalDetailsPageId !== "number" && (
              <a
                className="text-underline"
                href={href({
                  widgetSrc: `${instance}/widget/app`,
                  params: {
                    page: "payments",
                    id: voteProposalId,
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

function updateVoteSuccess(status, proposalId) {
  setVoteProposalId(proposalId);
  setToastStatus(status);
}

function checkProposalStatus(proposalId) {
  Near.asyncView(treasuryDaoID, "get_proposal", {
    id: proposalId,
  })
    .then((result) => {
      updateVoteSuccess(result.status, proposalId);
    })
    .catch(() => {
      // deleted request (thus proposal won't exist)
      updateVoteSuccess("Removed", proposalId);
    });
}

useEffect(() => {
  if (props.transactionHashes) {
    asyncFetch("${REPL_RPC_URL}", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "dontcare",
        method: "tx",
        params: [props.transactionHashes, context.accountId],
      }),
    }).then((transaction) => {
      if (transaction !== null) {
        const transaction_method_name =
          transaction?.body?.result?.transaction?.actions[0].FunctionCall
            .method_name;

        if (transaction_method_name === "act_proposal") {
          const args =
            transaction?.body?.result?.transaction?.actions[0].FunctionCall
              .args;
          const decodedArgs = JSON.parse(atob(args ?? "") ?? "{}");
          if (decodedArgs.id) {
            const proposalId = decodedArgs.id;
            checkProposalStatus(proposalId);
          }
        } else if (transaction_method_name === "add_proposal") {
          setToastStatus("ProposalAdded");
        }
      }
    });
  }
}, [props.transactionHashes]);

return (
  <div className="w-100 h-100 flex-grow-1 d-flex flex-column">
    <VoteSuccessToast />
    {typeof proposalDetailsPageId === "number" ? (
      <Widget
        loading=""
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
      <div className="h-100 w-100 flex-grow-1 d-flex flex-column">
        {bulkPreviewData && (
          <Widget
            loading=""
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.BulkImportPreviewTable`}
            props={{
              instance,
              proposals: bulkPreviewData,
              closePreviewTable: () => setBulkPreviewData(null),
              setToastStatus,
            }}
          />
        )}
        <Widget
          loading=""
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OffCanvas`}
          props={{
            showCanvas: showCreateRequest,
            onClose: toggleCreatePage,
            title: isBulkImport
              ? "Import Payment Requests"
              : "Create Payment Request",
            children: isBulkImport ? (
              <div>
                <div className="mb-3" style={{ fontSize: "13px" }}>
                  Create multiple payment requests at once by pasting data
                  copied from our spreadsheet template. Review and submit your
                  bulk requests with ease. You can add up to 10 requests at a
                  time.
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    className="primary-text-color cursor-pointer"
                    href="https://docs.neartreasury.com/bulk-import"
                  >
                    View Step-by-Step Instructions
                  </a>
                </div>
                <Widget
                  loading=""
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.BulkImportForm`}
                  props={{
                    instance,
                    onCloseCanvas: toggleCreatePage,
                    showPreviewTable: (data) => {
                      setBulkPreviewData(data);
                      toggleCreatePage();
                      setIsBulkImport(false);
                    },
                  }}
                />
              </div>
            ) : (
              <div>
                <div className="mb-3" style={{ fontSize: "13px" }}>
                  Fill in the details to send a payment request to a recipient.
                  Need to send many?
                  <span
                    className="primary-text-color cursor-pointer"
                    onClick={() => setIsBulkImport(true)}
                  >
                    Import Multiple Payment Requests
                  </span>
                </div>
                <Widget
                  loading=""
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.CreatePaymentRequest`}
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
        <div className="layout-flex-wrap flex-grow-1">
          <div className="layout-main">
            <Widget
              loading=""
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Tabs`}
              props={{
                ...props,
                page: "payments",
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
            className={`layout-secondary ${
              typeof showProposalDetailsId === "number" ? "show" : ""
            }`}
          >
            {typeof showProposalDetailsId === "number" && (
              <Widget
                loading=""
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
      </div>
    )}
  </div>
);
