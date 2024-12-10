const { getLinkUsingCurrentGateway } = VM.require(
  "${REPL_DEVHUB}/widget/core.lib.url"
) || { getLinkUsingCurrentGateway: () => {} };

const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const { encodeToMarkdown } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const onCloseCanvas = props.onCloseCanvas ?? (() => {});

const tokenMapping = {
  NEAR: "NEAR",
  USDT: "usdt.tether-token.near",
  USDC: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
};

const instance = props.instance;
if (!instance) {
  return <></>;
}

const { treasuryDaoID, proposalAPIEndpoint, showProposalSelection } =
  VM.require(`${instance}/widget/config.data`);

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
const [selectedTokensAvailable, setSelectedTokensAvailable] = useState(null);
const [isReceiverRegistered, setReceiverRegister] = useState(false);
const [isLoadingProposals, setLoadingProposals] = useState(false);
const [showCancelModal, setShowCancelModal] = useState(false);

useEffect(() => {
  if (!showProposalSelection) {
    setIsManualRequest(true);
  }
}, [showProposalSelection]);

function searchCacheApi() {
  let searchTerm = searchProposalId;
  let searchInput = encodeURI(searchTerm);
  let searchUrl = `${proposalAPIEndpoint}/proposals/search/${searchInput}`;

  return asyncFetch(searchUrl, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  }).catch((error) => {
    console.log("Error searching cache api", error);
  });
}

function setProposalData(result) {
  const body = result.body;
  const proposalsData = body.records;
  const data = [];
  for (const prop of proposalsData) {
    data.push({
      label: (
        <span className="text-sm">
          <b>#{prop.proposal_id}</b> {prop.name}{" "}
        </span>
      ),
      value: prop.proposal_id,
    });
  }
  setProposalsArray(proposalsData);
  setProposalsOptions(data);
  setLoadingProposals(false);
}

function searchProposals() {
  searchCacheApi().then((result) => {
    setProposalData(result);
  });
}

function fetchCacheApi(variables) {
  let fetchUrl = `${proposalAPIEndpoint}/proposals?order=${variables.order}&limit=${variables.limit}`;

  if (variables.stage) {
    fetchUrl += `&filters.stage=${variables.stage}`;
  }

  return asyncFetch(fetchUrl, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  }).catch((error) => {
    console.log("Error fetching cache api", error);
  });
}

function fetchProposals() {
  const FETCH_LIMIT = 10;
  const variables = {
    order: "id_desc",
    limit: FETCH_LIMIT,
    stage: "PAYMENT",
  };
  fetchCacheApi(variables).then((result) => {
    setProposalData(result);
  });
}

function getLastProposalId() {
  return Near.asyncView(treasuryDaoID, "get_last_proposal_id").then(
    (result) => result
  );
}

useEffect(() => {
  getLastProposalId().then((i) => setLastProposalId(i));
  Near.asyncView(treasuryDaoID, "get_policy").then((policy) => {
    setDaoPolicy(policy);
  });
}, []);

function refreshData() {
  Storage.set("REFRESH_TABLE_DATA", Math.random());
}

function cleanInputs() {
  setSelectedProposalId("");
  setSelectedProposal(null);
  setReceiver("");
  setAmount("");
  setNotes("");
  setTokenId("");
}

// close canvas after proposal is submitted
useEffect(() => {
  if (isTxnCreated) {
    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (lastProposalId !== id) {
          cleanInputs();
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

useEffect(() => {
  const handler = setTimeout(() => {
    setLoadingProposals(true);
    if (searchProposalId) {
      searchProposals();
    } else {
      fetchProposals();
    }
  }, 500);

  return () => {
    clearTimeout(handler);
  };
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
    background: var(--theme-color) !important;
    color: white;
  }

  .primary-text-color a {
    color: var(--theme-color) !important;
  }

  .btn:hover {
    color: black !important;
  }

  .text-sm {
    font-size: 13px;
  }
  .warning {
    background-color: rgba(255, 158, 0, 0.1);
    color: #ff9e00;
  }
`;

const nearPrice = useCache(
  () =>
    asyncFetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=near&vs_currencies=usd`
    ).then((res) => {
      return res.body.near?.usd;
    }),
  "near-price",
  { subscribe: false }
);

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
    if (token === tokenMapping.NEAR) {
      const nearTokens = Big(proposal.requested_sponsorship_usd_amount)
        .div(nearPrice)
        .toFixed();
      setAmount(nearTokens);
    } else {
      setAmount(proposal.requested_sponsorship_usd_amount);
    }
    const receiverAccount = proposal.receiver_account;
    setReceiver(receiverAccount);
    setTokenId(token);
    setSelectedProposalId(id.value);
  }
}

useEffect(() => {
  if (amount && tokenId) {
    const isNEAR = tokenId === tokenMapping.NEAR;
    if (isNEAR) {
      setParsedAmount(
        Big(amount ? amount : 0)
          .mul(Big(10).pow(24))
          .toFixed()
      );
    } else {
      Near.asyncView(tokenId, "ft_metadata", {}).then((ftMetadata) => {
        setParsedAmount(
          Big(amount ? amount : 0)
            .mul(Big(10).pow(ftMetadata.decimals))
            .toFixed()
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

  const calls = [
    {
      contractName: treasuryDaoID,
      methodName: "add_proposal",
      args: {
        proposal: {
          description: encodeToMarkdown(description),
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
    },
  ];
  if (!isReceiverRegistered && !isNEAR) {
    const depositInYocto = Big(0.125).mul(Big(10).pow(24)).toFixed();
    calls.push({
      contractName: tokenId,
      methodName: "storage_deposit",
      args: {
        account_id: receiver,
        registration_only: true,
      },
      gas: gas,
      deposit: depositInYocto,
    });
  }

  Near.call(calls);
}

function isAccountValid() {
  return (
    receiver.length === 64 ||
    (receiver ?? "").includes(".near") ||
    (receiver ?? "").includes(".tg")
  );
}

function isAmountValid() {
  const maxU128 = Big("340282366920938463463374607431768211455");

  if (!parsedAmount) {
    return false;
  }
  // Check if amount is not too big
  if (Big(parsedAmount).gt(maxU128)) {
    return false;
  }

  // Check if amount is not negative or zero
  if (Big(parsedAmount).lte(0)) {
    return false;
  }
  return true;
}

useEffect(() => {
  if (
    tokenId &&
    tokenId !== tokenMapping.NEAR &&
    receiver &&
    isAccountValid(receiver)
  ) {
    Near.asyncView(tokenId, "storage_balance_of", {
      account_id: receiver,
    }).then((storage) => {
      if (!storage) {
        setReceiverRegister(false);
      } else {
        setReceiverRegister(true);
      }
    });
  }
}, [receiver, tokenId]);

return (
  <Container>
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
      props={{
        instance,
        heading: "Are you sure you want to cancel?",
        content:
          "This action will clear all the information you have entered in the form and cannot be undone.",
        confirmLabel: "Yes",
        isOpen: showCancelModal,
        onCancelClick: () => setShowCancelModal(false),
        onConfirmClick: () => {
          cleanInputs();
          setShowCancelModal(false);
          onCloseCanvas();
        },
      }}
    />
    <div className="d-flex flex-column gap-3">
      {showProposalSelection && (
        <div className="d-flex flex-column gap-1">
          <label>Proposal</label>
          <Widget
            src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDownWithSearchAndManualRequest"
            props={{
              selectedValue: selectedProposalId,
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
                cleanInputs();
                setIsManualRequest(true);
              },
              showManualRequest: true,
              isLoadingProposals,
            }}
          />
        </div>
      )}
      {isManualRequest && (
        <div className="d-flex flex-column gap-3">
          <div className="d-flex flex-column gap-1">
            <label>{showProposalSelection && "Proposal"} Title</label>
            <Widget
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Input`}
              props={{
                className: "flex-grow-1",
                key: `proposal-title`,
                onBlur: (e) =>
                  setSelectedProposal((prev) => ({
                    ...prev,
                    name: e.target.value,
                  })),
                value: selectedProposal?.name ?? "",
                multiline: true,
              }}
            />
          </div>
          <div className="d-flex flex-column gap-1">
            <label>{showProposalSelection && "Proposal"} Summary</label>
            <Widget
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Input`}
              props={{
                className: "flex-grow-1",
                key: `proposal-summary`,
                onBlur: (e) =>
                  setSelectedProposal((prev) => ({
                    ...prev,
                    summary: e.target.value,
                  })),
                value: selectedProposal?.summary ?? "",
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
          src="${REPL_DEVHUB}/widget/devhub.entity.proposal.AccountInput"
          props={{
            value: receiver,
            placeholder: "treasury.near",
            onUpdate: setReceiver,
            maxWidth: "100%",
          }}
        />
      </div>
      <div className="d-flex flex-column gap-1">
        <label>Requested Token</label>
        <Widget
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokensDropdown"
          props={{
            instance,
            selectedValue: tokenId,
            onChange: (v) => setTokenId(v),
            setTokensAvailable: setSelectedTokensAvailable,
          }}
        />
      </div>
      <div className="d-flex flex-column gap-1">
        <label>Total Amount</label>
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Input`}
          props={{
            className: "flex-grow-1",
            key: `total-amount`,
            onChange: (e) => setAmount(e.target.value),
            placeholder: "Enter amount",
            value: amount,
            inputProps: {
              min: "0",
              type: "number",
            },
          }}
        />
        {tokenId === tokenMapping.NEAR && (
          <div className="d-flex gap-2 align-items-center justify-content-between">
            USD:{" "}
            {Big(amount ? amount : 0)
              .mul(nearPrice)
              .toFixed(2)}
            <div>Price: ${Big(nearPrice).toFixed(2)}</div>
          </div>
        )}
      </div>
      {selectedTokensAvailable &&
        amount &&
        parseFloat(selectedTokensAvailable) <=
          parseFloat(amount ? amount : 0) && (
          <div className="d-flex gap-3 align-items-center warning px-3 py-2 rounded-3">
            <i class="bi bi-exclamation-triangle h5"></i>
            <div>
              The treasury balance is insufficient to cover the payment. You can
              create the request, but it won’t be approved until the balance is
              topped up.
            </div>
          </div>
        )}

      <div className="d-flex flex-column gap-1">
        <label>Notes (Optional)</label>
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Input`}
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
            onClick: () => {
              setShowCancelModal(true);
            },
            disabled: isTxnCreated,
          }}
        />

        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: { root: "theme-btn" },
            disabled:
              !amount ||
              !receiver ||
              !selectedProposal?.name ||
              !tokenId ||
              !isAccountValid() ||
              !isAmountValid(),
            label: "Submit",
            onClick: onSubmitClick,
            loading: isTxnCreated,
          }}
        />
      </div>
    </div>
  </Container>
);
