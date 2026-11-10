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

## Install the apps
- **iPhone / iPad:** open the website in **Safari** → Share → **Add to Home Screen**.
- **Android:** download `BST-Shipment-Tracker-Android.apk` from Releases → open it → allow "install unknown apps". (Or in Chrome: ⋮ → Install app.)
- **Windows:** download the `.exe` from Releases → run it → "More info → Run anyway" if SmartScreen asks.
- **Mac:** download the `.dmg` → drag the app to Applications → first time: right-click → Open.
- **Any PC browser:** open the website → install icon in the address bar.

All versions open the same live website, so every update reaches every device at once.

## Making a new app release
Push a tag such as `v1.0.1` (or **Actions → Build apps → Run workflow**). GitHub builds the APK, EXE and DMG and attaches them to a new Release.

## Backups
**👤 My account → Settings, import & backup → Download backup** saves all data as one file. Keep a weekly copy.

## Folders
- `web/`: the app (website, installable app)
- `firestore.rules`: database security rules
- `desktop/`: Windows / Mac app (Electron)
- `mobile/`: Android app (Capacitor)
- `.github/workflows/`: automatic website publishing and app builds
