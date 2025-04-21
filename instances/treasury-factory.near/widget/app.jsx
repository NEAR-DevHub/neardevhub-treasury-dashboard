/**
 * This is the main entry point for the Treasury application.
 * Page route gets passed in through params, along with all other page props.
 */

const { page, ...passProps } = props;

const { getUserDaos } = VM.require("${REPL_DEVDAO_ACCOUNT}/widget/lib.common");

// Import our modules
const { AppLayout } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.templates.AppLayout`
) || { AppLayout: () => <></> };
const { ThemeContainer } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/config.css`
) || {
  ThemeContainer: () => <></>,
};

const { Theme } = VM.require(
  `${REPL_DEVDAO_ACCOUNT}/widget/components.templates.AppLayout`
) || {
  Theme: () => <></>,
};

if (typeof getUserDaos !== "function") {
  return <></>;
}

const propsToSend = { ...passProps };

function Page() {
  if (!page) {
    const accountId = context.accountId;
    const userDaos = getUserDaos(accountId)?.body?.[accountId]?.["daos"];

    if (Array.isArray(userDaos) && userDaos.length > 0) {
      page = "my-treasuries";
    }
  }

  const routes = (page ?? "").split(".");
  switch (routes[0]) {
    case "my-treasuries": {
      return (
        <Widget
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.treasury.MyTreasuries"
          props={propsToSend}
        />
      );
    }
    default:
      return (
        <Widget
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.treasury.Create"
          props={propsToSend}
        />
      );
  }
}
return (
  <Theme>
    <ThemeContainer>
      <AppLayout>
        <Page />
      </AppLayout>
    </ThemeContainer>
  </Theme>
);
