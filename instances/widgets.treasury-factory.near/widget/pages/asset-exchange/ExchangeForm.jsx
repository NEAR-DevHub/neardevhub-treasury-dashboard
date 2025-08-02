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
const priceAPI = `${REPL_BACKEND_API}/ft-token-price?account_id=`;
const primaryColor = metadata?.primaryColor
  ? metadata?.primaryColor
  : themeColor;

const colors = getAllColorsAsObject(isDarkTheme, primaryColor);
const nearblocksKey = "${REPL_NEARBLOCKS_KEY}";

const code = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link
            href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css"
            rel="stylesheet"
            />
            <script src="https://cdn.jsdelivr.net/npm/big-js@3.1.3/big.min.js"></script>
            <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
            />
            <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

            <title>Token Swap</title>
            <style>
            :root {
                --bs-body-bg: ${colors["--bg-page-color"]} !important;
                --bs-border-color: ${colors["--border-color"]} !important;
                --border-color: ${colors["--border-color"]} !important;
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
                display: none;
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
                font-size: 12px;
            }
            .disabled img {
                opacity: 0.8;
            }
            .dropdown-btn {
                border-top-right-radius: 0.375rem;
                border-bottom-right-radius: 0.375rem;
                height: 100%;
                background: ${colors["--bg-page-color"]} !important;
                color: ${colors["--text-color"]} !important;
                border-left: none !important;
            }

            .amount-input {
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

            i{
               color: ${colors["--icon-color"]};
            }

            .text-warning {
                color: ${colors["--other-warning"]} ;
            }

            .text-red {
                color: ${colors["--other-red"]} ;
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
                font-size: 12px;
                margin-left: 0.5rem !important;
            }

            .toggle-header {
                padding-block: 0.6rem;
                padding-inline: 0.6rem;
            }

            #exchange-details-collapse.show {
                border-top: 1px solid var(--border-color);
            }

            .collapse-container {
                border-radius: 0.5rem;
            }

            .collapse-container.collapse-shown {
                border-bottom: none !important;
                border-radius: 0.5rem 0.5rem 0 0; /* Only top rounded corners */
            }

            .collapse-item {
                display: flex;
                justify-content: space-between;
                width: 100%;
                align-items: center;
                gap: 0.5rem;
                border: 1px solid var(--border-color);
                border-top: none;
                padding-block: 0.6rem;
                padding-inline: 0.6rem;
                background-color: ${colors["--bg-system-color"]};
            }
            .cursor-pointer {
                cursor: pointer;
            }

            .custom-tooltip {
                --bs-tooltip-bg:${colors["--bg-page-color"]}  !important;
                --bs-tooltip-color:${colors["--text-color"]} !important;
                width: 300px !important;
                font-size: 13px;
                z-index: 1055;
              }              
            
              .tooltip-inner {
                border: 1px solid ${colors["--border-color"]};
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                max-width: 300px !important;
                width: 300px !important;
                white-space: normal;
              }
            </style>
        </head>
        <body data-bs-theme=${isDarkTheme ? "dark" : "light"}>
            <div class="d-flex flex-column gap-3">
            <!-- Send Section -->
            <div class="d-flex flex-column gap-2">
                <label>Send</label>
                <div class="d-flex">
                <input
                    type="number"
                    id="send-amount"
                    class="form-control amount-input"
                    placeholder="Amount"
                />
                <div class="token-selector">
                    <button
                    id="selectedSendToken"
                    class="border border-1 dropdown-btn d-flex align-items-center gap-2"
                    >
                    <img
                        id="sendTokenIcon"
                        src=""
                        width="20"
                        height="20"
                        style="display: none"
                    />
                    <span id="sendTokenSymbol">Select</span>
                    <span class="ms-auto"><i class="bi bi-chevron-down h6 mb-0"></i></span>
                    </button>
                    <div
                    id="sendDropdownMenu"
                    class="dropdown-menu dropdown-menu-end dropdown-menu-lg-start px-2"
                    >
                    <input
                        id="sendSearchInput"
                        type="text"
                        class="form-control mb-2"
                        placeholder="Search token"
                        onkeyup="handleSearch(event, 'send')"
                    />
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
                <div
                class="d-flex justify-content-between gap-2 align-items-center text-secondary text-sm"
                >
                <div id="send-current-price" style="display: none"></div>
                <div id="send-current-balance" style="display: none"></div>
                </div>
            </div>

            <!-- Receive Section -->
            <div class="d-flex flex-column gap-2">
                <label>Receive</label>
                <div class="d-flex" style="position: relative">
                <input
                    type="number"
                    disabled="true"
                    id="receive-amount"
                    class="form-control amount-input"
                />

                <!-- Spinner inside the input field -->
                <span
                    id="swapSpinner"
                    class="spinner-border spinner-border-sm"
                    style="position: absolute; left: 2%; top: 30%; display: none"
                >
                </span>

                <div class="token-selector">
                    <button
                    id="selectedReceiveToken"
                    class="border border-1 dropdown-btn d-flex align-items-center gap-2"
                    >
                    <img
                        id="receiveTokenIcon"
                        src=""
                        width="20"
                        height="20"
                        style="display: none"
                    />
                    <span id="receiveTokenSymbol">Select</span>
                    <span class="ms-auto"><i class="bi bi-chevron-down h6 mb-0"></i></span>
                    </button>
                    <div
                    id="receiveDropdownMenu"
                    class="dropdown-menu dropdown-menu-end dropdown-menu-lg-start px-2"
                    >
                    <input
                        id="receiveSearchInput"
                        type="text"
                        class="form-control mb-2"
                        placeholder="Search token"
                        onkeyup="handleSearch(event, 'receive')"
                    />
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
                <div
                class="d-flex justify-content-between gap-2 align-items-center text-secondary text-sm"
                >
                <div id="receive-current-price" style="display: none"></div>
                <div id="receive-current-balance" style="display: none"></div>
                </div>
                <div class="error" id="tokens-error" style="display: none">
                Please select different tokens for the swap.
                </div>
                <div class="error" id="swap-error">Swap failed. Please try again.</div>
            </div>

            <!-- Details section -->
            <div id="exchange-details" style="display: none">
                <div
                class="d-flex flex-column gap-2 border border-1 collapse-container"
               
                >
                <div
                    class="d-flex align-items-center gap-3 justify-content-between toggle-header"
                >
                    <div class="d-flex align-items-center gap-2">
                    <div id="tokens-exchange-rate" class="cursor-pointer">
                        <div id="send-exchange-rate" style="display: none"></div>
                        <div id="receive-exchange-rate"></div>
                    </div>
                    <i
                        class="bi bi-info-circle text-secondary"
                        data-bs-toggle="tooltip"
                        data-bs-custom-class="custom-tooltip"
                        data-bs-placement="top"
                        title="This exchange rate is based on the swap provider Ref Finance."
                    >
                    </i>
                    </div>
                    <div class="d-flex gap-2 align-items-center cursor-pointer"  
                    data-bs-toggle="collapse"
                    data-bs-target="#exchange-details-collapse"
                    aria-expanded="false"
                    aria-controls="exchange-details-collapse">
                    <i
                        class="bi bi-exclamation-triangle h5 mb-0 text-red"
                        id="exchange-rate-warning"
                        style="display: none"
                    ></i>
                    Details
                    <i id="details-toggle-icon" class="bi bi-chevron-down h6 mb-0"></i>
                    </div>
                </div>
                </div>

                <div class="collapse" id="exchange-details-collapse">
                <div class="collapse-item">
                    <div class="d-flex gap-2 align-items-center">
                    Price Deference
                    <i
                        class="bi bi-info-circle text-secondary"
                        data-bs-toggle="tooltip"
                        data-bs-custom-class="custom-tooltip"
                        data-bs-placement="top"
                        title="The difference between the market price and the price you get."
                    >
                    </i>
                    </div>
                    <div id="exchange-rate-percentage"></div>
                </div>
                <div class="collapse-item rounded-bottom-3" id="pool-fee-item">
                    <div class="d-flex gap-2 align-items-center">
                    Pool fee
                    <i
                        class="bi bi-info-circle text-secondary"
                        data-bs-toggle="tooltip"
                        data-bs-custom-class="custom-tooltip"
                        data-bs-placement="top"
                        title="This fee is collected by Ref Finance and shared with liquidity providers as a reward for providing liquidity to the pool."
                    >
                    </i>
                    </div>
                    <div id="pool-fee"></div>
                </div>
                <div
                    class="collapse-item rounded-bottom-3"
                    id="additional-storage-message"
                    style="display: none"
                >
                    <div class="d-flex gap-2 align-items-center">
                    Additional Storage Purchase
                    <i
                        class="bi bi-info-circle text-secondary"
                        data-bs-toggle="tooltip"
                        data-bs-custom-class="custom-tooltip"
                        data-bs-placement="top"
                        title="To collect this token, purchase storage space. After submission, 0.1 NEAR will be charged from your account as an additional transaction."
                    >
                    </i>
                    </div>

                    <div class="text-warning">0.1 NEAR</div>
                </div>
                </div>
            </div>

            <!-- Balance Warning -->
            <div id="balance-warning" style="display: none">
                <div
                class="d-flex gap-3 align-items-center warning-box px-3 py-2 rounded-3"
                >
                <i class="bi bi-exclamation-triangle h5 mb-0"></i>
                The treasury balance doesn't have enough tokens to swap. You can
                create the request, but it won’t be approved until the balance is
                topped up.
                </div>
            </div>

            <!-- NEAR Swap Info -->
            <div id="near-swap-info" style="display: none">
                <div
                class="d-flex gap-3 align-items-center warning-box px-3 py-2 rounded-3"
                >
                <i class="bi bi-exclamation-triangle h5 mb-0"></i>
                <div>
                    To exchange NEAR for another token, first swap it for wNEAR. You can
                    then exchange wNEAR for your desired token.
                </div>
                </div>
            </div>

            <!-- Slippage Section -->
            <div class="d-flex flex-column gap-2">
                <label>
                Price Slippage Limit (%)
                <i
                    class="bi bi-info-circle text-secondary"
                    data-bs-custom-class="custom-tooltip"
                    data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    title="Exchange rates may fluctuate during the approval process for your asset exchange request. Setting a price slippage limit helps protect against unexpected changes. If the actual exchange rate exceeds your specified limit at the time of voting, the request will fail."
                >
                </i>
                </label>
                <div class="d-flex">
                <input
                    type="number"
                    id="slippage"
                    class="form-control input-border-radius"
                    placeholder="Enter percentage"
                    value="0.1"
                />
                </div>
                <div
                id="min-amount-received"
                class="text-secondary text-sm"
                style="display: none"
                ></div>
                <div class="error" id="slippage-error">
                Percentage should be in range of 0-100.
                </div>
            </div>

            <!-- Notes Section -->
            <div class="d-flex flex-column gap-2">
                <label>Notes (Optional)</label>
                <div class="d-flex">
                <textarea
                    id="notes"
                    class="form-control input-border-radius"
                    placeholder="Enter notes"
                ></textarea>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="d-flex gap-3 align-items-center justify-content-end">
                <button
                id="cancelBtn"
                class="btn btn-outline-secondary"
                onclick="cancelForm()"
                >
                Cancel
                </button>
                <button
                id="submitBtn"
                class="btn theme-btn"
                onclick="submitForm()"
                disabled
                >
                Submit
                </button>
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
            let priceAPI = "";
            let tokenExchangePrices = [];
            let priceDifference = null;

            function checkSubmitDisable() {
                document.getElementById("submitBtn").disabled = !transactions?.length;
            }

            function updateSwapInfo() {
                transactions = [];
                var sendToken = fromToken ? fromToken.id : null;
                var receiveToken = toToken ? toToken.id : null;
                var sendAmount = document.getElementById("send-amount").value;
                var errorElement = document.getElementById("tokens-error");
                var warningElement = document.getElementById("balance-warning");
                var receiveAmountElement = document.getElementById("receive-amount");
                var nearSwapInfoElement = document.getElementById("near-swap-info");
                // Reset receive amount
                receiveAmountElement.value = "";

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
                if (
                    sendToken &&
                    receiveToken &&
                    sendToken !== receiveToken
                ) {
                    showExchangeDetailsSection();
                    if(sendAmount){
                        swapTokens();
                    }
                }
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
                updateIframeHeight();
                checkSubmitDisable();
            }

            function updateIframeHeight() {
                const height =
                document.documentElement.scrollHeight || document.body.scrollHeight;
                // Send the new height to the parent window
                window.parent.postMessage(
                { handler: "updateIframeHeight", height: height },
                "*",
                );
            }

            function showError(type, message) {
                var dropdown = document.getElementById(type + "ScrollBox");
                var errorDiv = document.createElement("div");
                errorDiv.className = "text-danger text-center";
                errorDiv.innerText = message;
                dropdown.innerHTML = "";
                dropdown.appendChild(errorDiv);
            }

            document.addEventListener("DOMContentLoaded", function () {
                const slippageInput = document.getElementById("slippage");
                const slippageError = document.getElementById("slippage-error");

                var tooltipTriggerList = [].slice.call(
                    document.querySelectorAll('[data-bs-toggle="tooltip"]')
                  );
                  
                  tooltipTriggerList.map(function (tooltipTriggerEl) {
                    return new bootstrap.Tooltip(tooltipTriggerEl, {
                      html: true,
                      delay: { show: 300, hide: 500 },
                      customClass: 'custom-tooltip',
                      trigger: 'hover focus'
                    });  
                });                  
                  

                // Select the exchange rate elements and the toggle button
                const sendExchangeRate = document.getElementById("send-exchange-rate");
                const receiveExchangeRate = document.getElementById(
                "receive-exchange-rate",
                );
                const toggleButton = document.getElementById("tokens-exchange-rate");

                toggleButton.addEventListener("click", function (event) {
                event.stopPropagation();
                if (sendExchangeRate.style.display === "none") {
                    sendExchangeRate.style.display = "block";
                    receiveExchangeRate.style.display = "none";
                } else {
                    sendExchangeRate.style.display = "none";
                    receiveExchangeRate.style.display = "block";
                }
                });

                // Select the collapse container and collapse element
                const collapseContainer = document.querySelector(".collapse-container");
                const collapseElement = document.querySelector(
                "#exchange-details-collapse",
                );
                const toggleIcon = document.getElementById("details-toggle-icon");

                // Add event listeners to detect when collapse is shown or hidden
                collapseElement.addEventListener("shown.bs.collapse", () => {
                // When the collapse is fully shown, hide the border
                collapseContainer.classList.add("collapse-shown");
                toggleIcon.classList.remove("bi-chevron-down");
                toggleIcon.classList.add("bi-chevron-up");
                updateIframeHeight();
                });

                collapseElement.addEventListener("hidden.bs.collapse", () => {
                // When the collapse is fully hidden, show the border again
                collapseContainer.classList.remove("collapse-shown");
                toggleIcon.classList.remove("bi-chevron-up");
                toggleIcon.classList.add("bi-chevron-down");
                updateIframeHeight();
                });

                let slippageDebounceTimer;
                slippageInput.addEventListener("input", function () {
                const slippageValue = parseFloat(slippageInput.value);

                if (isNaN(slippageValue) || slippageValue > 100) {
                    slippageError.style.display = "block"; // Show error
                } else {
                    slippageError.style.display = "none"; // Hide error

                    clearTimeout(slippageDebounceTimer);
                    slippageDebounceTimer = setTimeout(function () {
                    updateSwapInfo();
                    }, 1000);
                }
                });

                const sendAmountInput = document.getElementById("send-amount");

                let sendAmountDebounceTimer;
                sendAmountInput.addEventListener("input", function () {
                clearTimeout(sendAmountDebounceTimer);
                sendAmountDebounceTimer = setTimeout(function () {
                    updateSwapInfo();
                }, 1000);
                });

                function toggleDropdown(event, type) {
                    event.stopPropagation(); // Prevents closing when clicking inside
                
                    var selectedTokenBtn = document.getElementById("selected" + capitalize(type) + "Token");
                    var dropdownMenu = document.getElementById(type + "DropdownMenu");
                    var chevronIcon = selectedTokenBtn.querySelector("i"); // Get the icon inside the button
                
                    var isOpen = dropdownMenu.style.display === "block";
                    dropdownMenu.style.display = isOpen ? "none" : "block";
                
                    // Toggle the chevron direction
                    chevronIcon.classList.toggle("bi-chevron-down", isOpen);
                    chevronIcon.classList.toggle("bi-chevron-up", !isOpen);
                }
                
                function closeDropdown(event) {
                    ["send", "receive"].forEach(function (type) {
                        var dropdownMenu = document.getElementById(type + "DropdownMenu");
                        var selectedTokenBtn = document.getElementById("selected" + capitalize(type) + "Token");
                        var chevronIcon = selectedTokenBtn.querySelector("i");
                
                        if (!dropdownMenu.contains(event.target) && event.target !== selectedTokenBtn) {
                            dropdownMenu.style.display = "none";
                
                            // Ensure icon resets to down when closing
                            chevronIcon.classList.add("bi-chevron-down");
                            chevronIcon.classList.remove("bi-chevron-up");
                        }
                    });
                }
                
                ["send", "receive"].forEach(function (type) {
                var selectedTokenBtn = document.getElementById(
                    "selected" + capitalize(type) + "Token",
                );
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
                item.className =
                    "d-flex dropdown-item justify-content-between gap-1 px-1 py-2 cursor-pointer";

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
                priceText.innerText = "$" +  Number(token.price ?? 0).toLocaleString("en-US");

                nameContainer.appendChild(symbolText);
                nameContainer.appendChild(priceText);
                tokenInfo.appendChild(img);
                tokenInfo.appendChild(nameContainer);

                var balanceText = document.createElement("div");
                balanceText.className = "text-muted";
                balanceText.innerText = Number(
                    token.parsedBalance ?? 0,
                ).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });

                item.appendChild(tokenInfo);
                item.appendChild(balanceText);

                item.onclick = function () {
                    updateSelectedToken(type, token);
                    window[type + "SelectedToken"] = token;
                
                    var dropdownMenu = document.getElementById(type + "DropdownMenu");
                    var selectedTokenBtn = document.getElementById("selected" + capitalize(type) + "Token");
                    var chevronIcon = selectedTokenBtn.querySelector("i"); // Get the chevron icon inside the button
                
                    // Close the dropdown
                    dropdownMenu.style.display = "none";
                
                    // Reset the chevron icon to point down
                    chevronIcon.classList.add("bi-chevron-down");
                    chevronIcon.classList.remove("bi-chevron-up");
                };
                

                dropdown.appendChild(item);
                });
            }

            // Function to show loader
            function showLoader(type) {
                var dropdown = document.getElementById(type + "ScrollBox");
                dropdown.innerHTML =
                '<div class="d-flex justify-content-center py-2"><span class="spinner-border spinner-border-sm"></span></div>';
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
                var exchangeDetailsSection =
                document.getElementById("exchange-details");
                var tokenIcon = document.getElementById(type + "TokenIcon");
                var tokenSymbol = document.getElementById(type + "TokenSymbol");
                const currentBalance = document.getElementById(
                type + "-current-balance",
                );
                tokenIcon.src = token.icon;
                tokenIcon.style.display = "inline"; // Show the icon
                tokenSymbol.innerText = token.symbol;
                currentBalance.style.display = "block";
                currentBalance.innerText =
                "Current Balance: " +
                Number(token.parsedBalance ?? 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }) +
                " " +
                token.symbol;
                const currentPrice = document.getElementById(type + "-current-price");
                currentPrice.style.display = "block";
                currentPrice.innerText =
                "$" +
                Number(token.price ?? 0).toLocaleString("en-US");

                exchangeDetailsSection.style.display = "none";
                // Set the selected token variable
                if (type === "receive") {
                toToken = token;
                } else if (type === "send") {
                fromToken = token;
                }
                updateSwapInfo();
            }

            function handleSearch(event, type) {
                var query = event.target.value.toLowerCase();
                var filteredTokens = tokens.filter(
                (token) =>
                    token.symbol.toLowerCase().includes(query) ||
                    token.name.toLowerCase().includes(query),
                );
                populateDropdown(filteredTokens, type);
            }

            function capitalize(string) {
                return string.charAt(0).toUpperCase() + string.slice(1);
            }

            function cleanErrors() {
                priceDifference = null;
                var swapError = document.getElementById("swap-error");
                const poolFeeItem = document.getElementById("pool-fee-item");
                const additionalStorageMessage = document.getElementById(
                "additional-storage-message",
                );
                poolFeeItem.classList.add("rounded-bottom-3");

                additionalStorageMessage.style.display = "none";
                swapError.style.display = "none";
            }

            async function fetchTokensPrices() {
                try {
                var response = await fetch(
                    "https://indexer.ref.finance/list-token-price",
                );
                var data = await response.json();
                tokenExchangePrices = data;
                } catch (error) {
                console.error("Error fetching tokens prices:", error);
                }
            }

            function calculateAndDisplayPoolFee(
                amountIn,
                tokenOutAmount,
                tokenInContract,
                tokenOutContract
              ) {
                var poolFeeElement = document.getElementById("pool-fee");
              
                // Get token prices
                var tokenInPrice =
                  tokenExchangePrices?.[
                    tokenInContract === "near" ? "wrap.near" : tokenInContract
                  ]?.price;
              
                var tokenOutPrice =
                  tokenExchangePrices?.[
                    tokenOutContract === "near" ? "wrap.near" : tokenOutContract
                  ]?.price;
              
                if (!tokenInPrice || !tokenOutPrice) {
                  console.error("Price data missing for one or both tokens.");
                  return;
                }
              
                // Calculate expected tokenOut amount
                var expectedTokenOutAmount = (amountIn * tokenInPrice) / tokenOutPrice;
              
                // Calculate percentage difference (pool fee impact)
                var percentageDifference =
                  (Math.abs(tokenOutAmount - expectedTokenOutAmount) / expectedTokenOutAmount) *
                  100;
              
                // **Convert amount difference back to input token **
                const amountDifference =
                  Math.abs(expectedTokenOutAmount - tokenOutAmount) * tokenOutPrice / tokenInPrice;
              
                const formattedAmountDifference = amountDifference.toLocaleString("en-US", {
                  maximumFractionDigits: 4,
                });
              
                poolFeeElement.innerHTML =
                  percentageDifference.toFixed(4) + "%" + " / " + formattedAmountDifference + " " + fromToken.symbol;
              }
    
            function showExchangeDetailsSection() {
                var exchangeDetailsSection =
                document.getElementById("exchange-details");
                var exchangeDetailsRate = document.getElementById(
                "tokens-exchange-rate",
                );
                exchangeDetailsSection.style.display = "block";
                var sendExchangeRate = document.getElementById("send-exchange-rate");
                var receiveExchangeRate = document.getElementById(
                "receive-exchange-rate",
                );
                const tokenOutRate =
                fromToken.price > 0 ? toToken.price / fromToken.price : 0;
                const tokenInRate =
                toToken.price > 0 ? fromToken.price / toToken.price : 0;

                sendExchangeRate.innerHTML =
                "1 " +
                fromToken.symbol +
                " ($" +
                fromToken.price +
                ") " +
                "≈ " +
                Number(tokenOutRate).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                }) +
                " " +
                toToken.symbol;

                receiveExchangeRate.innerHTML =
                "1 " +
                toToken.symbol +
                " ($" +
                toToken.price +
                ") " +
                "≈ " +
                Number(tokenInRate).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                }) +
                " " +
                fromToken.symbol;
            }

            function calculateAndDisplayRateDifference(
                amountIn,
                tokenOutAmount,
                tokenInPrice,
                tokenOutPrice,
              ) {
                var percentageElement = document.getElementById("exchange-rate-percentage");
                var rateWarningElement = document.getElementById("exchange-rate-warning");
              
                if (!tokenInPrice || !tokenOutPrice) {
                  console.error("Price data missing for one or both tokens.");
                  return;
                }
              
                // Calculate expected tokenOut amount based on price conversion
                var expectedTokenOutAmount = (amountIn * tokenInPrice) / tokenOutPrice;
              
                // Calculate percentage difference
                var percentageDifference =
                  ((tokenOutAmount - expectedTokenOutAmount) / expectedTokenOutAmount) * 100;
              
                // Calculate absolute amount difference
                const amountDifference = Math.abs(expectedTokenOutAmount - tokenOutAmount).toLocaleString("en-US", {
                  maximumFractionDigits: 4,
                });
              
                // Show warning if the rate difference is significant (e.g., more than 1% lower)
                if (percentageDifference <= -1) {
                  rateWarningElement.style.display = "block";
                } else {
                  rateWarningElement.style.display = "none";
                }
                            
                if (percentageDifference < 0) {
                  percentageElement.classList.add("text-red");
                  percentageElement.classList.remove("text-green");
                } else {
                  percentageElement.classList.add("text-green");
                  percentageElement.classList.remove("text-red");
                }
              
                priceDifference = percentageDifference.toFixed(4);
                percentageElement.innerHTML =
                  percentageDifference.toFixed(4) +
                  "%" +
                  " / " +
                  amountDifference +
                  " " +
                  toToken.symbol;
              }
              
            function swapTokens() {
                var amount = document.getElementById("send-amount").value;
                var slippage = document.getElementById("slippage").value;
                var swapError = document.getElementById("swap-error");
                var swapSpinner = document.getElementById("swapSpinner");

                swapError.style.display = "none";

                if (!fromToken || !toToken) {
                swapError.innerText = "Please select both send and receive tokens.";
                swapError.style.display = "block";
                return;
                }

                var url =
                swapAPI +
                "?accountId=" +
                treasuryDaoID +
                "&amountIn=" +
                amount +
                "&tokenIn=" +
                fromToken.id +
                "&tokenOut=" +
                toToken.id +
                "&slippage=" +
                parseFloat(slippage ? slippage : 1) / 100;

                // Disable button, show spinner
                swapSpinner.style.display = "inline-block";

                fetch(url)
                .then((response) => response.json())
                .then(async (data) => {
                    if (data.error) {
                    throw new Error(data.error);
                    }

                    document.getElementById("receive-amount").value = data.outEstimate;
                    swapSpinner.style.display = "none";
                    // Fetch token prices in parallel

                    const [tokenInData, tokenOutData] = await Promise.all([
                    fetch(priceAPI + fromToken.id)
                        .then((res) => res.json())
                        .catch(() => ({ price: 0 })),

                    fetch(priceAPI + toToken.id)
                        .then((res) => res.json())
                        .catch(() => ({ price: 0 })),
                    ]);

                    var minAmountReceive = document.getElementById(
                    "min-amount-received",
                    );
                    const outEstimate = parseFloat(data.outEstimate) || 0;
                    const slippageValue = parseFloat(slippage) || 0; // Default to 0 if slippage is not valid
                    const adjustedAmount = Number(
                    outEstimate * (1 - slippageValue / 100),
                    ).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                    });

                    minAmountReceive.style.display = "block";
                    minAmountReceive.innerHTML =
                    "Minimum received:" + adjustedAmount + " " + fromToken.symbol;

                    const tokenInPrice = parseFloat(tokenInData?.price) || 0;
                    const tokenOutPrice = parseFloat(tokenOutData?.price) || 0;

                    // Calculate and display rate difference
                    calculateAndDisplayRateDifference(
                    amount,
                    data.outEstimate,
                    tokenInPrice,
                    tokenOutPrice,
                    );

                    calculateAndDisplayPoolFee(
                    amount,
                    data.outEstimate,
                    fromToken.id,
                    toToken.id,
                    );

                    transactions = data.transactions;
                    if (transactions.length > 1) {
                    const poolFeeItem = document.getElementById("pool-fee-item");

                    document.getElementById(
                        "additional-storage-message",
                    ).style.display = "flex";
                    poolFeeItem.classList.remove("rounded-bottom-3");
                    }

                    checkSubmitDisable();
                    updateIframeHeight();
                })
                .catch((error) => {
                    console.error("Swap API error:", error);
                    swapError.innerText = error;
                    swapError.style.display = "block";
                    swapSpinner.style.display = "none";
                });
            }

            function submitForm() {
                const notesInput = document.getElementById("notes");
                const slippageInput = document.getElementById("slippage");
                const sendInput = document.getElementById("send-amount");
                const receiveInput = document.getElementById("receive-amount");
               

                window.parent.postMessage(
                {
                    handler: "onSubmit",
                    args: {
                    transactions,
                    notes: notesInput.value,
                    amountIn: sendInput.value,
                    tokenIn: fromToken.id,
                    tokenOut: toToken.id,
                    slippage: slippageInput.value,
                    amountOut: receiveInput.value,
                    rateDifference:priceDifference,
                    },
                },
                "*",
                );
            }

            function cancelForm() {
                window.parent.postMessage({ handler: "onCancel" }, "*");
            }


            window.addEventListener("message", function (event) {
                whitelistTokenAPI = event.data.whitelistTokenAPI;
                treasuryDaoID = event.data.treasuryDaoID;
                
                // Set treasury wallet if provided
                if (event.data.treasuryWallet) {
                    document.getElementById("treasury-wallet").value = event.data.treasuryWallet;
                }
                swapAPI = event.data.swapAPI;
                priceAPI = event.data.priceAPI;
                fetchTokens();
                fetchTokensPrices();
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
      priceAPI,
      treasuryWallet: props.treasuryWallet || "sputnik-dao",
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
