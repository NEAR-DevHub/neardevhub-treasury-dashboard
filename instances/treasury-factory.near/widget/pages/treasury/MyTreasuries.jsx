const { getUserTreasuries, accountToLockup, getNearBalances } = VM.require(
  "${REPL_DEVDAO_ACCOUNT}/widget/lib.common"
);

const { Modal, ModalContent, ModalHeader } = VM.require(
  "${REPL_DEVDAO_ACCOUNT}/widget/lib.modal"
);

const { NearToken } = VM.require(
  "${REPL_DEVDAO_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };
const accountId = context.accountId;
const showCongratsModal = props.showCongratsModal;
const formFields = props.formFields;

const [userTreasuries, setUserTreasuries] = useState(null);
const [otherDaos, setOtherDaos] = useState([]);
const [isExpanded, setExpanded] = useState(false);

const storageAccountName = Storage.get(
  "TreasuryAccountName",
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.treasury.Create`
);

if (!Modal || typeof getUserTreasuries !== "function") {
  return <></>;
}

const draftTreasuries =
  JSON.parse(
    Storage.get(
      "TREASURY_DRAFTS",
      `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app`
    ) ?? "[]"
  ) ?? [];

function mergeUniqueTreasuries(arr1, arr2) {
  const uniqueMap = {};

  arr1.concat(arr2).forEach((item) => {
    uniqueMap[item.daoId] = item;
  });

  return Object.values(uniqueMap);
}
useEffect(() => {
  if (accountId) {
    getUserTreasuries(accountId).then((results) => {
      const withTreasury = results.filter((dao) => dao.hasTreasury);
      const withoutTreasury = results.filter((dao) => !dao.hasTreasury);

      if (storageAccountName) {
        const storageDaoId = `${storageAccountName}.sputnik-dao.near`;
        // Check if storageAccountName is already in withTreasury
        const hasStorageAccount = withTreasury.some(
          (dao) => dao.daoId === storageDaoId
        );

        // If not, push a new object into withTreasury
        if (!hasStorageAccount) {
          withTreasury.push({
            daoId: storageDaoId,
            instanceAccount: `${storageAccountName}.near`,
            hasTreasury: true,
            config: {
              name: storageAccountName,
            },
          });
        }
      }
      setUserTreasuries((prev) =>
        mergeUniqueTreasuries(prev ?? [], withTreasury ?? [])
      );

      setOtherDaos(withoutTreasury);

      if (!(withTreasury || [])?.length && (withoutTreasury || []).length) {
        setExpanded(true);
      }
    });
  }
}, [storageAccountName]);

useEffect(() => {
  if (!draftTreasuries?.length) return;

  const enrichedDrafts = draftTreasuries.map((i) => ({
    ...i,
    daoId: `${i.accountName}.sputnik-dao.near`,
    hasTreasury: true,
    instanceAccount: `${i.accountName}.near`,
    isDraft: true,
    config: { name: i.accountName },
  }));

  setUserTreasuries((prev) =>
    mergeUniqueTreasuries(prev ?? [], enrichedDrafts ?? [])
  );
}, [draftTreasuries]);

const Container = styled.div`
  width: 100%;
  font-size: 14px;

  label {
    color: black !important;
  }

  .warning-box {
    background: rgba(255, 158, 0, 0.1);
    color: var(--other-warning);
    padding-inline: 0.8rem;
    padding-block: 0.5rem;
    font-weight: 500;
    font-size: 13px;
    i {
      color: var(--other-warning);
    }
  }

  .grey-circle {
    width: 35px;
    height: 35px;
    background-color: var(--grey-04);
  }

  .custom-tag {
    background-color: var(--grey-035);
    color: var(--text-color);
    padding-block: 4px;
    padding-inline: 8px;
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .warning-link {
    text-decoration: underline;
    color: inherit !important;

    &:hover {
      color: inherit !important;
      text-decoration: underline;
      font-weight: bold;
    }
  }

  .badge-secondary {
    background-color: var(--grey-035);
  }

  .custom-hover {
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      cursor: pointer;
    }
  }
`;

const Skeleton = styled.div`
  background: var(--grey-04);
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }
`;

const defaultImage =
  "https://ipfs.near.social/ipfs/bafkreia5drpo7tfsd7maf4auxkhatp6273sunbg7fthx5mxmvb2mooc5zy";

const Loader = () => {
  return (
    <div className="row mt-3">
      <div className="card col-md-4 ">
        <div className={`d-flex gap-3 align-items-center card-body`}>
          <Skeleton style={{ height: 55, width: 55 }} className="rounded-3" />

          <div className="d-flex flex-column">
            <div className="h6 mb-0">
              <Skeleton
                style={{ height: 22, width: 120 }}
                className="rounded-3"
              />
            </div>
            <div className="text-secondary text-sm pt-2">
              <Skeleton
                style={{ height: 20, width: 60 }}
                className="rounded-3"
              />
            </div>
          </div>
        </div>
        <div className="border-top">
          <div className="card-body d-flex flex-column gap-3">
            <Skeleton
              style={{ height: 22, width: 150 }}
              className="rounded-3"
            />

            <div className="border border-1 p-3 rounded-3 d-flex flex-column gap-2">
              <div className="text-secondary">Total Balance</div>
              <div className="h6 mb-0 fw-bold">
                <Skeleton
                  style={{ height: 22, width: 200 }}
                  className="rounded-3"
                />
              </div>
            </div>
            <Skeleton style={{ height: 35 }} className="rounded-3" />
          </div>
        </div>
      </div>
    </div>
  );
};

const TokenImage = styled.div`
  position: relative;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  height: 32px;
  width: 32px;
`;

const nearPrice = fetch(`${REPL_BACKEND_API}/near-price`)?.body;

const BalanceComponent = ({ daoId, isDraft }) => {
  const maxShow = 3;
  const nearBalance = isDraft ? { totalParsed: 0 } : getNearBalances(daoId);
  const ftTokens = isDraft
    ? [{ totalCumulativeAmt: "", fts: [] }]
    : fetch(`${REPL_BACKEND_API}/ft-tokens/?account_id=${daoId}`)?.body ?? [
        { totalCumulativeAmt: "", fts: [] },
      ];
  const nearBalanceUSD = Big(nearBalance?.totalParsed ?? 0).mul(
    nearPrice ?? "1"
  );
  const totalBalance = Number(
    nearBalanceUSD.plus(Big(ftTokens?.totalCumulativeAmt ?? "0")).toFixed(2)
  ).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const near = {
    contract: "near",
    amount: nearBalance?.totalParsed,
    ft_meta: {
      icon: "https://ipfs.near.social/ipfs/bafkreiapqoxsl2vvknalgywodubstwocn5sfhvfwpnotvfab3ubwfwzpey",
    },
  };

  return (
    <div className="d-flex w-100 align-items-center justify-content-between">
      <div className="d-flex flex-column gap-1">
        <div className="text-secondary">Total Balance</div>
        <div className="h6 mb-0 fw-bold">${totalBalance}</div>
      </div>
      {!isDraft && (
        <div className="d-flex align-items-center">
          {(ftTokens?.fts ?? []).slice(0, maxShow - 1).map((acc, index) => (
            <TokenImage
              key={acc.contract}
              style={{
                marginLeft: index > 0 ? "-10px" : 0,
                zIndex: index,
                backgroundImage: `url("${acc.ft_meta.icon}")`,
              }}
              className="rounded-circle"
            />
          ))}

          <TokenImage
            key="near"
            style={{
              marginLeft: ftTokens?.fts?.length > 0 ? "-10px" : 0,
              zIndex: maxShow,
              backgroundImage: `url("${near.ft_meta.icon}")`,
              height: 37,
              width: 37,
            }}
            className="rounded-circle"
          />

          {ftTokens?.fts.length > maxShow && (
            <div
              style={{ marginLeft: "-15px", zIndex: 999 }}
              className="grey-circle rounded-circle d-flex justify-content-center align-items-center"
            >
              +{ftTokens.fts.length - (maxShow - 1)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SuccessModal = () => {
  return (
    showCongratsModal && (
      <Modal>
        <div className="d-flex justify-content-end w-100">
          <a href="?page=my-treasuries">
            <i className="bi bi-x-lg h4 mb-0 cursor-pointer"></i>
          </a>
        </div>
        <ModalContent>
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.SuccessPage`}
            props={{
              formFields,
            }}
          />
        </ModalContent>
      </Modal>
    )
  );
};

const TreasuryCard = ({ treasury, hasTreasury }) => {
  const lockupContract = accountToLockup(treasury.daoId);
  const primaryColor = treasury.config.metadata.primaryColor ?? "#01BF7A";
  const isDraft = treasury.isDraft;
  return (
    <div
      className={
        "card h-100 w-100 d-flex flex-column " +
        (hasTreasury && !isDraft && " custom-hover")
      }
      key={treasury.daoId}
    >
      <div
        className="p-3 d-flex gap-3 align-items-center"
        style={{ height: "80px" }}
      >
        <img
          src={
            (treasury.config.metadata?.flagLogo ?? "")?.includes("ipfs")
              ? treasury.config.metadata?.flagLogo
              : defaultImage
          }
          width={48}
          height={48}
          className="rounded-3 object-fit-cover"
        />
        <div className="d-flex flex-column">
          <div className="h6 mb-0">
            {treasury.config.name}
            {isDraft && <span class="badge badge-secondary">Draft</span>}
          </div>
          <div className="text-secondary text-sm">
            @{treasury.instanceAccount}
          </div>
        </div>
        {isDraft && (
          <div className="dropdown ms-auto">
            <div
              className="cursor-pointer"
              id="dropdownMenuButton"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i className="bi bi-three-dots"></i>
            </div>
            <div
              className="dropdown-menu dropdown-menu-end dropdown-menu-lg-start px-2 shadow w-100"
              aria-labelledby="dropdownMenuButton"
            >
              <div className="dropdown-item cursor-pointer">
                <div
                  onClick={() => {
                    const updatedTreasuries = userTreasuries.filter(
                      (i) => i.daoId !== treasury.daoId
                    );
                    const updatedDrafts = updatedTreasuries.filter(
                      (i) => i.isDraft
                    );
                    props.updateTreasuryDrafts(updatedDrafts);
                    setUserTreasuries(updatedTreasuries);
                  }}
                >
                  Delete Draft
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-top flex-grow-1 p-3 d-flex flex-column gap-3">
        <div
          className="d-flex flex-column gap-1"
          style={{ color: primaryColor }}
        >
          <div>
            <label>Spuntik DAO:</label>
            <span className="fw-semi-bold">{treasury.daoId}</span>
          </div>
          {lockupContract && (
            <div>
              <label>Lockup:</label>
              <span className="fw-semi-bold">{lockupContract}</span>
            </div>
          )}
        </div>

        <div className="mt-auto d-flex flex-column gap-3">
          <div className="border border-1 p-3 rounded-3 d-flex flex-column gap-2 justfiy-self-end">
            <BalanceComponent daoId={treasury.daoId} isDraft={isDraft} />
          </div>
          {isDraft && (
            <a
              className="btn btn-primary w-100"
              href={`?page=create&step=3`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => props.updateCurrentDraft(treasury)}
            >
              Complete Setup
            </a>
          )}
          {!hasTreasury && (
            <div className="d-flex gap-3 warning-box px-3 py-2 rounded-3 align-items-center">
              <i class="bi bi-exclamation-triangle h5 mb-0"></i>
              <div>
                <div className="fw-bold">
                  This treasury is not currently supported.
                </div>
                To enable it for use with NEAR Treasury,
                <a
                  className="warning-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://docs.neartreasury.com/support/`}
                >
                  please contact our team
                </a>
                .
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TreasuryCardList = ({ treasuries, hasTreasury }) => {
  if (!Array.isArray(treasuries) || treasuries.length === 0) return null;

  return (
    <div className="row g-4">
      {treasuries.map((treasury) => {
        const cardContent = (
          <TreasuryCard treasury={treasury} hasTreasury={hasTreasury} />
        );
        return (
          <div className="col-md-4" key={treasury.daoId}>
            {hasTreasury && !treasury.isDraft ? (
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={`https://${treasury.instanceAccount}.page/`}
                className="text-decoration-none text-dark d-block h-100 w-100"
              >
                {cardContent}
              </a>
            ) : (
              cardContent
            )}
          </div>
        );
      })}
    </div>
  );
};

function toggleExpand() {
  setExpanded(!isExpanded);
}

if (accountId) {
  return (
    <div className="d-flex flex-column align-items-center w-100 mb-4 px-3 mt-3">
      <div className="d-flex w-100 align-items-center justify-content-between position-relative">
        <h3 style={{ fontWeight: 600 }}>My Treasuries</h3>
        <div>
          <a target="_blank" rel="noopener noreferrer" href={`?page=create`}>
            <button className="btn btn-primary d-flex align-items-center gap-1">
              <i className="bi bi-plus-lg h6 mb-0"></i>
              Create Treasury
            </button>
          </a>
        </div>
      </div>
      <SuccessModal />
      <Container className="d-flex flex-column gap-3">
        {!Array.isArray(userTreasuries) && <Loader />}
        <div className="d-flex flex-column gap-3">
          <div className="mt-3">
            {Array.isArray(userTreasuries) && userTreasuries.length > 0 && (
              <TreasuryCardList
                treasuries={userTreasuries}
                hasTreasury={true}
              />
            )}

            {Array.isArray(otherDaos) && otherDaos.length > 0 && (
              <>
                <div className={userTreasuries.length && "border-top my-3"} />
                <div className="d-flex gap-2 align-items-center justify-content-between">
                  <div className="d-flex gap-2 align-items-center mb-3">
                    <h6 className="mb-0 fw-bold">Other DAOs</h6>
                    <div className="custom-tag rounded-3 fw-bold text-center">
                      {otherDaos.length}
                    </div>
                  </div>
                  <div className="text-secondary cursor-pointer">
                    {!isExpanded ? (
                      <div
                        className="d-flex gap-2 align-items-center"
                        onClick={toggleExpand}
                      >
                        Show <i className="bi bi-chevron-down"></i>
                      </div>
                    ) : (
                      <div
                        className="d-flex gap-2 align-items-center"
                        onClick={toggleExpand}
                      >
                        Hide <i className="bi bi-chevron-up"></i>
                      </div>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <TreasuryCardList
                    treasuries={otherDaos}
                    hasTreasury={false}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
return (
  <div className="d-flex flex-column align-items-center w-100 mb-4">
    <Container>
      <Widget src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Login`} />
    </Container>
  </div>
);
