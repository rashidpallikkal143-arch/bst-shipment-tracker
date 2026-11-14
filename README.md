# BST Shipment Tracker

Import container and shipment tracking for **Baniyas Spike Trading Co. L.L.C.**: Egypt road containers and BST Global import shipments.

- **Website / installable app:** https://bst-shipment-tracker.web.app/
- **Data:** Firebase (Firestore), protected by personal logins and user rights. No Google Sheets.
- **Apps:** iPhone / iPad (install from Safari), Android (APK), Windows (installer), Mac (DMG). Get them from the **Releases** page.

## One-time setup

### 1. Website address
The app is published to **https://bst-shipment-tracker.web.app** (Firebase Hosting) by the workflow *Publish to Firebase Hosting* after every change. It needs the repository secret `FIREBASE_SERVICE_ACCOUNT` (Firebase console → Project settings → Service accounts → Generate new private key; paste the whole JSON as the secret).

### 2. Create the Firebase database (free)
1. Go to https://console.firebase.google.com → **Add project** → name it `bst-shipment-tracker` → Google Analytics off → **Create**.
2. **Build → Authentication → Get started → Email/Password → Enable → Save.**
3. **Build → Firestore Database → Create database →** choose a location near the UAE → **Start in production mode → Create**.
4. Firestore **Rules** tab → delete everything → paste the whole file [`firestore.rules`](firestore.rules) → **Publish**.
5. **Project settings (⚙) → Your apps → Web (</>)** → nickname `BST Tracker` → **Register app** → copy the `firebaseConfig` values.
6. In this repository open [`web/js/config.js`](web/js/config.js) → ✏️ edit → paste the values (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) → **Commit changes**.

These config values are not secret. The data is protected by the logins and the rules.

### 3. Create the main admin
Open the website. It shows **First-time setup**: enter your name, an admin user ID and a password. This works only once.

### 4. Move the data from the Google Sheets
1. In the old Google Apps Script project, add the `exportForNewApp` function (it is at the end of the latest Code.gs) → choose **exportForNewApp** → **Run** → allow access.
2. Open **View → Logs** (or Google Drive) → download the file `BST tracker export ….json`.
3. In the new app: **👤 My account → Settings, import & backup → Import data** → choose the file → **Import**.

### 5. Create the users
**👤 My account → Users & rights → + Add user:** name, user ID, password, then tick the rights:

| Right | Allows |
|---|---|
| Full admin | Everything, including creating other admins |
| Manage users | Add users, change rights, switch users off |
| Egypt: view / add & edit / delete | Egypt section |
| Global import: view / add & edit / delete | BST Global Import Shipments section |
| Inspections: add & edit | Inspection records in both sections |
| Matex payments: view / add & edit | Matex payments (Egypt) |
| Settings, import & backup | Dropdown lists, transit days, months, import and backup |

Switching a user **off** blocks them immediately. People change their own password under **👤 My account**.

**Edit a user:** Users & rights → **Edit**. You can change the name, rights and status. Type a **new password** (and, if you like, a **new user ID**) to reset someone's login. The old login stops working at once; their rights and entries stay.

**Sign-ins & activity:** Users & rights → **🕘 Sign-ins & activity** shows when each person signed in (date, time, device) and everything they added, edited or deleted, with filters and an Excel (CSV) download. The history cannot be edited or removed.

**Delete a user (full admin only):** Edit → **🗑 Delete user…**. The app first lists every entry that person added or changed (Egypt, Global import, inspections, Matex). Tick "I have checked the entries" → **Delete user**. Their entries are kept. You cannot delete yourself.

## Live ship positions (free)
The tracker map shows ships live using the free service aisstream.io. A GitHub job collects positions about every 15 minutes.
1. Sign up at https://aisstream.io (Sign in with GitHub) → **API Keys** → create a key.
2. In the app: **Users & rights → + Add user**: name `AIS live tracking (system)`, user ID `ais-bot`, a long password, right **Global import: view** only.
3. GitHub repository → **Settings → Secrets and variables → Actions → New repository secret**: `AISSTREAM_KEY` (the key) and `AIS_BOT_PASSWORD` (the ais-bot password).
4. Publish the latest `firestore.rules` in Firebase (Firestore → Rules → Publish).
5. Put the **MMSI** (or IMO) number on each shipment. IMO-only ships are matched to their MMSI automatically, which can take a few rounds.

**Exact live position (free):** for every shipment with an MMSI or IMO number, the tracker opens VesselFinder's live map of that ship (land and satellite receivers). The free aisstream.io feed has almost no receivers between India, Pakistan and the UAE, so it rarely has positions for our routes.

**Optional paid feed on our own map:** buy credits at VesselFinder (api.vesselfinder.com), then add the GitHub secret `VESSELFINDER_KEY`. The live-ship job then fetches each ship's position (at most once an hour per ship, only when no free position is available) and draws it on the real map with its track.

## Purchase orders / schedules, Excel, summary report
- **📋 Purchase orders / schedules** (both sections): enter POs and dispatch schedules made by Baniyas Spike. When the invoice comes, click **➜ Make container entry / Make shipment**: the form opens filled from the PO; add the invoice and container details. The PO shows how much has been shipped.
- **📊 Excel import / export**: export any table to Excel, edit or add rows, and import it back (rows keep their ID column for updates).
- **📄 Summary report**: date-wise, month-wise, item-wise, container-wise, supplier- and shipper-wise report for any period, ready to print or save as PDF.
- In the **product tracker**, click the details on the right to edit that shipment.

## Install the apps
- **iPhone / iPad:** open the website in **Safari** → Share → **Add to Home Screen**.
- **Android:** download `BST-Shipment-Tracker-Android.apk` from Releases → open it → allow "install unknown apps". (Or in Chrome: ⋮ → Install app.)
- **Windows:** download the `.exe` from Releases → run it → "More info → Run anyway" if SmartScreen asks.
- **Mac:** download the `.dmg` → drag the app to Applications → first time: right-click → Open.
- **Any PC browser:** open the website → install icon in the address bar.

All versions open the same live website, so every update reaches every device at once.

## Making a new app release
Push a tag such as `v1.0.1` (or **Actions → Build apps → Run workflow**). GitHub builds the APK, EXE and DMG and attaches them to a new Release.

## Automatic daily backup
Every night (about 2 am UAE time) GitHub saves all data (Egypt, Global import, inspections, Matex, settings, users and rights, activity history) as a password-protected zip, kept 90 days.
Setup once:
1. In the app: **Users & rights → + Add user**: name `Automatic backup (system)`, user ID `backup-bot`, a long password, rights **Egypt: view, Global import: view, Matex payments: view** only.
2. GitHub → **Settings → Secrets and variables → Actions**: add `BACKUP_BOT_PASSWORD` (the backup-bot password) and `BACKUP_PASSWORD` (a new password that locks the backup files; keep it safe).
3. Publish the latest `firestore.rules` in Firebase.

Copy to the company Google account (Drive folder + optional email): create an Apps Script project there with [`tools/backup/BackupReceiver.gs`](tools/backup/BackupReceiver.gs), deploy it as a web app (Execute as: Me, Who has access: Anyone), then add the GitHub secrets `BACKUP_DRIVE_URL` (the web app URL) and `BACKUP_DRIVE_SECRET` (the same secret as in the script).

To restore: GitHub → **Actions → Daily backup** → open a run → **Artifacts** → download → open the zip with **7-Zip** and `BACKUP_PASSWORD` → in the app **Settings, import & backup → Import data** → choose the `.json` file (tick "replace" to go back to exactly that day).

## Backups
**👤 My account → Settings, import & backup → Download backup** saves all data as one file. Keep a weekly copy.

## Folders
- `web/`: the app (website, installable app)
- `firestore.rules`: database security rules
- `desktop/`: Windows / Mac app (Electron)
- `mobile/`: Android app (Capacitor)
- `.github/workflows/`: automatic website publishing and app builds

## Reading purchase orders from PDF files and scans

In **📋 Purchase orders / schedules → ⬆ Bulk import from Excel** you can pick PDF files and photos (.pdf, .jpg, .png, .webp) as well as Excel files, several at once.
Text PDFs are read directly (pdf.js); scanned pages and photos are read with OCR (tesseract.js, runs in the browser, nothing is uploaded).
The PO / PI number, date, supplier, port, items, pack sizes and quantities are taken from the document. Every PO read from a PDF or scan shows **Review & save**: check the fields (OCR can misread numbers) and save. POs saved this way are skipped by **Import**.
