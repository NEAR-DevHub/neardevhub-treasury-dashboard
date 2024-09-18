const { hasPermission } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  hasPermission: () => {},
};

const { selectedTab, instance } = props;

if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const [showCreateRequest, setShowCreateRequest] = useState(false);

const hasCreatePermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "call",
  "AddProposal"
);

const SidebarMenu = ({ currentTab }) => {
  return (
    <div
      className="d-flex gap-2 align-items-center"
      style={{ paddingBottom: "7px" }}
    >
      {hasCreatePermission && (
        <button
          className="primary p-2 rounded-2 h6 fw-bold d-flex align-items-center gap-2 mb-0"
          onClick={() => setShowCreateRequest(true)}
        >
          <i class="bi bi-plus-circle-fill"></i>Create Request
        </button>
      )}
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.SettingsDropdown`}
        props={{ isPendingPage: currentTab.title === "Pending Requests" }}
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
`;

return (
  <Container>
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OffCanvas`}
      props={{
        showCanvas: showCreateRequest,
        onClose: toggleCreatePage,
        title: "Create Asset Exchange Request",
        children: (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.CreateRequest`}
            props={{
              instance,
              onCloseCanvas: toggleCreatePage,
            }}
          />
        ),
      }}
    />
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Tabs`}
      props={{
        ...props,
        tabs: [
          {
            title: "Pending Requests",
            href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.PendingRequests`,
            props: props,
          },
          {
            title: "History",
            href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.History`,
            props: props,
          },
        ],
        SidebarMenu: SidebarMenu,
      }}
    />
  </Container>
);
