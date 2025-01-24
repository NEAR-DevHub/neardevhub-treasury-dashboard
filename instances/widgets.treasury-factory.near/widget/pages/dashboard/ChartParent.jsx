const { nearPrice, ftTokens, accountId, title, instance, totalBalance } = props;

const API_HOST = "https://ref-sdk-api.fly.dev/api";
const [allPeriodData, setAllPeriodData] = useState({});
const [isLoading, setIsLoading] = useState(true);
const [selectedToken, setSelectedToken] = useState("near");

// Function to fetch data for all periods at once
const fetchAllPeriodData = async () => {
  setIsLoading(true);
  try {
    asyncFetch(
      `${API_HOST}/all-token-balance-history?account_id=${accountId}&token_id=${selectedToken}`
    ).then((res) => {
      setAllPeriodData(res.body);
      setIsLoading(false);
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    setIsLoading(false);
  }
};

useEffect(() => {
  fetchAllPeriodData();
}, [selectedToken]);

return (
  <Widget
    src={"${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.Chart"}
    props={{
      nearPrice,
      ftTokens,
      accountId,
      title,
      instance,
      allPeriodData,
      isLoading,
      selectedToken,
      setSelectedToken,
      totalBalance,
    }}
  />
);
