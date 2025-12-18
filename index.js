// index.js
// Main entry point for the Egypt Job Fair Bot

require("dotenv").config();
const cron = require("node-cron");
const TelegramNotifier = require("./notifier");
const fetchJobFairs = require("./fetchJobFairs");
const isFutureDate = fetchJobFairs.isFutureDate;
const {
  loadSent,
  saveSent,
  createEventKey,
  isEventSent,
  markEventAsSent,
  getSentCount,
} = require("./storage");

// Initialize Telegram notifier
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!botToken || !chatId) {
  console.error(
    "Error: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in .env file"
  );
  process.exit(1);
}

const notifier = new TelegramNotifier(botToken, chatId);

// Configuration options for fetching job fairs
const fetchOptions = {
  eventbriteApiKey: process.env.EVENTBRITE_API_KEY || null,
  location: process.env.SEARCH_LOCATION || "Cairo, Egypt",
  linkedInRSSUrls: process.env.LINKEDIN_RSS_URLS
    ? process.env.LINKEDIN_RSS_URLS.split(",")
    : [],
  enableEventbrite: process.env.ENABLE_EVENTBRITE !== "false",
  enableLinkedIn: process.env.ENABLE_LINKEDIN !== "false",
  enableSearch: process.env.ENABLE_SEARCH !== "false",
  enableTicketsMarche: process.env.ENABLE_TICKETSMARCHE !== "false",
  enablePlatinumlist: process.env.ENABLE_PLATINUMLIST !== "false",
  enableOnlineTicketing: process.env.ENABLE_ONLINETICKETING !== "false",
  enableLuma: process.env.ENABLE_LUMA !== "false",
  searchQuery: process.env.SEARCH_QUERY || "job fair Egypt",
};

// Load previously sent notifications
const sent = loadSent();

/**
 * Main function to check and notify about job fairs
 */
async function checkAndNotify() {
  try {
    console.log("Fetching job fairs...");
    const fairs = await fetchJobFairs(fetchOptions);

    if (fairs.length === 0) {
      console.log("No job fairs found.");
      return;
    }

    console.log(`Found ${fairs.length} job fair(s)`);

    // Send notifications for each job fair (with deduplication)
    let newEventsCount = 0;
    for (const fair of fairs) {
      // Skip if already sent
      if (isEventSent(sent, fair)) {
        console.log(`Skipping duplicate: ${fair.title}`);
        continue;
      }

      // Skip if no link is available
      if (!fair.url && !fair.registerUrl) {
        console.log(`Skipping event without link: ${fair.title}`);
        continue;
      }

      // Additional validation: ensure date is in future and not TBD
      if (!fair.date || fair.date === "TBD" || fair.date.includes("TBD")) {
        console.log(`Skipping event with TBD date: ${fair.title}`);
        continue;
      }
      
      const dateToCheck = fair.dateObj || fair.date;
      if (!isFutureDate(dateToCheck)) {
        console.log(`Skipping event with past date: ${fair.title} (${fair.date})`);
        continue;
      }

      // Build link section - show registration link if different from event link, otherwise just event link
      let linkSection = "";
      if (fair.registerUrl && fair.registerUrl !== fair.url) {
        linkSection = `🔗 <a href="${fair.url}">Event Info</a> | <a href="${fair.registerUrl}">Register Here</a>`;
      } else if (fair.registerUrl) {
        linkSection = `🔗 <a href="${fair.registerUrl}">Register / More Info</a>`;
      } else if (fair.url) {
        linkSection = `🔗 <a href="${fair.url}">More Info</a>`;
      }

      const message = `
📢 <b>New Job Fair Detected</b>

<b>${fair.title}</b>
📍 ${fair.location}
📅 ${fair.date}

${linkSection}
      `.trim();

      await notifier.send(message);
      
      // Mark as sent
      markEventAsSent(sent, fair);
      newEventsCount++;
      
      // Small delay between messages to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Save sent notifications
    saveSent(sent);
    
    if (newEventsCount > 0) {
      console.log(`Sent ${newEventsCount} new job fair notification(s). Total sent: ${getSentCount(sent)}`);
    } else {
      console.log("No new job fairs to notify.");
    }
  } catch (error) {
    console.error("Error in checkAndNotify:", error);
    await notifier.send(
      `❌ Error fetching job fairs: ${error.message}`
    );
  }
}

// Schedule to run every 6 hours (balanced load & freshness)
cron.schedule("0 */6 * * *", async () => {
  console.log("Running scheduled job fair check...");
  await checkAndNotify();
});

console.log("Egypt Job Fair Bot starting...");
console.log("Bot is running. Scheduled to check every 6 hours.");

// Run immediately on startup
checkAndNotify();

