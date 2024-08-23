return (
  <div>
    <Widget
      src={`${REPL_DEPLOYMENT_ACCOUNT}/widget/components.SidebarAndMainLayout`}
      props={{
        leftNavbarOptions: [
          {
            title: "Members",
            href: `${REPL_DEPLOYMENT_ACCOUNT}/widget/pages.settings.MembersPage`,
            props: {},
          },
          // TO BE ADDED LATER
          // {
          //   title: "Groups",
          //   href: `${REPL_DEPLOYMENT_ACCOUNT}/widget/pages.settings.GroupsPage`,
          //   props: {},
          // },
          // {
          //   title: "Voting",
          //   href: `${REPL_DEPLOYMENT_ACCOUNT}/widget/pages.Voting`,
          //   props: {},
          // },
        ],
      }}
    />
  </div>
);
