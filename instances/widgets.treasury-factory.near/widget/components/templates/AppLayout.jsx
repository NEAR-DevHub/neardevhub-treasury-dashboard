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
    src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.system-updates.UpdateNotificationBanner"
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

    tr {
      height: 60px;

      th,
      td {
        padding: 0.5rem;
        color: inherit;
        vertical-align: middle;
        background: inherit;
      }
    }

    th:first-child,
    td:first-child {
      padding-left: 20px;
    }

    th:last-child,
    td:last-child {
      padding-right: 20px;
    }
  }

  .text-clamp {
    text-align: left;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .table-simple {
    margin-bottom: 0;
    font-size: 14px;

    thead th {
      font-weight: 500;
      font-size: 12px;
    }

    tbody tr:last-child {
      td {
        border-bottom-width: 0;
      }
    }
  }

  .table-compact {
    border-collapse: separate;
    border-spacing: 0;
    text-align: center;
    border-radius: 12px;

    thead th {
      border-bottom: 0;
    }

    tbody {
      tr {
        height: 45px;

        td {
          padding: 12px;
          border: 1px solid var(--border-color);
          border-bottom-width: 0;
          border-left-width: 0;

          &:last-child {
            padding-right: 10px;
          }

          &:first-child {
            border-left-width: 1px;
            background-color: var(--grey-045);
            font-weight: 500;
            text-align: left;
            padding-lef5: 10px;
          }
        }

        &:first-child {
          td {
            &:first-child {
              border-top-left-radius: 12px;
            }

            &:last-child {
              border-top-right-radius: 12px;
            }
          }
        }
        &:last-child {
          td {
            border-bottom-width: 1px;
            &:first-child {
              border-bottom-left-radius: 12px;
            }

            &:last-child {
              border-bottom-right-radius: 12px;
            }
          }
        }
      }
    }
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

  .system-update-banner {
    background-color: var(--other-green-light);
    padding: 8px;
    text-align: center;
    font-weight: 300;

    .badge {
      background-color: var(--other-green);
      color: white;
      margin-right: 8px;
    }

    a {
      text-decoration: underline;
    }
  }

  .proposal-row {
    &:hover {
      background-color: var(--grey-04) !important;
    }
  }

  .flex-1 {
    flex: 1;
  }

  .layout-flex-wrap {
    display: flex;
    gap: 8px;
    overflow: hidden;
    flex-wrap: wrap;
  }

  .layout-main {
    flex: 3;
    min-width: 0;
    overflow: auto;
    min-width: 300px;
  }

  /* Secondary panel (proposal-details section) */
  .layout-secondary {
    flex: 1.7;
    min-width: 0;
    overflow: auto;
    position: absolute;
    right: 0;
    width: 40%;
    transform: translateX(100%);
    opacity: 0;
    transition: transform 0.2s ease-out, opacity 0.2s ease-out;
    min-width: 300px;
  }

  /* When secondary panel is visible */
  .layout-secondary.show {
    transform: translateX(0);
    opacity: 1;
    position: relative;
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

  const data = fetch(`https://ref-sdk-test-cold-haze-1300-2.fly.dev/headers`);
  const gatewayURL = data?.body?.headers?.Origin ?? "";
  const isDarkTheme = metadata.theme === "dark";

  if (!config || !data) {
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

  return (
    <ParentContainer data-bs-theme={isDarkTheme ? "dark" : "light"}>
      <Theme
        className="w-100 d-flex flex-column"
        style={{
          minHeight: gatewayURL.includes("near.org") ? "100vh" : "100%",
        }}
      >
        <UpdateNotificationBanner
          page={page}
          instance={instance}
        ></UpdateNotificationBanner>
        <AppHeader page={page} instance={instance} />
        <BalanceBanner accountId={accountId} treasuryDaoID={treasuryDaoID} />
        <div className="px-3 pb-3 w-100 h-100 flex-grow-1 d-flex flex-column">
          {children}
        </div>
      </Theme>
    </ParentContainer>
  );
}

return { AppLayout, Theme };
