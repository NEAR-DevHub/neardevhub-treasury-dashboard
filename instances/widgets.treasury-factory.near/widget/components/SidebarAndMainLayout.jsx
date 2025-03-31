const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url");

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

const { tab, page, leftNavbarOptions } = props;

const Container = styled.div`
  .link {
    text-decoration: none;
  }

  .link.active {
    background-color: var(--grey-035);
  }

  .link:hover {
    background-color: var(--grey-035);
  }

  .flex-1 {
    flex: 1;
    min-width: 200px;
  }

  .flex-5 {
    flex: 5;
  }
`;

const defaultTab = leftNavbarOptions?.[0];

const currentTabKey = tab ? normalize(tab) : normalize(defaultTab?.key);

const [currentTab, setCurrentTab] = useState(defaultTab);

useEffect(() => {
  setCurrentTab(
    leftNavbarOptions.find((i) => normalize(i.key) === currentTabKey) ??
      defaultTab
  );
}, [tab]);

return (
  <Container className="d-flex gap-4 flex-wrap">
    <div className="flex-1" style={{ height: "max-content" }}>
      <div className="d-flex gap-2 flex-column">
        {leftNavbarOptions.map((item) => {
          const { title, key } = item;
          return (
            <div key={title} data-testid={title}>
              <a
                href={`?page=settings&tab=${key}`}
                className="d-flex w-100"
                style={{ textDecoration: "none" }}
              >
                <div
                  className={[
                    "link d-inline-flex gap-2 p-2 px-3 rounded-3 pointer w-100",
                    currentTab.title === title ? "active" : "",
                  ].join(" ")}
                >
                  <div>{title}</div>
                </div>
              </a>
            </div>
          );
        })}
      </div>
    </div>

    <div className="flex-5 w-100">
      {currentTab && (
        <div className="w-100 h-100" key={currentTab.key}>
          <Widget
            src={currentTab.href}
            props={{ ...props, ...currentTab.props }}
          />
        </div>
      )}
    </div>
  </Container>
);
