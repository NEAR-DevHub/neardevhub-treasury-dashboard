const { onClose, onSelect } = props;
if (!context.accountId || !props.term) return <></>;

let results = [];
const profilesData = Social.get("*/profile/name", "final") || {};
const followingData = Social.get(
  `${context.accountId}/graph/follow/**`,
  "final"
);

if (!profilesData || !followingData) return <></>;

const profiles = Object.entries(profilesData);
const term = (props.term || "").replace(/\W/g, "").toLowerCase();
const limit = 5;

for (let i = 0; i < profiles.length; i++) {
  let score = 0;
  const accountId = profiles[i][0];
  const accountIdSearch = profiles[i][0].replace(/\W/g, "").toLowerCase();
  const nameSearch = (profiles[i][1]?.profile?.name || "")
    .replace(/\W/g, "")
    .toLowerCase();
  const accountIdSearchIndex = accountIdSearch.indexOf(term);
  const nameSearchIndex = nameSearch.indexOf(term);

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

const [open, setOpen] = useState(false);

useEffect(() => {
  if (results.length > 0) setOpen(true);
}, [results]);

function onResultClick(id) {
  onSelect(id);
  onClose();
}

const Wrapper = styled.div`
  position: relative;
`;

const Scroller = styled.div`
  position: relative;
  
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 2px
  overflow: auto;
  scroll-behavior: smooth;

  > * {
    max-width: 200px;
    text-align: left;
    flex-grow: 0;
    flex-shrink: 0;
  }
`;

const Selection = styled.div`
  font-size: 14px;
  padding: 5px 0;
  width: 100%;
  background: transparent;

  &:hover {
    cursor: pointer;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 0;
  right: 10px;
  background: none;
  border: none;
  display: block;
  color #687076;
  transition: all 200ms;

  &:hover {
      color: #000;
  }
`;

if (results.length === 0) return <></>;

return (
  <Wrapper>
    <Scroller>
      <CloseButton tabIndex={-1} type="button" onClick={onClose}>
        <i className="bi bi-x-lg" />
      </CloseButton>

      {results.map((result) => {
        return (
          <Selection
            key={result.accountId}
            onClick={() => onResultClick(result.accountId)}
          >
            <Widget
              key={result.accountId}
              src="mob.near/widget/Profile.ShortInlineBlock"
              props={{
                accountId: result.accountId,
              }}
            />
          </Selection>
        );
      })}
    </Scroller>
  </Wrapper>
);
