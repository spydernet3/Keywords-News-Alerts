// ============================================================
//  KEYWORDS ALERT — Google Apps Script
//  File: Code.gs
// ============================================================

const FETCH_LIMIT = 400;

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Keywords Alert')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Fetches ALL articles (no date filter — date filtering is done client-side)
// Each article includes isoDate so client can filter Today vs Anytime
function fetchNews(keyword) {
  try {
    var cleaned = keyword.replace(/^"|"$/g, '').trim();
    var q       = encodeURIComponent('"' + cleaned + '"');
    var url     = 'https://news.google.com/rss/search?q=' + q + '&hl=en-IN&gl=IN&ceid=IN:en';

    var xml   = UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText();
    var doc   = XmlService.parse(xml);
    var items = doc.getRootElement().getChild('channel').getChildren('item');

    var tz      = Session.getScriptTimeZone();
    var results = [];

    for (var i = 0; i < items.length && results.length < FETCH_LIMIT; i++) {
      var item    = items[i];
      var pubDate = item.getChildText('pubDate') || '';
      if (!pubDate) continue;

      var title   = (item.getChildText('title') || '').replace(/ - [^-]+$/, '').trim();
      var link    = (item.getChildText('link')  || '').trim();
      var source  = item.getChild('source') ? item.getChild('source').getText() : extractDomain_(link);
      var date    = Utilities.formatDate(new Date(pubDate), tz, 'dd MMM yyyy, HH:mm');
      var isoDate = Utilities.formatDate(new Date(pubDate), tz, 'yyyy-MM-dd');

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

// Keywords are now stored in browser localStorage — NOT on server.
// These stubs exist only so the client call doesn't break.
function saveKeywords(keywords) { return true; }
function loadKeywords()         { return [];   }

function extractDomain_(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch(e) { return ''; }
}
