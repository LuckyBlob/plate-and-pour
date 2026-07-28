/**
 * Quizz Adversaire  ⇄  Google Sheets
 * ---------------------------------------------------------------------------
 * A Google Apps Script "web app" that hands the quizz page every tab of the
 * results spreadsheet as JSON, with no viewer login. Each tab is one season, so
 * a new season needs NOTHING here and NOTHING on the web page — add the tab in
 * the sheet and it shows up on the site.
 *
 * ── ONE-TIME SETUP ─────────────────────────────────────────────────────────
 * 1. script.google.com  (signed in as the account that OWNS the quizz sheet)
 *    → New project → paste this file over the default Code.gs.
 *
 * 2. SHEET_ID: open the quizz spreadsheet → the ID is the code in the URL,
 *    docs.google.com/spreadsheets/d/THIS_ID/edit. Paste it below.
 *
 * 3. Deploy → New deployment → type "Web app":
 *       Execute as:      Me
 *       Who has access:  Anyone            ← required; "Anyone with Google
 *                                            account" would lock out visitors
 *    Deploy → authorise → copy the /exec URL. That URL goes in ENDPOINT at the
 *    top of quizz-embed.html.
 *
 * The sheet itself can stay private — the script reads it as you, and only ever
 * hands out the cells, never write access.
 *
 * ── WHEN YOU EDIT THIS FILE LATER ──────────────────────────────────────────
 * Deploy → Manage deployments → pencil (edit) → Version: "New version" →
 * Deploy. Do NOT create a brand-new deployment: that changes the /exec URL and
 * the page would still be pointing at the old one.
 *
 * ── WHAT IT RETURNS ────────────────────────────────────────────────────────
 *   { "updated": "2026-07-28T18:04:11.000Z",
 *     "seasons": [ { "name": "Saison 2026",
 *                    "rows": [ ["Équipes","08-07-2026", …], ["A","15","6", …] ] } ] }
 *
 * Cells come back exactly as they READ in the sheet (display values), so the
 * date format you use there is the one the page shows. All scoring — who won a
 * round, who won the night, the standings — is worked out in the page, not
 * here, so the rules can change without a redeploy.
 */

var SHEET_ID = 'PASTE_THE_SPREADSHEET_ID_HERE';

// 0 = never cache: a corrected sheet shows up on the very next page load, which
// is the whole point. (The page asks for ?fresh=1 anyway, so it already bypasses
// any cache — raising this only ever adds a delay for someone.)
var CACHE_SECONDS = 0;

function doGet(e) {
  var params = (e && e.parameter) || {};
  var payload = params.fresh ? null : readCache_();
  if (!payload) {
    payload = buildPayload_();
    writeCache_(payload);
  }

  // JSONP fallback, for the rare host page whose CSP blocks a cross-site fetch.
  var cb = params.callback;
  if (cb && /^[A-Za-z0-9_$][A-Za-z0-9_$.]*$/.test(cb)) {
    return ContentService
      .createTextOutput(cb + '(' + payload + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

function buildPayload_() {
  var sheets = SpreadsheetApp.openById(SHEET_ID).getSheets();
  var seasons = [];
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    if (sh.isSheetHidden()) continue;                 // hidden tab = scratch work
    if (sh.getName().charAt(0) === '_') continue;     // name it _notes to hide it
    if (sh.getLastRow() < 2 || sh.getLastColumn() < 2) continue;
    seasons.push({
      name: sh.getName(),
      rows: sh.getDataRange().getDisplayValues()
    });
  }
  return JSON.stringify({ updated: new Date().toISOString(), seasons: seasons });
}

function readCache_() {
  if (!CACHE_SECONDS) return null;
  try { return CacheService.getScriptCache().get('quizz'); }
  catch (err) { return null; }
}

function writeCache_(payload) {
  if (!CACHE_SECONDS) return;
  if (payload.length > 90000) return;                 // over the cache's limit
  try { CacheService.getScriptCache().put('quizz', payload, CACHE_SECONDS); }
  catch (err) { /* cache is a nicety; never let it break the response */ }
}

/** Run this once from the editor to check the sheet is readable. */
function testRead() {
  var data = JSON.parse(buildPayload_());
  Logger.log('Saisons: ' + data.seasons.length);
  data.seasons.forEach(function (s) {
    Logger.log('· ' + s.name + ' — ' + s.rows.length + ' lignes × ' + s.rows[0].length + ' colonnes');
  });
}
