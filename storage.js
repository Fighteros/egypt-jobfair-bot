// storage.js
// Handles persistence of sent notifications to prevent duplicates

const fs = require("fs");
const path = require("path");

const SENT_FILE = path.join(__dirname, "sent.json");

/**
 * Load sent notifications from file
 * @returns {Set} Set of sent notification keys
 */
function loadSent() {
  try {
    if (fs.existsSync(SENT_FILE)) {
      const data = fs.readFileSync(SENT_FILE, "utf8");
      const sentArray = JSON.parse(data);
      return new Set(sentArray);
    }
  } catch (error) {
    console.error("Error loading sent notifications:", error.message);
  }
  return new Set();
}

/**
 * Save sent notifications to file
 * @param {Set} sent - Set of sent notification keys
 */
function saveSent(sent) {
  try {
    const sentArray = Array.from(sent);
    fs.writeFileSync(SENT_FILE, JSON.stringify(sentArray, null, 2), "utf8");
  } catch (error) {
    console.error("Error saving sent notifications:", error.message);
  }
}

/**
 * Create a unique key for an event (used for deduplication)
 * @param {Object} event - Event object with title and date
 * @returns {string} Unique key for the event
 */
function createEventKey(event) {
  return (event.title || "") + (event.date || "");
}

/**
 * Check if an event has already been sent
 * @param {Set} sent - Set of sent notification keys
 * @param {Object} event - Event object to check
 * @returns {boolean} True if event has already been sent
 */
function isEventSent(sent, event) {
  const key = createEventKey(event);
  return sent.has(key);
}

/**
 * Mark an event as sent
 * @param {Set} sent - Set of sent notification keys
 * @param {Object} event - Event object to mark as sent
 */
function markEventAsSent(sent, event) {
  const key = createEventKey(event);
  sent.add(key);
}

/**
 * Clear all sent notifications (useful for testing or reset)
 */
function clearSent() {
  try {
    if (fs.existsSync(SENT_FILE)) {
      fs.unlinkSync(SENT_FILE);
    }
  } catch (error) {
    console.error("Error clearing sent notifications:", error.message);
  }
}

/**
 * Get count of sent notifications
 * @param {Set} sent - Set of sent notification keys
 * @returns {number} Number of sent notifications
 */
function getSentCount(sent) {
  return sent.size;
}

module.exports = {
  loadSent,
  saveSent,
  createEventKey,
  isEventSent,
  markEventAsSent,
  clearSent,
  getSentCount,
};

