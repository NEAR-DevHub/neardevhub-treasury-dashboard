const { instance } = props;

if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const Container = styled.div`
  .flex-1 {
    flex: 1;
  }
`;

return (
  <Container className="h-100 w-100 flex-grow-1 d-flex flex-column">
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Tabs`}
      props={{
        ...props,
        tabs: [
          {
            title: "Pending Requests",
            href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.lockup.PendingRequests`,
            props: props,
          },
          {
            title: "History",
            href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.lockup.History`,
            props: props,
          },
        ],
        SidebarMenu: ({ currentTab }) => (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.lockup.CreateButton`}
            props={{
              instance,
              isPendingPage: currentTab.title === "Pending Requests",
            }}
          />
        ),
      }}
    />
  </Container>
);
