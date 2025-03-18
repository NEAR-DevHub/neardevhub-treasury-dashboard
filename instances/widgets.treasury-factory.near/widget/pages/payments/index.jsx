const { hasPermission } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  hasPermission: () => {},
};

const { selectedTab, instance } = props;

if (!instance) {
  return <></>;
}

const { treasuryDaoID, cacheURL } = VM.require(`${instance}/widget/config.data`);

if (!treasuryDaoID || !cacheURL) {
  return <></>;
}

const [showCreateRequest, setShowCreateRequest] = useState(false);
const [searchInput, setSearchInput] = useState("");
const [data, setData] = useState([]);
// Filters.
const [author, setAuthor] = useState("");
const [stage, setStage] = useState("");
const [sort, setSort] = useState("id_desc");
const [category, setCategory] = useState("");
const [input, setInput] = useState("");
const [loading, setLoading] = useState(false);
const [searchLoader, setSearchLoader] = useState(false);
const [makeMoreLoader, setMakeMoreLoader] = useState(false);
const [aggregatedCount, setAggregatedCount] = useState(null);
const [currentlyDisplaying, setCurrentlyDisplaying] = useState(0);

const hasCreatePermission = hasPermission(
  treasuryDaoID,
  context?.accountId,
  "transfer",
  "AddProposal"
);

console.log("cacheURL", cacheURL);
console.log("treasuryDaoID", treasuryDaoID);

const endpointToCall =
  "https://testing-indexer.fly.dev/dao/proposals/testing-astradao.sputnik-dao.near";


function searchCacheApi(dao_id, searchTerm) {
  const uriEncodedSearchTerm = encodeURI(searchTerm);
  const searchURL = `${cacheURL}/dao/proposals/search/${dao_id}/${uriEncodedSearchTerm}`;

  console.log("searchURL", searchURL);
  return asyncFetch(searchURL, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  }).catch((error) => {
    console.log("Error searching cache api", error);
  });
}

function searchProposals(searchInput) {
  if (loading) return;
  setLoading(true);

  searchCacheApi(treasuryDaoID, searchInput).then((result) => {
    let body = result.body;
    console.log("body search result in SearchProposals", body);
    setLoading(false);
  });
}

function fetchCacheApi(variables) {
  // FIXME: add the right filters
  // let fetchUrl = `${cacheUrl}/dao/proposals?order=${variables.order}&limit=${variables.limit}&offset=${variables.offset}`;
  let fetchUrl = endpointToCall;
  console.log("fetchUrl", fetchUrl);
  return asyncFetch(fetchUrl, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  }).catch((error) => {
    console.log("Error fetching cache api", error);
  });
}

function fetchProposals(offset) {
  if (!offset) {
    offset = 0;
  }
  if (loading) return;
  setLoading(true);
  const FETCH_LIMIT = 10;
  const variables = {
    order: sort,
    limit: FETCH_LIMIT,
    offset,
    category: category ? encodeURIComponent(category) : "",
    author_id: author ? encodeURIComponent(author) : "",
    stage: stage ? encodeURIComponent(stage) : "",
  };
  fetchCacheApi(variables).then((result) => {
    const body = result.body;
    console.log("fetchProposals body result after fetch", body);
    setLoading(false);
  });
}
useEffect(() => {
  setSearchLoader(true);
  fetchProposals();
}, [author, sort, category, stage]);


useEffect(() => {

  const handler = setTimeout(() => {
    if (searchInput) {
      console.log("index.jsx, searchProposals", searchInput);
      searchProposals(searchInput);
    } else {
      fetchProposals();
    }
  }, 1000);

  return () => {
    clearTimeout(handler);
  };
}, [searchInput]);



const SidebarMenu = ({ currentTab }) => {
  return (
    <div
      className="d-flex gap-2 align-items-center"
      style={{ paddingBottom: "16px" }}
    >
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Input`}
        props={{
          className: "flex-grow-1 w-100 w-xs-100",
          value: searchInput,
          onChange: (e) => {
            setSearchInput(e.target.value);
          },
          onKeyDown: (e) => e.key == "Enter" &&  fetchProposals(),
          skipPaddingGap: true,
          placeholder: "Search",
          inputProps: {
            suffix: <i class="bi bi-search m-auto"></i>,
          },
        }}
      />
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.FilterDropdown`}
        props={{
          isPendingPage: currentTab.title === "Pending Requests",
          instance,
        }}
      />
      {hasCreatePermission && (
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
          props={{
            ActionButton: () => (
              <button className="btn primary-button d-flex align-items-center gap-2 mb-0">
                <i class="bi bi-plus-lg h5 mb-0"></i>Create Request
              </button>
            ),
            checkForDeposit: true,
            treasuryDaoID,
            callbackAction: () => setShowCreateRequest(true),
          }}
        />
      )}
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.SettingsDropdown`}
        props={{
          isPendingPage: currentTab.title === "Pending Requests",
          instance,
        }}
      />
    </div>
  );
};

function toggleCreatePage() {
  setShowCreateRequest(!showCreateRequest);
}

const Container = styled.div`
  .flex-1 {
    flex: 1;
  }
`;

return (
  <Container>
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OffCanvas`}
      props={{
        showCanvas: showCreateRequest,
        onClose: toggleCreatePage,
        title: "Create Payment Request",
        children: (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.CreatePaymentRequest`}
            props={{
              instance,
              onCloseCanvas: toggleCreatePage,
            }}
          />
        ),
      }}
    />
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Tabs`}
      props={{
        ...props,
        tabs: [
          {
            title: "Pending Requests",
            href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.PendingRequests`,
            props: props,
          },
          {
            title: "History",
            href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.History`,
            props: props,
          },
        ],
        SidebarMenu: SidebarMenu,
      }}
    />
  </Container>
);
