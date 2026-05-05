// ============================================================
//  KEYWORDS ALERT — Google Apps Script Backend
//  Fixed: removed dead generateUID(), consistent UID validation,
//         defensive XML null-checks, cleaner error propagation.
// ============================================================

var FETCH_LIMIT  = 50;
var MAX_KEYWORDS = 30;
var MAX_KW_LEN   = 100;
var UID_MIN_LEN  = 16;
var UID_MAX_LEN  = 64;

// ── ENTRY POINT ───────────────────────────────────────────────
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Keywords Alert')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── UID HANDSHAKE ─────────────────────────────────────────────
/**
 * Validates the client's existing UID or mints a fresh one.
 * Called once on page load — the server is the source of truth.
 * Returns a valid UID string always (never null / undefined).
 */
function getOrCreateUID(existingUID) {
  if (existingUID && isValidUID_(existingUID)) {
    return existingUID;
  }
  return Utilities.getUuid().replace(/-/g, '');
}

// ── INPUT VALIDATION ──────────────────────────────────────────
/**
 * Accepts only hex-like alphanumeric IDs (dashes stripped at mint time).
 * Kept intentionally strict — UIDs are internal keys, not display strings.
 */
function isValidUID_(uid) {
  if (typeof uid !== 'string') return false;
  if (uid.length < UID_MIN_LEN || uid.length > UID_MAX_LEN) return false;
  return /^[a-zA-Z0-9]+$/.test(uid);
}

function sanitizeKeyword_(kw) {
  if (typeof kw !== 'string') return '';
  return kw.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, MAX_KW_LEN);
}

// ── FETCH NEWS ────────────────────────────────────────────────
/**
 * Fetches Google News RSS for the given keyword.
 * Returns: Array<article> | { error: string } | { noResults: true, message: string }
 *
 * Each article: { title, url, source, date (formatted), isoDate (yyyy-MM-dd) }
 * isoDate is pre-computed here using the script timezone so the client
 * can use it for "Today" filtering without fragile string-to-Date parsing.
 */
function fetchNews(keyword) {
  if (typeof keyword !== 'string') return { error: 'Invalid keyword.' };

  var kw = sanitizeKeyword_(keyword);
  if (!kw || kw.length < 1) return { error: 'Keyword is empty.' };

  try {
    var cleaned = kw.replace(/^"|"$/g, '').trim();
    var q       = encodeURIComponent('"' + cleaned + '"');
    var url     = 'https://news.google.com/rss/search?q=' + q
                  + '&hl=en-IN&gl=IN&ceid=IN:en';

    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions:        true,
      validateHttpsCertificates: true
    });

    if (response.getResponseCode() !== 200) {
      console.error('Fetch HTTP Error: ' + response.getResponseCode());
      return { error: 'News service unavailable. Try again later.' };
    }

    var xml = response.getContentText();

    // Pre-process: escape bare ampersands that would break the XML parser
    var safeXml = xml.replace(/&(?!(amp|lt|gt|quot|apos);)/g, '&amp;');

    var doc, channel;
    try {
      doc     = XmlService.parse(safeXml);
      channel = doc.getRootElement().getChild('channel');
    } catch (xmlError) {
      console.error('XML Parse Failed: ' + xmlError.toString());
      return { error: 'Format error from news source.' };
    }

    // Defensive: channel may not exist for empty feeds
    if (!channel) return { noResults: true, message: 'No results found.' };

    var items = channel.getChildren('item');
    if (!items || items.length === 0) {
      return { noResults: true, message: 'No results found.' };
    }

    var tz      = Session.getScriptTimeZone();
    var results = [];
    var maxScan = Math.min(items.length, 100);

    for (var i = 0; i < maxScan && results.length < FETCH_LIMIT; i++) {
      var item = items[i];

      var link = (item.getChildText('link') || '').trim();
      if (!link || !/^https?:\/\//i.test(link)) continue;

      var pubDate    = item.getChildText('pubDate') || '';
      var parsedDate = new Date(pubDate);
      if (!pubDate || isNaN(parsedDate.getTime())) continue;

      var title  = (item.getChildText('title') || '').replace(/ - [^-]+$/, '').trim();
      var source = item.getChild('source')
                     ? item.getChild('source').getText()
                     : extractDomain_(link);

      results.push({
        title:   title.slice(0, 300),
        url:     link,
        source:  (source || '').slice(0, 100),
        // Human-readable date for display
        date:    Utilities.formatDate(parsedDate, tz, 'dd MMM yyyy, HH:mm'),
        // Machine-readable date for "Today" filter — pre-computed server-side
        // to avoid fragile client-side re-parsing of the display string.
        isoDate: Utilities.formatDate(parsedDate, tz, 'yyyy-MM-dd')
      });
    }

    return results.length > 0
      ? results
      : { noResults: true, message: 'No news found.' };

  } catch (e) {
    console.error('fetchNews Failure: ' + e.toString());
    return { error: 'Failed to fetch news.' };
  }
}

// ── SAVE / LOAD KEYWORDS ──────────────────────────────────────
function saveKeywords(uid, keywords) {
  if (!isValidUID_(uid) || !Array.isArray(keywords)) return false;

  var safe = keywords
    .map(sanitizeKeyword_)
    .filter(function(k) { return k.length > 0; })
    .slice(0, MAX_KEYWORDS);

  try {
    PropertiesService.getScriptProperties()
      .setProperty('kw2_' + uid, JSON.stringify(safe));
    return true;
  } catch (e) {
    console.error('Storage Save Error: ' + e.toString());
    return false;
  }
}

function loadKeywords(uid) {
  if (!isValidUID_(uid)) return [];

  try {
    var raw = PropertiesService.getScriptProperties()
                .getProperty('kw2_' + uid);
    if (!raw) return [];

    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(sanitizeKeyword_)
      .filter(Boolean)
      .slice(0, MAX_KEYWORDS);
  } catch (e) {
    console.error('Storage Load Error: ' + e.toString());
    return [];
  }
}

// ── UTILS ─────────────────────────────────────────────────────
function extractDomain_(url) {
  try {
    var match = url.match(/^https?:\/\/([^\/]+)/i);
    return match ? match[1].replace(/^www\./i, '') : '';
  } catch (e) {
    return '';
  }
}
