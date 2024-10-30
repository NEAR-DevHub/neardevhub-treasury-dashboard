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

const { Theme } = VM.require(`${instance}/widget/config.css`) || {
  Theme: () => <></>,
};

const propsToSend = { ...passProps, instance: instance };

return (
  <Theme>
    <AppLayout
      page={"create-treasury"}
      instance={instance}
      skipHeader
    >
      <Widget
        src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.treasury.Create"
        props={propsToSend}
      />
    </AppLayout>
  </Theme>
);
