// api/cron.js
// Vercel Cron Job handler for checking and notifying about job fairs
//
// This is a STATELESS serverless function:
// - No global state or in-memory persistence
// - All state is loaded from Vercel KV at the start of each invocation
// - All state is saved to Vercel KV at the end of each invocation
// - Each cron execution is completely independent

const TelegramNotifier = require("../notifier");
const fetchJobFairs = require("../fetchJobFairs");
const isFutureDate = fetchJobFairs.isFutureDate;
const {
  loadSent,
  saveSent,
  isEventSent,
  markEventAsSent,
  getSentCount,
} = require("../storage");

/**
 * Main function to check and notify about job fairs
 * 
 * This function is stateless - it loads state from Vercel KV at the start
 * and saves state back to Vercel KV at the end. No in-memory state persists
 * between invocations.
 */
async function checkAndNotify() {
  try {
    // Initialize Telegram notifier
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      throw new Error(
        "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in environment variables"
      );
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

    console.log("Fetching job fairs...");
    const fairs = await fetchJobFairs(fetchOptions);

    if (fairs.length === 0) {
      console.log("No job fairs found.");
      return { success: true, message: "No job fairs found", newEvents: 0 };
    }

    console.log(`Found ${fairs.length} job fair(s)`);

    // Load previously sent notifications
    const sent = await loadSent();

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
        console.log(
          `Skipping event with past date: ${fair.title} (${fair.date})`
        );
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
    await saveSent(sent);

    const result = {
      success: true,
      message:
        newEventsCount > 0
          ? `Sent ${newEventsCount} new job fair notification(s). Total sent: ${getSentCount(
              sent
            )}`
          : "No new job fairs to notify.",
      newEvents: newEventsCount,
      totalSent: getSentCount(sent),
    };

    console.log(result.message);
    return result;
  } catch (error) {
    console.error("Error in checkAndNotify:", error);

    // Try to send error notification if notifier is available
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (botToken && chatId) {
        const notifier = new TelegramNotifier(botToken, chatId);
        await notifier.send(`❌ Error fetching job fairs: ${error.message}`);
      }
    } catch (notifyError) {
      console.error("Failed to send error notification:", notifyError);
    }

    return {
      success: false,
      message: error.message,
      error: error.toString(),
    };
  }
}

/**
 * Vercel serverless function handler (default export)
 * 
 * This handler is called by Vercel Cron Jobs according to the schedule
 * defined in vercel.json. Each invocation is stateless and independent.
 * 
 * @param {Object} req - Vercel request object
 * @param {Object} res - Vercel response object
 */
const handler = async (req, res) => {
  // Verify this is a cron request (optional security check)
  // Vercel automatically adds an Authorization header for cron jobs
  const authHeader = req.headers.authorization;
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Execute the stateless check and notify function
    // State is loaded from and saved to Vercel KV within this function
    const result = await checkAndNotify();
    return res.status(200).json(result);
  } catch (error) {
    console.error("Cron job error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Export both the handler (for Vercel) and checkAndNotify (for local testing)
module.exports = handler;
module.exports.checkAndNotify = checkAndNotify;
