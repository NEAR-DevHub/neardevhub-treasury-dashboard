const { instance } = props;

const { showThresholdConfiguration, showVotingDurationConfiguration } =
  VM.require(`${instance}/widget/config.data`);

const [leftNavbarOptions, setLeftBarOptions] = useState([
  {
    title: "Members",
    href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.MembersPage`,
    props: { instance },
  },
]);

useEffect(() => {
  if (showThresholdConfiguration) {
    setLeftBarOptions((prevOptions) => [
      ...prevOptions,
      {
        title: "Voting Thresholds",
        href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.Thresholds`,
        props: { instance },
      },
    ]);
  }
  if (showVotingDurationConfiguration) {
    setLeftBarOptions((prevOptions) => [
      ...prevOptions,
      {
        title: "Voting Duration",
        href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.VotingDurationPage`,
        props: { instance },
      },
    ]);
  }
}, [showThresholdConfiguration, showVotingDurationConfiguration]);

if (typeof showThresholdConfiguration !== "boolean") {
  return <></>;
}

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
