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
