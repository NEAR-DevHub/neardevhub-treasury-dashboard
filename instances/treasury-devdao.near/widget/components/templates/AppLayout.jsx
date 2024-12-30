const data = fetch(`https://httpbin.org/headers`);
const gatewayURL = data?.body?.headers?.Origin ?? "";

const config = Near.view("${REPL_TREASURY}", "get_config");
const metadata = JSON.parse(atob(config.metadata ?? ""));

const isDarkTheme = false;

// we need fixed positioning for near social and not for org
const ParentContainer = gatewayURL.includes("near.org")
  ? styled.div`
      width: 100%;
    `
  : styled.div`
      position: fixed;
      inset: 73px 0px 0px;
      width: 100%;
      overflow-y: scroll;
      background: var(--bg-page-color) !important;
    `;

const Theme = styled.div`
  display: flex;
  flex-direction: column;
  padding-top: calc(-1 * var(--body-top-padding));
  background: var(--bg-page-color) !important;

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

  --bg-header-color: ${isDarkTheme ? "#222222" : "#2C3E50"};
  --bg-page-color: ${isDarkTheme ? "#222222" : "#f4f4f4"};
  --bg-system-color: ${isDarkTheme ? "#131313" : "#f4f4f4"};
  --card-bg-page-color: ${isDarkTheme ? "#222222" : "#FFFFFF"};
  --text-color: ${isDarkTheme ? "#CACACA" : "#1B1B18"};
  --text-secondary-color: ${isDarkTheme ? "#878787" : "#999999"};
  --text-alt-color: ${isDarkTheme ? "#FFFFFF" : "#FFFFFF"};
  --link-inactive-color: ${isDarkTheme ? "" : "white"};
  --link-active-color: ${isDarkTheme ? "" : "white"};
  --border-color: ${isDarkTheme ? "#3B3B3B" : "rgba(226, 230, 236, 1)"};
  --grey-01: ${isDarkTheme ? "#F4F4F4" : "#1B1B18"};
  --grey-02: ${isDarkTheme ? "#B3B3B3" : "#555555"};
  --grey-03: ${isDarkTheme ? "#555555" : "#B3B3B3"};
  --grey-04: ${isDarkTheme ? "#323232" : "#F4F4F4"};
  --grey-05: ${isDarkTheme ? "#1B1B18" : "#F7F7F7"};

  .card {
    border-color: var(--border-color) !important;
    border-width: 1px !important;
    border-radius: 14px;
    background-color: var(--card-bg-page-color) !important;
  }

  .dropdown-menu {
    background-color: var(--card-bg-page-color) !important;
    color: var(--text-color) !important;
  }

  .offcanvas {
    background-color: var(--card-bg-page-color) !important;
    color: var(--text-color) !important;
  }

  color: var(--text-color);

  a {
    text-decoration: none;
    color: var(--link-inactive-color) !important;
    &.active {
      color: var(--link-active-color) !important;
      font-weight: 700 !important;
    }

    &:hover {
      text-decoration: none;
      color: var(--link-active-color) !important;
      font-weight: 700 !important;
    }
  }

  button.primary {
    background: var(--theme-color) !important;
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

  .text-dark-grey {
    color: rgba(85, 85, 85, 1) !important;
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
    color: white;
    border: none;
  }

  .toast {
    background: white !important;
  }

  .toast-header {
    background-color: #2c3e50 !important;
    color: white !important;
  }

  .text-md {
    font-size: 15px;
  }

  .primary-text-color {
    color: var(--theme-color);
  }

  .btn-outline-plain {
    padding-block: 8px !important;
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

  .table {
    border-color: var(--border-color) !important;
    color: var(--text-color) !important;
  }

  .bg-white {
    background-color: var(--bg-page-color) !important;
    color: var(--text-color) !important;
  }

  .fill-accent {
    fill: var(--theme-color);
  }
`;

const Container = styled.div`
  width: 100%;
`;

const AppHeader = ({ page, instance }) => (
  <Widget
    src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Navbar"
    props={{
      page,
      instance,
    }}
  />
);

function AppLayout({ page, instance, children }) {
  return (
    <ParentContainer>
      <Theme>
        <Container>
          <AppHeader page={page} instance={instance} />
          <div
            className="px-3 py-2"
            data-bs-theme={isDarkTheme ? "dark" : "light"}
          >
            {children}
          </div>
        </Container>
      </Theme>
    </ParentContainer>
  );
}

return { AppLayout };
