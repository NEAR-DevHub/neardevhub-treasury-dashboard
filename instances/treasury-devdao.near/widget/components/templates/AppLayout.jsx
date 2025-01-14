const { BalanceBanner } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.BalanceBanner`
) || { BalanceBanner: () => <></> };

const AppHeader = ({ page, instance }) => (
  <Widget
    src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Navbar"
    props={{
      page,
      instance,
    }}
  />
);

function AppLayout({ page, instance, children, treasuryDaoID, accountId }) {
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

  const getColors = (isDarkTheme) => `
  ${metadata.primaryColor ? `--theme-color: ${metadata.primaryColor};` : ""}
  --bg-header-color: ${isDarkTheme ? "#222222" : "#2C3E50"};
  --bg-page-color: ${isDarkTheme ? "#222222" : "#FFFFFF"};
  --bg-system-color: ${isDarkTheme ? "#131313" : "#f4f4f4"};
  --text-color: ${isDarkTheme ? "#CACACA" : "#1B1B18"};
  --text-secondary-color: ${isDarkTheme ? "#878787" : "#999999"};
  --text-alt-color: ${isDarkTheme ? "#FFFFFF" : "#FFFFFF"};
  --border-color: ${isDarkTheme ? "#3B3B3B" : "rgba(226, 230, 236, 1)"};
  --grey-01: ${isDarkTheme ? "#F4F4F4" : "#1B1B18"};
  --grey-02: ${isDarkTheme ? "#B3B3B3" : "#555555"};
  --grey-03: ${isDarkTheme ? "#555555" : "#B3B3B3"};
  --grey-04: ${isDarkTheme ? "#323232" : "#F4F4F4"};
  --grey-05: ${isDarkTheme ? "#1B1B18" : "#F7F7F7"};
  --icon-color:  ${isDarkTheme ? "#CACACA" : "#060606"};
  --other-primary:#2775C9;
  --other-warning:#B17108;
  --other-green:#3CB179;
  --other-red:#D95C4A;

  // bootstrap theme color
  --bs-body-bg: var(--bg-page-color);
  --bs-border-color:  var(--border-color);
  --bs-dropdown-link-hover-color: var(--grey-04);
`;

  const ParentContainer = styled.div`
    ${() => getColors(isDarkTheme)}
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
      border-radius: 14px;
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
        background: var(--theme-color-dark);
      }

      i {
        color: var(--text-alt-color) !important;
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
      -webkit-line-clamp: 3;
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
      background-color: rgb(185, 185, 185, 0.2);
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
      color: var(--theme-color);
      a {
        color: var(--theme-color) !important;
      }

      i {
        color: var(--theme-color) !important;
      }
    }

    .btn-outline.btn:hover {
      color: inherit !important;
    }

    .primary-text-color.btn:hover {
      color: inherit !important;
    }

    .badge {
      padding: 6px 8px;
      background: #f7dbff;
      color: var(--theme-color);
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

    h6,
    .h6,
    h5,
    .h5,
    h4,
    .h4,
    h3,
    .h3,
    h2,
    .h2,
    h1,
    .h1 {
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

    .use-max-bg {
      color: #007aff;
      cursor: pointer;
    }

    .bg-validator-info {
      background: rgba(0, 16, 61, 0.06);
      color: #1b1b18;
      padding-inline: 0.8rem;
      padding-block: 0.5rem;
      font-weight: 500;
      font-size: 13px;
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
      font-size: 13px;
    }

    .text-secondary a {
      color: inherit !important;
    }

    .text-delete {
      color: var(--other-red) !important;

      i {
        color: var(--other-red) !important;
      }
    }

    .btn-outline.btn:hover {
      color: inherit !important;
    }

    .border-right {
      border-right: 1px solid var(--border-color);
    }

    .cursor-pointer {
      cursor: pointer;
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

  return !config ? (
    <></>
  ) : (
    <ParentContainer data-bs-theme={isDarkTheme ? "dark" : "light"}>
      <Theme className="min-h-100 w-100">
        <AppHeader page={page} instance={instance} />
        <BalanceBanner accountId={accountId} treasuryDaoID={treasuryDaoID} />
        <div className="px-3 pb-3 w-100 h-100">{children}</div>
      </Theme>
    </ParentContainer>
  );
}

return { AppLayout };
