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

// State.init({
//   data: [],
//   author: "",
//   stage: "",
//   sort: "id_desc",
//   category: "",
//   input: "",
//   loading: false,
//   searchLoader: false,
//   makeMoreLoader: false,
//   aggregatedCount: null,
//   currentlyDisplaying: 0,
// });

const hasCreatePermission = hasPermission(
  treasuryDaoID,
  context?.accountId,
  "transfer",
  "AddProposal"
);

console.log("cacheURL", cacheURL);
console.log("treasuryDaoID", treasuryDaoID);
// https://testing-indexer.fly.dev/
// testing-astradao.sputnik-dao.near
// https://testing-indexer.fly.dev/dao/proposals/testing-astradao.sputnik-dao.near
// http://127.0.0.1:8080/dao/proposals/testing-astradao.sputnik-dao.near
// TODO once finished replace the cacheURl and treasuryDaoID with the ones from the config.data
const endpointToCall =
  "https://testing-indexer.fly.dev/dao/proposals/testing-astradao.sputnik-dao.near";


function searchCacheApi(dao_id, searchTerm) {
  const uriEncodedSearchTerm = encodeURI(searchTerm);
  // /dao/proposals/search/testing-astradao.sputnik-dao.near/requested
  const searchURL = `${cacheURL}/dao/proposals/search/${dao_id}/${uriEncodedSearchTerm}`;

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
    // const promises = body.records.map((proposal) => {
    //   if (isNumber(proposal.linked_rfp)) {
    //     getRfp(proposal.linked_rfp).then((rfp) => {
    //       return { ...proposal, rfpData: rfp };
    //     });
    //   } else {
    //     return Promise.resolve(proposal);
    //   }
    // });
    // Promise.all(promises).then((proposalsWithRfpData) => {
      // setAggregatedCount(body.total_records);
    //   fetchBlockHeights(proposalsWithRfpData, 0);
    // });
  });
}

function fetchCacheApi(variables) {
  let fetchUrl = endpointToCall;
  // let fetchUrl = `${cacheUrl}/dao/proposals?order=${variables.order}&limit=${variables.limit}&offset=${variables.offset}`;
  // FIXME: add the right filters
  // if (variables.author_id) {
    //   fetchUrl += `&filters.author_id=${variables.author_id}`;
    // }
    // if (variables.stage) {
      //   fetchUrl += `&filters.stage=${variables.stage}`;
      // }
      // if (variables.category) {
        //     fetchUrl += `&filters.category=${variables.category}`;
        // }
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
    // const promises = body.records.map((proposal) => {
    //   if (isNumber(proposal.linked_rfp)) {
    //     getRfp(proposal.linked_rfp).then((rfp) => {
    //       return { ...proposal, rfpData: rfp };
    //     });
    //   } else {
    //     return Promise.resolve(proposal);
    //   }
    // });
    // Promise.all(promises).then((proposalsWithRfpData) => {
      // setAggregatedCount(body.total_records);
    //   fetchBlockHeights(proposalsWithRfpData, offset);
    // });
  });
}
// MOVE TO TABS? to put the filters etc

useEffect(() => {
  setSearchLoader(true);
  fetchProposals();
}, [author, sort, category, stage]);


// useEffect(() => {
  // const handler = setTimeout(() => {
  //   if (searchInput) {
  //     console.log("index.jsx, searchProposals", searchInput);
  //     searchProposals(searchInput);
  //   } else {
  //     fetchProposals();
  //   }
  // }, 1000);

//   return () => {
//     clearTimeout(handler);
//   };
// }, [searchInput]);



const SidebarMenu = ({ currentTab }) => {
  return (
    <div
      className="d-flex gap-2 align-items-center"
      style={{ paddingBottom: "16px" }}
    >
      <Widget
        src={
         `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.SearchInput`
        }
        props={{
          search: searchInput,
          className: "w-xs-100",
          onSearch: (input) => {
            setSearchInput(input);
          },
          onEnter: () => {
            fetchProposals();
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
