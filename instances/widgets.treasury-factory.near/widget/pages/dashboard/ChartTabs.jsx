const {
  nearPrice,
  accountId,
  treasuryDaoID,
  lockupContract,
  daoFTTokens,
  intentsTokens,
  nearBalances,
  lockupNearBalances,
  instance,
  intentsTotalUsdBalance
} = props;

if (!instance) {
  return <></>;
}

const formatCurrency = (amount) => {
  return Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const tabs = [
  {
    id: "sputnik",
    title: "Sputnik DAO",
    data: {
      nearPrice,
      nearBalance: nearBalances?.totalParsed ?? "0",
      totalBalance: formatCurrency(
        Big(nearBalances?.totalParsed ?? "0").mul(nearPrice ?? 1)
      ),
      ftTokens: daoFTTokens.fts ? daoFTTokens.fts : null,
      accountId: treasuryDaoID,
      instance,
    }
  }
];

if (intentsTokens && intentsTokens.length > 0) {
  tabs.push({
    id: "intents",
    title: "NEAR Intents",
    data: {
      nearPrice,
      nearBalance: "0",
      totalBalance: formatCurrency(intentsTotalUsdBalance || 0),
      ftTokens: [],
      intentsTokens: intentsTokens,
      accountId: treasuryDaoID,
      instance,
    }
  });
}

// Add Lockup tab if lockup contract exists
if (lockupContract) {
  tabs.push({
    id: "lockup",
    title: "Lockup",
    data: {
      nearPrice,
      nearBalance: lockupNearBalances?.totalParsed ?? "0",
      totalBalance: formatCurrency(
        Big(lockupNearBalances?.totalParsed ?? "0").mul(nearPrice ?? 1)
      ),
      ftTokens: [],
      accountId: lockupContract,
      instance,
    }
  });
}

const [activeTab, setActiveTab] = useState(tabs[0]?.id || "sputnik");
const currentTabData = tabs.find(tab => tab.id === activeTab)?.data || {};

const ChartContainer = styled.div`
  background: var(--grey-05);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
`;

const TabsContainer = styled.div`
  background: transparent
  padding: 8px;
  display: flex;
  justify-content: flex-start;
  padding: 8px;
  gap: 8px;
  border-top: 1px solid var(--border-color);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
`;

const TabButton = styled.button`
  padding: 10px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-secondary-color);
  background: transparent;
  
  &.active {
    color: var(--text-color);
    background: var(--grey-04);
  }
`;

const ChartContent = styled.div`
  background: var(--bg-page-color);
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  border-bottom: 1px solid var(--border-color);
`;

return (
  <ChartContainer>
    <TabsContainer>
      {tabs.map((tab) => (
        <TabButton
          key={tab.id}
          className={activeTab === tab.id ? "active" : ""}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.title}
        </TabButton>
      ))}
    </TabsContainer>
    
    <ChartContent>
      <Widget
        loading=""
        src={"${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.ChartParent"}
        props={currentTabData}
      />
    </ChartContent>
  </ChartContainer>
);