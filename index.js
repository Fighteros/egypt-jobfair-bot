// index.js
// Legacy entry point - kept for local development/testing
// For Vercel deployment, use api/cron.js instead

require("dotenv").config();

// Import the checkAndNotify function from the cron module
const cronModule = require("./api/cron");
const checkAndNotify = cronModule.checkAndNotify;

if (!checkAndNotify) {
  console.error("Error: checkAndNotify function not found in api/cron.js");
  process.exit(1);
}

// For local development, you can run this directly
if (require.main === module) {
  console.log("Running job fair check locally...");
  // Since we're in local mode, we need to ensure KV is available
  // Vercel KV requires KV_URL, KV_REST_API_URL, KV_REST_API_TOKEN, etc.
  if (!process.env.KV_URL && !process.env.KV_REST_API_URL) {
    console.warn("Warning: Vercel KV environment variables not set. Storage may not work in local mode.");
    console.warn("For local testing, you may want to use a local KV instance or mock the storage.");
    console.warn("Set KV_REST_API_URL and KV_REST_API_TOKEN in your .env file for local testing.");
  }
  
  checkAndNotify()
    .then((result) => {
      console.log("Result:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error:", error);
      process.exit(1);
    });
}

module.exports = checkAndNotify;

