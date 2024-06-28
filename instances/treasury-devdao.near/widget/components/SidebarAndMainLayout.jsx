const { normalize } = VM.require(
  "${REPL_DEVHUB}/widget/core.lib.stringUtils"
) || { normalize: () => {} };

const { innerTab, page, leftNavbarOptions } = props;

const Container = styled.div`
  .link {
    text-decoration: none;
  }

  .link.active {
    font-weight: bolder;
    color: var(--theme-color) !important;
    background-color:rgba(227, 230, 232, 1)
  }

  .link:hover {
    color: var(--theme-color)) !important;
    color: var(--theme-color) !important;
    background-color:rgba(227, 230, 232, 1);
  }

  .flex-1 {
    flex: 1;
    min-width: 200px;
  }

  .flex-3 {
    flex: 3;
    min-width: 600px;
  }
`;

const currentTabTitle =
  props.innerTab ?? normalize(leftNavbarOptions?.[0].title);

const [currentTab, setCurrentTab] = useState(
  leftNavbarOptions.find((i) => normalize(i.title) === currentTabTitle) ??
    leftNavbarOptions?.[0]
);

return (
  <Container className="d-flex gap-4 flex-wrap">
    <div className="card card-body flex-1">
      <div className="d-flex gap-2 flex-column">
        {leftNavbarOptions.map((item) => {
          const { title, icon } = item;
          return (
            <div
              onClick={() => setCurrentTab(item)}
              className={[
                "link d-inline-flex gap-2 p-2 px-3 rounded-2 pointer",
                currentTab.title === title ? "active" : "",
              ].join(" ")}
              key={title}
            >
              <div className="d-flex gap-3 align-items-center">
                <h5 className="mb-0">{icon} </h5>
                {title}
              </div>
            </div>
          );
        })}
      </div>
    </div>
    <div className="card card-body flex-3">
      {currentTab && (
        <div className="w-100 h-100 mt-4" key={currentTab.title}>
          <Widget
            src={currentTab.href}
            props={{ ...props, ...currentTab.props }}
          />
        </div>
      )}
    </div>
  </Container>
);
