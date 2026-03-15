# 🔔 Keyword Alerts — Standalone Web App

> A live browser dashboard to track any keyword across Google News.  
> No API key. No sign-in. Completely free.

---

## ✨ Features

- Live browser dashboard — no spreadsheet needed
- Side-by-side keyword cards in a responsive grid
- Shows **8 articles per card** — Refresh slides to the next 8 from a pool of 40
- Today-only filtering on all fetches — no old articles
- Per-keyword independent refresh buttons
- Keywords saved automatically to your Google account (UserProperties)
- Shareable Web App URL — works on any browser, desktop or mobile

---

## 📁 Files

```
Code.gs       ← server-side backend
Index.html    ← frontend UI
```

---

## 🚀 Setup

**Step 1 — Create a new Apps Script project**

Go to [script.google.com](https://script.google.com) and click **New Project**.  
Name it anything, e.g. `Keyword Alerts Web App`.

**Step 2 — Add Code.gs**

The default file is already named `Code.gs`.  
Paste the full contents of `Code.gs` into it and press `Ctrl+S`.

**Step 3 — Add Index.html**

Click **+** next to Files → choose **HTML** → name it exactly:
```
Index
```
> ⚠️ Do NOT name it `Index.html` — Apps Script adds `.html` automatically.

Paste the full contents of `Index.html` and save.

**Step 4 — Deploy as Web App**

```
Deploy → New Deployment
```

| Setting | Value |
|---|---|
| Type | Web App |
| Execute as | Me |
| Who has access | Anyone (or "Anyone with Google account" for private use) |

Click **Deploy** and copy the **Web App URL**.

**Step 5 — Open the URL**

Paste the URL into any browser. Your app is live and ready to use.

> ⚠️ Google may show "Google hasn't verified this app".  
> Click **Advanced → Go to project (unsafe) → Allow**. This is safe — you are the developer.

---

## 🖥️ How to Use

| Action | How |
|---|---|
| Add a keyword | Type in the input box and click **+ Add** or press `Enter` |
| Remove a keyword | Click **✕** on the keyword pill |
| Fetch news | Click **↻ Refresh All** to load all keywords at once |
| Refresh one topic | Click **↻ Refresh** inside that keyword's card |
| See next 8 articles | Click **↻ Refresh** again — slides to the next 8 from the pool |
| Open an article | Click **Read ↗** on any news item |
| Clear everything | Click **✕ Clear All** in the actions bar |

---

## 📄 Pagination — How It Works

When you first refresh a keyword the server fetches up to **40 of today's articles** and stores them in a local pool. The card shows the first 8.

Each time you click **↻ Refresh** on a card:

- **Pool has more articles** → next 8 shown instantly, no server call
- **Pool exhausted** → fresh fetch of 40 articles from server, restarts from top

A page counter badge in each card header (e.g. `1–8 of 24 today`) shows exactly where you are in the pool.

---

## 💾 Keyword Persistence

Keywords are stored in **Google UserProperties** (server-side, tied to your Google account).  
They persist between sessions — your keyword list will be there the next time you open the web app URL.

---

## 🔁 Redeployment — After Any Code Change

Every time you edit `Code.gs` or `Index.html` you must create a new deployment version:

```
Deploy → Manage Deployments → Edit (pencil icon) → New version → Deploy
```

> The Web App URL stays the same after redeployment.

---

## 🗂️ Project Structure

```
your-repo/
├── Code.gs        ← Server: fetches RSS, saves keywords, serves HTML
└── Index.html     ← Client: keyword cards, refresh buttons, results UI
```

---

## 🔧 How It Works — Technical Details

**Fetching**  
`Code.gs` wraps the keyword in quotes (e.g. `"AI regulation"`) before querying Google News RSS via `UrlFetchApp`. This forces an exact phrase match at the RSS level, reducing noise before any client-side filtering.

**Today filter**  
Each article's `pubDate` is compared to today's date in the script timezone. Articles from any other date are discarded server-side before being returned to the browser.

**Refresh button reliability**  
Inline `onclick` handlers break when keywords contain spaces, quotes, or special characters. Instead each refresh button stores the keyword in a `data-refresh-kw` attribute. A single delegated event listener on the stable parent container catches all clicks. This survives `innerHTML` updates and works for any keyword regardless of its content.

**Pagination**  
The full pool of up to 40 articles is returned in a single server call and stored in the browser. Subsequent refresh clicks slice through the pool client-side with no additional server calls. When the pool is exhausted the next click triggers a fresh server fetch.

---

## 🌍 Region

Results default to **India (IN)**. To change the region, edit this line in `Code.gs`:

```javascript
const url = "https://news.google.com/rss/search?q=" + q
          + "&hl=en-IN&gl=IN&ceid=IN:en";
```

| Code | Region |
|---|---|
| `en-IN / IN` | India (default) |
| `en-US / US` | United States |
| `en-GB / GB` | United Kingdom |
| `en-AU / AU` | Australia |
| `en-SG / SG` | Singapore |

---

## ⚠️ Common Issues

| Issue | Fix |
|---|---|
| "Google hasn't verified this app" | Click **Advanced → Go to project (unsafe) → Allow**. Safe because you are the developer. |
| No articles showing after refresh | The keyword may have no coverage today. Try a broader keyword. |
| Refresh button not responding | Make sure you redeployed after the last code change (`Deploy → New version`). |
| Keywords lost after reopening | Check that `saveKeywords()` ran — open browser console for errors. |
| Changes not reflected after editing | You must create a new deployment version — editing and saving alone is not enough. |

---

## 📌 Notes

- No API key required — uses Google News RSS via Apps Script's built-in `UrlFetchApp`
- No third-party service — everything runs inside Google's infrastructure
- Free — runs within Google Apps Script's free quota limits
- Data source — Google News RSS, the same feed that powers Google Alerts

---

## 📄 License

MIT — free to use, modify, and distribute.
