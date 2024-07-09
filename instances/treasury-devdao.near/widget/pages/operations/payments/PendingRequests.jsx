const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

return (
  <div className="d-flex flex-column gap-3">
    <div className="d-flex justify-content-between">
      <h5>Pending Requests</h5>
      <div>
        <Link
          to={href({
            widgetSrc: `${REPL_TREASURY}/widget/app`,
            params: {
              page: "operations",
              tab: "payments",
              innerPage: "CreatePaymentRequest",
            },
          })}
        >
          <button className="primary p-2 rounded-2 h6 fw-bold d-flex align-items-center gap-2">
            <i class="bi bi-plus-circle-fill"></i>Create Payment Request
          </button>
        </Link>
      </div>
    </div>
  </div>
);
