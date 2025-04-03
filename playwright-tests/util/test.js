import { test as base } from "@playwright/test";

export const test = base.extend({
  instanceAccount: ["treasury-devdao.near", { option: true }],
  daoAccount: ["devdao.sputnik-dao.near", { option: true }],
  lockupContract: [null, { option: true }],
  factoryAccount: ["treasury-factory.near", { option: true }],
});

/**
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {async function}
 */

export async function overlayMessage(page, message) {
  await page.evaluate((message) => {
    const overlay = document.createElement("div");
    overlay.textContent = message;
    overlay.style.position = "fixed";
    overlay.style.top = "50%";
    overlay.style.left = "50%";
    overlay.style.transform = "translate(-50%, -50%)";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    overlay.style.color = "white";
    overlay.style.padding = "20px";
    overlay.style.fontSize = "20px";
    overlay.style.borderRadius = "10px";
    overlay.style.zIndex = "10000";
    overlay.style.animation = "blink 1s infinite";

    const style = document.createElement("style");
    style.textContent = `
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `;
    document.head.appendChild(style);
    document.body.appendChild(overlay);

    return () => {
      overlay.remove();
      style.remove();
    };
  }, message);

  const removeOverlay = async () =>
    (await page.evaluateHandle(() => window.removeOverlay)).dispose();
  return removeOverlay;
}
