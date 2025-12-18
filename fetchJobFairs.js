// fetchJobFairs.js
// Abstracts data source (Eventbrite API, LinkedIn RSS, Google-like search scraping)

const axios = require("axios");
const Parser = require("rss-parser");
const cheerio = require("cheerio");

const parser = new Parser();

/**
 * Parse date string to Date object
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {Date|null} Parsed date or null if invalid
 */
function parseDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (dateInput === "TBD" || dateInput.includes("TBD")) return null;
  
  try {
    // Try parsing various date formats
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (error) {
    return null;
  }
}

/**
 * Check if date is in the future
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {boolean} True if date is in the future
 */
function isFutureDate(dateInput) {
  const date = parseDate(dateInput);
  if (!date) return false; // If we can't parse, exclude it (or return true if you want to include TBD)
  
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
  const eventDate = new Date(date);
  eventDate.setHours(0, 0, 0, 0);
  
  return eventDate >= now;
}

/**
 * Filter events to only include future dates (excludes TBD dates)
 * @param {Array} events - Array of event objects
 * @returns {Array} Filtered array of future events
 */
function filterFutureEvents(events) {
  return events.filter(event => {
    // Exclude TBD dates - we only want events with confirmed future dates
    if (!event.date || event.date === "TBD" || event.date.includes("TBD")) {
      return false; // Exclude TBD dates
    }
    // Check dateObj first if available, otherwise parse from date string
    const dateToCheck = event.dateObj || event.date;
    return isFutureDate(dateToCheck);
  });
}

/**
 * Fetch job fairs from Eventbrite API
 * @param {string} apiKey - Eventbrite API key (optional, can use public search)
 * @param {string} location - Location to search (e.g., "Cairo, Egypt")
 * @returns {Promise<Array>} Array of job fair objects
 */
async function fetchFromEventbrite(apiKey = null, location = "Cairo, Egypt") {
  try {
    const searchQuery = encodeURIComponent(`job fair ${location}`);
    let url;

    if (apiKey) {
      // Using Eventbrite API with authentication
      url = `https://www.eventbriteapi.com/v3/events/search/?q=${searchQuery}&location.address=${encodeURIComponent(location)}&categories=102&expand=venue`;
    } else {
      // Public search via Eventbrite website (scraping approach)
      url = `https://www.eventbrite.com/d/${encodeURIComponent(location)}/${searchQuery}/?page=1`;
    }

    if (apiKey) {
      // API approach
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      return response.data.events
        .map((event) => {
          const eventDate = new Date(event.start.utc);
          return {
            title: event.name.text,
            location: event.venue?.address?.localized_area_display || location,
            date: eventDate.toLocaleDateString(),
            dateObj: eventDate,
            url: event.url,
            registerUrl: event.url, // Eventbrite URLs typically include registration
            source: "Eventbrite API",
          };
        })
        .filter(event => isFutureDate(event.dateObj));
    } else {
      // Scraping approach (fallback when no API key)
      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      const $ = cheerio.load(response.data);
      const events = [];

      // Parse Eventbrite search results
      $('[data-testid="organizer-profile-link"], .event-card').each(
        (i, elem) => {
          const $elem = $(elem);
          const title = $elem.find("h2, .event-title, [data-testid='event-title']").first().text().trim();
          const url = $elem.find("a").first().attr("href");
          const dateText = $elem.find(".event-date, [data-testid='event-date']").first().text().trim();

          if (title && url) {
            const fullUrl = url.startsWith("http") ? url : `https://www.eventbrite.com${url}`;
            const parsedDate = parseDate(dateText);
            
            events.push({
              title,
              location,
              date: dateText || "TBD",
              dateObj: parsedDate,
              url: fullUrl,
              registerUrl: fullUrl, // Eventbrite URLs typically include registration
              source: "Eventbrite",
            });
          }
        }
      );

      return events;
    }
  } catch (error) {
    console.error("Eventbrite fetch error:", error.message);
    return [];
  }
}

/**
 * Fetch job fairs from LinkedIn RSS feeds
 * @param {Array<string>} rssUrls - Array of LinkedIn RSS feed URLs
 * @returns {Promise<Array>} Array of job fair objects
 */
async function fetchFromLinkedInRSS(rssUrls = []) {
  const defaultFeeds = [
    // LinkedIn Events RSS (if available) or company pages
    "https://www.linkedin.com/feed/rss/",
  ];

  const feeds = rssUrls.length > 0 ? rssUrls : defaultFeeds;
  const allEvents = [];

  for (const feedUrl of feeds) {
    try {
      // LinkedIn doesn't provide direct RSS for events, but we can search for event-related content
      // Alternative: Use LinkedIn's search API or scrape their events page
      const searchUrl = `https://www.linkedin.com/events/search/?keywords=job%20fair%20egypt`;

      // For actual RSS parsing (if you have valid RSS feeds)
      if (feedUrl.includes(".rss") || feedUrl.includes("/feed/")) {
        const feed = await parser.parseURL(feedUrl);
        feed.items.forEach((item) => {
          if (
            item.title?.toLowerCase().includes("job fair") ||
            item.content?.toLowerCase().includes("job fair") ||
            item.contentSnippet?.toLowerCase().includes("job fair")
          ) {
            const pubDate = item.pubDate ? new Date(item.pubDate) : null;
            allEvents.push({
              title: item.title,
              location: extractLocation(item.content || item.contentSnippet),
              date: pubDate ? pubDate.toLocaleDateString() : "TBD",
              dateObj: pubDate,
              url: item.link,
              registerUrl: item.link, // Use same link if no separate registration
              source: "LinkedIn RSS",
            });
          }
        });
      }
    } catch (error) {
      console.error(`LinkedIn RSS fetch error for ${feedUrl}:`, error.message);
    }
  }

  return allEvents;
}

/**
 * Extract location from text content
 */
function extractLocation(text) {
  const egyptCities = [
    "Cairo",
    "Alexandria",
    "Giza",
    "Luxor",
    "Aswan",
    "Egypt",
  ];
  for (const city of egyptCities) {
    if (text.includes(city)) {
      return city + ", Egypt";
    }
  }
  return "Egypt";
}

/**
 * Google-like search scraping for job fairs
 * Uses DuckDuckGo or similar search engine (no API key required)
 * @param {string} query - Search query
 * @param {string} location - Location filter
 * @returns {Promise<Array>} Array of job fair objects
 */
async function fetchFromGoogleLikeSearch(
  query = "job fair Egypt",
  location = "Egypt"
) {
  try {
    // Using DuckDuckGo HTML search (no API key needed, privacy-friendly)
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + " " + location)}`;

    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Parse search results
    $(".result, .web-result").each((i, elem) => {
      const $elem = $(elem);
      const title = $elem.find(".result__title, a.result__a").first().text().trim();
      const url = $elem.find("a.result__a, .result__url").first().attr("href");
      const snippet = $elem.find(".result__snippet, .result__body").first().text().trim();

      // Filter for job fair related results
      if (
        title &&
        url &&
        (title.toLowerCase().includes("job fair") ||
          title.toLowerCase().includes("career fair") ||
          title.toLowerCase().includes("employment fair") ||
          snippet.toLowerCase().includes("job fair"))
      ) {
        // Extract date from snippet if available
        const dateMatch = snippet.match(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i);
        const dateStr = dateMatch ? dateMatch[0] : "TBD";
        const parsedDate = parseDate(dateStr);
        const fullUrl = url.startsWith("http") ? url : `https://${url}`;

        events.push({
          title,
          location: extractLocationFromSnippet(snippet) || location,
          date: dateStr,
          dateObj: parsedDate,
          url: fullUrl,
          registerUrl: fullUrl, // Use same link if no separate registration
          source: "Search Engine",
        });
      }
    });

    return events;
  } catch (error) {
    console.error("Google-like search error:", error.message);
    return [];
  }
}

/**
 * Extract location from search snippet
 */
function extractLocationFromSnippet(snippet) {
  const egyptCities = [
    "Cairo",
    "Alexandria",
    "Giza",
    "Luxor",
    "Aswan",
    "Egypt",
  ];
  for (const city of egyptCities) {
    if (snippet.includes(city)) {
      return city === "Egypt" ? "Egypt" : `${city}, Egypt`;
    }
  }
  return null;
}

/**
 * Fetch job fairs from TicketsMarche
 * @param {string} location - Location to search (e.g., "Cairo, Egypt")
 * @returns {Promise<Array>} Array of job fair objects
 */
async function fetchFromTicketsMarche(location = "Cairo, Egypt") {
  try {
    const searchQuery = encodeURIComponent(`job fair ${location}`);
    // TicketsMarche search URL
    const url = `https://www.ticketsmarche.com/en/events?q=${searchQuery}&location=${encodeURIComponent(location)}`;
    
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Parse TicketsMarche event listings
    $('.event-card, .event-item, [class*="event"], .listing-item').each((i, elem) => {
      const $elem = $(elem);
      const title = $elem.find('h2, h3, .event-title, [class*="title"]').first().text().trim();
      const url = $elem.find('a').first().attr('href');
      const dateText = $elem.find('.date, .event-date, [class*="date"]').first().text().trim();
      const locationText = $elem.find('.location, .venue, [class*="location"]').first().text().trim() || location;

      if (title && url) {
        const fullUrl = url.startsWith('http') ? url : `https://www.ticketsmarche.com${url}`;
        const parsedDate = parseDate(dateText);
        
        events.push({
          title,
          location: locationText,
          date: dateText || "TBD",
          dateObj: parsedDate,
          url: fullUrl,
          registerUrl: fullUrl,
          source: "TicketsMarche",
        });
      }
    });

    return filterFutureEvents(events);
  } catch (error) {
    console.error("TicketsMarche fetch error:", error.message);
    return [];
  }
}

/**
 * Fetch job fairs from Platinumlist (Collard Tickets)
 * @param {string} location - Location to search (e.g., "Cairo, Egypt")
 * @returns {Promise<Array>} Array of job fair objects
 */
async function fetchFromPlatinumlist(location = "Cairo, Egypt") {
  try {
    const searchQuery = encodeURIComponent(`job fair ${location}`);
    // Platinumlist search URL
    const url = `https://www.platinumlist.net/events?search=${searchQuery}&location=${encodeURIComponent(location)}`;
    
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Parse Platinumlist event listings
    $('.event-card, .event-item, [class*="event"], .event-listing-item').each((i, elem) => {
      const $elem = $(elem);
      const title = $elem.find('h2, h3, .event-title, [class*="title"], .event-name').first().text().trim();
      const url = $elem.find('a').first().attr('href');
      const dateText = $elem.find('.date, .event-date, [class*="date"], .event-time').first().text().trim();
      const locationText = $elem.find('.location, .venue, [class*="location"], .event-venue').first().text().trim() || location;

      if (title && url) {
        const fullUrl = url.startsWith('http') ? url : `https://www.platinumlist.net${url}`;
        const parsedDate = parseDate(dateText);
        
        events.push({
          title,
          location: locationText,
          date: dateText || "TBD",
          dateObj: parsedDate,
          url: fullUrl,
          registerUrl: fullUrl,
          source: "Platinumlist",
        });
      }
    });

    return filterFutureEvents(events);
  } catch (error) {
    console.error("Platinumlist fetch error:", error.message);
    return [];
  }
}

/**
 * Fetch job fairs from OnlineTicketing
 * @param {string} location - Location to search (e.g., "Cairo, Egypt")
 * @returns {Promise<Array>} Array of job fair objects
 */
async function fetchFromOnlineTicketing(location = "Cairo, Egypt") {
  try {
    const searchQuery = encodeURIComponent(`job fair ${location}`);
    // OnlineTicketing search URL - adjust domain if different
    const possibleDomains = [
      'https://www.onlineticketing.com',
      'https://www.onlineticketing.net',
      'https://onlineticketing.com',
    ];
    
    let events = [];
    
    for (const domain of possibleDomains) {
      try {
        const url = `${domain}/events?q=${searchQuery}&location=${encodeURIComponent(location)}`;
        
        const response = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          timeout: 10000,
        });

        const $ = cheerio.load(response.data);
        
        // Parse OnlineTicketing event listings
        $('.event-card, .event-item, [class*="event"], .ticket-item').each((i, elem) => {
          const $elem = $(elem);
          const title = $elem.find('h2, h3, .event-title, [class*="title"]').first().text().trim();
          const url = $elem.find('a').first().attr('href');
          const dateText = $elem.find('.date, .event-date, [class*="date"]').first().text().trim();
          const locationText = $elem.find('.location, .venue, [class*="location"]').first().text().trim() || location;

          if (title && url) {
            const fullUrl = url.startsWith('http') ? url : `${domain}${url}`;
            const parsedDate = parseDate(dateText);
            
            events.push({
              title,
              location: locationText,
              date: dateText || "TBD",
              dateObj: parsedDate,
              url: fullUrl,
              registerUrl: fullUrl,
              source: "OnlineTicketing",
            });
          }
        });
        
        // If we found events, break out of the loop
        if (events.length > 0) break;
      } catch (err) {
        // Try next domain
        continue;
      }
    }

    return filterFutureEvents(events);
  } catch (error) {
    console.error("OnlineTicketing fetch error:", error.message);
    return [];
  }
}

/**
 * Fetch job fairs from Luma
 * @param {string} location - Location to search (e.g., "Cairo, Egypt")
 * @returns {Promise<Array>} Array of job fair objects
 */
async function fetchFromLuma(location = "Cairo, Egypt") {
  try {
    const searchQuery = encodeURIComponent(`job fair ${location}`);
    // Luma events search URL
    const url = `https://lu.ma/search?q=${searchQuery}&location=${encodeURIComponent(location)}`;
    
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Parse Luma event listings
    $('.event-card, .event-item, [class*="event"], [data-testid*="event"], .lm-event-card').each((i, elem) => {
      const $elem = $(elem);
      const title = $elem.find('h2, h3, .event-title, [class*="title"], [data-testid*="title"]').first().text().trim();
      const url = $elem.find('a').first().attr('href');
      const dateText = $elem.find('.date, .event-date, [class*="date"], [data-testid*="date"]').first().text().trim();
      const locationText = $elem.find('.location, .venue, [class*="location"], [data-testid*="location"]').first().text().trim() || location;

      if (title && url) {
        const fullUrl = url.startsWith('http') ? url : `https://lu.ma${url}`;
        const parsedDate = parseDate(dateText);
        
        events.push({
          title,
          location: locationText,
          date: dateText || "TBD",
          dateObj: parsedDate,
          url: fullUrl,
          registerUrl: fullUrl,
          source: "Luma",
        });
      }
    });

    // Also try to parse JSON-LD structured data if available
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const jsonData = JSON.parse($(elem).html());
        if (jsonData['@type'] === 'Event' || (Array.isArray(jsonData) && jsonData.some(item => item['@type'] === 'Event'))) {
          const eventData = Array.isArray(jsonData) ? jsonData.find(item => item['@type'] === 'Event') : jsonData;
          if (eventData && (eventData.name?.toLowerCase().includes('job fair') || eventData.name?.toLowerCase().includes('career fair'))) {
            const eventDate = eventData.startDate ? new Date(eventData.startDate) : null;
            events.push({
              title: eventData.name,
              location: eventData.location?.address || location,
              date: eventDate ? eventDate.toLocaleDateString() : "TBD",
              dateObj: eventDate,
              url: eventData.url || eventData['@id'] || '',
              registerUrl: eventData.url || eventData['@id'] || '',
              source: "Luma",
            });
          }
        }
      } catch (err) {
        // Skip invalid JSON
      }
    });

    return filterFutureEvents(events);
  } catch (error) {
    console.error("Luma fetch error:", error.message);
    return [];
  }
}

/**
 * Main function to fetch job fairs from all sources
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} Combined array of job fair objects
 */
async function fetchJobFairs(options = {}) {
  const {
    eventbriteApiKey = null,
    location = "Cairo, Egypt",
    linkedInRSSUrls = [],
    enableEventbrite = true,
    enableLinkedIn = true,
    enableSearch = true,
    enableTicketsMarche = true,
    enablePlatinumlist = true,
    enableOnlineTicketing = true,
    enableLuma = true,
    searchQuery = "job fair Egypt",
  } = options;

  const allEvents = [];

  // Fetch from Eventbrite
  if (enableEventbrite) {
    console.log("Fetching from Eventbrite...");
    const eventbriteEvents = await fetchFromEventbrite(eventbriteApiKey, location);
    allEvents.push(...eventbriteEvents);
  }

  // Fetch from LinkedIn RSS
  if (enableLinkedIn) {
    console.log("Fetching from LinkedIn RSS...");
    const linkedInEvents = await fetchFromLinkedInRSS(linkedInRSSUrls);
    allEvents.push(...linkedInEvents);
  }

  // Fetch from Google-like search
  if (enableSearch) {
    console.log("Fetching from search engine...");
    const searchEvents = await fetchFromGoogleLikeSearch(searchQuery, location);
    allEvents.push(...searchEvents);
  }

  // Fetch from TicketsMarche
  if (enableTicketsMarche) {
    console.log("Fetching from TicketsMarche...");
    const ticketsMarcheEvents = await fetchFromTicketsMarche(location);
    allEvents.push(...ticketsMarcheEvents);
  }

  // Fetch from Platinumlist
  if (enablePlatinumlist) {
    console.log("Fetching from Platinumlist...");
    const platinumlistEvents = await fetchFromPlatinumlist(location);
    allEvents.push(...platinumlistEvents);
  }

  // Fetch from OnlineTicketing
  if (enableOnlineTicketing) {
    console.log("Fetching from OnlineTicketing...");
    const onlineTicketingEvents = await fetchFromOnlineTicketing(location);
    allEvents.push(...onlineTicketingEvents);
  }

  // Fetch from Luma
  if (enableLuma) {
    console.log("Fetching from Luma...");
    const lumaEvents = await fetchFromLuma(location);
    allEvents.push(...lumaEvents);
  }

  // Remove duplicates based on URL
  const uniqueEvents = [];
  const seenUrls = new Set();

  for (const event of allEvents) {
    const normalizedUrl = event.url.toLowerCase().replace(/\/$/, "");
    if (!seenUrls.has(normalizedUrl)) {
      seenUrls.add(normalizedUrl);
      uniqueEvents.push(event);
    }
  }

  // Filter to only future events
  const futureEvents = filterFutureEvents(uniqueEvents);

  return futureEvents;
}

module.exports = fetchJobFairs;
module.exports.isFutureDate = isFutureDate;
