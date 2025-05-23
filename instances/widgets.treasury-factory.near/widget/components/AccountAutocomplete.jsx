if (!context.accountId || !props.term) return <></>;

let results = [];
const filterAccounts = props.filterAccounts ?? []; //  hide certain accounts from the list
const profilesData = Social.get("*/profile/name", "final") || {};
const followingData = Social.get(
  `${context.accountId}/graph/follow/**`,
  "final"
);
if (!profilesData) return <></>;
const profiles = Object.entries(profilesData);
const term = props.term;
const parsedTerm = (term || "").replace(/\W/g, "").toLowerCase();
const isValidAccount =
  term.includes(".near") ||
  term.includes(".aurora") ||
  term.includes(".tg") ||
  (term ?? "").length == 64;
const limit = 5;

for (let i = 0; i < profiles.length; i++) {
  let score = 0;
  const accountId = profiles[i][0];
  const accountIdSearch = profiles[i][0].replace(/\W/g, "").toLowerCase();
  const nameSearch = (profiles[i][1]?.profile?.name || "")
    .replace(/\W/g, "")
    .toLowerCase();
  const accountIdSearchIndex = accountIdSearch.indexOf(parsedTerm);
  const nameSearchIndex = nameSearch.indexOf(parsedTerm);

  if (accountIdSearchIndex > -1 || nameSearchIndex > -1) {
    score += 10;

    if (accountIdSearchIndex === 0) {
      score += 10;
    }
    if (nameSearchIndex === 0) {
      score += 10;
    }
    if (followingData[accountId] === "") {
      score += 30;
    }

    results.push({
      accountId,
      score,
    });
  }
}
results.sort((a, b) => b.score - a.score);
results = results.slice(0, limit);
if (filterAccounts?.length > 0) {
  results = results.filter((item) => !filterAccounts?.includes(item.accountId));
}

function onResultClick(id) {
  props.onSelect && props.onSelect(id);
}

const Wrapper = styled.div`
  position: relative;
  color: var(--text-color);
  &::before {
    content: "";
    display: block;
    position: absolute;
    right: 0;
    width: 6px;
    height: 100%;
    z-index: 10;
  }
`;

const Scroller = styled.div`
  position: relative;
  display: flex;
  padding: 6px;
  gap: 10px;
  overflow: auto;
  scroll-behavior: smooth;
  align-items: center;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }

  .item {
    max-width: 175px;
    flex-grow: 0;
    flex-shrink: 0;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 6px;
    transition: all 200ms;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  display: block;
  color: var(--icon-color);
  transition: all 200ms;
`;

if (!isValidAccount && results.length === 0) return <></>;

const Account = ({ accountId }) => {
  return (
    <div
      className="item cursor-pointer"
      onClick={() => onResultClick(accountId)}
    >
      <Widget
        key={accountId}
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
        props={{
          accountId: accountId,
          showKYC: false,
          instance: props.instance,
        }}
      />
    </div>
  );
};

return (
  <Wrapper>
    <Scroller>
      <CloseButton tabIndex={-1} type="button" onClick={props.onClose}>
        <i class="bi bi-x-circle-fill h5 mb-0"></i>
      </CloseButton>
      {isValidAccount ? (
        <Account accountId={term} />
      ) : (
        results.map((result) => {
          return <Account accountId={result.accountId} />;
        })
      )}
    </Scroller>
  </Wrapper>
);
