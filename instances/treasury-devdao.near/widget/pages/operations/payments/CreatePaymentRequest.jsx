const { getLinkUsingCurrentGateway } = VM.require(
  "${REPL_DEVHUB}/widget/core.lib.url"
) || { getLinkUsingCurrentGateway: () => {} };

const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const [fromWalletOptions, setFromWalletOptions] = useState([
  { label: "treasurydevhub.near", value: "treasurydevhub.near" },
  {
    label: "infrastructure-committee.near",
    value: "infrastructure-committee.near",
  },
]);

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

const [tokensOptions, setTokenOptions] = useState([
  { label: "NEAR", value: tokenMapping.NEAR },
  { label: "USDT", value: tokenMapping.USDT },
  {
    label: "USDC",
    value: tokenMapping.USDC,
  },
]);

const [sender, setSender] = useState(fromWalletOptions[0].value);
const [tokenId, setTokenId] = useState(null);
const [receiver, setReceiver] = useState(null);
const [memo, setMemo] = useState(null);
const [selectedProposalId, setSelectedProposalId] = useState("");
const [amount, setAmount] = useState(null);
const [proposalsArray, setProposalsArray] = useState([]);
const [isTxnCreated, setTxnCreated] = useState(false);

const [proposalsOptions, setProposalsOptions] = useState([]);
const [searchProposalId, setSearchProposalId] = useState("");
const [parsedAmount, setParsedAmount] = useState(null);
const [daoPolicy, setDaoPolicy] = useState(null);
const [lastProposalId, setLastProposalId] = useState(null);
const [showPaymentsPage, setShowPaymentsPage] = useState(false);
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
  if (sender) {
    getLastProposalId().then((i) => setLastProposalId(i));
  }
}, [sender]);

// redirect user to payments page after proposal is submitted
useEffect(() => {
  if (isTxnCreated) {
    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (lastProposalId !== id) {
          setShowPaymentsPage(true);
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

const Wrapper = styled.div`
  width: 50%;
  margin: auto;
  @media screen and (max-width: 1300px) {
    width: 60%;
  }
  @media screen and (max-width: 1000px) {
    width: 100%;
  }

  .border-line {
    border: 2px solid rgba(236, 238, 240, 1);
  }
`;

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
  .green-btn {
    background-color: #04a46e !important;
    color: white;
  }

  .primary-text-color a {
    color: var(--theme-color) !important;
  }
`;

function onSelectProposal(id) {
  const proposal = proposalsArray.find((item) => item.proposal_id === id.value);

  if (proposal !== null) {
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

useEffect(() => {
  if (sender) {
    Near.asyncView(sender, "get_policy").then((policy) => {
      setDaoPolicy(policy);
    });
  }
}, [sender]);

function onSubmitClick() {
  setTxnCreated(true);
  const isNEAR = tokenId === tokenMapping.NEAR;
  const gas = 270000000000000;
  const deposit = daoPolicy?.proposal_bond || 100000000000000000000000;
  const proposal = proposalsArray.find(
    (item) => item.proposal_id === selectedProposalId
  );
  const description = {
    proposal_id: selectedProposalId,
    title: proposal.name,
    summary: proposal.summary,
    link: getLinkUsingCurrentGateway(
      `${REPL_DEVHUB}/widget/app?page=proposal&id=${selectedProposalId}`
    ),
    memo: memo,
  };
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

const VerificationIconContainer = ({ isVerified, label }) => {
  return (
    <div className="d-flex gap-2 align-items-center">
      <img
        src={
          isVerified
            ? "https://ipfs.near.social/ipfs/bafkreidqveupkcc7e3rko2e67lztsqrfnjzw3ceoajyglqeomvv7xznusm"
            : "https://ipfs.near.social/ipfs/bafkreidqveupkcc7e3rko2e67lztsqrfnjzw3ceoajyglqeomvv7xznusm"
        }
        height={30}
      />
      <div>{label}</div>
    </div>
  );
};

if (showPaymentsPage) {
  return (
    <Widget
      src={`${REPL_TREASURY}/widget/app`}
      props={{
        page: "operations",
        tab: "payments",
      }}
    />
  );
}
return (
  <Container className="container-xxl">
    <div className="d-flex gap-1 align-items-center mb-2 bolder h6 primary-text-color">
      <Link
        to={href({
          widgetSrc: `${REPL_TREASURY}/widget/app`,
          params: {
            page: "operations",
            tab: "payments",
          },
        })}
      >
        <div className="">Pending Requests</div>
      </Link>
      <span>/</span>
      <div style={{ fontWeight: 700 }}>Create New</div>
    </div>
    <div className="card card-body">
      <Wrapper className="d-flex gap-3 flex-column">
        <div className="h5 bolder my-2 text-center">Create Payment Request</div>
        <div className="border-line p-3 rounded-3 d-flex flex-column gap-3">
          <div className="d-flex flex-column gap-1">
            <label>From Wallet</label>
            <Widget
              src="${REPL_DEVHUB}/widget/devhub.components.molecule.DropDownWithSearch"
              props={{
                selectedValue: sender,
                onChange: (v) => setSender(v.value),
                options: fromWalletOptions,
                showSearch: false,
                defaultLabel: "treasury.near",
              }}
            />
          </div>
          <div className="d-flex flex-column gap-1">
            <label>Choose Proposal</label>
            <Widget
              src="${REPL_DEVHUB}/widget/devhub.components.molecule.DropDownWithSearch"
              props={{
                selectedValue: "",
                onChange: onSelectProposal,
                options: proposalsOptions,
                showSearch: true,
                searchInputPlaceholder: "Search by id or title",
                defaultLabel: "Search proposals",
                searchByValue: true,
                onSearch: (value) => {
                  setSearchProposalId(value);
                },
              }}
            />
          </div>
          <div className="d-flex flex-column gap-1">
            <label>To Wallet (Recipient)</label>
            <Widget
              src="${REPL_DEVHUB}/widget/devhub.components.molecule.DropDownWithSearch"
              props={{
                selectedValue: receiver,
                onChange: (v) => setReceiver(v.value),
                options: recipientsOptions,
                showSearch: false,
                defaultLabel: "neardevhub.near",
              }}
            />
          </div>

          <div className="d-flex gap-2 flex-column">
            <VerificationIconContainer isVerified={true} label="KYC Verified" />
            <VerificationIconContainer
              isVerified={true}
              label="Test Transaction Confirmed"
            />
            <div className="text-grey">
              You can add new recipients in the
              <Link
                to={href({
                  widgetSrc: `${REPL_TREASURY}/widget/app`,
                  params: {
                    page: "operations",
                    tab: "payments",
                    innerTab: "payment-recipients",
                  },
                })}
              >
                Manage Recipients tab.
              </Link>
            </div>
          </div>
          <div className="d-flex flex-column gap-1">
            <label>Currency</label>
            <Widget
              src="${REPL_DEVHUB}/widget/devhub.components.molecule.DropDownWithSearch"
              props={{
                selectedValue: tokenId,
                onChange: (v) => setTokenId(v.value),
                options: tokensOptions,
                showSearch: false,
                defaultLabel: "Near",
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
                onChange: (e) => setMemo(e.target.value),
                placeholder: "Enter memo",
                value: memo,
              }}
            />
          </div>
          <div className="d-flex mt-2 gap-3 justify-content-end">
            <Link
              to={href({
                widgetSrc: `${REPL_TREASURY}/widget/app`,
                params: {
                  page: "operations",
                  tab: "payments",
                },
              })}
            >
              <Widget
                src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
                props={{
                  classNames: {
                    root: "btn-outline-danger shadow-none border-0",
                  },
                  label: "Cancel",
                }}
              />
            </Link>
            <Widget
              src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
              props={{
                classNames: { root: "green-btn" },
                disabled:
                  !amount ||
                  !sender ||
                  !receiver ||
                  !selectedProposalId?.toString() ||
                  !tokenId,
                label: "Submit",
                onClick: onSubmitClick,
              }}
            />
          </div>
        </div>
      </Wrapper>
    </div>
  </Container>
);
