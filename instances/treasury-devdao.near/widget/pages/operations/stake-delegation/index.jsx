const { innerPage } = props;

if (innerPage) {
  return (
    <Widget
      src={`${REPL_TREASURY}/widget/pages.operations.stake-delegation.${innerPage}`}
    />
  );
}

return (
  <div>
    <Widget
      src={`${REPL_TREASURY}/widget/components.SidebarAndMainLayout`}
      props={{
        ...props,
        leftNavbarOptions: [
          {
            icon: <i class="bi bi-envelope"></i>,
            title: "Pending Requests",
            href: `${REPL_TREASURY}/widget/pages.operations.stake-delegation.PendingRequests`,
            props: {},
          },
          {
            icon: <i class="bi bi-clock-history"></i>,
            title: "History",
            href: `${REPL_TREASURY}/widget/pages.operations.stake-delegation.History`,
            props: {},
          },
        ],
      }}
    />
  </div>
);
