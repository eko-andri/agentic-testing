// Triggering commit to test playwright configuration
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  use: {
    headless: true, // Run in non-headless mode for debugging
    slowMo: 2000, // Slow down operations by 2 seconds for better visibility
  },
});
