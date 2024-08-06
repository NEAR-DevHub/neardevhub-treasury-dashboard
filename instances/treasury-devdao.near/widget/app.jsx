/**
 * This is the main entry point for the Treasury application.
 * Page route gets passed in through params, along with all other page props.
 */

const { page, ...passProps } = props;

// Import our modules
const { AppLayout } = VM.require(
  "${REPL_DEPLOYMENT_ACCOUNT}/widget/components.templates.AppLayout"
) || { AppLayout: () => <></> };

const { Theme } = VM.require(
  "${REPL_DEPLOYMENT_ACCOUNT}/widget/config.css"
) || {
  Theme: () => <></>,
};

if (!page) {
  // If no page is specified, we default to the feed page TEMP
  page = "dashboard";
}

// This is our navigation, rendering the page based on the page parameter
function Page() {
  const routes = page.split(".");
  switch (routes[0]) {
    case "dashboard": {
      return (
        <Widget
          src="${REPL_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.index"
          props={passProps}
        />
      );
    }
    // ?page=members
    case "members": {
      return (
        <Widget
          src={"${REPL_DEPLOYMENT_ACCOUNT}/widget/pages.members.index"}
          props={passProps}
        />
      );
    }
    case "payments": {
      return (
        <Widget
          src={"${REPL_DEPLOYMENT_ACCOUNT}/widget/pages.payments.index"}
          props={passProps}
        />
      );
    }

    case "stake-delegation": {
      return (
        <Widget
          src={"${REPL_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.index"}
          props={passProps}
        />
      );
    }

    case "asset-exchange": {
      return (
        <Widget
          src={"${REPL_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.index"}
          props={passProps}
        />
      );
    }

    default: {
      // TODO: 404 page
      return <p>404</p>;
    }
  }
}

return (
  <Theme>
    <AppLayout page={page}>
      <Page />
    </AppLayout>
  </Theme>
);
