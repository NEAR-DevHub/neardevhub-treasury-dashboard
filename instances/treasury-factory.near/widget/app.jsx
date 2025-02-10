/**
 * This is the main entry point for the Treasury application.
 * Page route gets passed in through params, along with all other page props.
 */

const { page, ...passProps } = props;

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

const propsToSend = { ...passProps };

return (
  <Theme>
    <ThemeContainer>
      <AppLayout>
        <Widget
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.treasury.Create"
          props={propsToSend}
        />
      </AppLayout>
    </ThemeContainer>
  </Theme>
);
