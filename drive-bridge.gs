/**
 * Plate & Pour  ⇄  Google Drive bridge
 * -------------------------------------
 * A tiny Google Apps Script "web app" that lets the Plate & Pour page read and
 * write ONE JSON file on Drive, with no viewer login. It runs as the Google
 * account you deploy it from, so that account must have EDIT access to the file.
 *
 * SETUP
 *  1. Sign in to https://script.google.com as  majordome@adversaire.ca
 *  2. New project → delete the sample → paste this whole file.
 *  3. Put the file's ID in FILE_ID below. (Open plate-and-pour-import.json in
 *     Drive → Share → Copy link. The ID is the long code in the link:
 *     https://drive.google.com/file/d/THIS_IS_THE_ID/view )
 *  4. Deploy → New deployment → gear icon → "Web app".
 *        Execute as:      Me (majordome@adversaire.ca)
 *        Who has access:  Anyone
 *     Click Deploy, then Authorize access and allow Drive.
 *  5. Copy the "Web app URL" (it ends in /exec).
 *  6. In Plate & Pour → Settings → paste it into the Drive URL box → Save settings.
 *
 * Now: opening the site auto-loads the shared data; Export pushes your changes
 * back to Drive; Import re-pulls the latest.
 *
 * NOTE: "Anyone" means anyone who has that /exec URL can read and overwrite the
 * file. The URL is unguessable — keep it private. It is not a password.
 */

var FILE_ID = 'PASTE_THE_FILE_ID_HERE';

function doGet(e) {
  var text = DriveApp.getFileById(FILE_ID).getBlob().getDataAsString('UTF-8');
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  DriveApp.getFileById(FILE_ID).setContent(e.postData.contents);
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
