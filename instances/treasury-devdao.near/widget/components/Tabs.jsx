const { normalize } = VM.require(
  "${REPL_DEVHUB}/widget/core.lib.stringUtils"
) || { normalize: () => {} };

const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const { selectedTab, tabs, SidebarMenu } = props;

const [currentTabProps, setCurrentTabProps] = useState(null);

const Container = styled.div`
  .border-bottom {
    border-bottom: 1px solid rgba(226, 230, 236, 1);
  }
`;

const NavUnderline = styled.ul`
  cursor: pointer;
  font-size: 16px;
  .nav-link {
    color: rgba(147, 149, 151, 1) !important;
    padding-bottom: 15px;
  }
  .active {
    font-weight: bolder;
    color: var(--theme-color) !important;
    border-bottom: 3px solid var(--theme-color);
  }
  .nav-link:hover {
    color: var(--theme-color) !important;
    font-weight: bolder;
  }
`;

function findTab(tabTitle) {
  return tabs.find((i) => normalize(i.title) === tabTitle);
}

const [currentTab, setCurrentTab] = useState(selectedTab);

useEffect(() => {
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
}, [props]);

return (
  <Container className="card rounded-3 py-3 d-flex flex-column gap-3">
    <div
      className="d-flex justify-content-between gap-2 align-items-center border-bottom flex-wrap"
      style={{ paddingRight: "10px" }}
    >
      <NavUnderline className="nav gap-2">
        {tabs.map(
          ({ title }) =>
            title && (
              <li key={title}>
                <div
                  onClick={() => {
                    setCurrentTab(findTab(normalize(title)));
                    setCurrentTabProps({ instance: props.instance });
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
      <div className="w-100 h-100 px-3" key={currentTab.title}>
        <Widget src={currentTab.href} props={currentTabProps} />
      </div>
    )}
  </Container>
);
