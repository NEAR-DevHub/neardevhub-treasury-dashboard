import os from "os";

function parseKeyToReadableFormat(key) {
  return key
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/([a-z])([A-Z])/g, "$1 $2") // Add spaces between camelCase or PascalCase words
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize each word
}

export const encodeToMarkdown = (data) => {
  return Object.entries(data)
    .filter(([key, value]) => {
      return (
        key && // Key exists and is not null/undefined
        value !== null &&
        value !== undefined &&
        value !== ""
      );
    })
    .map(([key, value]) => {
      return `* ${parseKeyToReadableFormat(key)}: ${String(value)}`;
    })
    .join(" <br>");
};

export const InsufficientBalance = BigInt(0.05 * 10 ** 24).toString();

export function toBase64(json) {
  return Buffer.from(JSON.stringify(json)).toString("base64");
}

export const roles = [
  {
    name: "Vote role",
    storageState:
      "playwright-tests/storage-states/wallet-connected-admin-with-vote-role.json",
    canCreateRequest: false,
  },
  {
    name: "Settings role",
    storageState:
      "playwright-tests/storage-states/wallet-connected-admin-with-settings-role.json",
    canCreateRequest: false,
  },
  {
    name: "All role",
    storageState:
      "playwright-tests/storage-states/wallet-connected-admin-with-all-role.json",
    canCreateRequest: true,
  },
];

export const isMac = os.platform() === "darwin";

export function formatTimestamp(date) {
  return new Date(date).getTime() * 1000000;
}
