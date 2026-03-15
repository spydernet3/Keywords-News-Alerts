// ============================================================
//  KEYWORD ALERTS — Google Apps Script Web App
//  File: Code.gs  (server-side)
// ============================================================

const FETCH_LIMIT = 40; // fetch up to 40 today articles per keyword

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Keyword Alerts')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Returns all of today's articles (up to FETCH_LIMIT) for a keyword
function fetchNews(keyword) {
  try {
    var q   = encodeURIComponent(keyword);
    var url = 'https://news.google.com/rss/search?q=' + q
            + '&hl=en-IN&gl=IN&ceid=IN:en';
    var xml = UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText();
    var doc = XmlService.parse(xml);
    var items = doc.getRootElement()
                   .getChild('channel')
                   .getChildren('item');

    var tz    = Session.getScriptTimeZone();
    var today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');

    var results = [];

    for (var i = 0; i < items.length && results.length < FETCH_LIMIT; i++) {
      var item    = items[i];
      var pubDate = item.getChildText('pubDate') || '';
      if (!pubDate) continue;

      var articleDate = Utilities.formatDate(new Date(pubDate), tz, 'yyyy-MM-dd');
      if (articleDate !== today) continue;

      var title  = (item.getChildText('title') || '').replace(/ - [^-]+$/, '').trim();
      var link   = (item.getChildText('link')  || '').trim();
      var source = item.getChild('source')
                     ? item.getChild('source').getText()
                     : extractDomain_(link);
      var date   = Utilities.formatDate(new Date(pubDate), tz, 'dd MMM yyyy, HH:mm');

      results.push({ title: title, url: link, source: source, date: date });
    }

    if (!results.length) {
      return { noResults: true, message: "No news found for today. Try again later." };
    }

    return results;

  } catch (e) {
    return { error: 'Failed to fetch: ' + e.message };
  }
}

function saveKeywords(keywords) {
  PropertiesService.getUserProperties().setProperty('keywords', JSON.stringify(keywords));
  return true;
}

function loadKeywords() {
  var raw = PropertiesService.getUserProperties().getProperty('keywords');
  return raw ? JSON.parse(raw) : [];
}

function extractDomain_(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch(e) { return ''; }
}
