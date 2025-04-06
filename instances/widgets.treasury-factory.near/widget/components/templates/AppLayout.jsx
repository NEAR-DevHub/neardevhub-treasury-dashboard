const { BalanceBanner } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.BalanceBanner`
) || { BalanceBanner: () => <></> };

const { getAllColorsAsCSSVariables } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || { getAllColorsAsCSSVariables: () => {} };

const AppHeader = ({ page, instance }) => (
  <Widget
    src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Navbar"
    props={{
      page,
      instance,
    }}
  />
);

const UpdateNotificationBanner = ({ page, instance }) => (
  <Widget
    src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.systemupdates.UpdateNotificationBanner"
    props={{
      page,
      instance,
    }}
  />
);

const Theme = styled.div`
  padding-top: calc(-1 * var(--body-top-padding));

  // remove up/down arrow in input of type = number
  /* For Chrome, Safari, and Edge */
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* For Firefox */
  input[type="number"] {
    -moz-appearance: textfield;
  }

  .card {
    border-color: var(--border-color) !important;
    border-width: 1px !important;
    border-radius: 16px;
    background-color: var(--bg-page-color) !important;
  }

  .dropdown-menu {
    background-color: var(--bg-page-color) !important;
    color: var(--text-color) !important;
  }

  .dropdown-item.active,
  .dropdown-item:active {
    background-color: var(--grey-04) !important;
    color: inherit !important;
  }

  .dropdown-item:hover,
  .dropdown-item:focus {
    background-color: var(--grey-04) !important;
    color: inherit !important;
  }

  .offcanvas {
    background-color: var(--bg-page-color) !important;
    color: var(--text-color) !important;
  }

  color: var(--text-color);
  font-weight: 500;

  a {
    text-decoration: none;
    color: var(--text-color) !important;
    font-weight: 500;
    &.active {
      color: var(--text-color) !important;
    }

    &:hover {
      text-decoration: none;
      color: var(--text-color) !important;
    }
  }

  button {
    height: 40px;
    font-weight: 500;
  }

  button.primary {
    background: var(--theme-color);
    color: var(--text-alt-color) !important;
    border: none !important;
    padding-block: 0.7rem !important;

    i {
      color: var(--text-alt-color) !important;
    }
  }

  .primary-button {
    background: var(--theme-color) !important;
    color: var(--text-alt-color) !important;
    border: none !important;

    &:hover {
      background: var(--theme-color-dark) !important;
    }

    i {
      color: var(--text-alt-color) !important;
    }
  }

  .form-check-input {
    border-color: var(--border-color) !important;
    box-shadow: none !important;

    &:checked {
      background-color: var(--theme-color) !important;
    }
  }

  .text-lg {
    font-size: 15px;
  }

  .fw-semi-bold {
    font-weight: 500;
  }

  .text-secondary {
    color: var(--text-secondary-color) !important;
  }

  .max-w-100 {
    max-width: 100%;
  }

  .custom-truncate {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.5;
    max-height: 4.5em;
    text-align: left;
  }

  .display-none {
    display: none;
  }

  .btn-transparent {
    border: 1px solid var(--border-color);
    :hover {
      border: 1px solid var(--border-color);
    }
  }

  .text-right {
    text-align: end;
  }

  .text-left {
    text-align: left;
  }
  .text-underline {
    text-decoration: underline !important;
  }

  .bg-highlight {
    background-color: var(--grey-04) !important;
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .theme-btn {
    background: var(--theme-color) !important;
    color: white !important;
    border: none;
  }

  .theme-btn.btn:hover {
    color: white !important;
    background: var(--theme-color-dark) !important;
  }

  .btn-outline-secondary {
    border-color: var(--border-color) !important;
    color: var(--text-color) !important;
    border-width: 1px !important;

    i {
      color: var(--text-color) !important;
    }

    &:hover {
      color: var(--text-color) !important;
      border-color: var(--border-color) !important;
      background: var(--grey-035) !important;
    }
  }

  .toast-container {
    right: 10px !important;
    bottom: 10px !important;
  }
  .toast {
    border-radius: 10px;
    overflow: hidden;
    color: var(--text-color) !important;
    background: var(--bg-page-color) !important;
    border-color: var(--border-color) !important;

    a {
      color: inherit !important;
      &:active {
        color: inherit !important;
      }
      &:hover {
        color: inherit !important;
      }
    }
  }

  .toast-header {
    background-color: var(--bg-system-color) !important;
    color: var(--text-secondary-color) !important;
  }

  .text-md {
    font-size: 15px;
  }

  .primary-text-color {
    color: var(--theme-color) !important;
    a {
      color: var(--theme-color) !important;
    }

    i {
      color: var(--theme-color) !important;
    }
  }

  a.primary-text-color:hover {
    color: var(--theme-color-dark) !important;
  }

  .btn-outline.btn:hover {
    color: inherit !important;
  }

  .primary-text-color.btn:hover {
    color: inherit !important;
  }

  .badge {
    padding: 6px 8px;
    background: var(--grey-035);
    color: var(--text-color);
    rounded: 8px;
    font-weight: 500;
    font-size: 12px;
  }

  .btn-outline-plain {
    height: 40px;
    padding-block: 7px !important;
    padding-inline: 10px !important;
    border-radius: 0.375rem !important;
    border: 1.5px solid var(--border-color) !important;
    background-color: var(--bg-page-color) !important;
    color: var(--text-color) !important;

    &:hover {
      background-color: white;
      color: black;
    }
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    color: var(--text-color) !important;
  }

  .btn.disabled:not(.no-transparent),
  fieldset:disabled:not(.no-transparent) {
    border-color: transparent !important;
  }

  .table {
    border-color: var(--border-color) !important;
    color: var(--text-color) !important;
    margin-bottom: 20px;

    .amount {
      font-size: 14px;
    }
  }

  .table td:first-child {
    padding-left: 20px;
  }

  .table td:last-child {
    padding-right: 20px;
  }

  .bg-white {
    background-color: var(--bg-page-color) !important;
    color: var(--text-color) !important;
  }

  .bg-dropdown {
    background-color: var(--bg-page-color) !important;
    color: var(--text-color) !important;
  }

  .bg-custom-overlay {
    background-color: var(--bg-page-color) !important;
    color: var(--text-color) !important;
  }

  .fill-accent {
    fill: var(--theme-color);
  }

  .bg-validator-warning {
    background: rgba(255, 158, 0, 0.1);
    color: var(--other-warning);
    padding-inline: 0.8rem;
    padding-block: 0.5rem;
    font-weight: 500;
    font-size: 13px;
  }

  .bg-withdraw-warning {
    background: rgba(255, 158, 0, 0.1);
    color: var(--other-warning);
    padding-inline: 0.8rem;
    padding-block: 0.5rem;
    font-weight: 500;
    font-size: 13px;
  }

  .text-sm {
    font-size: 12px;
  }

  .text-secondary a {
    color: inherit !important;
  }

  .text-red {
    color: var(--other-red) !important;
  }

  .btn-outline.btn:hover {
    color: inherit !important;
  }

  .border-right {
    border-right: 1px solid var(--border-color);
  }

  .success-icon {
    color: var(--other-green) !important;
  }

  .warning-icon {
    color: var(--other-warning) !important;
  }

  .error-icon {
    color: var(--other-red) !important;
  }

  .primary-icon {
    color: var(--theme-color) !important;
  }
`;

function AppLayout({ page, instance, children, treasuryDaoID, accountId }) {
  const { themeColor } = VM.require(`${instance}/widget/config.data`) || {
    themeColor: "",
  };

  const config = treasuryDaoID
    ? useCache(
        () => Near.asyncView(treasuryDaoID, "get_config"),
        treasuryDaoID + "_get_config",
        { subscribe: false }
      )
    : null;
  const metadata = JSON.parse(atob(config.metadata ?? ""));

  const data = fetch(`https://httpbin.org/headers`);
  const gatewayURL = data?.body?.headers?.Origin ?? "";
  const isDarkTheme = metadata.theme === "dark";

  if (!config) {
    return <></>;
  }

  const primaryColor = metadata?.primaryColor
    ? metadata?.primaryColor
    : themeColor;

  const ParentContainer = styled.div`
    ${() => getAllColorsAsCSSVariables(isDarkTheme, primaryColor)}
    width: 100%;
    background: var(--bg-system-color) !important;
    ${() =>
      gatewayURL.includes("near.org")
        ? `
        /* Styles specific to near.org */
        position: static;
      `
        : `
        /* Styles specific to other URLs */
        position: fixed;
        inset: 73px 0px 0px;
        overflow-y: scroll;
      `}
  `;

  if (page === "lockup") {
    children = (
      <Widget
        src={"${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.lockup.index"}
        props={{ page, instance }}
      />
    );
  }
  return (
    <ParentContainer data-bs-theme={isDarkTheme ? "dark" : "light"}>
      <Theme
        className="w-100"
        style={{
          minHeight: gatewayURL.includes("near.org") ? "100vh" : "100%",
        }}
      >
        <UpdateNotificationBanner></UpdateNotificationBanner>
        <AppHeader page={page} instance={instance} />
        <BalanceBanner accountId={accountId} treasuryDaoID={treasuryDaoID} />
        <div className="px-3 pb-3 w-100 h-100">{children}</div>
      </Theme>
    </ParentContainer>
  );
}

return { AppLayout, Theme };
