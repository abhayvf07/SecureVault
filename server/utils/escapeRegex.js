/**
 * Escape special regex characters to prevent ReDoS attacks.
 * Use this whenever user-supplied strings are used in `new RegExp()` or `$regex`.
 *
 * @param {string} string - The raw user input string
 * @returns {string} Escaped string safe for use in RegExp
 */
const escapeRegex = (string = '') => {
  if (typeof string !== 'string') return '';
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
};

module.exports = { escapeRegex };
