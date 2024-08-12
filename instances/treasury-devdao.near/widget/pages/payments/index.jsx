const { innerPage } = props;

if (innerPage) {
  return <Widget src={`${REPL_TREASURY}/widget/pages.payments.${innerPage}`} />;
}

const [showCreateRequest, setShowCreateRequest] = useState(false);

const sidebarMenu = (
  <div
    className="d-flex gap-2 align-items-center"
    style={{ paddingBottom: "7px" }}
  >
    <button
      className="primary p-2 rounded-2 h6 fw-bold d-flex align-items-center gap-2 mb-0"
      onClick={() => setShowCreateRequest(true)}
    >
      <i class="bi bi-plus-circle-fill"></i>Create Request
    </button>

    <Widget
      src={`${REPL_DEPLOYMENT_ACCOUNT}/widget/components.SettingsDropdown`}
    />
  </div>
);

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
      src={`${REPL_DEPLOYMENT_ACCOUNT}/widget/components.OffCanvas`}
      props={{
        showCanvas: showCreateRequest,
        onClose: toggleCreatePage,
        title: "Create Payment Request",
        children: (
          <Widget
            src={`${REPL_DEPLOYMENT_ACCOUNT}/widget/pages.payments.CreatePaymentRequest`}
            props={{
              onCloseCanvas: toggleCreatePage,
            }}
          />
        ),
      }}
    />
    <Widget
      src={`${REPL_DEPLOYMENT_ACCOUNT}/widget/components.Tabs`}
      props={{
        ...props,
        tabs: [
          {
            title: "Pending Requests",
            href: `${REPL_DEPLOYMENT_ACCOUNT}/widget/pages.payments.PendingRequests`,
            props: {},
          },
          {
            title: "History",
            href: `${REPL_DEPLOYMENT_ACCOUNT}/widget/pages.payments.History`,
            props: {},
          },
        ],
        sidebarMenu: sidebarMenu,
      }}
    />
  </Container>
);
