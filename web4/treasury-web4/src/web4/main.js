import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupModal } from "@near-wallet-selector/modal-ui-js";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupSender } from "@near-wallet-selector/sender";
import { setupIntearWallet } from "@near-wallet-selector/intear-wallet";
import { setupNearMobileWallet } from "@near-wallet-selector/near-mobile-wallet"
import { setupHotWallet } from "@near-wallet-selector/hot-wallet";
import { Buffer } from "buffer";

window.Buffer = Buffer;

console.log("main.js loaded");
let setupLedger;
const walletSelectorModules = [
  setupMyNearWallet(),
  setupMeteorWallet(),
  setupSender(),
  setupIntearWallet(),
  setupNearMobileWallet(),
  setupHotWallet(),
];
try {
  setupLedger = (await import("@near-wallet-selector/ledger")).setupLedger;
  walletSelectorModules.push(setupLedger());
} catch (e) {
  console.warn("not able to setup ledger", e);
}

const selector = await setupWalletSelector({
  network: "mainnet",
  modules: walletSelectorModules,
});

const modal = setupModal(selector, {
  contractId: "social.near",
});

document
  .getElementById("login-walletselector-btn")
  .addEventListener("click", () => {
    return modal.show();
  });
const currentDomain = window.location.host ?? "";
const extractedDomain = currentDomain.split(".page")?.[0] ?? "";

document.getElementById("web4-link").href =
  `https://${extractedDomain}.page/`;
document.getElementById("dev-org-link").href =
  `https://dev.near.org/${extractedDomain}/widget/app`;
document.getElementById("social-link").href =
  `https://near.social/${extractedDomain}/widget/app`;

const dropdownToggle = document.getElementById("dropdownToggle");
const dropdownIcon = document.getElementById("dropdownIcon");
const dropdownMenu = document.getElementById("dropdownMenu");

dropdownToggle.addEventListener("click", function (event) {
  event.stopPropagation();
  const isExpanded = dropdownMenu.classList.toggle("show");

  dropdownIcon.classList.toggle("bi-chevron-down", !isExpanded);
  dropdownIcon.classList.toggle("bi-chevron-up", isExpanded);
});

document
  .getElementById("logout-walletselector-btn")
  .addEventListener("click", async () => {
    (await selector.wallet()).signOut().then(() => checkForLogin());
  });

document
  .getElementById("logout-dropdown-btn")
  .addEventListener("click", (event) => {
    event.stopPropagation();
    document.getElementById("logout-dropdown").classList.toggle("show");
  });

window.onclick = function (event) {
  const dropdownBtn = document.getElementById("logout-dropdown-btn");
  const dropdownContent = document.getElementById("logout-dropdown");
  if (
    !dropdownBtn.contains(event.target) &&
    !dropdownContent.contains(event.target)
  ) {
    dropdownContent.classList.remove("show");
  }

  if (
    !dropdownToggle.contains(event.target) &&
    !dropdownMenu.contains(event.target)
  ) {
    dropdownMenu.classList.remove("show");
    dropdownIcon.classList.add("bi-chevron-down");
    dropdownIcon.classList.remove("bi-chevron-up");
  }
};

async function checkForLogin() {
  const isSignedIn = selector.isSignedIn();
  const loginBtn = document.getElementById("login-walletselector-btn");
  const logoutBtn = document.getElementById("logout-btn");

  if (isSignedIn) {
    const accountId = selector.store.getState().accounts[0].accountId;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "block";

    const imageSrc = `https://i.near.social/magic/large/https://near.social/magic/img/account/${accountId}`;
    const response = await fetch("https://api.near.social/get", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
      },
      body: JSON.stringify({ keys: [`${accountId}/profile/*`] }),
    });

    const data = await response.json();
    const name = data?.[accountId]?.profile.name;
    logoutBtn.innerHTML = `
      <button>
        <img src="${imageSrc}" />
        <div class="text-align-left">
        <h6> ${name} </h6>
        <div style="opacity: 0.5; font-size: 12px"> ${accountId} </div>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          class="bi bi-chevron-down"
          viewBox="0 0 16 16"
        >
          <path
            fill-rule="evenodd"
            d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"
          />
        </svg>
      </button>`;
  } else {
    loginBtn.style.display = "block";
    logoutBtn.style.display = "none";
  }
}

checkForLogin();

modal.on("onHide", async (event) => {
  if (event.hideReason === "wallet-navigation") {
    checkForLogin();
  }
});

await import(
  "https://cdn.jsdelivr.net/npm/near-bos-webcomponent@0.0.9/dist/main.1b3f0d7d1017de355a7c.bundle.js"
);
await import(
  "https://cdn.jsdelivr.net/npm/near-bos-webcomponent@0.0.9/dist/runtime.25b143da327a5371509f.bundle.js"
);

const viewer = document.createElement("near-social-viewer");

viewer.selector = selector;
viewer.setAttribute(
  "initialProps",
  JSON.stringify({ page: "", pikespeakKey: "PIKESPEAK_API_KEY" }),
);

if (location.host.endsWith(".page")) {
  const instanceAccount = location.host.split(".")[0];
  viewer.setAttribute("src", `${instanceAccount}.near/widget/app`);
  viewer.setAttribute("rpc", "https://rpc.mainnet.fastnear.com");
} else if (location.port === "8080") {
  viewer.setAttribute("rpc", "http://127.0.0.1:14500");
}

document.body.appendChild(viewer);

const waitForTheme = setInterval(() => {
  const theme = document?.querySelector("[data-bs-theme]");

  if (theme) {
    clearInterval(waitForTheme);

    const isDarkTheme = theme.getAttribute("data-bs-theme") === "dark";
    document.body.setAttribute(
      "data-bs-theme",
      isDarkTheme ? "dark" : "light",
    );
    const logo = document.getElementById("logo");
    const web4Image = document.getElementById("web4-image");

    web4Image.src = isDarkTheme
      ? "https://ipfs.near.social/ipfs/bafkreiarq7ufrypui3ivevbnky46n5u5awgthls22jvr73fsmoyemprrzy"
      : "https://ipfs.near.social/ipfs/bafkreiepnpb5bjy4bopxwmkxog35swcqliupvmjgzlo3k2pfc345qoquz4";

    logo.src = isDarkTheme
      ? "https://ipfs.near.social/ipfs/bafkreighuyf2wcsc3nyey64536craz2ffis45fnjelh4gqxigugasalcwy"
      : "https://ipfs.near.social/ipfs/bafkreibm63lijt7qs3dzlmrrdbhqgxkt55k5daswgrq5z4stqp4zk46kc4";
  }
}, 500);

// Register service worker
if ('serviceWorker' in navigator) {
  window.serviceWorkerRegistrationAttempted = true;
  
  function registerServiceWorker() {
    navigator.serviceWorker.register('/service-worker.js')
      .then(function(registration) {
        console.log('Service Worker registered with scope:', registration.scope);
        
        // Wait for the service worker to be controlling
        if (navigator.serviceWorker.controller) {
          console.log('Service Worker is already controlling');
        } else {
          console.log('Waiting for Service Worker to take control...');
          navigator.serviceWorker.addEventListener('controllerchange', function() {
            console.log('Service Worker is now controlling');
          });
        }
      })
      .catch(function(error) {
        console.log('Service Worker registration failed:', error);
      });
  }
  
  // Check if the document is already loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // Document is already loaded, register immediately
    registerServiceWorker();
  } else {
    // Document is still loading, wait for load event
    window.addEventListener('load', registerServiceWorker);
  }
}