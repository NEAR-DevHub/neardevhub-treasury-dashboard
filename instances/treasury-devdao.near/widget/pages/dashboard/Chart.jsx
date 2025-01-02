const { nearPrice, ftTokens, accountId, title, instance } = props;

if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const { Skeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
);

if (!Skeleton) {
  return <></>;
}
const API_HOST = "https://ref-sdk-api.fly.dev/api";
const [height, setHeight] = useState(350);
const [history, setHistory] = useState([]);
const [tokenAddresses, setTokenAddresses] = useState([]);
const [selectedPeriod, setSelectedPeriod] = useState({
  value: 1,
  interval: 12,
});
const [selectedToken, setSelectedToken] = useState("near");
const [isLoading, setIsLoading] = useState(true);
const [balanceDate, setBalanceDate] = useState({ balance: 0, date: "" });

const nearTokenInfo = {
  contract: "near",
  ft_meta: { symbol: "NEAR" },
};

const tokens = Array.isArray(ftTokens)
  ? [nearTokenInfo, ...ftTokens]
  : [nearTokenInfo];

const periodMap = [
  { period: "1H", value: 1 / 6, interval: 6 },
  { period: "1D", value: 1, interval: 12 },
  { period: "1W", value: 24, interval: 8 },
  { period: "1M", value: 24 * 2, interval: 15 },
  { period: "1Y", value: 24 * 30, interval: 12 },
  { period: "All", value: 24 * 365, interval: 10 },
];

function formatCurrency(amount) {
  return Number(amount)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const config = Near.view(treasuryDaoID, "get_config");
const metadata = JSON.parse(atob(config.metadata ?? ""));

const isDarkTheme = metadata.theme === "dark";
const bgPageColor = isDarkTheme ? "#222222" : "#FFFFFF";
const borderColor = isDarkTheme ? "#3B3B3B" : "rgba(226, 230, 236, 1)";
const iconColor = isDarkTheme ? "#CACACA" : "#060606";
const textColor = isDarkTheme ? "#CACACA" : "#1B1B18";
const fillStyle = isDarkTheme
  ? "rgba(27, 27, 24, 0.1)"
  : "rgba(255, 255, 255, 0.7)";

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
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif;
            margin: 0;
            padding: 0;
            overflow: hidden;
          }

          canvas {
              width: 100%;
              height: 100%;
              display: block;
              background-color:${bgPageColor};
              color: ${textColor};
          }
      </style>
  </head>
  <body>
      <canvas id="myChart" height="400"></canvas>
      <script>
    const ctx = document.getElementById("myChart").getContext("2d");
    let account_id;
    let history;
    let hoverX = null;

    let gradient = ctx.createLinearGradient(0, 0, 0, 350);
    gradient.addColorStop(0, "rgba(0,0,0, 0.3)")
    gradient.addColorStop(0.3, "rgba(0,0,0, 0.1)")
    gradient.addColorStop(1, "rgba(0,0,0, 0)")

    // Plugin for drawing the tracking line
    const trackingLinePlugin = {
        id: 'trackingLine',
        afterDatasetsDraw(chart) {
            const { ctx, chartArea } = chart;

            if (hoverX !== null) {
                // Draw the vertical tracking line
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(hoverX, chartArea.top);
                ctx.lineTo(hoverX, chartArea.bottom);
                ctx.lineWidth = 1;
                ctx.strokeStyle = '${iconColor}';
                ctx.setLineDash([5, 3]);
                ctx.stroke();
                ctx.restore();
                
                ctx.fillStyle = '${fillStyle}'; // Semi-transparent overlay
                ctx.fillRect(hoverX, chartArea.top, chartArea.right - hoverX, chartArea.bottom - chartArea.top);
                ctx.restore();
            }
        }
    };

    // Chart configuration
    const options = {
        responsive: true,
        plugins: {
            tooltip: {
                enabled: false,
            }
        },
        layout: {
          padding: {
            top: 10,
            bottom: 10,
            left: 0,
            right: 0
          }
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              display: true,
              color: '${textColor}',
            },   
          },
          y: {
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
        events: []
    };

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
            borderColor: '${borderColor}',
            pointBackgroundColor: '${bgPageColor}',
            pointRadius: 0,
            tension: 0,
            borderWidth: 1.5
          },
        ],
      },
      options,
      plugins: [trackingLinePlugin],
    });

    const xScale = myChart.scales.x;
    const rect = myChart.canvas.getBoundingClientRect();
    let currIndex = xScale.getValueForPixel(rect.width);

    // Track mouse movement
    document.getElementById('myChart').addEventListener('mousemove', (event) => {
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Check if the mouse is inside the chart area
        const chartArea = myChart.chartArea;
        if (x >= chartArea.left && x <= chartArea.right && y >= chartArea.top && y <= chartArea.bottom) {
            hoverX = x;
            const periods = myChart.data.datasets[0].data.length
            currIndex = xScale.getValueForPixel(x-(rect.width/periods/2-1));
        } else {
            currIndex = xScale.getValueForPixel(chartArea.right);
            hoverX = null; // Clear the hover position if outside chart area
        }

        sendChartBalance()
        myChart.update('none'); // Update chart without animation
    });

    // Clear hover position on mouse leave
    document.getElementById('myChart').addEventListener('mouseleave', () => {
        hoverX = null;
        myChart.update('none');
    });

    function sendChartHeight() {
      currIndex = myChart.data.datasets[0].data.length-1;
      const chartHeight = document.getElementById("myChart").offsetHeight;
      window.parent.postMessage({ handler: "chartHeight", chartHeight }, "*");
    }

    function sendChartBalance() {
      const data = myChart.data.datasets[0].data;
      const timestamp = myChart.data.timestamp

      window.parent.postMessage({
        handler: "balance",
        balance: data[currIndex],
        date: timestamp[currIndex]
      }, "*");
    }

    window.addEventListener(
      "message",
      function (event) {
        account_id = event.data.account_id;
        history = event.data.history;
        const balances = history.map((h) => parseFloat(h.balance))
        const min = Math.min(...balances)
        const max = Math.max(...balances)

        const data = {
          dataset: balances,
          labels: history.map((h) => h.date),
          timestamp: history.map((h) => h.timestamp),
        };

        myChart.data.datasets[0].data = data.dataset;
        myChart.data.labels = data.labels;
        myChart.data.timestamp = data.timestamp;
        myChart.options.scales.y.min = min > 0 ? min*0.9 : -0.01;
        myChart.options.scales.y.max = max > 0 ? max*1.1 : 10;

        myChart.update();
        sendChartHeight();
        sendChartBalance();
      },
      false
    );

  </script>

  </body>
  </html>
`;

const Period = styled.div`
  font-size: 14px;
  padding: 8px 16px;
  color: #999999;
  font-weight: 500;

  &.selected {
    background-color: var(--grey-04);
    color: var(--text-color);
    border-radius: 8px;
  }
`;

const RadioButton = styled.div`
  .radio-btn {
    border-radius: 50%;
    border: 1px solid var(--icon-color);
    display: flex;
    justify-content: center;
    align-items: center;
    height: 14px;
    width: 14px;

    .selected {
      background: var(--icon-color);
      border-radius: 50%;
      height: 6px;
      width: 6px;
    }
  }
`;

// Function to fetch data from the API based on the selected period
async function fetchData() {
  try {
    asyncFetch(
      `${API_HOST}/token-balance-history?account_id=${accountId}&period=${selectedPeriod.value}&interval=${selectedPeriod.interval}&token_id=${selectedToken}`
    ).then((resp) => {
      if (resp?.body) setHistory(resp.body);
      setIsLoading(false);
    });
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

useEffect(() => {
  setIsLoading(true);
  fetchData();
}, [selectedToken, selectedPeriod]);

const LoadingBalance = () => {
  return (
    <div className="mt-2">
      <Skeleton
        style={{ height: "32px", width: "100%" }}
        className="rounded-1"
      />
    </div>
  );
};

const LoadingTokens = () => {
  return (
    <div className="mt-2">
      <Skeleton
        style={{ height: "24px", width: "50%" }}
        className="rounded-2"
      />
    </div>
  );
};

const LoadingChart = () => {
  return (
    <div className="mt-2">
      <Skeleton
        style={{ height: "390px", width: "100%" }}
        className="rounded-2"
      />
    </div>
  );
};
const formattedDate = (date) => {
  const d = date.toLocaleDateString("en-US", { dateStyle: "medium" });
  const t = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
  });

  return `${d} ${t}`;
};

return (
  <div className="card flex-1 w-100 card-body">
    <div>
      <div className="d-flex justify-content-between flex-row align-items-start">
        <div className="d-flex flex-column gap-2">
          <h6 className="text-secondary mb-0">{title}</h6>
          {balanceDate ? (
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <h3 className="fw-bold mb-0">
                <span className="balance-value">
                  {formatCurrency(balanceDate.balance)}
                </span>
                <span>
                  {
                    [nearTokenInfo, ...(ftTokens ?? [])].find(
                      (t) => t.contract === selectedToken
                    )?.ft_meta?.symbol
                  }
                </span>
              </h3>
              {balanceDate.date && (
                <div style={{ fontSize: 14 }} className="balance-date">
                  {formattedDate(new Date(balanceDate.date))}
                </div>
              )}
            </div>
          ) : (
            <LoadingBalance />
          )}
        </div>

        <div className="d-flex gap-1 flex-wrap">
          {periodMap.map(({ period, value, interval }, idx) => (
            <Period
              role="button"
              key={idx}
              onClick={() => setSelectedPeriod({ value, interval })}
              className={
                selectedPeriod.value === value &&
                selectedPeriod.interval === interval
                  ? "selected"
                  : ""
              }
            >
              {period}
            </Period>
          ))}
        </div>
      </div>

      {tokens ? (
        <div className="d-flex gap-4 mt-2 flex-wrap align-items-center">
          {tokens.slice(0, 5).map((item, _index) => {
            const { contract, ft_meta } = item;
            const { symbol } = ft_meta;

            return (
              <RadioButton className="d-flex align-items-center" key={idx}>
                <input
                  style={{ visibility: "hidden", width: 0, padding: 0 }}
                  id={contract}
                  type="radio"
                  value={contract}
                  onClick={() => setSelectedToken(contract)}
                  selected={contract === selectedToken}
                />
                <label
                  htmlFor={contract}
                  role="button"
                  className="d-flex align-items-center gap-1"
                >
                  <div className="radio-btn">
                    <div
                      className={contract === selectedToken ? "selected" : ""}
                    />
                  </div>
                  <span className={contract === selectedToken ? "fw-bold" : ""}>
                    {symbol}
                  </span>
                </label>
              </RadioButton>
            );
          })}
        </div>
      ) : (
        <LoadingTokens />
      )}
    </div>

    {isLoading || !history.length ? (
      <LoadingChart />
    ) : (
      <div
        className="w-100 d-flex justify-content-center align-items-center mt-2 rounded-3 overflow-hidden"
        style={{ height: "400px" }}
      >
        <iframe
          className="chart"
          style={{ width: "100%", height: `${height}px` }}
          srcDoc={code}
          message={{ account_id, history }}
          onMessage={(e) => {
            switch (e.handler) {
              case "chartHeight": {
                setHeight(e.chartHeight);
              }
              case "balance": {
                setBalanceDate({ balance: e.balance, date: e.date });
              }
            }
          }}
        />
      </div>
    )}
  </div>
);
