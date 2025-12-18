# Egypt Job Fair Bot

A Node.js bot that automatically fetches job fair information from multiple sources (Eventbrite API, LinkedIn RSS feeds, and Google-like search scraping) and sends notifications via Telegram.

## Features

- 🔍 **Multiple Data Sources**:
  - Eventbrite API integration (with optional API key)
  - LinkedIn RSS feed parsing
  - Google-like search scraping (using DuckDuckGo)
  - TicketsMarche event listings
  - Platinumlist (Collard Tickets) event listings
  - OnlineTicketing event listings
  - Luma event listings

- 📱 **Telegram Notifications**: Sends formatted messages with job fair details

- ⏰ **Automated Scheduling**: Runs every 6 hours (balanced load & freshness)

- 🔄 **Deduplication**: Prevents duplicate notifications using persistent storage
  - Tracks sent notifications across bot restarts
  - Uses event title + date as unique identifier
  - Only sends notifications for new job fairs

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
# Telegram Bot Configuration (Required)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Eventbrite API Key (Optional - enables API access, otherwise uses scraping)
EVENTBRITE_API_KEY=your_eventbrite_api_key_here

# Search Configuration (Optional)
SEARCH_LOCATION=Cairo, Egypt
SEARCH_QUERY=job fair Egypt

# LinkedIn RSS Feeds (Optional, comma-separated)
LINKEDIN_RSS_URLS=https://example.com/feed1.rss,https://example.com/feed2.rss

# Enable/Disable Data Sources (Optional, defaults to true)
ENABLE_EVENTBRITE=true
ENABLE_LINKEDIN=true
ENABLE_SEARCH=true
ENABLE_TICKETSMARCHE=true
ENABLE_PLATINUMLIST=true
ENABLE_ONLINETICKETING=true
ENABLE_LUMA=true
```

## Getting Started

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` and follow the instructions
3. Copy the bot token to your `.env` file as `TELEGRAM_BOT_TOKEN`
4. Get your chat ID by messaging [@userinfobot](https://t.me/userinfobot)
5. Copy your chat ID to your `.env` file as `TELEGRAM_CHAT_ID`

### 2. (Optional) Get Eventbrite API Key

1. Go to [Eventbrite API Keys](https://www.eventbrite.com/platform/api-keys/)
2. Create a new API key
3. Add it to your `.env` file as `EVENTBRITE_API_KEY`

**Note**: If you don't provide an API key, the bot will use web scraping to fetch Eventbrite events (may be less reliable).

### 3. Run the Bot

```bash
node index.js
```

The bot will:
- Run immediately on startup
- Schedule checks every 6 hours
- Track sent notifications to prevent duplicates

## How It Works

### Data Sources

1. **Eventbrite API/Scraping**:
   - If `EVENTBRITE_API_KEY` is provided, uses the official API
   - Otherwise, scrapes Eventbrite's public search results
   - Searches for job fairs in the specified location

2. **LinkedIn RSS Feeds**:
   - Parses RSS feeds for job fair-related content
   - Extracts events from feed items containing "job fair" keywords
   - Supports multiple RSS feed URLs

3. **Google-like Search Scraping**:
   - Uses DuckDuckGo HTML search (privacy-friendly, no API key needed)
   - Searches for job fairs using the configured query
   - Filters results for job fair-related content

4. **TicketsMarche**:
   - Scrapes event listings from TicketsMarche platform
   - Searches for job fairs in the specified location
   - Extracts event details including title, date, location, and registration URL

5. **Platinumlist (Collard Tickets)**:
   - Scrapes event listings from Platinumlist platform
   - Searches for job fairs in the specified location
   - Extracts event details including title, date, location, and registration URL

6. **OnlineTicketing**:
   - Scrapes event listings from OnlineTicketing platform
   - Searches for job fairs in the specified location
   - Extracts event details including title, date, location, and registration URL

7. **Luma**:
   - Scrapes event listings from Luma platform
   - Searches for job fairs in the specified location
   - Extracts event details including title, date, location, and registration URL
   - Also parses JSON-LD structured data when available

### Event Format

Each job fair event includes:
- **Title**: Event name
- **Location**: Event location (extracted or default)
- **Date**: Event date (parsed from source or "TBD")
- **URL**: Link to event details
- **Source**: Data source identifier

## Configuration Options

All configuration is done via environment variables in the `.env` file:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | - | Your Telegram bot token |
| `TELEGRAM_CHAT_ID` | Yes | - | Your Telegram chat ID |
| `EVENTBRITE_API_KEY` | No | null | Eventbrite API key (optional) |
| `SEARCH_LOCATION` | No | "Cairo, Egypt" | Location to search for events |
| `SEARCH_QUERY` | No | "job fair Egypt" | Search query string |
| `LINKEDIN_RSS_URLS` | No | [] | Comma-separated RSS feed URLs |
| `ENABLE_EVENTBRITE` | No | true | Enable/disable Eventbrite source |
| `ENABLE_LINKEDIN` | No | true | Enable/disable LinkedIn source |
| `ENABLE_SEARCH` | No | true | Enable/disable search scraping |
| `ENABLE_TICKETSMARCHE` | No | true | Enable/disable TicketsMarche source |
| `ENABLE_PLATINUMLIST` | No | true | Enable/disable Platinumlist source |
| `ENABLE_ONLINETICKETING` | No | true | Enable/disable OnlineTicketing source |
| `ENABLE_LUMA` | No | true | Enable/disable Luma source |

## Project Structure

```
egypt-jobfair-bot/
├── index.js              # Main entry point
├── fetchJobFairs.js      # Data fetching logic (all sources)
├── notifier.js           # Telegram notification handler
├── storage.js             # Persistent storage for deduplication
├── sent.json              # Storage file (auto-generated)
├── package.json          # Dependencies
└── .env                  # Configuration (create this)
```

## Dependencies

- `axios`: HTTP client for API requests and web scraping
- `rss-parser`: RSS feed parsing
- `cheerio`: Server-side HTML parsing (jQuery-like)
- `dotenv`: Environment variable management
- `node-cron`: Task scheduling

## Storage & Deduplication

The bot uses `storage.js` to prevent duplicate notifications:
- **Persistent Storage**: Sent notifications are saved to `sent.json`
- **Unique Keys**: Events are identified by `title + date` combination
- **Automatic Tracking**: New events are automatically tracked after sending
- **Cross-Restart Persistence**: Sent notifications persist across bot restarts

To reset sent notifications, delete the `sent.json` file.

## Error Handling

The bot includes comprehensive error handling:
- Individual source failures don't crash the bot
- Errors are logged to console
- Telegram notifications include error messages
- Storage errors are handled gracefully

## Limitations

- **LinkedIn RSS**: LinkedIn doesn't provide direct RSS feeds for events. The implementation searches for job fair-related content in available feeds.
- **Web Scraping**: May break if target websites change their HTML structure. The bot attempts to handle multiple CSS selectors for robustness.
- **Rate Limiting**: Be mindful of rate limits when scraping websites. The bot includes delays between requests to avoid overwhelming servers.
- **Storage File**: The `sent.json` file grows over time. Consider periodic cleanup for long-running bots.
- **Platform Availability**: Some platforms may require authentication or have anti-scraping measures. The bot will gracefully handle failures and continue with other sources.

## License

ISC

