/**
 * Focuses on an input field, selects all text, clears it, and then removes focus.
 * @param {Object} params - The parameters for the function.
 * @param {import('playwright').ElementHandle} params.inputField - The Playwright ElementHandle for the input field.
 * @returns {Promise<void>} A promise that resolves once the input field is focused, cleared, and blurred.
 */
export async function focusInputClearAndBlur({ inputField }) {
  await inputField.focus();
  await inputField.press(
    process.platform === "darwin" ? "Meta+A" : "Control+A"
  );
  await inputField.press("Delete");
  await inputField.blur();
}

/**
 * Focuses on an input field, selects all text, clears it, replaces it with a specified value, and then removes focus.
 * @param {Object} params - The parameters for the function.
 * @param {import('playwright').ElementHandle} params.inputField - The Playwright ElementHandle for the input field.
 * @param {string} params.newValue - The new value to set in the input field.
 * @returns {Promise<void>} A promise that resolves once the input field is focused, cleared, updated, and blurred.
 */
export async function focusInputReplaceAndBlur({ inputField, newValue }) {
  await inputField.focus();
  await inputField.press(
    process.platform === "darwin" ? "Meta+A" : "Control+A"
  );
  await inputField.press("Delete");
  await inputField.type(newValue); // Types the specified value into the input field
  await inputField.blur();
}
