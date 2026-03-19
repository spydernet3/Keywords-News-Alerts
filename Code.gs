// ============================================================
//  KEYWORDS ALERT — Google Apps Script
//  File: Code.gs
//
//  DEPLOYMENT SETTING (IMPORTANT):
//  Deploy → Manage deployments → Edit → set:
//    Execute as : "User accessing the web app"
//    Who has access : "Anyone"
//  This stores each user's keywords under their own Google
//  account — permanent, private, works across devices.
// ============================================================

var FETCH_LIMIT = 50; // Google News RSS returns ~10–20 items max anyway

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Keywords Alert')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── FETCH NEWS ────────────────────────────────────────────────
// Fetches ALL articles with no date filter.
// Date filtering (Today / Anytime) is handled client-side.
// Each article includes isoDate for client-side date comparison.
function fetchNews(keyword) {
  try {
    var cleaned = keyword.replace(/^"|"$/g, '').trim();
    var q       = encodeURIComponent('"' + cleaned + '"');
    var url     = 'https://news.google.com/rss/search?q=' + q
                + '&hl=en-IN&gl=IN&ceid=IN:en';

    var xml   = UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText();
    var doc   = XmlService.parse(xml);
    var items = doc.getRootElement().getChild('channel').getChildren('item');

    var tz      = Session.getScriptTimeZone();
    var results = [];

    for (var i = 0; i < items.length && results.length < FETCH_LIMIT; i++) {
      var item    = items[i];
      var pubDate = item.getChildText('pubDate') || '';
      if (!pubDate) continue;

      var parsedDate = new Date(pubDate);
      var title   = (item.getChildText('title') || '').replace(/ - [^-]+$/, '').trim();
      var link    = (item.getChildText('link')  || '').trim();
      var source  = item.getChild('source')
                      ? item.getChild('source').getText()
                      : extractDomain_(link);
      var date    = Utilities.formatDate(parsedDate, tz, 'dd MMM yyyy, HH:mm');
      var isoDate = Utilities.formatDate(parsedDate, tz, 'yyyy-MM-dd');

      results.push({
        title:   title,
        url:     link,
        source:  source,
        date:    date,
        isoDate: isoDate
      });
    }

    if (!results.length) {
      return { noResults: true, message: 'No news found. Keyword may be too specific.' };
    }

    return results;

  } catch (e) {
    return { error: 'Fetch failed: ' + e.message };
  }
}

// ── KEYWORD STORAGE ───────────────────────────────────────────
// Stored per user on the server (Google account).
// Requires "Execute as: User accessing the web app" deployment.
// Each user's keywords are completely private and permanent.
function saveKeywords(keywords) {
  try {
    PropertiesService.getUserProperties()
      .setProperty('kw', JSON.stringify(keywords));
    return true;
  } catch(e) {
    return false;
  }
}

function loadKeywords() {
  try {
    var raw = PropertiesService.getUserProperties().getProperty('kw');
    return raw ? JSON.parse(raw) : [];
  } catch(e) {
    return [];
  }
}

// ── UTILS ─────────────────────────────────────────────────────
function extractDomain_(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch(e) { return ''; }
}
