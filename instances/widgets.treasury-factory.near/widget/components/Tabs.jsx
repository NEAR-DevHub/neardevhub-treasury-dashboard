const normalize = (text) =>
  text
    ? text
        .replaceAll(/[- \.]/g, "_")
        .replaceAll(/[^\w]+/g, "")
        .replaceAll(/_+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "")
        .toLowerCase()
        .trim("-")
    : "";

const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const { tab, tabs, SidebarMenu } = props;

const [currentTabProps, setCurrentTabProps] = useState(null);

const Container = styled.div`
  .border-bottom {
    border-bottom: 1px solid var(--border-color) !important;
  }
`;

const NavUnderline = styled.ul`
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;

  .nav-link {
    color: var(--text-secondary-color) !important;
    padding-bottom: 24px;
  }
  .active {
    color: var(--text-color) !important;
    border-bottom: 3px solid var(--theme-color);
  }
  .nav-link:hover {
    color: var(--text-color) !important;
  }
`;

function findTab(tabTitle) {
  return tabs.find((i) => normalize(i.title) === tabTitle);
}

const [currentTab, setCurrentTab] = useState(null);

useEffect(() => {
  if (!currentTabProps) {
    const defaultTab = tabs[0].title;
    let tab = findTab(
      selectedTab ? normalize(selectedTab ?? "") : normalize(defaultTab)
    );
    // in case selectedTab is not provided
    if (!tab) {
      tab = normalize(defaultTab);
    }
    setCurrentTab(tab);
    setCurrentTabProps({ ...tab.props, ...props });
  }
}, [props]);

return (
  <Container className="card py-3 d-flex flex-column">
    <div
      className="d-flex justify-content-between gap-2 align-items-center border-bottom flex-wrap"
      style={{ paddingRight: "10px" }}
    >
      <NavUnderline className="nav gap-2">
        {tabs.map(
          ({ title, props: tabProps }) =>
            title && (
              <li key={title}>
                <div
                  onClick={() => {
                    setCurrentTab(findTab(normalize(title)));
                    setCurrentTabProps({
                      ...tabProps,
                      instance: props.instance,
                    });
                    if (typeof tabProps.onSelectRequest === "function") {
                      tabProps.onSelectRequest(null);
                    }
                  }}
                  className={[
                    "d-inline-flex gap-2 nav-link",
                    normalize(currentTab.title) === normalize(title)
                      ? "active"
                      : "",
                  ].join(" ")}
                >
                  <span>{title}</span>
                </div>
              </li>
            )
        )}
      </NavUnderline>
      <div className="px-2">
        <SidebarMenu currentTab={currentTab} />
      </div>
    </div>
    {currentTab && (
      <div className="w-100 h-100" key={currentTab.title}>
        <Widget
          src={currentTab.href}
          props={{ ...currentTabProps, ...props }}
        />
      </div>
    )}
  </Container>
);
