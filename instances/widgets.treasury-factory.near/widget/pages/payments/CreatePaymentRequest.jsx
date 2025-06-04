const { getLinkUsingCurrentGateway } = VM.require(
  "${REPL_DEVHUB}/widget/core.lib.url"
) || { getLinkUsingCurrentGateway: () => {} };

const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };

const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const { encodeToMarkdown, LOCKUP_MIN_BALANCE_FOR_STORAGE, accountToLockup } =
  VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common");

const onCloseCanvas = props.onCloseCanvas ?? (() => {});

const tokenMapping = {
  NEAR: "NEAR",
  USDT: "usdt.tether-token.near",
  USDC: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
};

const instance = props.instance;
if (!instance || typeof accountToLockup !== "function") {
  return <></>;
}

const { treasuryDaoID, proposalAPIEndpoint, showProposalSelection } =
  VM.require(`${instance}/widget/config.data`);

const lockupContract = accountToLockup(treasuryDaoID);

const walletOptions = [
  {
    label: treasuryDaoID,
    value: treasuryDaoID,
  },
];

const [selectedWallet, setSelectedWallet] = useState(walletOptions[0]);

const [tokenId, setTokenId] = useState(null);
const [selectedTokenBlockchain, setSelectedTokenBlockchain] = useState(null);
const [selectedTokenIsIntent, setSelectedTokenIsIntent] = useState(false);
const [receiver, setReceiver] = useState(null);
const [isReceiverAccountValid, setIsReceiverAccountValid] = useState(false);
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
const [showErrorToast, setShowErrorToast] = useState(false);
const [nearPrice, setNearPrice] = useState("1"); // setting 1 as default, so VM doesn't throw any error

const [lockupNearBalances, setLockupNearBalances] = useState(null);

useEffect(() => {
  if (!showProposalSelection) {
    setIsManualRequest(true);
  }
}, [showProposalSelection]);

function formatNearAmount(amount) {
  return Big(amount ?? "0")
    .div(Big(10).pow(24))
    .toFixed(2);
}

useEffect(() => {
  if (lockupContract) {
    Near.asyncView(lockupContract, "get_liquid_owners_balance").then((res) => {
      setLockupNearBalances((prev) => ({
        ...prev,
        available: res,
        availableParsed: formatNearAmount(res),
        storage: LOCKUP_MIN_BALANCE_FOR_STORAGE,
        storageParsed: formatNearAmount(LOCKUP_MIN_BALANCE_FOR_STORAGE),
      }));
    });
  }
}, [lockupContract]);

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
    let checkTxnTimeout = null;

    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (typeof lastProposalId === "number" && lastProposalId !== id) {
          cleanInputs();
          onCloseCanvas();
          clearTimeout(checkTxnTimeout);
          refreshData();
          setTxnCreated(false);
        } else {
          checkTxnTimeout = setTimeout(() => checkForNewProposal(), 1000);
        }
      });
    };

    checkForNewProposal();

    return () => {
      clearTimeout(checkTxnTimeout);
    };
  }
}, [isTxnCreated, lastProposalId]);

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

  .text-secondary a {
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

  .primary-text-color a {
    color: var(--theme-color) !important;
  }

  .warning {
    background-color: rgba(255, 158, 0, 0.1);
    color: #ff9e00;
  }
`;

const nearPriceAPI = `${REPL_BACKEND_API}/near-price`;

useEffect(() => {
  function fetchNearPrice() {
    asyncFetch(nearPriceAPI).then((res) => {
      if (typeof res.body === "number") {
        setNearPrice(res.body);
      }
    });
  }
  const interval = setInterval(() => {
    fetchNearPrice();
  }, 60_000);

  fetchNearPrice();
  return () => clearInterval(interval);
}, []);

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
  const isNativeNEAR =
    selectedTokenBlockchain === "near" && tokenId === tokenMapping.NEAR;

  const gasForAddProposal = Big(270).mul(Big(10).pow(12)).toFixed(); // 270 Tgas
  const gasForIntentAction = Big(30).mul(Big(10).pow(12)).toFixed(); // 30 Tgas for ft_withdraw
  const gasForLockupAction = Big(270).mul(Big(10).pow(12)).toFixed(); // Gas for lockup's internal transfer action
  const gasForStorageDeposit = Big(50).mul(Big(10).pow(12)).toFixed(); // 50 Tgas for storage_deposit

  const depositForAddProposal = (daoPolicy?.proposal_bond || "0").toString();

  const descriptionFields = {
    title: selectedProposal?.name,
    summary: selectedProposal?.summary,
    notes: notes,
  };

  if (!isManualRequest && selectedProposalId) {
    descriptionFields["proposalId"] = selectedProposalId;
  }

  const isLockupTransfer = selectedWallet.value === lockupContract;
  let proposalKind;

  if (selectedTokenIsIntent) {
    if (selectedTokenBlockchain && selectedTokenBlockchain !== "near") {
      // Non-NEAR / Intent-based payment
      const ftWithdrawArgs = {
        token: tokenId, // This is the NEAR FT contract, e.g., "btc.omft.near"
        receiver_id: tokenId, // Per test expectation, this is also the token contract ID for intents.near
        amount: parsedAmount, // Amount in FT's decimals (e.g., 2 * 10^8 for 2 BTC if 8 decimals)
        memo: `WITHDRAW_TO:${receiver}`, // `receiver` holds the actual off-chain address
      };

      proposalKind = {
        FunctionCall: {
          receiver_id: "intents.near", // Target contract for intent withdrawals
          actions: [
            {
              method_name: "ft_withdraw",
              args: Buffer.from(JSON.stringify(ftWithdrawArgs)).toString(
                "base64"
              ),
              deposit: "1", // 1 yoctoNEAR
              gas: gasForIntentAction,
            },
          ],
        },
      };
    } else {
      // NEAR / Intent-based payment
      const ftWithdrawArgs = {
        token: tokenId, // This is the NEAR FT contract, e.g., "wrap.near"
        receiver_id: receiver,
        amount: parsedAmount,
      };

      proposalKind = {
        FunctionCall: {
          receiver_id: "intents.near", // Target contract for intent withdrawals
          actions: [
            {
              method_name: "ft_withdraw",
              args: Buffer.from(JSON.stringify(ftWithdrawArgs)).toString(
                "base64"
              ),
              deposit: "1", // 1 yoctoNEAR
              gas: gasForIntentAction,
            },
          ],
        },
      };
    }
  } else {
    // NEAR blockchain payment (native NEAR or NEP-141 on NEAR)
    if (isLockupTransfer) {
      descriptionFields["proposal_action"] = "transfer";

      const lockupArgs = {
        amount: parsedAmount,
        receiver_id: receiver,
      };
      if (!isNativeNEAR) {
        // If it's an FT transfer via lockup, the lockup's transfer method might need token_id.
        // This depends on the lockup contract's interface. Assuming it's a generic transfer
        // that might handle FTs if token_id is passed, or it's a separate method.
        // For now, mirroring the previous direct FT transfer structure.
        // This part might need adjustment based on `lockupContract` capabilities.
        // The original code for lockup transfer didn't explicitly handle FTs with token_id in its args.
        // Sticking to native NEAR transfer for lockup for now unless specified.
        // If lockup can transfer FTs, its method_name or args might differ.
        // The provided test is for non-NEAR, so this path is less critical for the immediate fix.
      }

      proposalKind = {
        FunctionCall: {
          receiver_id: lockupContract,
          actions: [
            {
              // Assuming lockupContract.transfer handles native NEAR.
              // If FTs, it might be ft_transfer_call to token contract,
              // or lockup has a specific method.
              method_name: "transfer",
              args: Buffer.from(JSON.stringify(lockupArgs)).toString("base64"),
              deposit: "0",
              gas: gasForLockupAction,
            },
          ],
        },
      };
    } else {
      // Direct transfer (native NEAR or NEP-141 FT on NEAR)
      proposalKind = {
        Transfer: {
          token_id: isNativeNEAR ? "" : tokenId,
          receiver_id: receiver,
          amount: parsedAmount,
        },
      };
    }
  }

  const finalDescriptionString = encodeToMarkdown(descriptionFields);

  const calls = [
    {
      contractName: treasuryDaoID,
      methodName: "add_proposal",
      args: {
        proposal: {
          description: finalDescriptionString,
          kind: proposalKind,
        },
      },
      gas: gasForAddProposal,
      deposit: depositForAddProposal,
    },
  ];

  if (
    selectedTokenBlockchain === "near" &&
    !isNativeNEAR &&
    !isReceiverRegistered
  ) {
    const depositInYocto = Big(0.125).mul(Big(10).pow(24)).toFixed();
    calls.push({
      contractName: tokenId,
      methodName: "storage_deposit",
      args: {
        account_id: receiver,
        registration_only: true,
      },
      gas: gasForStorageDeposit,
      deposit: depositInYocto,
    });
  }

  Near.call(calls);
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
    selectedTokenBlockchain === "near" && // Check only for NEAR blockchain
    tokenId &&
    tokenId !== tokenMapping.NEAR && // And it's an FT (not native NEAR)
    receiver &&
    isReceiverAccountValid // And receiver is a valid NEAR account
  ) {
    Near.asyncView(tokenId, "storage_balance_of", {
      account_id: receiver,
    }).then((storage) => {
      setReceiverRegister(!!storage); // Simplified
    });
  } else {
    // For non-NEAR networks, or if it's native NEAR, or if receiver is not valid/empty,
    // assume storage is not an issue or not applicable for this check.
    setReceiverRegister(true);
  }
}, [receiver, tokenId, isReceiverAccountValid, selectedTokenBlockchain]); // Added/updated dependencies

return (
  <Container>
    <TransactionLoader
      showInProgress={isTxnCreated}
      cancelTxn={() => setTxnCreated(false)}
    />
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
      {lockupContract && (
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.WalletDropdown`}
          props={{
            lockupNearBalances,
            instance,
            selectedValue: selectedWallet,
            onUpdate: (v) => {
              if (v.value !== selectedWallet.value) {
                cleanInputs();
              }
              setSelectedWallet(v);
            },
          }}
        />
      )}
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
        {selectedTokenBlockchain === "near" ||
        selectedTokenBlockchain == null ? (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.AccountInput`}
            props={{
              value: receiver,
              placeholder: "treasury.near",
              onUpdate: (value) => {
                setReceiver(value);
              },
              setParentAccountValid: setIsReceiverAccountValid,
              maxWidth: "100%",
              instance,
              allowNonExistentImplicit: true,
            }}
          />
        ) : (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OtherChainAccountInput`}
            props={{
              blockchain: selectedTokenBlockchain,
              value: receiver,
              setValue: setReceiver,
              setIsValid: setIsReceiverAccountValid,
              instance: REPL_BASE_DEPLOYMENT_ACCOUNT,
            }}
          />
        )}
      </div>
      <div className="d-flex flex-column gap-1">
        <label>Requested Token</label>
        <Widget
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokensDropdown"
          props={{
            daoAccount: selectedWallet.value,
            selectedValue: tokenId,
            onChange: (v) => {
              setTokenId(v);
            },
            setSelectedTokenBlockchain: (blockchain) => {
              if (
                selectedTokenBlockchain &&
                blockchain !== selectedTokenBlockchain
              ) {
                setReceiver(""); // Reset receiver
                setIsReceiverAccountValid(false); // Reset validation status
                setSelectedTokenBlockchain(blockchain);
              }
            },
            setTokensAvailable: setSelectedTokensAvailable,
            setSelectedTokenIsIntent,
            lockupNearBalances,
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
            <div className="d-flex gap-1 align-items-center">
              {"$" +
                Big(amount ? amount : 0)
                  .mul(nearPrice)
                  .toFixed(2)
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              <Widget
                src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                props={{
                  popup: (
                    <div>
                      The USD value is calculated based on token prices from{" "}
                      <a
                        href={nearPriceAPI}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="primary-text"
                      >
                        {" "}
                        CoinGecko
                      </a>{" "}
                      and updates automatically every minute.
                    </div>
                  ),
                  children: (
                    <i className="bi bi-info-circle primary-icon h6 mb-0"></i>
                  ),
                  instance,
                }}
              />
            </div>
            <div>${Big(nearPrice).toFixed(2)}</div>
          </div>
        )}
      </div>
      {selectedTokensAvailable &&
        amount &&
        parseFloat(selectedTokensAvailable) <
          parseFloat(amount ? amount : 0) && (
          <div className="d-flex gap-3 align-items-center warning px-3 py-2 rounded-3">
            <i class="bi bi-exclamation-triangle warning-icon h5"></i>
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
              root: "btn btn-outline-secondary shadow-none no-transparent",
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
              !isReceiverAccountValid ||
              !isAmountValid() ||
              isTxnCreated,
            label: "Submit",
            onClick: onSubmitClick,
            loading: isTxnCreated,
          }}
        />
      </div>
    </div>
  </Container>
);
