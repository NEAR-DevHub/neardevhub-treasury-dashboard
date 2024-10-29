const { instance } = props;
return (
  <div>
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.SidebarAndMainLayout`}
      props={{
        leftNavbarOptions: [
          {
            title: "Members",
            href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.MembersPage`,
            props: { instance },
          },
          {
            title: "Voting Thresholds",
            href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.Thresholds`,
            props: { instance },
          },
          // {
          //   title: "Voting",
          //   href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.Voting`,
          //   props: {},
          // },
        ],
      }}
    />
  </div>
);
