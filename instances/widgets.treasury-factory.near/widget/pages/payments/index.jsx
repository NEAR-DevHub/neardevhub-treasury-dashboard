const { instance } = props;

if ( !instance) {
  return <></>;
}

const [showCreateRequest, setShowCreateRequest] = useState(false);

function toggleCreatePage() {
  setShowCreateRequest(!showCreateRequest);
}

const Container = styled.div`
  .flex-1 {
    flex: 1;
  }
`;

return (
  <Container>
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OffCanvas`}
      props={{
        showCanvas: showCreateRequest,
        onClose: toggleCreatePage,
        title: "Create Payment Request",
        children: (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.CreatePaymentRequest`}
            props={{
              instance,
              onCloseCanvas: toggleCreatePage,
            }}
          />
        ),
      }}
    />
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Tabs`}
      props={{
        ...props,
        tabs: [
          {
            title: "Pending Requests",
            href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.PendingRequests`,
            props: props,
          },
          {
            title: "History",
            href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.History`,
            props: props,
            proposals: data,
          },
        ],
        setShowCreateRequest: setShowCreateRequest,
        page: 'payments', // payments, stake-delegation, asset-exchange, settings-history
        searchAndFilterHistory: true,
      }}
    />
  </Container>
);
