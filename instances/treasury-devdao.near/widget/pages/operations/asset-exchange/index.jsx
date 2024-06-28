return (
  <div>
    <Widget
      src={`${REPL_TREASURY}/widget/components.SidebarAndMainLayout`}
      props={{
        leftNavbarOptions: [
          {
            icon: <i class="bi bi-envelope"></i>,
            title: "Pending Requests",
            href: `${REPL_TREASURY}/widget/pages.operations.asset-exchange.PendingRequests`,
            props: {},
          },
          {
            icon: <i class="bi bi-clock-history"></i>,
            title: "History",
            href: `${REPL_TREASURY}/widget/pages.operations.asset-exchange.History`,
            props: {},
          },
        ],
      }}
    />
  </div>
);
