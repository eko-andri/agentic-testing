// staticSyntaxCheck.js
// Utility to check JavaScript syntax using acorn
const acorn = require("acorn");

/**
 * Checks if the given JavaScript code has syntax errors.
 * @param {string} code
 * @returns {string|null} Returns error message if syntax error, otherwise null.
 */
function checkSyntax(code) {
  try {
    acorn.parse(code, { ecmaVersion: 2020, sourceType: "module" });
    return null;
  } catch (err) {
    return err.message;
  }
}

module.exports = { checkSyntax };
