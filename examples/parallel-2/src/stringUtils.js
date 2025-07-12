/**
 * String Utility Library
 * A collection of useful string manipulation functions
 */

/**
 * Reverses a string
 * @param {string} str - The string to reverse
 * @returns {string} The reversed string
 */
function reverse(str) {
  return str.split('').reverse().join('');
}

/**
 * Capitalizes the first letter of each word in a string
 * @param {string} str - The string to capitalize
 * @returns {string} The capitalized string
 */
function capitalize(str) {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Truncates a string to a specified length and adds an ellipsis if truncated
 * @param {string} str - The string to truncate
 * @param {number} maxLength - The maximum length of the string
 * @returns {string} The truncated string
 */
function truncate(str, maxLength) {
  if (!str) return '';
  if (maxLength <= 0) return '...';
  if (str.length <= maxLength) return str;
  
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Counts the number of words in a string
 * @param {string} str - The string to count words in
 * @returns {number} The number of words in the string
 */
function countWords(str) {
  // Implementation will go here
}

module.exports = {
  reverse,
  capitalize,
  truncate,
  countWords
};