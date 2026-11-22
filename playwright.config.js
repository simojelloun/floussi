// Configuration des tests automatiques (npm test). Voir DEVELOPPEMENT.md.
const { defineConfig, devices } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "tests",
  timeout: 60000,
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:8181", ...devices["iPhone 13"], browserName: "chromium", locale: "fr-FR", timezoneId: "Africa/Casablanca" },
  webServer: { command: "node outils/serveur.mjs", env: { PORT: "8181" }, url: "http://localhost:8181/index.html", reuseExistingServer: true }
});
