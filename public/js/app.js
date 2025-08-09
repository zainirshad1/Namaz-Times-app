// Import Firebase services from your configuration file
import { auth, db } from "./firebase-config.js";
import { signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.15.0/firebase-auth.js";
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.15.0/firebase-firestore.js";

// Global variables for application state
let userId = null;
let isReadingActive = false;
let isPlaying = false;
let currentTab = 'listen'; // Default tab on load
let surahs = [];
let reciters = [];
let scripts = [];
let currentSurahData = null;
let currentSurahAudioData = null;
let listeningAyahIndex = 0;
let currentAyahIndex = 0;
let currentPlaybackSpeed = 1.0;

// Firestore collection name for user progress
const PROGRESS_COLLECTION = "userProgress";

// HTML element references
const userDisplayStatus = document.getElementById('user-display-status');
const loadingSpinner = document.getElementById('loading-spinner');
const errorMessage = document.getElementById('error-message');
const saveConfirmationMessage = document.getElementById('save-confirmation-message');
const readingSummary = document.getElementById('reading-summary');
const surahSelectRead = document.getElementById('surah-select-read');
const ayahSelect = document.getElementById('ayah-select');
const startDoneReadingBtn = document.getElementById('start-done-reading-btn');

// Utility functions
function showLoading() {
    if (loadingSpinner) {
        loadingSpinner.classList.remove('hidden');
    }
}

function hideLoading() {
    if (loadingSpinner) {
        loadingSpinner.classList.add('hidden');
    }
}

function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
}

function clearError() {
    if (errorMessage) {
        errorMessage.classList.add('hidden');
    }
}

function showConfirmation(message) {
    if (saveConfirmationMessage) {
        saveConfirmationMessage.textContent = message;
        saveConfirmationMessage.classList.remove('hidden');
        setTimeout(() => {
            saveConfirmationMessage.classList.add('hidden');
        }, 3000);
    }
}

function setDisplayUsername(email, uid) {
    if (userDisplayStatus) {
        userDisplayStatus.textContent = email ? `Welcome, ${email} (UID: ${uid})` : `Welcome, Guest (UID: ${uid})`;
    }
}

// Load reading progress
async function loadReadingProgress() {
    if (!userId) return;
    const userProgressDocRef = doc(db, PROGRESS_COLLECTION, userId);
    try {
        const docSnap = await getDoc(userProgressDocRef);
        if (docSnap.exists() && docSnap.data().lastRead) {
            const { surahNumber, ayahIndex } = docSnap.data().lastRead;
            if (surahSelectRead) surahSelectRead.value = surahNumber;
            currentAyahIndex = ayahIndex;
            showConfirmation(`Resumed from Surah ${surahNumber}, Ayah ${ayahIndex + 1}.`);
        }
    } catch (error) {
        console.error("Error loading reading progress:", error);
        showError("Failed to load reading progress. Permissions issue.");
    }
}

// Save reading progress
async function saveReadingProgress() {
    if (!userId) return;
    const userProgressDocRef = doc(db, PROGRESS_COLLECTION, userId);
    try {
        await setDoc(userProgressDocRef, {
            lastRead: {
                surahNumber: parseInt(surahSelectRead.value),
                ayahIndex: currentAyahIndex
            },
            updatedAt: serverTimestamp()
        }, { merge: true });
        showConfirmation("Reading progress saved!");
    } catch (error) {
        console.error("Error saving reading progress:", error);
        showError("Failed to save reading progress. Permissions issue.");
    }
}

// Test write operation
async function testWriteOperation() {
    if (!userId) return;
    try {
        await setDoc(doc(db, PROGRESS_COLLECTION, userId), { testField: "testValue" });
        console.log("Test write successful");
    } catch (error) {
        console.error("Test write failed:", error);
    }
}

// Initialize Firebase, authenticate user, and set up event listeners
async function initializeAppAndListeners() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            setDisplayUsername(user.email, user.uid);
            console.log("User  is authenticated. userId:", userId);
            await Promise.all([
                loadReadingProgress(),
                testWriteOperation() // Test write operation on user login
            ]);
        } else {
            try {
                const anonymousUser Credential = await signInAnonymously(auth);
                userId = anonymousUser Credential.user.uid;
                setDisplayUsername(null, userId);
                console.log("Signed in anonymously. userId:", userId);
                await testWriteOperation(); // Test write operation for anonymous user
            } catch (e) {
                console.error("Error signing in anonymously:", e);
                showError("Could not sign in as guest. Please ensure Anonymous Auth is enabled in Firebase.");
            }
        }
    });
}

// Initialize the app when the window loads
window.onload = initializeAppAndListeners;
