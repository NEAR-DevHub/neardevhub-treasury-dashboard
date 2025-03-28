const { getAllColorsAsObject } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);
const instance = props.instance;
if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const config = treasuryDaoID ? Near.view(treasuryDaoID, "get_config") : null;
const metadata = JSON.parse(atob(config.metadata ?? ""));
const isDarkTheme = metadata.theme === "dark";
const onSubmit = props.onSubmit ?? (() => {});
const onCancel = props.onCancel ?? (() => {});

const { themeColor } = VM.require(`${instance}/widget/config.data`) || {
  themeColor: "",
};
const whitelistTokenAPI = `${REPL_BACKEND_API}/whitelist-tokens?account=${treasuryDaoID}`;
const swapAPI = `${REPL_BACKEND_API}/swap`;
const primaryColor = metadata?.primaryColor
  ? metadata?.primaryColor
  : themeColor;

const colors = getAllColorsAsObject(isDarkTheme, primaryColor);
const nearblocksKey = "${REPL_NEARBLOCKS_KEY}";

const code = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/big-js@3.1.3/big.min.js"></script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
        <title>Token Swap</title>
        <style>
            :root {
                --bs-body-bg: ${colors["--bg-page-color"]} !important;
                --bs-border-color: ${colors["--border-color"]} !important;
                --bs-form-control-disabled-bg: ${
                  colors["--grey-04"]
                } !important;
            }
            body {
                background-color: ${colors["--bg-page-color"]} !important;
                color: ${colors["--text-color"]} !important;
                overflow-y: hidden;
            }
            .disabled {
                background-color: ${colors["--grey-04"]} !important;
                color: ${colors["--text-secondary-color"]} !important;
                border-color: ${colors["--border-color"]};
                cursor: not-allowed !important;
                border-radius: 5px;
                opacity: inherit !important;
            }
            .text-green {
                color: ${colors["--other-green"]};
            }
            .dropdown-menu {
                display:none;
                width: 100%;
                background-color: ${colors["--bg-page-color"]} !important;
                color: ${colors["--text-color"]} !important;
            }
            .dropdown-item {
                cursor: pointer;
            }
            .dropdown-item.active,
            .dropdown-item:active {
                background-color: ${colors["--grey-04"]} !important;
                color: inherit !important;
            }
            .dropdown-item:hover,
            .dropdown-item:focus {
                background-color: ${colors["--grey-04"]} !important;
                color: inherit !important;
            }
            .btn {
                padding: 0.5rem 1.2rem !important;
            }
            .error {
                color: ${colors["--other-red"]} !important;
                font-size: 14px;
                display: none;
            }
            .theme-btn {
                background: ${colors["--theme-color"]} !important;
                color: white !important;
                border: none;
              }
              .theme-btn.btn:hover {
                color: white !important;
                background: ${colors["--theme-color-dark"]} !important;
              }  
              .text-sm {
                font-size: 13px;
              }
              .disabled img {
                opacity: 0.8;
              }
              .dropdown-btn{
                border-top-right-radius: 0.375rem;
                border-bottom-right-radius: 0.375rem;
                height:100%;
                background: ${colors["--bg-page-color"]} !important;
                color: ${colors["--text-color"]} !important;
                border-left: none !important;
              }
    
             .amount-input{
                border-radius: 0px !important;
                border-top-left-radius: 0.375rem !important;
                border-bottom-left-radius: 0.375rem !important;
             }
             label {
                font-weight: 500;
                margin-bottom: 3px;
                font-size: 15px;
              }
              .scroll-box {
                max-height: 200px;
                overflow-y: scroll;
              }
              .dropdown-toggle:after {
                position: absolute;
                top: 46%;
                right: 5%;
              }
            
              .dropdown-menu {
                width: 350px;
                right: 0;
              }
    
              .warning-box {
                background: rgba(255, 158, 0, 0.1);
                color: ${colors["--other-warning"]} ;
                padding-inline: 0.8rem;
                padding-block: 0.5rem;
                font-weight: 500;
                font-size: 13px;
                i {
                    color: ${colors["--other-warning"]} !important;
                }
              }
    
              .info-box{
                background:  ${colors["--grey-04"]} !important;
                color: ${colors["--grey-02"]} !important;
                padding-inline: 0.8rem;
                padding-block: 0.5rem;
                font-weight: 500;
                font-size: 13px;
                i {
                    color: ${colors["--grey-02"]} !important;
                }
              }
              .btn-outline-secondary {
                border-color: ${colors["--border-color"]} !important;
                color: ${colors["--text-color"]} !important;
                border-width: 1px !important;
              }
              .btn-outline-secondary i {
                color: ${colors["--text-color"]} !important;
              }
              .btn-outline-secondary:hover {
                color: ${colors["--text-color"]} !important;
                border-color: ${colors["--border-color"]} !important;
                background: ${colors["--grey-035"]} !important;
              }
              .ms-auto {
                font-size:12px;
              }
        </style>
    </head>
    <body data-bs-theme=${isDarkTheme ? "dark" : "light"}>
        <div class="d-flex flex-column gap-3">
            <div id="third-party-swap-info" style="display: none;">
                <div class="d-flex gap-3 align-items-center info-box px-3 py-2 rounded-3">
                    <i class="bi bi-info-circle h5 mb-0"></i>
                    <div> Some third-party tools may impose swapping fees when converting your funds.</div>
                </div>
            </div>
            <!-- Send Section -->
            <div class="d-flex flex-column gap-1">
                <label>Send</label>
                <div class="d-flex">
                    <input type="number" id="send-amount" class="form-control amount-input" placeholder="Amount">
                    <div class="token-selector">
                        <button id="selectedSendToken" class="border border-1 dropdown-btn d-flex align-items-center gap-2">
                            <img id="sendTokenIcon" src="" width="20" height="20" style="display:none;">
                            <span id="sendTokenSymbol">Select</span>
                            <span class="ms-auto"><i class="bi bi-chevron-down"></i></span>
                        </button>
                        <div id="sendDropdownMenu" class="dropdown-menu dropdown-menu-end dropdown-menu-lg-start px-2">
                            <input id="sendSearchInput" type="text" class="form-control mb-2" placeholder="Search token" onkeyup="handleSearch(event, 'send')" />
                            <div class="text-secondary d-flex justify-content-between px-1">
                                <div>Token</div>
                                <div>Balance</div>
                            </div>
                            <div id="sendScrollBox" class="scroll-box">
                                <!-- Loader/Error/Token List will be inserted here -->
                            </div>
                        </div>
                    </div>
                </div>
                <div id="send-current-balance" class="text-secondary text-sm" style="display:none"></div>
            </div>

            <!-- Receive Section -->
            <div class="d-flex flex-column gap-1">
                <label>Receive</label>
                <div class="d-flex">
                    <input type="number" disabled="true" id="receive-amount" class="form-control amount-input" placeholder="Amount">
                    <div class="token-selector">
                        <button id="selectedReceiveToken" class="border border-1 dropdown-btn d-flex align-items-center gap-2">
                            <img id="receiveTokenIcon" src="" width="20" height="20" style="display:none;">
                            <span id="receiveTokenSymbol">Select</span>
                            <span class="ms-auto"><i class="bi bi-chevron-down"></i></span>
                        </button>
                        <div id="receiveDropdownMenu" class="dropdown-menu dropdown-menu-end dropdown-menu-lg-start px-2">
                            <input id="receiveSearchInput" type="text" class="form-control mb-2" placeholder="Search token" onkeyup="handleSearch(event, 'receive')" />
                            <div class="text-secondary d-flex justify-content-between px-1">
                                <div>Token</div>
                                <div>Balance</div>
                            </div>
                            <div id="receiveScrollBox" class="scroll-box">
                                <!-- Loader/Error/Token List will be inserted here -->
                            </div>
                        </div>
                    </div>
                </div>
                <div id="receive-current-balance" class="text-secondary text-sm" style="display:none"></div>
                <div class="error" id="tokens-error">Please select different tokens for the swap.</div>
            </div>

            <!-- Swap Button -->
            <div class="d-flex flex-column gap-1">
                <button id="swapButton" onclick="swapTokens()" disabled class="btn theme-btn">
                    <span id="swapButtonText">Calculate</span>
                    <span id="swapSpinner" class="spinner-border spinner-border-sm" style="display: none;"></span>
                </button>
                <div class="error" id="swap-error">Swap failed. Please try again.</div>
            </div>

            <!-- Balance Warning -->
            <div id="balance-warning" style="display: none;">
                <div class="d-flex gap-3 align-items-center warning-box px-3 py-2 rounded-3">
                    <i class="bi bi-exclamation-triangle h5 mb-0"></i>
                    The treasury balance doesn't have enough tokens to swap. You can create the request, but it won’t be approved until the balance is topped up.
                </div>
            </div>

            <!-- NEAR Swap Info -->
            <div id="near-swap-info" style="display: none;">
                <div class="d-flex gap-3 align-items-center warning-box px-3 py-2 rounded-3">
                    <i class="bi bi-exclamation-triangle h5 mb-0"></i>
                    <div>To exchange NEAR for another token, first swap it for wNEAR. You can then exchange wNEAR for your desired token.</div>
                </div>
            </div>

            <!-- Exchange rate Info -->
            <div id="exchange-rate-info" style="display: none;">
                <div class="d-flex gap-3 align-items-center warning-box px-3 py-2 rounded-3">
                     <i class="bi bi-exclamation-triangle h5 mb-0"></i>
                     <div> The exchange rate applied differs by <span id="exchange-rate-percentage">X%</span> from other platforms. Please review before proceeding.</div>
                </div>
            </div>


            <!-- Warning Message -->
            <div id="warning-message" style="display: none;">
                <div class="d-flex gap-3 align-items-center warning-box px-3 py-2 rounded-3">
                    <i class="bi bi-exclamation-triangle h5 mb-0"></i>
                    To collect this token, purchase storage space. After submission, 0.1 NEAR will be charged from your account as an additional transaction.
                </div>
            </div>

            <!-- Slippage Section -->
            <div class="d-flex flex-column gap-1">
                <label>Price Slippage Limit (%)</label>
                <div class="d-flex">
                    <input type="number" id="slippage" class="form-control input-border-radius" placeholder="Enter percentage" value="1">
                </div>
                <div class="error" id="slippage-error">Percentage should be in range of 0-100.</div>
            </div>

            <!-- Notes Section -->
            <div class="d-flex flex-column gap-1">
                <label>Notes (Optional)</label>
                <div class="d-flex">
                    <textarea id="notes" class="form-control input-border-radius" placeholder="Enter notes"></textarea>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="d-flex gap-3 align-items-center justify-content-end">
                <button id="cancelBtn" class="btn btn-outline-secondary" onclick="cancelForm()">Cancel</button>
                <button id="submitBtn" class="btn theme-btn" onclick="submitForm()" disabled>Submit</button>
            </div>
        </div>

        <script>
            var fromToken = null;
            var toToken = null;
            let whitelistTokenAPI = "";
            let treasuryDaoID = "";
            let transactions = []
            let tokens = [];     
            let swapAPI = ""; 
    
            function checkSubmitDisable() {
                document.getElementById("submitBtn").disabled = !transactions?.length;
            }    
            
            function updateSwapInfo() {
                transactions = []
                var sendToken = fromToken ? fromToken.id : null;
                var receiveToken = toToken ? toToken.id : null;
                var sendAmount = document.getElementById("send-amount").value;
                var errorElement = document.getElementById("tokens-error");
                var warningElement = document.getElementById("balance-warning"); 
                var receiveAmountElement = document.getElementById("receive-amount");
                var nearSwapInfoElement = document.getElementById("near-swap-info");
                var thirdPartySwap = document.getElementById("third-party-swap-info"); 
                // Reset receive amount
                receiveAmountElement.value = "";

                if (isNearOrWrapNear(receiveToken) && isNearOrWrapNear(sendToken)) {
                    thirdPartySwap.style.display = "none";
                  } else {
                    thirdPartySwap.style.display = "block";
                  }                  
            
                function isNearOrWrapNear(token) {
                    return token === "near" || token === "wrap.near";
                }
            
                // Ensure both tokens are selected before checking conditions
                if (!sendToken || !receiveToken) {
                    nearSwapInfoElement.style.display = "none";
                    return;
                }
            
                // Show message when:
                // - Sending NEAR and receiving anything other than NEAR or wNEAR
                // - Receiving NEAR and sending anything other than NEAR or wNEAR
                if (
                    (sendToken === "near" && !isNearOrWrapNear(receiveToken)) ||
                    (receiveToken === "near" && !isNearOrWrapNear(sendToken))
                ) {
                     nearSwapInfoElement.style.display = "block";
                } else {
                    nearSwapInfoElement.style.display = "none";
                }        
            
                // Handle Errors
                if (sendToken && receiveToken && sendToken === receiveToken) {
                    errorElement.style.display = "block";
                } else {
                    errorElement.style.display = "none";
                }
                 if (sendAmount && fromToken) {
                    var balance = parseFloat(fromToken.parsedBalance || "0");
            
                    if (balance < parseFloat(sendAmount)) {
                            warningElement.style.display = "block";
                    } else {
                        warningElement.style.display = "none";
                    }
                }
                disableCalculateBtn()
                updateIframeHeight()
                checkSubmitDisable()
            }       
            
            function updateIframeHeight() {
                const height = document.documentElement.scrollHeight || document.body.scrollHeight;
                // Send the new height to the parent window
                window.parent.postMessage({ handler: 'updateIframeHeight', height: height }, '*');
              }    
  
              function showError(type, message) {
                  var dropdown = document.getElementById(type + "ScrollBox");
                  var errorDiv = document.createElement("div");
                  errorDiv.className = "text-danger text-center";
                  errorDiv.innerText = message;
                  dropdown.innerHTML = "";
                  dropdown.appendChild(errorDiv);
              }
              
            
            function disableCalculateBtn() {
                var swapButton = document.getElementById("swapButton");
                var sendAmountInput = document.getElementById("send-amount");
                var amount = parseFloat(sendAmountInput.value);
                var nearSwapInfoElement = document.getElementById("near-swap-info");
                var slippageError = document.getElementById("slippage-error");
                var tokensError = document.getElementById("tokens-error");
            
                if (isNaN(amount) || 
                amount <= 0 || 
                !fromToken || 
                !toToken || 
                [nearSwapInfoElement, slippageError, tokensError].some(el => el.style.display === "block")
            ) {
                    swapButton.disabled = true;
                } else {
                    swapButton.disabled = false;
                }
                
            }
              
            
            document.addEventListener("DOMContentLoaded", function () {
                const slippageInput = document.getElementById("slippage");
                const slippageError = document.getElementById("slippage-error");
            
                slippageInput.addEventListener("input", function () {
                    const slippageValue = parseFloat(slippageInput.value);
            
                    if (isNaN(slippageValue) || slippageValue > 100) {
                        slippageError.style.display = "block"; // Show error
                    } else {
                        slippageError.style.display = "none"; // Hide error
                    }
                });
    
                const sendAmountInput = document.getElementById("send-amount");
                sendAmountInput.addEventListener("input", function () {
                    updateSwapInfo()
                });
               
    
                function toggleDropdown(event, type) {
                    event.stopPropagation(); // Prevents closing when clicking inside
            
                    var selectedTokenBtn = document.getElementById("selected" + capitalize(type) + "Token");
                    var dropdownMenu = document.getElementById(type + "DropdownMenu");
            
                    var isOpen = dropdownMenu.style.display === "block";
                    dropdownMenu.style.display = isOpen ? "none" : "block";
                }
            
                function closeDropdown(event) {
                    ["send", "receive"].forEach(function (type) {
                        var dropdownMenu = document.getElementById(type + "DropdownMenu");
                        var selectedTokenBtn = document.getElementById("selected" + capitalize(type) + "Token");
            
                        if (!dropdownMenu.contains(event.target) && event.target !== selectedTokenBtn) {
                            dropdownMenu.style.display = "none";
                        }
                    });
                }
            
                ["send", "receive"].forEach(function (type) {
                    var selectedTokenBtn = document.getElementById("selected" + capitalize(type) + "Token");
                    var searchInput = document.getElementById(type + "SearchInput");
            
                    selectedTokenBtn.addEventListener("click", function (event) {
                        toggleDropdown(event, type);
                    });
            
                    searchInput.addEventListener("click", function (event) {
                        event.stopPropagation(); // Prevent closing on input focus
                    });
                });
            
                document.addEventListener("click", closeDropdown);
            });
            
            
    
            async function fetchTokens() {
              try {
                  // Show loader while fetching tokens
                  showLoader("send");
                  showLoader("receive");
          
                  var response = await fetch(whitelistTokenAPI);
                  var data = await response.json();
                  tokens = data;
          
                  populateDropdown(tokens, "send");
                  populateDropdown(tokens, "receive");
              } catch (error) {
                  console.error("Error fetching tokens:", error);
                  showError("send", "Failed to load tokens.");
                  showError("receive", "Failed to load tokens.");
              } finally {
                  hideLoader("send");
                  hideLoader("receive");
              }
          }
          
          function populateDropdown(tokenList, type) {
              var dropdown = document.getElementById(type + "ScrollBox");
              dropdown.innerHTML = "";
          
              if (!tokenList.length) {
                  showError(type, "No tokens available.");
                  return;
              }
          
              tokenList.forEach(function (token) {
                  var item = document.createElement("div");
                  item.className = "d-flex dropdown-item justify-content-between gap-1 px-1 py-2 cursor-pointer";
          
                  var tokenInfo = document.createElement("div");
                  tokenInfo.className = "d-flex gap-2 align-items-center";
          
                  var img = document.createElement("img");
                  img.src = token.icon;
                  img.width = 30;
                  img.height = 30;
          
                  var nameContainer = document.createElement("div");
                  var symbolText = document.createElement("h6");
                  symbolText.className = "mb-0";
                  symbolText.innerText = token.symbol;
          
                  var priceText = document.createElement("div");
                  priceText.className = "text-muted text-sm";
                  priceText.innerText = "$" + token.price;
          
                  nameContainer.appendChild(symbolText);
                  nameContainer.appendChild(priceText);
                  tokenInfo.appendChild(img);
                  tokenInfo.appendChild(nameContainer);
          
                  var balanceText = document.createElement("div");
                  balanceText.className = "text-muted";
                  balanceText.innerText = Number(token.parsedBalance ?? 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });
          
                  item.appendChild(tokenInfo);
                  item.appendChild(balanceText);
          
                  item.onclick = function () {
                      updateSelectedToken(type, token);
                      window[type + "SelectedToken"] = token;
                      document.getElementById(type + "DropdownMenu").style.display = "none";
                  };
          
                  dropdown.appendChild(item);
              });
          }
          
          // Function to show loader
          function showLoader(type) {
              var dropdown = document.getElementById(type + "ScrollBox");
              dropdown.innerHTML = '<div class="d-flex justify-content-center py-2"><span class="spinner-border spinner-border-sm"></span></div>';
            }
          
          // Function to hide loader
          function hideLoader(type) {
              var dropdown = document.getElementById(type + "ScrollBox");
              if (dropdown) {
                  var loader = dropdown.querySelector(".loader");
                  if (loader) {
                      dropdown.removeChild(loader);
                  }
              }
          }
            
            function updateSelectedToken(type, token) {
                cleanErrors();
                var tokenIcon = document.getElementById(type + "TokenIcon");
                var tokenSymbol = document.getElementById(type + "TokenSymbol");
                const currentBalance =  document.getElementById(type + "-current-balance");
                tokenIcon.src = token.icon;
                tokenIcon.style.display = "inline"; // Show the icon
                tokenSymbol.innerText = token.symbol;
                currentBalance.style.display = "block";
                currentBalance.innerText = "Current Balance: " +  Number(token.parsedBalance ?? 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) + " " + token.symbol;
                // Set the selected token variable
                if (type === "receive") {
                    toToken = token;
                } else if (type === "send") {
                    fromToken = token;
                }
                updateSwapInfo()
            } 
            
            function handleSearch(event, type) {
                var query = event.target.value.toLowerCase();
                var filteredTokens = tokens.filter(token =>
                    token.symbol.toLowerCase().includes(query) ||
                    token.name.toLowerCase().includes(query)
                );
                populateDropdown(filteredTokens, type);
            }
            
            function capitalize(string) {
                return string.charAt(0).toUpperCase() + string.slice(1);
            }
    
            function cleanErrors(){
                var swapError = document.getElementById("swap-error");
                const warningMessage = document.getElementById("warning-message");
                warningMessage.style.display = "none"; 
                swapError.style.display = "none";
            }

            function calculateAndDisplayRateDifference(
                amountIn,
                tokenOutAmount,
                tokenInPrice,
                tokenOutPrice,
              ) {
                var exchangeRateInfo = document.getElementById("exchange-rate-info");
                var percentageElement = document.getElementById("exchange-rate-percentage");
              
                if (!tokenInPrice || !tokenOutPrice) {
                  console.error("Price data missing for one or both tokens.");
                  exchangeRateInfo.style.display = "none";
                  return;
                }
              
                // Calculate the expected tokenOut amount
                var expectedTokenOutAmount = (amountIn * tokenInPrice) / tokenOutPrice;
              
                // Calculate percentage difference
                var percentageDifference =
                    (expectedTokenOutAmount / tokenOutAmount - 1) * 100;

              
                // Update UI
                percentageElement.textContent = percentageDifference.toFixed(2) + "%";
                exchangeRateInfo.style.display = percentageDifference >= 1 ? "block" : "none";
              }                         
    
            function swapTokens() {
                var amount = document.getElementById("send-amount").value;
                var slippage = document.getElementById("slippage").value;
                var swapError = document.getElementById("swap-error");
                var swapButton = document.getElementById("swapButton");
                var swapButtonText = document.getElementById("swapButtonText");
                var swapSpinner = document.getElementById("swapSpinner");
            
                swapError.style.display = "none";
            
                if (!fromToken || !toToken) {
                    swapError.innerText = "Please select both send and receive tokens.";
                    swapError.style.display = "block";
                    return;
                }
            
                var url = swapAPI + "?accountId=" + treasuryDaoID +
                    "&amountIn=" + amount +
                    "&tokenIn=" + fromToken.id +
                    "&tokenOut=" + toToken.id +
                    "&slippage=" + parseInt(slippage ? slippage: 1) / 100;
            
                // Disable button, show spinner
                swapButton.disabled = true;
                swapButtonText.style.display = "none";
                swapSpinner.style.display = "inline-block";
            
                fetch(url)
                    .then(response => response.json())
                    .then(async (data) => {
                        if (data.error) {
                            throw new Error(data.error);
                        }

                        document.getElementById("receive-amount").value = data.outEstimate;

                        // Fetch token prices in parallel
                        const headers = {
                            "Authorization": "Bearer ${nearblocksKey}"
                        };
                        
                        const [tokenInData, tokenOutData] = await Promise.all([
                            fetch('https://api.nearblocks.io/v1/fts/' + fromToken.id, { headers })
                                .then(res => res.json())
                                .catch(() => ({ price: 0 })),
                        
                            fetch('https://api.nearblocks.io/v1/fts/' + toToken.id, { headers })
                                .then(res => res.json())
                                .catch(() => ({ price: 0 }))
                        ]);
                        

                       
                        const tokenInPrice = parseFloat(tokenInData?.contracts?.[0]?.price) || 0;
                        const tokenOutPrice = parseFloat(tokenOutData?.contracts?.[0]?.price) || 0;
                        // Calculate and display rate difference
                        calculateAndDisplayRateDifference(amount, data.outEstimate, tokenInPrice, tokenOutPrice);

                        transactions = data.transactions;
                        if (transactions.length > 1) {
                            document.getElementById("warning-message").style.display = "flex";
                        }

                        checkSubmitDisable();
                        updateIframeHeight();
                    })
                    .catch(error => {
                        console.error("Swap API error:", error);
                        swapError.innerText = error;
                        swapError.style.display = "block";
                    })
                    .finally(() => {
                        // Enable button, hide spinner, restore text
                        swapButton.disabled = false;
                        swapSpinner.style.display = "none";
                        swapButtonText.style.display = "inline";
                    });
            }
            
            function submitForm() {
                const notesInput = document.getElementById("notes");
                const slippageInput = document.getElementById("slippage");
                const sendInput = document.getElementById("send-amount");
                const receiveInput = document.getElementById("receive-amount");
                var percentageElement = document.getElementById("exchange-rate-percentage");
                var percentageValue = percentageElement.textContent || percentageElement.innerText;
                const rateDifference =  parseFloat(percentageValue.replace('%', ''));

                window.parent.postMessage(
                    { 
                        handler: "onSubmit", 
                        args: {transactions, notes: notesInput.value,amountIn: sendInput.value, tokenIn: fromToken.id, tokenOut:toToken.id, slippage:slippageInput.value, amountOut:receiveInput.value, rateDifference }, 
                    }, 
                        "*"
                    );
              }
            
                function cancelForm() {
                    window.parent.postMessage({ handler: "onCancel" }, "*");
                }
            
            window.addEventListener("message", function (event) {
                whitelistTokenAPI = event.data.whitelistTokenAPI;
                treasuryDaoID = event.data.treasuryDaoID;
                swapAPI = event.data.swapAPI
                fetchTokens();
            });
        </script>
    
    </body>
    </html>
    `;

State.init({
  height: "600px",
});

return (
  <iframe
    srcDoc={code}
    style={{ height: state.height, width: "100%" }}
    message={{
      whitelistTokenAPI,
      treasuryDaoID,
      swapAPI,
    }}
    onMessage={(e) => {
      switch (e.handler) {
        case "onCancel": {
          onCancel();
          break;
        }
        case "onSubmit": {
          onSubmit(e.args);
          break;
        }
        case "updateIframeHeight": {
          State.update({ height: e.height });
          break;
        }
      }
    }}
  />
);
