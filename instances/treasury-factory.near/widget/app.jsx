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

const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  setTimeout(() => {
    setIsLoading(false);
  }, 500);
}, []);

function updateTreasuryDrafts(treasuries) {
  Storage.set("TREASURY_DRAFTS", JSON.stringify(treasuries));
}

function updateCurrentDraft(treasury) {
  console.log("called", JSON.stringify(treasury));
  Storage.set("CURRENT_DRAFT", JSON.stringify(treasury));
}

function Page() {
  if (!page) {
    const accountId = context.accountId;
    const userDaos = getUserDaos(accountId)?.body?.[accountId]?.["daos"];

    if (Array.isArray(userDaos) && userDaos.length > 0) {
      page = "my-treasuries";
    }
  }

  const routes = (page ?? "").split(".");
  if (isLoading) {
    return <></>;
  }
  switch (routes[0]) {
    case "my-treasuries": {
      return (
        <Widget
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.treasury.MyTreasuries"
          props={{ ...propsToSend, updateTreasuryDrafts, updateCurrentDraft }}
        />
      );
    }
    default:
      return (
        <Widget
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.treasury.Create"
          props={{ ...propsToSend, updateTreasuryDrafts, updateCurrentDraft }}
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
