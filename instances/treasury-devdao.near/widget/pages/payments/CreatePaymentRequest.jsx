const { getLinkUsingCurrentGateway } = VM.require(
  "${REPL_DEVHUB}/widget/core.lib.url"
) || { getLinkUsingCurrentGateway: () => {} };

const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const onCloseCanvas = props.onCloseCanvas ?? (() => {});
// need to fetch the list from API
const [recipientsOptions, setReceientsOptions] = useState([
  { label: "devhub.near", value: "devhub.near" },
  { label: "devgovgigs.near", value: "devgovgigs.near" },
]);

const tokenMapping = {
  NEAR: "NEAR",
  USDT: "usdt.tether-token.near",
  USDC: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
};

const sender = "${REPL_TREASURY}";
const [tokenId, setTokenId] = useState(null);
const [receiver, setReceiver] = useState(null);
const [notes, setNotes] = useState(null);
const [selectedProposalId, setSelectedProposalId] = useState("");
const [amount, setAmount] = useState(null);
const [proposalsArray, setProposalsArray] = useState([]);
const [isTxnCreated, setTxnCreated] = useState(false);

const [proposalsOptions, setProposalsOptions] = useState([]);
const [searchProposalId, setSearchProposalId] = useState("");
const [selectedProposal, setSelectedProposal] = useState(null);
const [parsedAmount, setParsedAmount] = useState(null);
const [daoPolicy, setDaoPolicy] = useState(null);
const [lastProposalId, setLastProposalId] = useState(null);
const [isManualRequest, setIsManualRequest] = useState(false);
const QUERYAPI_ENDPOINT = `https://near-queryapi.api.pagoda.co/v1/graphql`;
const queryName = "${REPL_PROPOSAL_FEED_INDEXER_QUERY_NAME}";
const query = `query GetLatestSnapshot($offset: Int = 0, $limit: Int = 10, $where: ${queryName}_bool_exp = {}) {
${queryName}(
  offset: $offset
  limit: $limit
  order_by: {proposal_id: desc}
  where: $where
) {
  name
  proposal_id
  requested_sponsorship_paid_in_currency
  requested_sponsorship_usd_amount
  receiver_account
  summary
  timeline
}
}`;

function separateNumberAndText(str) {
  const numberRegex = /\d+/;

  if (numberRegex.test(str)) {
    const number = str.match(numberRegex)[0];
    const text = str.replace(numberRegex, "").trim();
    return { number: parseInt(number), text };
  } else {
    return { number: null, text: str.trim() };
  }
}

const buildWhereClause = () => {
  let where = {};
  const { number, text } = separateNumberAndText(searchProposalId);

  if (number) {
    where = { proposal_id: { _eq: number }, ...where };
  }

  if (text) {
    where = { name: { _ilike: `%${text}%` }, ...where };
  }

  return where;
};

function getLastProposalId() {
  return Near.asyncView(sender, "get_last_proposal_id").then(
    (result) => result
  );
}

useEffect(() => {
  getLastProposalId().then((i) => setLastProposalId(i));
  Near.asyncView(sender, "get_policy").then((policy) => {
    setDaoPolicy(policy);
  });
}, []);

function refreshData() {
  Storage.privateSet("REFRESH_TABLE_DATA", Math.random());
}

// close canvas after proposal is submitted
useEffect(() => {
  if (isTxnCreated) {
    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (lastProposalId !== id) {
          onCloseCanvas();
          refreshData();
          setTxnCreated(false);
        } else {
          setTimeout(() => checkForNewProposal(), 1000);
        }
      });
    };
    checkForNewProposal();
  }
}, [isTxnCreated]);

function fetchGraphQL(operationsDoc, operationName, variables) {
  return asyncFetch(QUERYAPI_ENDPOINT, {
    method: "POST",
    headers: { "x-hasura-role": "${REPL_X_HASURA_ROLE}" },
    body: JSON.stringify({
      query: operationsDoc,
      variables: variables,
      operationName: operationName,
    }),
  });
}

const fetchProposals = () => {
  const FETCH_LIMIT = 30;
  const variables = {
    limit: FETCH_LIMIT,
    offset: 0,
    where: buildWhereClause(),
  };
  fetchGraphQL(query, "GetLatestSnapshot", variables).then(async (result) => {
    if (result.status === 200) {
      if (result.body.data) {
        const proposalsData = result.body.data[queryName];

        const data = [];
        for (const prop of proposalsData) {
          data.push({
            label: "# " + prop.proposal_id + " : " + prop.name,
            value: prop.proposal_id,
          });
        }
        setProposalsArray(proposalsData);
        setProposalsOptions(data);
      }
    }
  });
};

useEffect(() => {
  fetchProposals();
}, [searchProposalId]);

const Container = styled.div`
  font-size: 14px;
  .text-grey {
    color: #b9b9b9 !important;
  }

  .text-grey a {
    color: inherit !important;
  }
  label {
    font-weight: 600;
    margin-bottom: 3px;
    font-size: 15px;
  }
  .p-2 {
    padding: 0px !important;
  }
  .rounded-pill {
    border-radius: 5px !important;
  }
  .theme-btn {
    background-color: var(--theme-color) !important;
    color: white;
  }

  .primary-text-color a {
    color: var(--theme-color) !important;
  }

  .btn:hover {
    color: black !important;
  }
`;

function onSelectProposal(id) {
  if (!id) {
    setSelectedProposal(null);
    return;
  }

  const proposal = proposalsArray.find((item) => item.proposal_id === id.value);

  if (proposal !== null) {
    setSelectedProposal({
      ...proposal,
      timeline: JSON.parse(proposal.timeline),
    });
    const token = tokenMapping[proposal.requested_sponsorship_paid_in_currency];
    const receiverAccount = proposal.receiver_account;
    if (!recipientsOptions.find((i) => i.value === receiverAccount)) {
      const options = [
        ...recipientsOptions,
        { label: receiverAccount, value: receiverAccount },
      ];
      setReceientsOptions(options);
      setReceiver(proposal.receiver_account);
    }
    setAmount(proposal.requested_sponsorship_usd_amount);
    setTokenId(token);
    setSelectedProposalId(id.value);
  }
}

useEffect(() => {
  if (amount && tokenId) {
    const isNEAR = tokenId === tokenMapping.NEAR;
    if (isNEAR) {
      setParsedAmount(Big(amount).mul(Big(10).pow(24)).toFixed());
    } else {
      Near.asyncView(tokenId, "ft_metadata", {}).then((ftMetadata) => {
        setParsedAmount(
          Big(amount).mul(Big(10).pow(ftMetadata.decimals)).toFixed()
        );
      });
    }
  }
}, [amount, tokenId]);

function onSubmitClick() {
  setTxnCreated(true);
  const isNEAR = tokenId === tokenMapping.NEAR;
  const gas = 270000000000000;
  const deposit = daoPolicy?.proposal_bond || 100000000000000000000000;
  const description = {
    title: selectedProposal.name,
    summary: selectedProposal.summary,
    notes: notes,
  };

  if (!isManualRequest) {
    description["proposalId"] = selectedProposalId;
  }

  Near.call([
    {
      contractName: sender,
      methodName: "add_proposal",
      args: {
        proposal: {
          description: JSON.stringify(description),
          kind: {
            Transfer: {
              token_id: isNEAR ? "" : tokenId,
              receiver_id: receiver,
              amount: parsedAmount,
            },
          },
        },
      },
      gas: gas,
      deposit: deposit,
    },
  ]);
}

return (
  <Container>
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-column gap-1">
        <label>Proposal</label>
        <Widget
          src="${REPL_DEPLOYMENT_ACCOUNT}/widget/components.DropDownWithSearchAndManualRequest"
          props={{
            selectedValue: "",
            onChange: onSelectProposal,
            options: proposalsOptions,
            showSearch: true,
            searchInputPlaceholder: "Search by id or title",
            defaultLabel: isManualRequest ? "Add manual request" : "Select",
            searchByValue: true,
            onSearch: (value) => {
              setSearchProposalId(value);
            },
            onClickOfManualRequest: () => {
              setSelectedProposal(null);
              setIsManualRequest(true);
            },
            showManualRequest: true,
          }}
        />
      </div>
      {isManualRequest && (
        <div className="d-flex flex-column gap-3">
          <div className="d-flex flex-column gap-1">
            <label>Proposal Title</label>
            <Widget
              src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Input`}
              props={{
                className: "flex-grow-1",
                key: `proposal-title`,
                onBlur: (e) =>
                  setSelectedProposal((prev) => ({
                    ...prev,
                    name: e.target.value,
                  })),
                value: selectedProposal.name,
                multiline: true,
              }}
            />
          </div>
          <div className="d-flex flex-column gap-1">
            <label>Proposal Summary</label>
            <Widget
              src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Input`}
              props={{
                className: "flex-grow-1",
                key: `proposal-summary`,
                onBlur: (e) =>
                  setSelectedProposal((prev) => ({
                    ...prev,
                    summary: e.target.value,
                  })),
                value: selectedProposal.summary,
                multiline: true,
              }}
            />
          </div>
        </div>
      )}
      {selectedProposal && !isManualRequest && (
        <div className="border p-3 rounded-3 d-flex flex-column gap-2">
          <h6 className="d-flex gap-2 mb-0">
            {selectedProposal.name}{" "}
            <div style={{ width: "fit-content" }}>
              <Widget
                src={"${REPL_DEVHUB}/widget/devhub.entity.proposal.StatusTag"}
                props={{
                  timelineStatus: selectedProposal.timeline.status,
                }}
              />
            </div>
          </h6>
          <div>{selectedProposal.summary}</div>
          <Link
            target="_blank"
            rel="noopener noreferrer"
            to={href({
              widgetSrc: `${REPL_DEVHUB}/widget/app`,
              params: {
                page: "proposal",
                id: selectedProposal.proposal_id,
              },
            })}
          >
            <button className="btn p-0 d-flex align-items-center gap-2 bolder">
              Open Proposal <i class="bi bi-box-arrow-up-right"></i>
            </button>
          </Link>
        </div>
      )}
      <div className="d-flex flex-column gap-1">
        <label>Recipient</label>
        <Widget
          src="${REPL_DEVHUB}/widget/devhub.components.molecule.DropDownWithSearch"
          props={{
            selectedValue: receiver,
            onChange: (v) => setReceiver(v.value),
            options: recipientsOptions,
            showSearch: false,
            defaultLabel: "Select",
          }}
        />
      </div>
      <div className="d-flex flex-column gap-1">
        <label>Requested Token</label>
        <Widget
          src="${REPL_DEPLOYMENT_ACCOUNT}/widget/components.TokensDropdown"
          props={{
            selectedValue: tokenId,
            onChange: (v) => setTokenId(v),
          }}
        />
      </div>
      <div className="d-flex flex-column gap-1">
        <label>Total Amount</label>
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Input`}
          props={{
            className: "flex-grow-1",
            key: `total-amount`,
            onChange: (e) => setAmount(e.target.value),
            placeholder: "Enter amount",
            value: amount,
            inputProps: {
              type: "number",
            },
          }}
        />
      </div>
      <div className="d-flex flex-column gap-1">
        <label>Notes (Optional)</label>
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Input`}
          props={{
            className: "flex-grow-1",
            key: `notes`,
            onChange: (e) => setNotes(e.target.value),
            value: notes,
            multiline: true,
          }}
        />
      </div>
      <div className="d-flex mt-2 gap-3 justify-content-end">
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: {
              root: "btn-outline shadow-none border-0",
            },
            label: "Cancel",
            onClick: onCloseCanvas,
            disabled: isTxnCreated,
          }}
        />

        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: { root: "theme-btn" },
            disabled:
              !amount || !receiver || !selectedProposal?.name || !tokenId,
            label: "Submit",
            onClick: onSubmitClick,
            loading: isTxnCreated,
          }}
        />
      </div>
    </div>
  </Container>
);
