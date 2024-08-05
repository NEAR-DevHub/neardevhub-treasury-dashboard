return (
  <div>
    <Widget
      src={`${REPL_TREASURY}/widget/components.SidebarAndMainLayout`}
      props={{
        leftNavbarOptions: [
          {
            icon: <i class="bi bi-envelope"></i>,
            title: "Pending Requests",
            href: `${REPL_TREASURY}/widget/pages.stake-delegation.PendingRequests`,
            props: {},
          },
          {
            icon: <i class="bi bi-clock-history"></i>,
            title: "History",
            href: `${REPL_TREASURY}/widget/pages.stake-delegation.History`,
            props: {},
          },
        ],
      }}
    />
  </div>
);
