/*
 * BST Shipment Tracker: Firebase settings.
 *
 * Paste your Firebase web app config below (Firebase console > Project settings > Your apps > Web app > "SDK setup and configuration" > Config).
 * These values are not secret: your data is protected by the logins and the Firestore security rules (firestore.rules).
 *
 * While apiKey still says PASTE_YOUR_API_KEY the app runs in DEMO MODE: everything works, but data is saved only on this device.
 */
window.BST_FIREBASE_CONFIG = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000"
};

/* Domain used to turn a user ID (e.g. "rashid") into a Firebase login name (rashid@users.bst-tracker.app). Leave as is. */
window.BST_LOGIN_DOMAIN = "users.bst-tracker.app";
