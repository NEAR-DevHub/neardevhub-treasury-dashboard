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
    let selectedTab = findTab(
      tab ? normalize(tab ?? "") : normalize(defaultTab)
    );
    // in case selectedTab is not provided
    if (!selectedTab) {
      selectedTab = normalize(defaultTab);
    }
    setCurrentTab(selectedTab);
    setCurrentTabProps({ ...selectedTab.props, ...props });
  }
}, [props]);

// needed to pass props to child related to current tab
useEffect(() => {
  if (typeof props.setCurrentTab === "function") {
    props.setCurrentTab(currentTab);
  }
}, [currentTab]);

return (
  <Container
    className="card py-3 d-flex flex-column w-100 h-100 flex-grow-1
  "
  >
    <div
      className="d-flex justify-content-between gap-2 align-items-center border-bottom flex-wrap flex-sm-nowrap"
      style={{ paddingRight: "10px" }}
    >
      <NavUnderline className="nav gap-2 w-100">
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
      <div className="px-2 d-flex gap-2 justify-content-start justify-content-sm-end w-100">
        {/* show export in all history tabs except settings and system updates */}
        {currentTab.title === "History" && props.page !== "settings" && (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.ExportTransactions`}
            props={{
              page: props.page,
              instance: props.instance,
            }}
          />
        )}
        <SidebarMenu currentTab={currentTab} />
      </div>
    </div>
    {currentTab && (
      <div className="w-100 h-100 flex-grow-1" key={currentTab.title}>
        <Widget
          src={currentTab.href}
          props={{ ...currentTabProps, ...props }}
        />
      </div>
    )}
  </Container>
);
