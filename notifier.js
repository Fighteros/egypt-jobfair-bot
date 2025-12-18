// notifier.js
// Single responsibility: send messages to Telegram

const axios = require("axios");

class TelegramNotifier {
  constructor(botToken, chatId) {
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
    this.chatId = chatId;
  }

  async send(message) {
    try {
      await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: "HTML",
      });
    } catch (error) {
      // Always log but never crash the process
      console.error("Telegram send failed", error.message);
    }
  }
}

module.exports = TelegramNotifier;
