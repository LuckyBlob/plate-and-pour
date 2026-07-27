/**
 * Plate & Pour  ⇄  Google Drive  (+ instant GitHub mirror)
 * --------------------------------------------------------
 * A Google Apps Script "web app" that lets the Plate & Pour page read/write ONE
 * JSON file on Drive with no viewer login. On every save it ALSO pushes the same
 * data straight to the GitHub copy, so the read-only mirror (used on networks that
 * block Google, e.g. the bar) is up to date within seconds — no 15-minute wait.
 *
 * ── ONE-TIME SETUP ──────────────────────────────────────────────────────────
 * 1. script.google.com  (signed in as  majordome@adversaire.ca)  → your project.
 *
 * 2. FILE_ID: open plate-and-pour-import.json in Drive → Share → Copy link; the ID
 *    is the code in .../d/THIS_ID/view. Paste it below.
 *
 * 3. GitHub token (lets this script write the mirror):
 *    • github.com → Settings → Developer settings → Fine-grained tokens →
 *      Generate new token. Repository access: only  LuckyBlob/plate-and-pour.
 *      Permissions → Repository → Contents: Read and write. Generate, copy it.
 *    • Back in Apps Script → ⚙ Project Settings → Script properties → Add property:
 *         name  = GH_TOKEN
 *         value = <the token>
 *      (Stored on your account only — it is NEVER in the public page.)
 *
 * 4. Deploy the NEW code to the SAME url:  Deploy → Manage deployments →
 *    pencil (edit) → Version: "New version" → Deploy.  (Do NOT create a brand-new
 *    deployment — that would change the /exec URL the app is wired to.)
 *
 * If you skip step 3, saving still works (Drive only); the mirror just falls back
 * to the 15-minute scheduled refresh.
 */

var FILE_ID = 'PASTE_THE_FILE_ID_HERE';
var GH_REPO = 'LuckyBlob/plate-and-pour';
var GH_PATH = 'data.json';

function doGet(e) {
  var text = DriveApp.getFileById(FILE_ID).getBlob().getDataAsString('UTF-8');
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var body = e.postData.contents;
  DriveApp.getFileById(FILE_ID).setContent(body);      // 1) live Drive copy
  var mirror = pushToGitHub(body);                     // 2) instant GitHub mirror
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, mirror: mirror }))
    .setMimeType(ContentService.MimeType.JSON);
}

function pushToGitHub(content) {
  var token = PropertiesService.getScriptProperties().getProperty('GH_TOKEN');
  if (!token) return 'no-token';                       // fine — cron will catch up
  var api = 'https://api.github.com/repos/' + GH_REPO + '/contents/' + GH_PATH;
  var headers = { Authorization: 'token ' + token, Accept: 'application/vnd.github+json' };
  try {
    var sha = null;                                    // need the current sha to update
    var get = UrlFetchApp.fetch(api + '?ref=main', { headers: headers, muteHttpExceptions: true });
    if (get.getResponseCode() === 200) sha = JSON.parse(get.getContentText()).sha;
    var payload = {
      message: 'Sync data.json from Adversaire drive (instant)',
      content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
      branch: 'main'
    };
    if (sha) payload.sha = sha;
    var put = UrlFetchApp.fetch(api, {
      method: 'put', headers: headers, contentType: 'application/json',
      payload: JSON.stringify(payload), muteHttpExceptions: true
    });
    return put.getResponseCode();                      // 200/201 = mirrored
  } catch (err) {
    return 'error:' + err;                             // Drive still saved; cron backstop covers it
  }
}
