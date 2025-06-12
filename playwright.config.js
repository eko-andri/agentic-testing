const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  use: {
    headless: false, // Jalankan Playwright secara headless
    slowMo: 2000, // Lambatkan aksi jadi 2 detik per step
  },
});
