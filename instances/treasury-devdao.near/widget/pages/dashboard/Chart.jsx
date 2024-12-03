const { nearPrice, totalBalance, ftTokens, accountId } = props;

const [height, setHeight] = useState(200);
const [history, setHistory] = useState([]);
const [tokens, setTokens] = useState([]);
const [tokenAddresses, setTokenAddresses] = useState([]);
const [selectedPeriod, setSelectedPeriod] = useState(1);
const [selectedToken, setSelectedToken] = useState("near");
const [isLoading, setIsLoading] = useState(true);

const nearTokenIcon = "${REPL_NEAR_TOKEN_ICON}";
const nearTokenInfo = {
  contract: "near",
  ft_meta: { symbol: "NEAR", icon: nearTokenIcon },
};

const Loading = () => (
  <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
);

const periodMap = [
  { period: "1H", value: 1 },
  { period: "24H", value: 24 },
  { period: "1W", value: 168 },
  { period: "1M", value: 744 },
  { period: "1Y", value: 8664 },
];

const code = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Line Chart with Timeframe Selection and API</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
          body {
              font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
              margin: 0;
              padding: 0;
              overflow: hidden;
          }

          canvas {
              width: 100%;
              height: 100%;
              display: block;
          }
      </style>
  </head>
  <body>

  <canvas id="myChart" height="400"></canvas>

  <script>
    const ctx = document.getElementById("myChart").getContext("2d");
    let account_id;
    let history;  

    let gradient = ctx.createLinearGradient(0, 0, 0, 350);
    gradient.addColorStop(0, "rgba(67, 121, 238, 0.3)")
    gradient.addColorStop(0.3, "rgba(67, 121, 238, 0.1)")
    gradient.addColorStop(1, "rgba(67, 121, 238, 0)")

    // Initialize the chart with an empty dataset and labels
    let myChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          { 
            data: [],
            fill: true,
            backgroundColor: gradient,
            borderColor: "#4379EE",
            pointBackgroundColor: "#fff",
            pointRadius: 0,
            tension: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        tooltipFillColor: "rgba(0,0,0,0.8)",
        tooltipFontStyle: "bold",
        tooltipTemplate: "<%= value %>",
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              display: true,
              color: "#687076"
            },
          },
          y: {
            beginAtZero: true,
            display: false,
            grid: {
              display: false,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });

    function sendChartHeight() {
      const chartHeight = document.getElementById("myChart").offsetHeight;
      window.parent.postMessage({ handler: "chartHeight", chartHeight }, "*");
    }

    window.addEventListener(
      "message",
      function (event) {
        account_id = event.data.account_id;
        history = event.data.history;

        const data = {
          dataset: history.map((h) => h.balance),
          labels: history.map((h) => h.date),
        };

        myChart.data.datasets[0].data = data.dataset;
        myChart.data.labels = data.labels;
        myChart.update();
        sendChartHeight();
      },
      false
    );

  </script>

  </body>
  </html>
`;

// Function to fetch data from the API based on the selected period
async function fetchData() {
  setIsLoading(true);
  try {
    asyncFetch(
      `http://localhost:3003/token-balance-history?account_id=${accountId}&period=${selectedPeriod}&token_id=${selectedToken}`
    ).then((resp) => {
      if (resp?.body) setHistory(resp.body);
    });
  } catch (error) {
    console.error("Error fetching data:", error);
  }

  setIsLoading(false);
}

useEffect(() => {
  fetchData();
}, [selectedToken, selectedPeriod]);

return (
  <div className="card flex-1 w-100 card-body">
    <div>
      <div className="d-flex justify-content-between flex-row align-items-start">
        <div>
          <h6 className="text-grey">Total Balance</h6>
          <div className="fw-bold h3 mb-0">{totalBalance} USD</div>
        </div>

        <div className="d-flex gap-4">
          {periodMap.map(({ period, value }, idx) => (
            <div
              role="button"
              key={idx}
              onClick={() => setSelectedPeriod(value)}
              className={selectedPeriod === value ? "fw-bold" : ""}
            >
              {period}
            </div>
          ))}
        </div>
      </div>

      <div className="d-flex gap-4 flex-row align-items-center">
        {Array.isArray(ftTokens) &&
          [nearTokenInfo, ...ftTokens].map((item, _index) => {
            const { contract, ft_meta } = item;
            const { symbol, icon } = ft_meta;

            return (
              <div className="d-block" key={idx}>
                <input
                  style={{ visibility: "hidden" }}
                  id={contract}
                  type="radio"
                  value={contract}
                  onClick={() => setSelectedToken(contract)}
                  selected={contract === selectedToken}
                />
                <label htmlFor={contract} role="button">
                  <img width={30} height={30} src={icon} alt={symbol} />
                  <span className={contract === selectedToken ? "fw-bold" : ""}>
                    {symbol}
                  </span>
                </label>
              </div>
            );
          })}
      </div>
    </div>

    <div
      className="w-100 d-flex justify-content-center align-items-center"
      style={{ height: "100%" }}
    >
      {isLoading ? (
        <Loading />
      ) : (
        <iframe
          style={{ width: "100%", height: `${height}px` }}
          srcDoc={code}
          message={{ account_id, history }}
          onMessage={(e) => {
            switch (e.handler) {
              case "chartHeight": {
                setHeight(e.chartHeight);
              }
            }
          }}
        />
      )}
    </div>
  </div>
);
