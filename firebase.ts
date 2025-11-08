import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// !!! IMPORTANT: REPLACE WITH YOUR ACTUAL FIREBASE CONFIG !!!
// You can find this in your Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID"
};

// Initialize Firebase only if config is present to avoid immediate crash on load if not configured
let app;
let auth;
let db;

try {
    // Simple check to see if it's still the placeholder
    if (firebaseConfig.apiKey === "REPLACE_WITH_YOUR_API_KEY") {
        console.warn("StoreMaster: Firebase is not configured. Please update firebase.ts with your credentials.");
    } else {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
}

export { auth, db };
