const { innerPage } = props;

if (innerPage) {
  return (
    <Widget
      src={`${REPL_TREASURY}/widget/pages.operations.payments.${innerPage}`}
    />
  );
}

const [showCreateRequest, setShowCreateRequest] = useState(false);

const sidebarMenu = (
  <div className="d-flex gap-2 align-items-center">
    <button
      className="primary p-2 rounded-2 h6 fw-bold d-flex align-items-center gap-2"
      onClick={() => setShowCreateRequest(true)}
    >
      <i class="bi bi-plus-circle-fill"></i>Create Request
    </button>

    <button className="btn-outline p-2 rounded-2 h6 fw-bold">
      <i class="bi bi-gear"></i>
    </button>
  </div>
);

return (
  <div>
    <Widget
      src={`${REPL_TREASURY}/widget/components.OffCanvas`}
      props={{
        showCanvas: showCreateRequest,
        onClose: () => setShowCreateRequest(!showCreateRequest),
        title: "Create Payment Request",
        children: (
          <Widget
            src={`${REPL_TREASURY}/widget/pages.operations.payments.CreatePaymentRequest`}
          />
        ),
      }}
    />
    <Widget
      src={`${REPL_TREASURY}/widget/components.Tabs`}
      props={{
        ...props,
        tabs: [
          {
            title: "Pending Requests",
            href: `${REPL_TREASURY}/widget/pages.operations.payments.PendingRequests`,
            props: {},
          },
          {
            title: "History",
            href: `${REPL_TREASURY}/widget/pages.operations.payments.History`,
            props: {},
          },
        ],
        sidebarMenu: sidebarMenu,
      }}
    />
  </div>
);
