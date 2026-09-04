/**
 * Strip ANSI escape sequences from a string.
 *
 * @param {string} str - Input string potentially containing ANSI escapes
 * @returns {string} Cleaned string
 */
export function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");
}
