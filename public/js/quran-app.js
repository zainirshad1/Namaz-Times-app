// Import Firebase services from your configuration file
import { auth, db } from "./firebase-config.js";
import { signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getDoc, collection, getDocs, doc, setDoc, updateDoc, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Import functions from refactored modules with updated paths
import { fetchSurahs, fetchReciters, fetchScripts, fetchSurahData, fetchSurahAudio } from './Quran/quran-api.js';
import {
    displaySingleAyah, populateAyahDropdown, updateReadTabUIState,
    updateDailyReadCount, loadReadingProgress, saveReadingProgress, updateRewardsEarned
} from './Quran/quran-read.js';
import {
    displayFullSurah, stopPlayback, startRecitation, playNextAyah,
    highlightAyah, updateDailyListenCount
} from './Quran/quran-listen.js';
import { navigatePreviousAyah, navigateNextAyah } from './Quran/quran-read.js';

console.log("DB object on quran-app.js import:", db);

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

// HTML element references (all checked for null before use)
const userDisplayStatus = document.getElementById('user-display-status');
const loadingSpinner = document.getElementById('loading-spinner');
const errorMessage = document.getElementById('error-message');
const saveConfirmationMessage = document.getElementById('save-confirmation-message');
const readingSummary = document.getElementById('reading-summary');

const surahSelect = document.getElementById('surah-select');
const reciterSelect = document.getElementById('reciter-select');
const speedSelect = document.getElementById('speed-select');
const scriptSelect = document.getElementById('script-select');
const playPauseBtn = document.getElementById('play-pause-btn');
const stopBtn = document.getElementById('stop-btn');
const quranAudio = document.getElementById('quran-audio');
const quranDisplay = document.getElementById('quran-display');

const tabListenBtn = document.getElementById('tab-listen');
const tabReadBtn = document.getElementById('tab-read');
const listenTabContent = document.getElementById('listen-tab-content');
const readTabContent = document.getElementById('read-tab-content');

const surahSelectRead = document.getElementById('surah-select-read');
const ayahSelect = document.getElementById('ayah-select');
const scriptSelectRead = document.getElementById('script-select-read');
const prevAyahBtn = document.getElementById('prev-ayah-btn');
const nextAyahBtn = document.getElementById('next-ayah-btn');
const startDoneReadingBtn = document.getElementById('start-done-reading-btn');
const quranDisplayRead = document.getElementById('quran-display-read');

const reciterContainer = document.getElementById('reciter-container');
const speedContainer = document.getElementById('speed-container');
const scriptContainer = document.getElementById('script-container');
const scriptContainerRead = document.getElementById('script-container-read');


/**
 * Utility function to show the loading spinner.
 */
function showLoading() {
    if (loadingSpinner) {
        loadingSpinner.classList.remove('hidden');
    }
}

/**
 * Utility function to hide the loading spinner.
 */
function hideLoading() {
    if (loadingSpinner) {
        loadingSpinner.classList.add('hidden');
    }
}

/**
 * Utility function to display an error message.
 * @param {string} message - The error message to display.
 */
function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
}

/**
 * Utility function to clear any displayed error messages.
 */
function clearError() {
    if (errorMessage) {
        errorMessage.classList.add('hidden');
    }
}

/**
 * Utility function to display a confirmation message.
 * @param {string} message - The confirmation message to display.
 */
function showConfirmation(message) {
    if (saveConfirmationMessage) {
        saveConfirmationMessage.textContent = message;
        saveConfirmationMessage.classList.remove('hidden');
        setTimeout(() => {
            saveConfirmationMessage.classList.add('hidden');
        }, 3000); // Hide after 3 seconds
    }
}

/**
 * Updates the user's display name or status including UID.
 * @param {string} email - The user's email.
 * @param {string} uid - The user's UID.
 */
function setDisplayUsername(email, uid) {
    if (userDisplayStatus) {
        if (email && uid) {
            userDisplayStatus.textContent = `Welcome, ${email} (UID: ${uid})`;
        } else if (uid) { // For anonymous users, email might be null
            userDisplayStatus.textContent = `Welcome, Guest (UID: ${uid})`;
        } else {
            userDisplayStatus.textContent = 'Welcome!';
        }
    }
}

/**
 * Populates a given select element with options based on provided data.
 * @param {HTMLElement} selectElement - The select element to populate.
 * @param {Array} data - The array of data to create options from.
 * @param {string} valueKey - The key in each data object to use for the option's value.
 * @param {string} textKey - The key in each data object to use for the option's text.
 * @param {string} [englishTextKey] - An optional key for English text to append.
 */
function populateSelect(selectElement, data, valueKey, textKey, englishTextKey) {
    if (selectElement) {
        selectElement.innerHTML = '';
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueKey];
            option.textContent = item[textKey];
            if (englishTextKey && item[englishTextKey]) {
                option.textContent += ` (${item[englishTextKey]})`;
            }
            selectElement.appendChild(option);
        });
    }
}


/**
 * Loads and displays user progress data on the dashboard.
 * @param {string} currentUserId - The current user's UID.
 * @param {object} firestoreDb - The Firestore database instance.
 */
async function displayUserDashboard(currentUserId, firestoreDb) {
    if (!currentUserId) {
        // Clear dashboard if no user is logged in
        document.getElementById('total-read-today').textContent = '0';
        document.getElementById('total-read-week').textContent = '0';
        document.getElementById('total-read-month').textContent = '0';
        document.getElementById('total-read-overall').textContent = '0';
        document.getElementById('total-listen-today').textContent = '0';
        document.getElementById('total-listen-week').textContent = '0';
        document.getElementById('total-listen-month').textContent = '0';
        document.getElementById('total-listen-overall').textContent = '0';
        document.getElementById('rewards-accumulated').textContent = '0';
        document.getElementById('rewards-redeemed').textContent = '0'; 
        document.getElementById('rewards-available').textContent = '0'; 
        return;
    }

    let totalReadToday = 0, totalReadWeek = 0, totalReadMonth = 0, totalReadOverall = 0;
    let totalListenToday = 0, totalListenWeek = 0, totalListenMonth = 0, totalListenOverall = 0;
    let rewardsEarned = 0, rewardsRedeemed = 0, rewardsAvailable = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for accurate daily comparison

    // Calculate start of week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Calculate start of month (1st day)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    try {
        // Fetch daily read logs from 'users/{userId}/dailyReadLogs' collection
        const readLogsRef = collection(firestoreDb, "users", currentUserId, "dailyReadLogs");
        const readSnapshot = await getDocs(readLogsRef);
        readSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            const docDate = new Date(docSnap.id); // Assuming YYYY-MM-DD string ID
            docDate.setHours(0, 0, 0, 0);

            const count = data.count || 0;
            totalReadOverall += count;

            if (docDate.getTime() === today.getTime()) {
                totalReadToday = count;
            }
            if (docDate >= startOfWeek) {
                totalReadWeek += count;
            }
            if (docDate >= startOfMonth) {
                totalReadMonth += count;
            }
        });

        // Fetch daily listen logs from 'users/{userId}/dailyListenLogs' collection
        const listenLogsRef = collection(firestoreDb, "users", currentUserId, "dailyListenLogs");
        const listenSnapshot = await getDocs(listenLogsRef);
        listenSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            const docDate = new Date(docSnap.id); // Assuming YYYY-MM-DD string ID
            docDate.setHours(0, 0, 0, 0);

            const count = data.count || 0;
            totalListenOverall += count;

            if (docDate.getTime() === today.getTime()) {
                totalListenToday = count;
            }
            if (docDate >= startOfWeek) {
                totalListenWeek += count;
            }
            if (docDate >= startOfMonth) {
                totalListenMonth += count;
            }
        });

        // Fetch rewards summary from 'users/{userId}/quranData/rewardsTotals' document
        const rewardsSummaryRef = doc(firestoreDb, "users", currentUserId, "quranData", "rewardsTotals");
        const rewardsSnap = await getDoc(rewardsSummaryRef);
        if (rewardsSnap.exists()) {
            const data = rewardsSnap.data();
            rewardsEarned = data.rewardsEarned || 0; 
            rewardsRedeemed = data.rewardsRedeemed || 0; 
            rewardsAvailable = data.rewardsAvailable || 0; 
        }

        document.getElementById('total-read-today').textContent = totalReadToday.toString();
        document.getElementById('total-read-week').textContent = totalReadWeek.toString();
        document.getElementById('total-read-month').textContent = totalReadMonth.toString();
        document.getElementById('total-read-overall').textContent = totalReadOverall.toString();
        document.getElementById('total-listen-today').textContent = totalListenToday.toString();
        document.getElementById('total-listen-week').textContent = totalListenWeek.toString();
        document.getElementById('total-listen-month').textContent = totalListenMonth.toString();
        document.getElementById('total-listen-overall').textContent = totalListenOverall.toString();
        document.getElementById('rewards-accumulated').textContent = rewardsEarned.toString();
        document.getElementById('rewards-redeemed').textContent = rewardsRedeemed.toString(); 
        document.getElementById('rewards-available').textContent = rewardsAvailable.toString(); 

    } catch (error) {
        console.error("Error displaying user dashboard:", error);
        showError("Failed to load user progress. Please check your network and Firebase rules.");
    }
}


/**
 * Switches between "Listen" and "Read" tabs.
 * @param {string} tabName - 'listen' or 'read'.
 */
async function switchTab(tabName) {
    currentTab = tabName;
    listeningAyahIndex = stopPlayback(quranAudio, playPauseBtn, quranDisplay, listeningAyahIndex);
    isReadingActive = false;
    
    if (tabListenBtn) tabListenBtn.classList.remove('active');
    if (tabReadBtn) tabReadBtn.classList.remove('active');

    if (listenTabContent) listenTabContent.classList.add('hidden');
    if (readTabContent) readTabContent.classList.add('hidden');
    
    if (reciterContainer) reciterContainer.classList.add('hidden');
    if (speedContainer) speedContainer.classList.add('hidden');
    if (scriptContainer) scriptContainer.classList.add('hidden');
    if (scriptContainerRead) scriptContainerRead.classList.add('hidden');

    showLoading();
    clearError();
    try {
        if (tabName === 'listen') {
            if (tabListenBtn) tabListenBtn.classList.add('active');
            if (listenTabContent) listenTabContent.classList.remove('hidden');
            if (reciterContainer) reciterContainer.classList.remove('hidden');
            if (speedContainer) speedContainer.classList.remove('hidden');
            if (scriptContainer) scriptContainer.classList.remove('hidden');
            
            const selectedSurah = surahSelect ? surahSelect.value : '1';
            const selectedScript = scriptSelect ? scriptSelect.value : 'en.ahmedali';
            const selectedReciter = reciterSelect ? reciterSelect.value : 'ar.alafasy';

            currentSurahData = await fetchSurahData(selectedSurah, selectedScript);
            currentSurahAudioData = await fetchSurahAudio(selectedSurah, selectedReciter);
            displayFullSurah(currentSurahData, quranDisplay, quranAudio, highlightAyah);

        } else { // tabName === 'read'
            if (tabReadBtn) tabReadBtn.classList.add('active');
            if (readTabContent) readTabContent.classList.remove('hidden');
            if (scriptContainerRead) scriptContainerRead.classList.remove('hidden');
            
            const selectedSurahRead = surahSelectRead ? surahSelectRead.value : '1';
            const selectedScriptRead = scriptSelectRead ? scriptSelectRead.value : 'en.ahmedali';
            
            currentSurahData = await fetchSurahData(selectedSurahRead, selectedScriptRead);
            displaySingleAyah(currentAyahIndex, currentSurahData, quranDisplayRead, ayahSelect);
            populateAyahDropdown(currentSurahData, ayahSelect, currentAyahIndex);
        }
    } catch (error) {
        console.error("Error switching tab or loading initial tab data:", error);
        showError("Failed to load tab content. Please check your network and selected options.");
    } finally {
        hideLoading();
    }
    updateReadTabUIState(startDoneReadingBtn, isReadingActive);
}


/**
 * Initializes Firebase, authenticates user, and sets up all event listeners.
 */
async function initializeAppAndListeners() {
    try {
        // No direct signInAnonymously call here.
        // onAuthStateChanged will handle initial session detection and anonymous sign-in.
    } catch (e) {
        console.error("Error during initial app setup:", e);
        showError("Could not initialize app. Please check your network and Firebase Auth settings.");
    }

    // Listen for Firebase authentication state changes
    onAuthStateChanged(auth, async (user) => {
        console.log("onAuthStateChanged triggered. Initial user:", user ? user.uid : "null");
        if (user) {
            userId = user.uid;
            setDisplayUsername(user.email, user.uid);
            console.log("onAuthStateChanged: User is authenticated. userId:", userId);
            
            // --- Ensure the user's root document and new grouping documents/collections exist ---
            const userDocRef = doc(db, "users", userId);
            // Paths for new collections with a document inside them
            const profileDocRef = doc(db, "users", userId, "personalDetails", "profile");
            const quranDataSummaryDocRef = doc(db, "users", userId, "quranData", "quranSummary");
            const quranDataRewardsDocRef = doc(db, "users", userId, "quranData", "rewardsTotals");
            const quranDataLastReadDocRef = doc(db, "users", userId, "quranData", "lastReadProgress");
            const appSettingsDocRef = doc(db, "users", userId, "appSettings", "defaults");

            try {
                // Ensure the top-level user document exists
                await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
                // Create the default documents within the new collections
                await setDoc(profileDocRef, {}, { merge: true });
                await setDoc(appSettingsDocRef, {}, { merge: true });
                await setDoc(quranDataSummaryDocRef, {}, { merge: true }); // General summary for quranData
                await setDoc(quranDataRewardsDocRef, { rewardsEarned: 0, rewardsRedeemed: 0, rewardsAvailable: 0 }, { merge: true }); // Initialize rewards

                // Initialize quranDataLastReadDocRef ONLY if it doesn't exist
                const lastReadProgressSnap = await getDoc(quranDataLastReadDocRef);
                if (!lastReadProgressSnap.exists()) {
                    await setDoc(quranDataLastReadDocRef, { surahNumber: 1, ayahIndex: 0, updatedAt: serverTimestamp() });
                    console.log("Initialized last read progress for new user/document:", userId);
                } else {
                    console.log("lastReadProgress document already exists for user:", userId);
                }
                console.log("Firebase structure initialized/verified for user:", userId);

            } catch (e) {
                console.error("Error ensuring user/grouping documents exist:", e);
                showError("Failed to initialize user profile structure.");
            }
            // --- END NEW ---

            showLoading();
            try {
                const [fetchedSurahs, fetchedReciters, fetchedScripts] = await Promise.all([
                    fetchSurahs(),
                    fetchReciters(),
                    fetchScripts()
                ]);

                surahs = fetchedSurahs;
                reciters = fetchedReciters;
                scripts = fetchedScripts;

                populateSelect(surahSelect, surahs, 'number', 'name', 'englishName');
                populateSelect(surahSelectRead, surahs, 'number', 'name', 'englishName');
                populateSelect(reciterSelect, reciters, 'identifier', 'name', 'englishName');
                populateSelect(scriptSelect, scripts, 'identifier', 'englishName');
                populateSelect(scriptSelectRead, scripts, 'identifier', 'englishName');

                await displayUserDashboard(userId, db);
                const lastReadData = await loadReadingProgress(userId, db, surahSelectRead, showConfirmation, showError);
                if (lastReadData) {
                    currentAyahIndex = lastReadData.ayahIndex; 
                    if (surahSelectRead) surahSelectRead.value = lastReadData.surahNumber;
                    console.log("Loaded last read progress:", lastReadData);
                } else {
                    console.log("No last read progress found for user:", userId, "Starting from Surah 1, Ayah 1.");
                    currentAyahIndex = 0; // Default to first ayah
                    if (surahSelectRead) surahSelectRead.value = '1'; // Default to first surah
                }

                await switchTab(currentTab);
            } catch (error) {
                console.error("Error loading initial data:", error);
                showError("Failed to load essential app data. Please refresh.");
            } finally {
                hideLoading();
            }

        } else { // Anonymous user scenario
            try {
                const anonymousUserCredential = await signInAnonymously(auth);
                userId = anonymousUserCredential.user.uid;
                setDisplayUsername(null, userId);
                console.log("onAuthStateChanged: Successfully signed in anonymously. New userId:", userId);
                
                // --- Ensure the anonymous user's root document and new grouping documents/collections exist ---
                const userDocRef = doc(db, "users", userId);
                const profileDocRef = doc(db, "users", userId, "personalDetails", "profile");
                const quranDataSummaryDocRef = doc(db, "users", userId, "quranData", "quranSummary");
                const quranDataRewardsDocRef = doc(db, "users", userId, "quranData", "rewardsTotals");
                const quranDataLastReadDocRef = doc(db, "users", userId, "quranData", "lastReadProgress");
                const appSettingsDocRef = doc(db, "users", userId, "appSettings", "defaults");
                try {
                    await setDoc(userDocRef, { lastLogin: serverTimestamp(), isAnonymous: true }, { merge: true }); 
                    await setDoc(profileDocRef, {}, { merge: true });
                    await setDoc(appSettingsDocRef, {}, { merge: true });
                    await setDoc(quranDataSummaryDocRef, {}, { merge: true });
                    await setDoc(quranDataRewardsDocRef, { rewardsEarned: 0, rewardsRedeemed: 0, rewardsAvailable: 0 }, { merge: true }); // Initialize rewards
                    
                    // Initialize quranDataLastReadDocRef ONLY if it doesn't exist for anonymous users
                    const lastReadProgressSnap = await getDoc(quranDataLastReadDocRef);
                    if (!lastReadProgressSnap.exists()) {
                        await setDoc(quranDataLastReadDocRef, { surahNumber: 1, ayahIndex: 0, updatedAt: serverTimestamp() });
                        console.log("Initialized last read progress for new anonymous user/document:", userId);
                    } else {
                        console.log("lastReadProgress document already exists for anonymous user:", userId);
                    }
                    console.log("Firebase structure initialized/verified for anonymous user:", userId);
                } catch (e) {
                    console.error("Error ensuring anonymous user/grouping documents exist:", e);
                    showError("Failed to initialize anonymous user profile structure.");
                }
                // --- END NEW ---

                showLoading();
                try {
                    const [fetchedSurahs, fetchedReciters, fetchedScripts] = await Promise.all([
                        fetchSurahs(),
                        fetchReciters(),
                        fetchScripts()
                    ]);

                    surahs = fetchedSurahs;
                    reciters = fetchedReciters;
                    scripts = fetchedScripts;

                    populateSelect(surahSelect, surahs, 'number', 'name', 'englishName');
                    populateSelect(surahSelectRead, surahs, 'number', 'name', 'englishName');
                    populateSelect(reciterSelect, reciters, 'identifier', 'name', 'englishName');
                    populateSelect(scriptSelect, scripts, 'identifier', 'englishName');
                    populateSelect(scriptSelectRead, scripts, 'identifier', 'englishName');

                    await displayUserDashboard(userId, db);
                    const lastReadData = await loadReadingProgress(userId, db, surahSelectRead, showConfirmation, showError);
                    if (lastReadData) {
                        currentAyahIndex = lastReadData.ayahIndex; 
                        if (surahSelectRead) surahSelectRead.value = lastReadData.surahNumber;
                        console.log("Loaded last read progress (anonymous):", lastReadData);
                    } else {
                        console.log("No last read progress found for anonymous user:", userId, "Starting from Surah 1, Ayah 1.");
                        currentAyahIndex = 0; // Default to first ayah
                        if (surahSelectRead) surahSelectRead.value = '1'; // Default to first surah
                    }

                    await switchTab(currentTab);
                } catch (error) {
                    console.error("Error loading initial data for anonymous user:", error);
                    showError("Failed to load essential app data as guest. Please refresh.");
                } finally {
                    hideLoading();
                }

            } catch (e) {
                console.error("Error signing in anonymously for guest user:", e);
                showError("Could not sign in as guest. Please ensure Anonymous Auth is enabled in Firebase.");
                
                userId = null;
                setDisplayUsername("Guest User (Login Failed)", null);
                console.log("onAuthStateChanged: Anonymous sign-in failed. userId:", userId);
                
                showLoading();
                try {
                    const [fetchedSurahs, fetchedReciters, fetchedScripts] = await Promise.all([
                        fetchSurahs(),
                        fetchReciters(),
                        fetchScripts()
                    ]);
                    surahs = fetchedSurahs;
                    reciters = fetchedReciters;
                    scripts = fetchedScripts;

                    populateSelect(surahSelect, surahs, 'number', 'name', 'englishName');
                    populateSelect(surahSelectRead, surahs, 'number', 'name', 'englishName');
                    populateSelect(reciterSelect, reciters, 'identifier', 'name', 'englishName');
                    populateSelect(scriptSelect, scripts, 'identifier', 'englishName');
                    populateSelect(scriptSelectRead, scripts, 'identifier', 'englishName');

                    displayUserDashboard(userId, db); // Display dashboard even if no user ID
                    currentSurahData = await fetchSurahData('1', 'en.ahmedali');
                    currentSurahAudioData = await fetchSurahAudio('1', 'ar.alafasy');
                    await switchTab(currentTab);
                } catch (error) {
                    console.error("Error loading fallback data:", error);
                    showError("Failed to load fallback app data.");
                } finally {
                    hideLoading();
                }
            }
        }
    });

    // --- Event Listeners ---

    if (quranAudio) quranAudio.addEventListener('ended', async () => {
        const { newAyahIndex, playbackStopped } = await playNextAyah(
            listeningAyahIndex, currentSurahAudioData, quranAudio,
            updateDailyListenCount,
            () => stopPlayback(quranAudio, playPauseBtn, quranDisplay, listeningAyahIndex),
            showConfirmation, highlightAyah,
            { userId, db, displayUserDashboard: () => displayUserDashboard(userId, db), showError, quranDisplay, playPauseBtn }
        );
        listeningAyahIndex = newAyahIndex;
        if (playbackStopped) {
            isPlaying = false;
            if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
        }
    });

    if (playPauseBtn) playPauseBtn.addEventListener('click', async () => {
        if (isPlaying) {
            listeningAyahIndex = stopPlayback(quranAudio, playPauseBtn, quranDisplay, listeningAyahIndex);
            isPlaying = false;
        } else {
            if (quranAudio && quranAudio.paused && quranAudio.currentTime > 0) {
                if (quranAudio) quranAudio.play().catch(e => console.error("Audio resume error:", e));
                isPlaying = true;
                if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
                highlightAyah(listeningAyahIndex, quranDisplay);
            } else {
                listeningAyahIndex = 0;
                isPlaying = await startRecitation(
                    currentSurahAudioData, listeningAyahIndex, quranAudio, playPauseBtn,
                    (idx) => highlightAyah(idx, quranDisplay),
                    showError,
                    () => stopPlayback(quranAudio, playPauseBtn, quranDisplay, listeningAyahIndex),
                    currentPlaybackSpeed, quranDisplay
                );
            }
        }
    });
    if (stopBtn) stopBtn.addEventListener('click', () => {
        listeningAyahIndex = stopPlayback(quranAudio, playPauseBtn, quranDisplay, listeningAyahIndex);
        isPlaying = false;
    });
    
    if (surahSelect) surahSelect.addEventListener('change', async () => {
        listeningAyahIndex = stopPlayback(quranAudio, playPauseBtn, quranDisplay, listeningAyahIndex);
        isPlaying = false;
        clearError();
        showLoading();
        try {
            const selectedSurah = surahSelect.value;
            const selectedScript = scriptSelect ? scriptSelect.value : 'en.ahmedali';
            const selectedReciter = reciterSelect ? reciterSelect.value : 'ar.alafasy';
            currentSurahData = await fetchSurahData(selectedSurah, selectedScript);
            currentSurahAudioData = await fetchSurahAudio(selectedSurah, selectedReciter);
            displayFullSurah(currentSurahData, quranDisplay, quranAudio, highlightAyah);

        } catch (error) {
            console.error("Error changing surah (Listen tab):", error);
            showError("Failed to load new Surah data.");
        } finally {
            hideLoading();
        }
    });

    if (reciterSelect) reciterSelect.addEventListener('change', async () => {
        listeningAyahIndex = stopPlayback(quranAudio, playPauseBtn, quranDisplay, listeningAyahIndex);
        isPlaying = false;
        clearError();
        showLoading();
        try {
            const selectedSurah = surahSelect ? surahSelect.value : '1';
            const selectedReciter = reciterSelect.value;
            currentSurahAudioData = await fetchSurahAudio(selectedSurah, selectedReciter);
        } catch (error) {
            console.error("Error changing reciter (Listen tab):", error);
            showError("Failed to load new Reciter audio.");
        } finally {
            hideLoading();
        }
    });

    if (speedSelect) speedSelect.addEventListener('change', () => {
        currentPlaybackSpeed = parseFloat(speedSelect.value);
        if (quranAudio) quranAudio.playbackRate = currentPlaybackSpeed;
    });

    if (scriptSelect) scriptSelect.addEventListener('change', async () => {
        listeningAyahIndex = stopPlayback(quranAudio, playPauseBtn, quranDisplay, listeningAyahIndex);
        isPlaying = false;
        clearError();
        showLoading();
        try {
            const selectedSurah = surahSelect ? surahSelect.value : '1';
            const selectedScript = scriptSelect.value;
            currentSurahData = await fetchSurahData(selectedSurah, selectedScript);
            displayFullSurah(currentSurahData, quranDisplay, quranAudio, highlightAyah);
        } catch (error) {
            console.error("Error changing script (Listen tab):", error);
            showError("Failed to load new Script data.");
        } finally {
            hideLoading();
        }
    });
    
    if (tabListenBtn) tabListenBtn.addEventListener('click', () => switchTab('listen'));
    if (tabReadBtn) tabReadBtn.addEventListener('click', () => switchTab('read'));
    
    if (surahSelectRead) surahSelectRead.addEventListener('change', async () => {
        clearError();
        showLoading();
        try {
            currentAyahIndex = 0;
            const selectedSurahRead = surahSelectRead.value;
            const selectedScriptRead = scriptSelectRead ? scriptSelectRead.value : 'en.ahmedali';
            currentSurahData = await fetchSurahData(selectedSurahRead, selectedScriptRead);
            displaySingleAyah(currentAyahIndex, currentSurahData, quranDisplayRead, ayahSelect);
            populateAyahDropdown(currentSurahData, ayahSelect, currentAyahIndex);
            updateReadTabUIState(startDoneReadingBtn, isReadingActive);
        }  catch (error) {
            console.error("Error changing surah (Read tab):", error);
            showError("Failed to load new Surah data for reading.");
        } finally {
            hideLoading();
        }
    });
    
    if (ayahSelect) ayahSelect.addEventListener('change', () => {
        clearError();
        currentAyahIndex = parseInt(ayahSelect.value);
        displaySingleAyah(currentAyahIndex, currentSurahData, quranDisplayRead, ayahSelect);
        updateReadTabUIState(startDoneReadingBtn, isReadingActive);
    });
    
    if (scriptSelectRead) scriptSelectRead.addEventListener('change', async () => {
        clearError();
        showLoading();
        try {
            const selectedSurahRead = surahSelectRead ? surahSelectRead.value : '1';
            const selectedScriptRead = scriptSelectRead.value;
            currentSurahData = await fetchSurahData(selectedSurahRead, selectedScriptRead);
            displaySingleAyah(currentAyahIndex, currentSurahData, quranDisplayRead, ayahSelect);
        } catch (error) {
            console.error("Error changing script (Read tab):", error);
            showError("Failed to load new Script data.");
        } finally {
            hideLoading();
        }
    });
    
    if (prevAyahBtn) prevAyahBtn.addEventListener('click', async () => {
        console.log("Navigating to previous Ayah. Current Ayah:", currentAyahIndex, "Current Surah:", surahSelectRead?.value);
        const { newAyahIndex, newSurahData } = await navigatePreviousAyah({
            currentAyahIndex, currentSurahData, surahs, surahSelectRead, scriptSelectRead,
            updateDailyReadCount, showError, showConfirmation,
            displaySingleAyah: (idx, data) => displaySingleAyah(idx, data, quranDisplayRead, ayahSelect),
            populateAyahDropdown: (data, select, idx) => populateAyahDropdown(data, select, idx),
            updateReadTabUIState: () => updateReadTabUIState(startDoneReadingBtn, isReadingActive),
            userId, db, displayUserDashboard: () => displayUserDashboard(userId, db),
            ayahSelect: ayahSelect, 
            quranDisplayRead: quranDisplayRead 
        });
        currentAyahIndex = newAyahIndex;
        currentSurahData = newSurahData || currentSurahData; 
        console.log("After previous Ayah navigation. New Ayah:", currentAyahIndex, "New Surah Data:", currentSurahData);
    });
    
    if (nextAyahBtn) nextAyahBtn.addEventListener('click', async () => {
        console.log("Navigating to next Ayah. Current Ayah:", currentAyahIndex, "Current Surah:", surahSelectRead?.value);
        const { newAyahIndex, newSurahData } = await navigateNextAyah({
            currentAyahIndex, currentSurahData, surahs, surahSelectRead, scriptSelectRead,
            isReadingActive, updateDailyReadCount,
            saveReadingProgress: (uid, fdb, surahSel, ayahIdx, confirmCb, errorCb) => saveReadingProgress(uid, fdb, surahSel, ayahIdx, confirmCb, errorCb),
            showError, showConfirmation,
            displaySingleAyah: (idx, data) => displaySingleAyah(idx, data, quranDisplayRead, ayahSelect),
            populateAyahDropdown: (data, select, idx) => populateAyahDropdown(data, select, idx),
            updateReadTabUIState: () => updateReadTabUIState(startDoneReadingBtn, isReadingActive),
            userId, db, displayUserDashboard: () => displayUserDashboard(userId, db),
            ayahSelect: ayahSelect, 
            quranDisplayRead: quranDisplayRead 
        });
        currentAyahIndex = newAyahIndex;
        currentSurahData = newSurahData || currentSurahData; 
        console.log("After next Ayah navigation. New Ayah:", currentAyahIndex, "New Surah Data:", currentSurahData);

        if (currentAyahIndex === 0 && newSurahData && parseInt(surahSelectRead.value) === 1) { 
             // This condition seems specific for the end of the Quran if it wraps around to Surah 1, Ayah 1.
             // If the user truly finishes the entire Quran, the logic inside the navigateNextAyah handles it.
             // This might be redundant or indicative of a specific edge case for wrapping.
             // Consider reviewing if this precise check is still needed or if navigateNextAyah's "end of Quran" handling is sufficient.
             // For now, retaining it as per your code.
             if (currentSurahData.arabic.length -1 == currentAyahIndex) {
                 isReadingActive = false;
                 updateReadTabUIState(startDoneReadingBtn, isReadingActive);
             }
        }
    });
    
    if (startDoneReadingBtn) startDoneReadingBtn.addEventListener('click', async () => {
        isReadingActive = !isReadingActive;
        console.log("Start/Done Reading button clicked. isReadingActive set to:", isReadingActive);
        if (!isReadingActive) { // If reading session is ending
            console.log("Saving reading progress. User ID:", userId, "Surah Select Value:", surahSelectRead?.value, "Current Ayah Index:", currentAyahIndex);
            await saveReadingProgress(userId, db, surahSelectRead, currentAyahIndex, showConfirmation, showError);
            if (readingSummary) {
                readingSummary.textContent = "Reading session ended.";
                readingSummary.classList.remove('hidden');
                setTimeout(() => readingSummary.classList.add('hidden'), 3000);
            }
        } else { // If reading session is starting
            if (readingSummary) {
                readingSummary.textContent = "Reading session started.";
                readingSummary.classList.remove('hidden');
                setTimeout(() => readingSummary.classList.add('hidden'), 3000);
            }
        }
        updateReadTabUIState(startDoneReadingBtn, isReadingActive);
    });
}

window.onload = initializeAppAndListeners;
