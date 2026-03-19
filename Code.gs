// ============================================================
//  KEYWORDS ALERT — Google Apps Script
//  File: Code.gs
//
//  DEPLOYMENT SETTING:
//  Deploy → Manage deployments → Edit → set:
//    Execute as  : "Me (owner)"       ← keep as default
//    Who has access : "Anyone"
//
//  HOW PRIVACY WORKS:
//  Each user's browser generates a unique random ID on first
//  visit (stored in their localStorage). Keywords are saved
//  on the server keyed by that ID — so every user's keywords
//  are completely separate. No Google login required.
// ============================================================

var FETCH_LIMIT = 50;

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Keywords Alert')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── FETCH NEWS ────────────────────────────────────────────────
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

      results.push({ title: title, url: link, source: source, date: date, isoDate: isoDate });
    }

    if (!results.length) {
      return { noResults: true, message: 'No news found. Keyword may be too specific.' };
    }

    return results;

  } catch (e) {
    return { error: 'Fetch failed: ' + e.message };
  }
}

// ── KEYWORD STORAGE — keyed by unique browser ID ─────────────
// ScriptProperties is shared storage, but we namespace each
// user's data under their own unique ID: "kw_<uid>"
// So user A's keywords are completely invisible to user B.

function saveKeywords(uid, keywords) {
  try {
    if (!uid || typeof uid !== 'string' || uid.length < 8) return false;
    // Sanitize key — only allow alphanumeric + underscore
    var safeUid = uid.replace(/[^a-zA-Z0-9_]/g, '');
    PropertiesService.getScriptProperties()
      .setProperty('kw_' + safeUid, JSON.stringify(keywords));
    return true;
  } catch(e) {
    return false;
  }
}

function loadKeywords(uid) {
  try {
    if (!uid || typeof uid !== 'string' || uid.length < 8) return [];
    var safeUid = uid.replace(/[^a-zA-Z0-9_]/g, '');
    var raw = PropertiesService.getScriptProperties()
                .getProperty('kw_' + safeUid);
    return raw ? JSON.parse(raw) : [];
  } catch(e) {
    return [];
  }
}

// ── UTILS ─────────────────────────────────────────────────────
function extractDomain_(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch(e) { return ''; }
}
