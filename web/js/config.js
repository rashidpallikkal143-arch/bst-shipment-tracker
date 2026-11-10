/*
 * BST Shipment Tracker: Firebase settings.
 *
 * Paste your Firebase web app config below (Firebase console > Project settings > Your apps > Web app > "SDK setup and configuration" > Config).
 * These values are not secret: your data is protected by the logins and the Firestore security rules (firestore.rules).
 *
 * While apiKey still says PASTE_YOUR_API_KEY the app runs in DEMO MODE: everything works, but data is saved only on this device.
 */
window.BST_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCPA9zRypd6VjgVfdOTi_lkqOCRnMIxdqU",
  authDomain: "bst-shipment-tracker.firebaseapp.com",
  projectId: "bst-shipment-tracker",
  storageBucket: "bst-shipment-tracker.firebasestorage.app",
  messagingSenderId: "221792945705",
  appId: "1:221792945705:web:261da65ab6d1074629fe38"
};

/* Domain used to turn a user ID (e.g. "rashid") into a Firebase login name (rashid@users.bst-tracker.app). Leave as is. */
window.BST_LOGIN_DOMAIN = "users.bst-tracker.app";
