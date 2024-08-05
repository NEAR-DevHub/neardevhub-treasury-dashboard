const { innerPage } = props;

if (innerPage) {
  return <Widget src={`${REPL_TREASURY}/widget/pages.payments.${innerPage}`} />;
}

const [showCreateRequest, setShowCreateRequest] = useState(false);

// to make it accessible in both history and pending payments requests
const columnsVisibility = JSON.parse(
  Storage.privateGet("COLUMNS_VISIBLILITY") ?? "[]"
);

function changeColumnsVisibility(value) {
  Storage.privateSet("COLUMNS_VISIBLILITY", JSON.stringify(value));
}

const sidebarMenu = (
  <div className="d-flex gap-2 align-items-center">
    <button
      className="primary p-2 rounded-2 h6 fw-bold d-flex align-items-center gap-2 mb-0"
      onClick={() => setShowCreateRequest(true)}
    >
      <i class="bi bi-plus-circle-fill"></i>Create Request
    </button>

    <Widget
      src={`${REPL_TREASURY}/widget/components.SettingsDropdown`}
      props={{ columnsVisibility, changeColumnsVisibility }}
    />
  </div>
);

function toggleCreatePage() {
  setShowCreateRequest(!showCreateRequest);
}

return (
  <div>
    <Widget
      src={`${REPL_TREASURY}/widget/components.OffCanvas`}
      props={{
        showCanvas: showCreateRequest,
        onClose: toggleCreatePage,
        title: "Create Payment Request",
        children: (
          <Widget
            src={`${REPL_TREASURY}/widget/pages.payments.CreatePaymentRequest`}
            props={{ onCloseCanvas: toggleCreatePage }}
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
            href: `${REPL_TREASURY}/widget/pages.payments.PendingRequests`,
            props: {
              columnsVisibility,
            },
          },
          {
            title: "History",
            href: `${REPL_TREASURY}/widget/pages.payments.History`,
            props: {
              columnsVisibility,
            },
          },
        ],
        sidebarMenu: sidebarMenu,
      }}
    />
  </div>
);
