const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  use: {
    headless: true, // Jalankan Playwright secara headless
    slowMo: 0,      // Tidak perlu slow motion jika headless
  },
});
