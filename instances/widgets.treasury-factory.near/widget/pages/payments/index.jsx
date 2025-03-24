const { hasPermission } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  hasPermission: () => {},
};

const { tab, instance, id } = props;

if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const [showCreateRequest, setShowCreateRequest] = useState(false);
const [showProposalDetailsId, setShowProposalId] = useState(null);

const hasCreatePermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "transfer",
  "AddProposal"
);

const proposalDetailsPageId =
  props.id || props.id === "0" || props.id === 0
    ? parseInt(props.proposalDetailsPageId)
    : null;

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
  }

  .flex-main-item {
    flex: 3;
    min-width: 0;
    overflow: auto;
  }

  .flex-secondary-item {
    flex: 1.5;
    min-width: 0;
    overflow: auto;
  }
`;

return proposalDetailsPageId || proposalDetailsPageId === 0 ? (
  <Widget
    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.ProposalDetailsPage`}
    props={{
      id: proposalDetailsPageId,
      instance,
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
            tabs: [
              {
                title: "Pending Requests",
                href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.PendingRequests`,
                props: {
                  ...props,
                  onSelectRequest: (id) => setShowProposalId(id),
                },
              },
              {
                title: "History",
                href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.History`,
                props: {
                  ...props,
                  onSelectRequest: (id) => setShowProposalId(id),
                },
              },
            ],
            SidebarMenu: SidebarMenu,
          }}
        />
      </div>
      {showProposalDetailsId && (
        <div className="flex-secondary-item">
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.ProposalDetailsPage`}
            props={{
              id: showProposalDetailsId,
              instance,
              isCompactVersion: true,
              onClose: () => setShowProposalId(null),
            }}
          />
        </div>
      )}
    </div>
  </Container>
);
