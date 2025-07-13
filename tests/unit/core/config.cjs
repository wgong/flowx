/**
 * Export the configManager from the actual implementation
 */

// Use require to import the compiled JS version instead of directly requiring the TS file
const { configManager } = require('../../../src/core/config');

module.exports = { configManager };