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
