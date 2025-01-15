const { instance } = props;

const [leftNavbarOptions, setLeftBarOptions] = useState([
  {
    title: "Requests",
    href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.feed.index`,
    props: { instance, ...props },
  },
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
  {
    title: "Voting Duration",
    href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.VotingDurationPage`,
    props: { instance },
  },
  {
    title: "Theme & Logo",
    href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.Theme`,
    props: { instance },
  },
]);

return (
  <div>
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.SidebarAndMainLayout`}
      props={{
        leftNavbarOptions,
      }}
    />
  </div>
);
