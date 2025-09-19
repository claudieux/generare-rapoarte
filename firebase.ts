
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// --- Firebase Configuration ---
// IMPORTANT: To enable the "Save & Load" feature, you must replace the placeholder
// values below with your own Firebase project's configuration.
// You can find this configuration in your Firebase project settings page.
const firebaseConfig = {
  apiKey: "AIzaSyDHCUsPv3p7dd_tc_qC6TyBKAWHhFnskx4",
  authDomain: "dci-screening.firebaseapp.com",
  projectId: "dci-screening",
  storageBucket: "dci-screening.firebasestorage.app",
  messagingSenderId: "423342387154",
  appId: "1:423342387154:web:646b2ea099de5b84f6620b"
};

// --- IMPORTANT SETUP NOTE ---
// For Firestore to work, you must not only provide the config above,
// but also go to your Firebase project console, navigate to the
// "Firestore Database" section, and click "Create database".
// If you've done this and still face connection issues, check your
// Firestore security rules.

let app: FirebaseApp;
let db: Firestore;
let isFirebaseConfigured = false;

// Initialize Firebase only if a valid projectId is provided (i.e., not a placeholder).
// This prevents the app from crashing if the configuration is missing.
if (firebaseConfig.projectId && firebaseConfig.projectId !== "YOUR_PROJECT_ID") {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        isFirebaseConfigured = true;
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        alert("Firebase initialization failed. Please check your configuration in firebase.ts and the browser console for more details.");
    }
} else {
    console.warn("Firebase is not configured. 'Save & Load' functionality is disabled. Please update firebase.ts with your project configuration.");
}

// Export the initialized instances and the configuration status.
// `db` will be undefined if config is missing, so components must check `isFirebaseConfigured`.
export { db, isFirebaseConfigured };