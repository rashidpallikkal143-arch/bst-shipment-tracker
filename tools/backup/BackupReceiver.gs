/**
 * BST Shipment Tracker: backup receiver for the company Google account.
 * Every night the tracker's backup job sends the password-protected backup zip here.
 * This script saves it in Google Drive (folder below), removes copies older than KEEP_DAYS,
 * and (optionally) emails the file to EMAIL_TO.
 *
 * Setup: paste into a new Apps Script project in the company account, fill in the 3 settings,
 * then Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone > Deploy.
 */
const SECRET = 'PASTE-YOUR-OWN-LONG-SECRET-HERE';   // same text as the GitHub secret BACKUP_DRIVE_SECRET
const EMAIL_TO = '';                                // e.g. 'accounts@company.com' to also get each backup by email; '' = Drive only
const KEEP_DAYS = 180;                              // backups older than this are moved to the Drive bin
const FOLDER = 'BST Tracker Backups';

function doPost(e) {
  try {
    const j = JSON.parse(e.postData.contents);
    if (!SECRET || SECRET.indexOf('PASTE-') === 0 || j.secret !== SECRET) return out_({ ok: false, error: 'wrong secret' });
    const name = String(j.name || ('BST-backup-' + new Date().toISOString().slice(0, 10))).replace(/[^\w.-]/g, '_') + '.zip';
    const blob = Utilities.newBlob(Utilities.base64Decode(j.data), 'application/zip', name);
    const folder = folder_(), file = folder.createFile(blob);
    file.setDescription('BST tracker automatic backup · ' + (j.summary || '') + ' · open with 7-Zip and the backup password');
    // tidy up old copies
    const limit = Date.now() - KEEP_DAYS * 864e5, it = folder.getFiles();
    while (it.hasNext()) { const f = it.next(); if (/^BST-backup-/.test(f.getName()) && f.getDateCreated().getTime() < limit) f.setTrashed(true); }
    if (EMAIL_TO) MailApp.sendEmail({ to: EMAIL_TO, subject: 'BST tracker backup ' + name.replace('.zip', ''),
      body: 'Automatic backup of the BST Shipment Tracker.\n\n' + (j.summary || '') + '\n\nThe attached zip is locked with the backup password. Open it with 7-Zip.\nA copy is also in Google Drive, folder "' + FOLDER + '".',
      attachments: [blob] });
    return out_({ ok: true, file: file.getId(), folder: folder.getUrl() });
  } catch (err) { return out_({ ok: false, error: String(err && err.message || err) }); }
}
function doGet() { return out_({ ok: true, info: 'BST backup receiver is running. Backups are sent here automatically.' }); }
function folder_() { const f = DriveApp.getFoldersByName(FOLDER); return f.hasNext() ? f.next() : DriveApp.createFolder(FOLDER); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
/** Run once by hand (Run > testSetup) to give the script permission for Drive and Mail. */
function testSetup() { Logger.log('Drive folder: ' + folder_().getUrl()); if (EMAIL_TO) Logger.log('Emails will go to ' + EMAIL_TO + '. Mail quota left today: ' + MailApp.getRemainingDailyQuota()); }

/* ---------------------------------------------------------------------------------------------
 * Live ship tracking timer. GitHub's own schedule is irregular (often hours apart), so this
 * starts the tracker's "Live ship positions" job on GitHub every 15 minutes.
 * Needs the script property GITHUB_TOKEN (Project Settings > Script properties): a GitHub
 * fine-grained token for this repository with "Actions: Read and write".
 * Run startLiveShipTimer once to switch it on (stopLiveShipTimer switches it off).
 */
const GH_REPO = 'rashidpallikkal143-arch/bst-shipment-tracker';
function kickLiveShips() {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('Add the script property GITHUB_TOKEN first.');
  const r = UrlFetchApp.fetch('https://api.github.com/repos/' + GH_REPO + '/actions/workflows/vessels.yml/dispatches', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify({ ref: 'main' }),
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
  if (r.getResponseCode() !== 204) throw new Error('GitHub answered ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 200));
}
function startLiveShipTimer() {
  stopLiveShipTimer();
  ScriptApp.newTrigger('kickLiveShips').timeBased().everyMinutes(15).create();
  kickLiveShips();
  Logger.log('Live ship timer is on: the tracker job starts every 15 minutes.');
}
function stopLiveShipTimer() { ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'kickLiveShips'; }).forEach(function (t) { ScriptApp.deleteTrigger(t); }); }
