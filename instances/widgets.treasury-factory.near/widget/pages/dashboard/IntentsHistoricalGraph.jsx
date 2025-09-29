const { title, instance } = props;

if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const { Skeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
);

const { getAllColorsAsObject } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

if (!Skeleton || typeof getAllColorsAsObject !== "function") {
  return <></>;
}

const [height, setHeight] = useState(350);
const [history, setHistory] = useState([]);
const [availableTokens, setAvailableTokens] = useState([]);
const [selectedToken, setSelectedToken] = useState(null);
const [selectedPeriod, setSelectedPeriod] = useState("1Y");
const [balanceDate, setBalanceDate] = useState(null);
const [allPeriodData, setAllPeriodData] = useState(null);
const [hasData, setHasData] = useState(false);

const periodMap = {
  "1H": { value: 1 / 6, interval: 6 },
  "1D": { value: 1, interval: 12 },
  "1W": { value: 24, interval: 8 },
  "1M": { value: 24 * 2, interval: 15 },
  "1Y": { value: 24 * 30, interval: 12 },
  All: { value: 24 * 365, interval: 10 },
};

function formatCurrency(amount) {
  return Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

// Fetch intents historical data
useEffect(() => {
  // Fetch data for all periods from the API endpoint
  asyncFetch(
    `${REPL_BACKEND_API}/intents-balance-history?account_id=${treasuryDaoID}`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = response.body;

      // Check if data has any keys (periods with data)
      if (data && typeof data === "object" && Object.keys(data).length > 0) {
        setAllPeriodData(data);
        setHasData(true);
      } else {
        setHasData(false);
      }
    })
    .catch((error) => {
      console.error("Failed to fetch intents data:", error);
      setHasData(false);
    });
}, [instance]);

// Extract available tokens from the latest period data (1H)
useEffect(() => {
  if (
    hasData &&
    allPeriodData &&
    allPeriodData["1H"] &&
    allPeriodData["1H"].length > 0
  ) {
    const latestData = allPeriodData["1H"][allPeriodData["1H"].length - 1];
    if (latestData.tokens) {
      const tokens = latestData.tokens.map((token) => ({
        token_id: token.token_id,
        symbol: token.symbol,
      }));
      setAvailableTokens(tokens);

      // Set default selected token if none selected
      if (!selectedToken && tokens.length > 0) {
        setSelectedToken(tokens[0].token_id);
      }
    }
  }
}, [hasData, allPeriodData]);

// Process data for the selected token and period
useEffect(() => {
  if (allPeriodData[selectedPeriod] && selectedToken) {
    const processedHistory = allPeriodData[selectedPeriod].map((dataPoint) => {
      const tokenData = dataPoint.tokens.find(
        (token) => token.token_id === selectedToken
      );
      return {
        timestamp: dataPoint.timestamp,
        date: dataPoint.date,
        balance: tokenData ? parseFloat(tokenData.parsedBalance) : 0,
      };
    });
    setHistory(processedHistory);
  }
}, [selectedPeriod, allPeriodData, selectedToken]);

const config = treasuryDaoID ? Near.view(treasuryDaoID, "get_config") : null;
const metadata = JSON.parse(atob(config.metadata ?? ""));

const isDarkTheme = metadata.theme === "dark";
const fillStyle = isDarkTheme
  ? "rgba(34, 34, 34, 0.7)"
  : "rgba(255, 255, 255, 0.7)";

const colors = getAllColorsAsObject(isDarkTheme);
const code = `
<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Intents Historical Chart</title>
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
            height: 400px;
            display: block;
            background-color: ${colors["--bg-page-color"]};
            color: ${colors["--text-color"]};
          }
      </style>
  </head>
  <body>
      <canvas id="myChart"></canvas>
      <script>
    const ctx = document.getElementById("myChart").getContext("2d");
    let selectedToken;
    let history;
    let hoverX = null;

    let gradient = ctx.createLinearGradient(0, 0, 0, 350);
    if (${isDarkTheme}) {
      gradient.addColorStop(0, "rgba(255,255,255, 0.2)")
      gradient.addColorStop(0.3, "rgba(255,255,255, 0.1)")
      gradient.addColorStop(1, "rgba(255,255,255, 0)")
    } else {
      gradient.addColorStop(0, "rgba(0,0,0, 0.3)")
      gradient.addColorStop(0.3, "rgba(0,0,0, 0.1)")
      gradient.addColorStop(1, "rgba(0,0,0, 0)")
    }

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
                ctx.strokeStyle = '${colors["--icon-color"]}';
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
        maintainAspectRatio: false,
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
              color: '${colors["--text-color"]}',
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
        events: [],
        animation: {
          duration: 300,
          onComplete: () => {
            // the labels are sometimes not visible because of less height
            setTimeout(() => {
              sendChartHeight(); 
            }, 1000);
          },
        },
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
            borderColor: '${colors["--text-color"]}',
            pointBackgroundColor: ' ${colors["--bg-page-color"]}',
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

    window.addEventListener('resize', () => {
      myChart.resize();
    });

    function sendChartHeight() {
      currIndex = myChart.data.datasets[0].data.length-1;
      const chartHeight = document.getElementById("myChart").offsetHeight;
      window.parent.postMessage({ handler: "chartHeight", chartHeight, selectedToken }, "*");
    }

    function sendChartBalance() {
      const data = myChart.data.datasets[0].data;
      const timestamp = myChart.data.timestamp

      window.parent.postMessage({
        handler: "balance",
        balance: data[currIndex],
        date: timestamp[currIndex],
        selectedToken
      }, "*");
    }

    window.addEventListener(
      "message",
      function (event) {
        selectedToken = event.data.selectedToken;
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

  &:hover {
    background-color: var(--grey-04);
    color: var(--text-color);
    border-radius: 8px;
  }

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

const getSelectedTokenSymbol = () => {
  const token = availableTokens.find((t) => t.token_id === selectedToken);
  return token ? token.symbol : "";
};

// Don't render anything until we have data
if (!hasData) {
  return <></>;
}

return (
  <div
    className="card flex-1 w-100 card-body"
    data-testid="intents-historical-graph"
  >
    <div>
      <div className="d-flex justify-content-between flex-row align-items-start">
        <div className="d-flex flex-column gap-2">
          <h6 className="text-secondary mb-0">{title}</h6>
          {balanceDate && (
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <h3 className="fw-bold mb-0">
                <span className="balance-value">
                  {formatCurrency(balanceDate.balance)}
                </span>
                <span className="ms-1">{getSelectedTokenSymbol()}</span>
              </h3>
              {balanceDate.date && (
                <div style={{ fontSize: 14 }} className="balance-date">
                  <Widget
                    loading=""
                    src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DateTimeDisplay"
                    props={{
                      timestamp: balanceDate.date,
                      instance: instance,
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="d-flex gap-1 flex-wrap">
          {Object.entries(periodMap).map(
            ([period, { value, interval }], idx) => (
              <Period
                role="button"
                key={`intents-${idx}`}
                onClick={() => setSelectedPeriod(period)}
                className={
                  periodMap[selectedPeriod].value === value &&
                  periodMap[selectedPeriod].interval === interval
                    ? "selected"
                    : ""
                }
              >
                {period}
              </Period>
            )
          )}
        </div>
      </div>

      {availableTokens.length > 0 && (
        <div className="d-flex gap-4 mt-2 flex-wrap align-items-center">
          {availableTokens.slice(0, 8).map((token, _index) => {
            const { token_id, symbol } = token;

            return (
              <RadioButton
                className="d-flex align-items-center"
                key={`intents-token-${token_id}`}
              >
                <input
                  style={{ visibility: "hidden", width: 0, padding: 0 }}
                  id={`intents-${token_id}`}
                  type="radio"
                  value={token_id}
                  onClick={() => {
                    setBalanceDate(null);
                    setSelectedToken(token_id);
                  }}
                  selected={token_id === selectedToken}
                />
                <label
                  htmlFor={`intents-${token_id}`}
                  role="button"
                  className="d-flex align-items-center gap-1"
                >
                  <div className="radio-btn">
                    <div
                      className={token_id === selectedToken ? "selected" : ""}
                    />
                  </div>
                  <span
                    style={{ maxWidth: 100 }}
                    className={`text-truncate${
                      token_id === selectedToken ? " fw-bold" : ""
                    }`}
                  >
                    {symbol}
                  </span>
                </label>
              </RadioButton>
            );
          })}
        </div>
      )}
    </div>

    {history.length > 0 && (
      <div
        className="w-100 d-flex justify-content-center align-items-center mt-2 rounded-3 overflow-hidden"
        style={{ height: "400px" }}
      >
        <iframe
          className="chart"
          style={{ width: "100%", height: `${height}px` }}
          srcDoc={code}
          message={{ selectedToken, history }}
          onMessage={(e) => {
            if (e.selectedToken !== selectedToken) return; // ignore if it's not from this iframe

            switch (e.handler) {
              case "chartHeight":
                setHeight(e.chartHeight);
                break;
              case "balance":
                setBalanceDate({ balance: e.balance, date: e.date });
                break;
              default:
                break;
            }
          }}
        />
      </div>
    )}
  </div>
);
