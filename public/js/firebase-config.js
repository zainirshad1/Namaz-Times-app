// public/js/firebase-config.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAhPYAh6wrTzlIdDPmomsFWDOquKlyG6Pk",
    authDomain: "namaz-times-app.firebaseapp.com",
    projectId: "namaz-times-app",
    storageBucket: "namaz-times-app.firebasestorage.app",
    messagingSenderId: "974582220585",
    appId: "1:974582220585:web:092a933942836566f95938",
    measurementId: "G-3CTLSN6BLS"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export all the initialized services.
// The key is to also export 'app' under the name 'firebaseApp'
// to match the import statement in main.js.
export { app, analytics, auth, db, storage };
export const firebaseApp = app;	
