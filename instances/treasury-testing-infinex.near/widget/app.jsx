/**
 * This is the main entry point for the Treasury application.
 * Page route gets passed in through params, along with all other page props.
 */

const { page, ...passProps } = props;

// Import our modules
const { AppLayout } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.templates.AppLayout"
) || { AppLayout: () => <></> };

const instance = "${REPL_INSTANCE}";
const treasuryDaoID = "${REPL_TREASURY}";

const { Theme } = VM.require(`${instance}/widget/config.css`) || {
  Theme: () => <></>,
};

if (!page) {
  // If no page is specified, we default to the feed page TEMP
  page = "dashboard";
}

const propsToSend = { ...passProps, instance: instance };

// This is our navigation, rendering the page based on the page parameter
function Page() {
  const routes = page.split(".");
  switch (routes[0]) {
    case "dashboard": {
      return (
        <Widget
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.index"
          props={propsToSend}
        />
      );
    }
    // ?page=settings
    case "settings": {
      return (
        <Widget
          src={"${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.index"}
          props={propsToSend}
        />
      );
    }
    case "payments": {
      return (
        <Widget
          src={"${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.index"}
          props={propsToSend}
        />
      );
    }

    case "stake-delegation": {
      return (
        <Widget
          src={
            "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.index"
          }
          props={propsToSend}
        />
      );
    }

    case "asset-exchange": {
      return (
        <Widget
          src={
            "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.index"
          }
          props={propsToSend}
        />
      );
    }

    case "proposals-feed": {
      return (
        <Widget
          src={
            "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.proposals-feed.index"
          }
          props={propsToSend}
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
    <AppLayout page={page} instance={instance} treasuryDaoID={treasuryDaoID}>
      <Page />
    </AppLayout>
  </Theme>
);
