// quran-app.js

// Import Firebase services from your configuration file
import { auth, db } from "./firebase-config.js";
import { signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Import the new modules for Listen and Read modes
import { initializeListenMode, loadListenModeData, stopPlayback } from "./listen-mode.js";
import { initializeReadMode, loadReadModeData, saveReadingProgress, loadReadingProgress } from "./read-mode.js";

// Global variables for application state
export let userId = null;
export let surahs = [];
export let scripts = [];
export let currentTab = 'listen'; // Default tab on load

// HTML element references
const userDisplayStatus = document.getElementById('user-display-status');
const loadingSpinner = document.getElementById('loading-spinner');
const errorMessage = document.getElementById('error-message');
const saveConfirmationMessage = document.getElementById('save-confirmation-message');
const tabListenBtn = document.getElementById('tab-listen');
const tabReadBtn = document.getElementById('tab-read');
const listenTabContent = document.getElementById('listen-tab-content');
const readTabContent = document.getElementById('read-tab-content');

// Firestore collection name for user progress
export const PROGRESS_COLLECTION = "userProgress";

// Utility functions (exported for use in other files)
export function showLoading() {
    if (loadingSpinner) loadingSpinner.classList.remove('hidden');
}
export function hideLoading() {
    if (loadingSpinner) loadingSpinner.classList.add('hidden');
}
export function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
}
export function clearError() {
    if (errorMessage) errorMessage.classList.add('hidden');
}
export function showConfirmation(message) {
    if (saveConfirmationMessage) {
        saveConfirmationMessage.textContent = message;
        saveConfirmationMessage.classList.remove('hidden');
        setTimeout(() => saveConfirmationMessage.classList.add('hidden'), 3000);
    }
}
function setDisplayUsername(email, uid) {
    if (userDisplayStatus) {
        if (email && uid) {
            userDisplayStatus.textContent = `Welcome, ${email} (UID: ${uid})`;
        } else if (uid) {
            userDisplayStatus.textContent = `Welcome, Guest (UID: ${uid})`;
        } else {
            userDisplayStatus.textContent = 'Welcome!';
        }
    }
}

// Fetch lists of Surahs and Scripts from API
export async function loadSurahsAndScripts() {
    showLoading();
    try {
        const [surahResponse, scriptResponse] = await Promise.all([
            fetch('https://api.alquran.cloud/v1/surah'),
            fetch('https://api.alquran.cloud/v1/edition/type/translation')
        ]);
        const surahData = await surahResponse.json();
        const scriptData = await scriptResponse.json();
        surahs = surahData.data;
        scripts = scriptData.data.filter(s => s.language === 'en' && s.format === 'text');
    } catch (error) {
        console.error("Error fetching initial data:", error);
        showError("Failed to load initial data. Please check your network connection.");
    } finally {
        hideLoading();
    }
}

// Loads and displays user progress data on the dashboard
export async function displayUserDashboard() {
    if (!userId) {
        // Clear dashboard if no user is logged in
        ['total-read-today', 'total-read-week', 'total-read-month', 'total-read-overall',
         'total-listen-today', 'total-listen-week', 'total-listen-month', 'total-listen-overall',
         'rewards-accumulated'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '0';
        });
        return;
    }
    // (The rest of the dashboard logic remains the same as your original code)
    // ... [Copy the displayUserDashboard function logic here]
    let totalReadToday = 0, totalReadWeek = 0, totalReadMonth = 0, totalReadOverall = 0;
    let totalListenToday = 0, totalListenWeek = 0, totalListenMonth = 0, totalListenOverall = 0;
    
    const today = new Date();
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const readingHistoryRef = collection(db, PROGRESS_COLLECTION, userId, "readingHistory");
    
    try {
        const snapshot = await getDocs(readingHistoryRef);
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const docDate = new Date(doc.id);
            docDate.setHours(0, 0, 0, 0);

            const read = data.read || 0;
            const listen = data.listen || 0;

            totalReadOverall += read;
            totalListenOverall += listen;

            if (docDate.toDateString() === today.toDateString()) {
                totalReadToday = read;
                totalListenToday = listen;
            }
            if (docDate >= startOfWeek) {
                totalReadWeek += read;
                totalListenWeek += listen;
            }
            if (docDate >= startOfMonth) {
                totalReadMonth += read;
                totalListenMonth += listen;
            }
        });

        document.getElementById('total-read-today').textContent = totalReadToday.toString();
        document.getElementById('total-read-week').textContent = totalReadWeek.toString();
        document.getElementById('total-read-month').textContent = totalReadMonth.toString();
        document.getElementById('total-read-overall').textContent = totalReadOverall.toString();
        document.getElementById('total-listen-today').textContent = totalListenToday.toString();
        document.getElementById('total-listen-week').textContent = totalListenWeek.toString();
        document.getElementById('total-listen-month').textContent = totalListenMonth.toString();
        document.getElementById('total-listen-overall').textContent = totalListenOverall.toString();
        document.getElementById('rewards-accumulated').textContent = (totalReadOverall + totalListenOverall).toString();

    } catch (error) {
        console.error("Error displaying user dashboard:", error);
        showError("Failed to load user progress. Please check your network.");
    }
}

// Switches between "Listen" and "Read" tabs
export async function switchTab(tabName) {
    currentTab = tabName;
    stopPlayback(); // Stop any audio if switching tabs
    
    if (tabListenBtn) tabListenBtn.classList.remove('active');
    if (tabReadBtn) tabReadBtn.classList.remove('active');
    if (listenTabContent) listenTabContent.classList.add('hidden');
    if (readTabContent) readTabContent.classList.add('hidden');
    
    if (tabName === 'listen') {
        if (tabListenBtn) tabListenBtn.classList.add('active');
        if (listenTabContent) listenTabContent.classList.remove('hidden');
        loadListenModeData();
    } else { // tabName === 'read'
        if (tabReadBtn) tabReadBtn.classList.add('active');
        if (readTabContent) readTabContent.classList.remove('hidden');
        loadReadModeData();
    }
}

// Main initialization function
async function initializeApp() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            setDisplayUsername(user.email, user.uid); 
            await Promise.all([
                loadSurahsAndScripts(),
                displayUserDashboard(),
                loadReadingProgress()
            ]);
            initializeListenMode();
            initializeReadMode();
            await switchTab(currentTab);
        } else {
            try {
                const anonymousUserCredential = await signInAnonymously(auth);
                userId = anonymousUserCredential.user.uid;
                setDisplayUsername(null, userId);
                await Promise.all([
                    loadSurahsAndScripts(),
                    displayUserDashboard(),
                    loadReadingProgress()
                ]);
                initializeListenMode();
                initializeReadMode();
                await switchTab(currentTab);
            } catch (e) {
                console.error("Error signing in anonymously:", e);
                showError("Could not sign in as guest. Please ensure Anonymous Auth is enabled.");
                userId = null;
                setDisplayUsername("Guest User (Login Failed)", null);
                await loadSurahsAndScripts();
                displayUserDashboard();
                initializeListenMode();
                initializeReadMode();
                await switchTab(currentTab);
            }
        }
    });

    // --- Tab Switching Event Listeners ---
    if (tabListenBtn) tabListenBtn.addEventListener('click', () => switchTab('listen'));
    if (tabReadBtn) tabReadBtn.addEventListener('click', () => switchTab('read'));
}

window.onload = initializeApp;
