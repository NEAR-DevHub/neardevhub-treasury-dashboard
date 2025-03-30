const instance = props.instance;
if (!instance) {
  return <></>;
}

const Container = styled.div`
  font-size: 13px;
  min-height: 60vh;
  display: flex;

  td {
    padding: 0.5rem;
    color: inherit;
    vertical-align: middle;
    background: inherit;
  }

  thead td {
    text-wrap: nowrap;
  }

  table {
    overflow-x: auto;
  }
`;

const SidebarMenu = ({ currentTab }) => <></>;

return (
  <Widget
    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Tabs`}
    props={{
      ...props,
      tabs: [
        {
          title: "Available Updates",
          href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.systemupdates.AvailableUpdates`,
          props: props,
        },
        {
          title: "History",
          href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.systemupdates.History`,
          props: props,
        },
      ],
      SidebarMenu: SidebarMenu,
    }}
  />
);
