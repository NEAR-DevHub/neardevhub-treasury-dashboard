const { normalize } = VM.require(
  "${REPL_DEVHUB}/widget/core.lib.stringUtils"
) || { normalize: () => {} };

const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const Container = styled.div`
  min-height: 80vh;
`;

const NavUnderline = styled.ul`
  cursor: pointer;
  a {
    text-decoration: none;
    color: rgba(147, 149, 151, 1) !important;
  }
  a.active {
    font-weight: bolder;
    color: var(--theme-color) !important;
    border-bottom: 3px solid black;
  }
  a:hover {
    color: var(--theme-color) !important;
  }
  .nav-item {
    font-size: 20px;
  }
`;

const { tab } = props;

const tabs = [
  {
    title: "Payments",
    view: "payments.index",
    props: {},
  },
  {
    title: "Stake Delegation",
    view: "stake-delegation.index",
  },
  {
    title: "Asset Exchange",
    view: "asset-exchange.index",
  },
];

function findTab(tabTitle) {
  return tabs.find((it) => normalize(it.title) === tabTitle);
}

const defaultTab = tabs[0].title;
let currentTab = findTab(tab ?? normalize(defaultTab));
// in case tab is not provided
if (!currentTab) {
  currentTab = findTab(normalize(defaultTab));
}

return (
  <Container>
    <NavUnderline className="nav gap-4 my-4">
      {tabs.map(
        ({ title }) =>
          title && (
            <li className="nav-item" key={title}>
              <Link
                to={href({
                  widgetSrc: `${REPL_TREASURY}/widget/app`,
                  params: {
                    ...props,
                    page: "operations",
                    tab: normalize(title),
                  },
                })}
                className={[
                  "d-inline-flex gap-2 nav-link",
                  normalize(currentTab.title) === normalize(title)
                    ? "active"
                    : "",
                ].join(" ")}
              >
                <span>{title}</span>
              </Link>
            </li>
          )
      )}
    </NavUnderline>
    {currentTab && (
      <div className="w-100 h-100 mt-4" key={currentTab.title}>
        <Widget
          src={`${REPL_TREASURY}/widget/pages.operations.${currentTab.view}`}
          props={{ ...currentTab.props, ...props }}
        />
      </div>
    )}
  </Container>
);
