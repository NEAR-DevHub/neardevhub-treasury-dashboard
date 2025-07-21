const { instance, tab } = props;

const [leftNavbarOptions, setLeftBarOptions] = useState([
  {
    title: "Pending Requests",
    key: "pending-requests",
    href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.feed.index`,
    props: { instance, ...props },
  },
  {
    title: "Members",
    key: "members",
    href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.members.index`,
    props: { instance, ...props },
  },
  {
    title: "Voting Thresholds",
    key: "voting-thresholds",
    href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.Thresholds`,
    props: { instance, ...props },
  },
  {
    title: "Voting Duration",
    key: "voting-duration",
    href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.VotingDurationPage`,
    props: { instance, ...props },
  },
  {
    title: "Theme & Logo",
    key: "theme-logo",
    href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.Theme`,
    props: { instance, ...props },
  },
  {
    title: "System updates",
    key: "system-updates",
    href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.system-updates.SystemUpdates`,
    props: { instance, ...props },
  },
]);

const Menu = useMemo(() => {
  return (
    <Widget
      loading=""
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.SidebarAndMainLayout`}
      props={{
        leftNavbarOptions,
        tab,
      }}
    />
  );
}, []);

return Menu;
