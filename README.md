# Egypt Job Fair Bot

A Node.js bot that automatically fetches job fair information from multiple sources (Eventbrite API, LinkedIn RSS feeds, and Google-like search scraping) and sends notifications via Telegram. **Optimized for Vercel deployment with Vercel Cron and Vercel KV.**

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

- ⏰ **Automated Scheduling**: Runs every 6 hours using Vercel Cron (balanced load & freshness)

- 🔄 **Deduplication**: Prevents duplicate notifications using Vercel KV
  - Tracks sent notifications across deployments
  - Uses event title + date as unique identifier
  - Only sends notifications for new job fairs

- ☁️ **Vercel Hosting**: Serverless deployment with automatic scaling

## Deployment Options

### Option 1: Deploy to Vercel (Recommended)

This bot is optimized for Vercel deployment with:
- ✅ **Vercel Cron Jobs**: Scheduled jobs that run every 6 hours automatically
- ✅ **Stateless Functions**: Each execution is independent with no in-memory state
- ✅ **Persistent Storage**: Vercel KV provides durable storage that survives across invocations

#### Prerequisites

1. A [Vercel account](https://vercel.com) (free tier is sufficient)
2. A GitHub account (for Git-based deployment, recommended)
3. Your project code pushed to a GitHub repository (or use CLI deployment)

#### Deployment Methods

##### Method 1: Deploy via GitHub (Recommended)

This is the easiest and most maintainable method. Vercel will automatically deploy on every push to your repository.

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/egypt-jobfair-bot.git
   git push -u origin main
   ```

2. **Import project to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click **"Add New..."** → **"Project"**
   - Select **"Import Git Repository"**
   - Choose your GitHub repository (`egypt-jobfair-bot`)
   - Click **"Import"**

3. **Configure project settings**:
   - **Framework Preset**: Leave as "Other" (or "Node.js")
   - **Root Directory**: `./` (default)
   - **Build Command**: Leave empty (no build step needed)
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install` (default)
   - Click **"Deploy"**

4. **Set up Vercel KV**:
   - After deployment, go to your project dashboard
   - Navigate to **Storage** tab
   - Click **"Create Database"**
   - Select **"KV"** (Key-Value store)
   - Choose a name for your database (e.g., `jobfair-storage`)
   - Select a region (choose closest to your users)
   - Click **"Create"**
   - The KV connection is automatically configured - no additional setup needed!

5. **Configure Environment Variables**:
   - In your project dashboard, go to **Settings** → **Environment Variables**
   - Add each required variable (see list below):
     - Click **"Add New"**
     - Enter the variable name (e.g., `TELEGRAM_BOT_TOKEN`)
     - Enter the variable value
     - Select environments: **Production**, **Preview**, and **Development** (or as needed)
     - Click **"Save"**
   - Repeat for all required variables

6. **Redeploy to apply environment variables**:
   - After adding environment variables, go to **Deployments** tab
   - Click the **"..."** menu on the latest deployment
   - Select **"Redeploy"**
   - This ensures all environment variables are available to your functions

7. **Verify Cron Job**:
   - Go to **Settings** → **Cron Jobs**
   - You should see a cron job configured:
     - **Path**: `/api/cron`
     - **Schedule**: `0 */6 * * *` (every 6 hours)
   - The cron job will automatically start running on the next scheduled time

##### Method 2: Deploy via Vercel CLI

Use this method if you prefer command-line deployment or don't want to use GitHub.

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```
   - This will open your browser to authenticate

3. **Deploy to Vercel**:
   ```bash
   vercel
   ```
   - Follow the prompts:
     - **Set up and deploy?** → Yes
     - **Which scope?** → Select your account
     - **Link to existing project?** → No (for first deployment)
     - **Project name?** → `egypt-jobfair-bot` (or your preferred name)
     - **Directory?** → `./` (current directory)
     - **Override settings?** → No (uses `vercel.json`)

4. **Set up Vercel KV** (same as Method 1, step 4):
   - Go to your Vercel project dashboard
   - Navigate to **Storage** → **Create Database** → **KV**
   - Create and configure your KV database

5. **Configure Environment Variables** (same as Method 1, step 5):
   - Use the Vercel dashboard, or use CLI:
   ```bash
   vercel env add TELEGRAM_BOT_TOKEN
   vercel env add TELEGRAM_CHAT_ID
   # ... add other variables
   ```

6. **Redeploy**:
   ```bash
   vercel --prod
   ```

#### Post-Deployment Setup

After deployment, complete these steps:

1. **Verify Vercel KV Connection**:
   - Your code uses `@vercel/kv` which automatically connects to your KV database
   - No manual connection strings needed - Vercel handles this automatically
   - Test by manually triggering the cron endpoint (see Testing section below)

2. **Check Function Logs**:
   - Go to **Deployments** → Select your deployment → **Functions** tab
   - Click on `/api/cron` to view logs
   - Check for any errors or warnings

3. **Monitor Cron Job Execution**:
   - Go to **Settings** → **Cron Jobs**
   - View execution history and status
   - Check for any failed executions

#### Required Environment Variables in Vercel

Set these in your Vercel project settings:

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

# Optional: Cron Secret for additional security
CRON_SECRET=your_optional_secret_here
```

#### Testing the Deployment

1. **Test the Cron Endpoint Manually**:

   Visit your deployment URL in a browser:
   ```
   https://your-project.vercel.app/api/cron
   ```

   Or use curl:
   ```bash
   curl https://your-project.vercel.app/api/cron
   ```

   You should see a JSON response indicating the job execution status.

2. **Check Function Logs**:
   - Go to your Vercel project dashboard
   - Navigate to **Deployments** → Select latest deployment
   - Click on **Functions** tab
   - Click on `/api/cron` to view detailed logs
   - Look for execution results, errors, or warnings

3. **Verify Telegram Notifications**:
   - After triggering the cron job, check your Telegram chat
   - You should receive notifications for any new job fairs found
   - If no notifications appear, check the logs for errors

4. **Test Vercel KV Storage**:
   - The bot automatically uses Vercel KV for deduplication
   - After the first run, check logs to confirm KV operations
   - Look for messages indicating successful storage operations

#### Troubleshooting

**Issue: Cron job not running**
- ✅ Check that `vercel.json` is in the root directory
- ✅ Verify cron schedule in **Settings** → **Cron Jobs**
- ✅ Ensure the `/api/cron.js` file exists in the `api/` directory
- ✅ Check that your deployment was successful

**Issue: Environment variables not working**
- ✅ Make sure variables are set in **Settings** → **Environment Variables**
- ✅ Redeploy after adding new environment variables
- ✅ Verify variable names match exactly (case-sensitive)
- ✅ Check that variables are enabled for the correct environments (Production/Preview/Development)

**Issue: Vercel KV connection errors**
- ✅ Ensure Vercel KV database is created in **Storage** tab
- ✅ Verify the database is linked to your project
- ✅ Check that `@vercel/kv` package is in `package.json` dependencies
- ✅ Review function logs for specific KV error messages

**Issue: Function timeout errors**
- ✅ Vercel functions have a 300-second (5-minute) timeout limit
- ✅ Check function logs to see if execution is taking too long
- ✅ Consider optimizing data fetching or reducing sources if needed
- ✅ The `vercel.json` already sets `maxDuration: 300` for the cron function

**Issue: No Telegram notifications**
- ✅ Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set correctly
- ✅ Test your bot token by sending a message manually via Telegram
- ✅ Check function logs for Telegram API errors
- ✅ Ensure your bot has permission to send messages to the chat

**Issue: Duplicate notifications**
- ✅ Vercel KV should prevent duplicates automatically
- ✅ Check that KV database is properly connected
- ✅ Verify storage operations in function logs
- ✅ If needed, clear KV database and redeploy

**Issue: Deployment fails**
- ✅ Check that all dependencies are listed in `package.json`
- ✅ Verify Node.js version compatibility (Vercel uses Node.js 18.x by default)
- ✅ Review build logs for specific error messages
- ✅ Ensure `vercel.json` syntax is valid JSON

#### Updating Your Deployment

When you make changes to your code:

1. **Via GitHub** (if using Git deployment):
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```
   - Vercel will automatically detect the push and redeploy

2. **Via Vercel CLI**:
   ```bash
   vercel --prod
   ```

3. **Manual Redeploy**:
   - Go to Vercel dashboard → **Deployments**
   - Click **"..."** on a previous deployment
   - Select **"Redeploy"**

### Option 2: Local Development

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

### 3. Run the Bot Locally

For local testing:
```bash
node index.js
```

**Note**: For production, deploy to Vercel. The local version is for testing only and doesn't use Vercel Cron or KV.

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
├── api/
│   └── cron.js           # Vercel Cron job handler (serverless function)
├── index.js              # Legacy entry point (for local testing)
├── fetchJobFairs.js       # Data fetching logic (all sources)
├── notifier.js           # Telegram notification handler
├── storage.js            # Vercel KV storage for deduplication
├── vercel.json           # Vercel configuration (cron schedule)
├── package.json          # Dependencies
└── .env                  # Configuration (for local development)
```

## Dependencies

- `@vercel/kv`: Vercel KV client for persistent storage
- `axios`: HTTP client for API requests and web scraping
- `rss-parser`: RSS feed parsing
- `cheerio`: Server-side HTML parsing (jQuery-like)
- `dotenv`: Environment variable management (for local development)

## Storage & Deduplication

The bot uses Vercel KV to prevent duplicate notifications:
- **Persistent Storage**: Sent notifications are stored in Vercel KV
- **Unique Keys**: Events are identified by `title + date` combination
- **Automatic Tracking**: New events are automatically tracked after sending
- **Cross-Deployment Persistence**: Sent notifications persist across deployments and restarts
- **No File System**: No local files needed - everything is stored in Vercel KV

To reset sent notifications, you can clear the KV database or use the `clearSent()` function.

## Error Handling

The bot includes comprehensive error handling:
- Individual source failures don't crash the bot
- Errors are logged to console
- Telegram notifications include error messages
- Storage errors are handled gracefully

## Architecture: Stateless Functions with Persistent Storage

This bot follows best practices for serverless architecture:

### ✅ Vercel Cron Jobs
- **Scheduled Execution**: Configured in `vercel.json` to run every 6 hours (`0 */6 * * *`)
- **Automatic Triggering**: Vercel automatically invokes `/api/cron` endpoint on schedule
- **No Manual Scheduling**: No need for external cron services or long-running processes

### ✅ Stateless Functions
- **No Global State**: Each function invocation is completely independent
- **No In-Memory Persistence**: All state is loaded from Vercel KV at the start of each execution
- **Idempotent Operations**: Each cron run can be safely retried without side effects
- **Scalable**: Functions can scale horizontally without state synchronization issues

### ✅ Persistent Storage (Vercel KV)
- **Durable State**: All sent notification tracking is stored in Vercel KV
- **Cross-Invocation Persistence**: State survives between function invocations and deployments
- **Atomic Operations**: Load and save operations are atomic, preventing race conditions
- **No File System**: No local files needed - everything is in the cloud database

### How It Works

1. **Cron Trigger**: Vercel Cron invokes `/api/cron` every 6 hours
2. **Load State**: Function loads sent notifications from Vercel KV
3. **Process Events**: Function fetches job fairs and checks for duplicates
4. **Send Notifications**: New events trigger Telegram notifications
5. **Save State**: Updated sent notifications are saved back to Vercel KV
6. **Function Ends**: Function completes, no state remains in memory

## Vercel-Specific Notes

- **Cron Jobs**: Vercel Cron runs on a schedule defined in `vercel.json`. The cron job runs every 6 hours.
- **Serverless Functions**: The bot runs as a serverless function, so there's no persistent process. Each cron execution is independent.
- **KV Storage**: Vercel KV provides persistent storage without file system access. Perfect for serverless environments.
- **Environment Variables**: All configuration is done via Vercel environment variables. No `.env` file needed in production.
- **Function Timeout**: Vercel serverless functions have execution time limits (300 seconds max). The bot is optimized to complete within these limits.

## Limitations

- **LinkedIn RSS**: LinkedIn doesn't provide direct RSS feeds for events. The implementation searches for job fair-related content in available feeds.
- **Web Scraping**: May break if target websites change their HTML structure. The bot attempts to handle multiple CSS selectors for robustness.
- **Rate Limiting**: Be mindful of rate limits when scraping websites. The bot includes delays between requests to avoid overwhelming servers.
- **Platform Availability**: Some platforms may require authentication or have anti-scraping measures. The bot will gracefully handle failures and continue with other sources.
- **Vercel Function Limits**: Free tier has execution time limits. For very large result sets, consider pagination or filtering.

## License

ISC
