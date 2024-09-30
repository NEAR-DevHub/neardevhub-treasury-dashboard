const totalBalance = "$1500 USD";
const [height, setHeight] = useState("400px");
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

        .balance-timeframe-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 5px;
        }

        .button-container {
            display: flex;
            gap: 10px;
        }

        button {
            border: none;
            background-color: transparent;
            color: #B3B3B3;
            font-size: 17px;
            cursor: pointer;
        }

        button:hover {
            color: black;
        }

        .selected {
            color: black;
            font-weight: 600;
        }

        .balance-container h2 {
            margin: 0;
            font-size: 16px;
        }

        .balance-container p {
            margin: 5px 0;
            font-size: 14px;
        }

        .token-select {
            display: flex;
            gap: 10px;
            margin-top: 5px;
        }

        .token-option {
            display: flex;
            align-items: center;
        }

        .token-option img {
            width: 20px;
            height: 20px;
            margin-right: 5px;
        }

        input[type="radio"] {
            cursor: pointer;
        }

        h1, h6 {
            margin-block: 5px;
        }

        .text-grey {
            color: #555555;
        }

        .chart-container {
            width: 100%;
            height: 100%;
            position: relative;
        }

        canvas {
            width: 100%;
            display: block;
        }

        /* Loader Styles */
        .loader {
            border: 5px solid #f3f3f3; /* Light grey */
            border-top: 5px solid #3498db; /* Blue */
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            position: absolute;
            top: 25%;
            left: 45%;
            transform: translate(-50%, -50%);
            display: none;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
<div class="balance-timeframe-container">
    <div class="balance-container">
        <h6 class="text-grey">Total Balance</h6>
        <h1>$1500 USD</h1>
        <div class="token-select" id="tokenSelect"></div>
    </div>

    <div class="button-container">
        <button onclick="fetchData('1H', this)" class="selected">1H</button>
        <button onclick="fetchData('24H', this)">24H</button>
        <button onclick="fetchData('1W', this)">1W</button>
        <button onclick="fetchData('1M', this)">1M</button>
        <button onclick="fetchData('1Y', this)">1Y</button>
        <button onclick="fetchData('All', this)">All</button>
    </div>
</div>

<div class="chart-container">
    <div class="loader" id="loader"></div> <!-- Loader element -->
    <canvas id="myChart"></canvas>
</div>

<script>
    const ctx = document.getElementById('myChart').getContext('2d');

    // Initialize the chart with an empty dataset and labels
    let myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '',
                data: [],
                borderColor: '#4379EE',
                backgroundColor: 'rgba(67, 121, 238, 0.16)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        display: true,
                        color: "#000",
                    }
                },
                y: {
                    beginAtZero: true,
                    display: false,
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    function sendChartHeight() {
        const chartHeight = document.getElementById('myChart').offsetHeight;
        window.parent.postMessage({ handler: "chartHeight", chartHeight }, '*');
    }

    // Show loader
    function showLoader() {
        document.getElementById('loader').style.display = 'block';
    }

    // Hide loader
    function hideLoader() {
        document.getElementById('loader').style.display = 'none';
    }

    // Function to fetch data from the API based on the selected timeframe
    async function fetchData(timeframe, button) {
        try {
            showLoader(); // Show loader before fetching data

            if (button) {
                const buttons = document.querySelectorAll('.button-container button');
                buttons.forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
            }
            // Simulate an API call with a timeout
            await new Promise(resolve => setTimeout(resolve, 2000));

            const data = {
                "dataset": [12, 19, 3, 5, 2, 3, 9],
                "labels": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5", "Point 6", "Point 7"]
            };

            const dataset = data.dataset;
            const labels = data.labels;

            myChart.data.datasets[0].data = dataset;
            myChart.data.labels = labels;
            myChart.update();
            sendChartHeight();

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            hideLoader(); // Hide loader once data is fetched
        }
    }

    // Function to fetch tokens and populate the token selection options
    async function fetchTokens() {
        try {
            // Fetch tokens from the API (replace with your API URL)
            const response = await fetch('http://localhost:3003/balance-chart/tokens');
            const tokens = await response.json();

            const tokenSelect = document.getElementById('tokenSelect');
            tokenSelect.innerHTML = ''; // Clear existing tokens

            // Create radio buttons dynamically based on fetched tokens
            tokens.forEach(token => {
                const tokenOption = document.createElement('div');
                tokenOption.classList.add('token-option');
                
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = 'token';
                input.value = token.contract;
                input.id = token.contract;
                input.onchange = selectToken;
                tokenOption.appendChild(input);
                
                const img = document.createElement('img');
                img.src = token.icon; // Token icon from API
                img.alt = token.symbol;
                tokenOption.appendChild(img);
                
                const label = document.createElement('label');
                label.setAttribute('for', token.symbol);
                label.innerText = token.symbol;
                tokenOption.appendChild(label);

                tokenSelect.appendChild(tokenOption);
            });
        } catch (error) {
            console.error('Error fetching tokens:', error);
        }
    }
    
    // Function to handle token selection
    function selectToken(event) {
        const selectedToken = event.target.value;
    }

    window.onload = () => {
        fetchData('1H');
    };
</script>

</body>
</html>
`;

return (
  <iframe
    style={{
      width: "100%",
      height: height,
    }}
    className="card card-body"
    srcDoc={code}
    message={{}}
    onMessage={(e) => {
      switch (e.handler) {
        case "chartHeight":
          setHeight(e.chartHeight + 120);
      }
    }}
  />
);
