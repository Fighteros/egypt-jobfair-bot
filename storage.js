// storage.js
// Handles persistence of sent notifications to prevent duplicates using Vercel KV
//
// This module provides PERSISTENT storage that survives across serverless function invocations.
// All operations are async and use Vercel KV, ensuring state persists between cron job runs.
//
// Key characteristics:
// - Stateless: No in-memory state persists between function invocations
// - Persistent: All state is stored in Vercel KV (external database)
// - Atomic: Each load/save operation is independent and atomic

const { kv } = require("@vercel/kv");

const SENT_KEY = "jobfair:sent";

/**
 * Load sent notifications from Vercel KV
 * @returns {Promise<Set>} Set of sent notification keys
 */
async function loadSent() {
  try {
    const sentArray = await kv.get(SENT_KEY);
    if (Array.isArray(sentArray)) {
      return new Set(sentArray);
    }
  } catch (error) {
    console.error("Error loading sent notifications:", error.message);
  }
  return new Set();
}

/**
 * Save sent notifications to Vercel KV
 * @param {Set} sent - Set of sent notification keys
 */
async function saveSent(sent) {
  try {
    const sentArray = Array.from(sent);
    await kv.set(SENT_KEY, sentArray);
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
async function clearSent() {
  try {
    await kv.del(SENT_KEY);
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

