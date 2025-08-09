// Import Firebase services from your configuration file
import { auth, db } from "./firebase-config.js";
// UPDATED: Changed Firebase SDK version from 10.12.2 to 12.1.0
import { signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
// UPDATED: Changed Firebase SDK version from 10.12.2 to 12.1.0
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ADDED THIS LOG: Check the value of db right after import
console.log("DB object on quran-app.js import:", db);

// Global variables for application state
let userId = null;
let isReadingActive = false;
let isPlaying = false;
let currentTab = 'listen'; // Default tab on load
let surahs = [];
let reciters = [];
let scripts = []; // Corrected: Added 'let' to declare the variable
let currentSurahData = null; // Stores Arabic and Translation text for current surah
let currentSurahAudioData = null; // Stores audio URLs for current surah
let listeningAyahIndex = 0; // Current ayah index for audio playback
let currentAyahIndex = 0; // Current ayah index for reading mode
let currentPlaybackSpeed = 1.0; // Audio playback speed

// Firestore collection name for user progress
const PROGRESS_COLLECTION = "userProgress";

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
const quranDisplay = document.getElementById('quran-display'); // For listen mode

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
const quranDisplayRead = document.getElementById('quran-display-read'); // For read mode

// Dropdown containers (for showing/hiding based on tab)
const reciterContainer = document.getElementById('reciter-container');
const speedContainer = document.getElementById('speed-container'); // CORRECTED THIS LINE
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
 * Fetches the list of all Surahs from the Al Quran Cloud API and populates the dropdowns.
 */
async function loadSurahs() {
    showLoading();
    try {
        const response = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await response.json();
        surahs = data.data;

        if (surahSelect) {
            surahSelect.innerHTML = '';
            surahs.forEach(surah => {
                const option = document.createElement('option');
                option.value = surah.number;
                option.textContent = `${surah.number}. ${surah.name} (${surah.englishName})`;
                surahSelect.appendChild(option);
            });
        }
        
        if (surahSelectRead) {
            surahSelectRead.innerHTML = '';
            surahs.forEach(surah => {
                const option = document.createElement('option');
                option.value = surah.number;
                option.textContent = `${surah.number}. ${surah.name} (${surah.englishName})`;
                surahSelectRead.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error fetching surahs:", error);
        showError("Failed to load surah list. Please check your network connection.");
    } finally {
        hideLoading();
    }
}

/**
 * Fetches the list of audio reciters from the Al Quran Cloud API and populates the dropdown.
 */
async function loadReciters() {
    showLoading();
    try {
        const response = await fetch('https://api.alquran.cloud/v1/edition/format/audio');
        const data = await response.json();
        reciters = data.data;
        if (reciterSelect) {
            reciterSelect.innerHTML = '';
            reciters.forEach(reciter => {
                const option = document.createElement('option');
                option.value = reciter.identifier;
                option.textContent = `${reciter.name} (${reciter.englishName})`;
                reciterSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error fetching reciters:", error);
        showError("Failed to load reciter list. Please check your network connection.");
    } finally {
        hideLoading();
    }
}

/**
 * Fetches the list of available translation/script editions from the Al Quran Cloud API and populates the dropdowns.
 */
async function loadScripts() {
    showLoading();
    try {
        const response = await fetch('https://api.alquran.cloud/v1/edition/type/translation');
        const data = await response.json();
        // Filter for English text translations
        scripts = data.data.filter(s => s.language === 'en' && s.format === 'text');
        
        if (scriptSelect) {
            scriptSelect.innerHTML = '';
            scripts.forEach(script => {
                const option = document.createElement('option');
                option.value = script.identifier;
                option.textContent = script.englishName;
                scriptSelect.appendChild(option);
            });
        }

        if (scriptSelectRead) {
            scriptSelectRead.innerHTML = '';
            scripts.forEach(script => {
                const option = document.createElement('option');
                option.value = script.identifier;
                option.textContent = script.englishName;
                scriptSelectRead.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error fetching scripts:", error);
        showError("Failed to load script list. Please check your network connection.");
    } finally {
        hideLoading();
    }
}

/**
 * Loads the Arabic text and a specified translation for a given Surah.
 * @param {string} surahNumber - The number of the Surah.
 * @param {string} scriptIdentifier - The identifier for the translation/script.
 */
async function loadSurahData(surahNumber, scriptIdentifier) {
    showLoading();
    clearError();
    try {
        // Fetch Arabic text
        const arabicResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}`);
        const arabicData = await arabicResponse.json();

        // Fetch translation text
        const translationResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${scriptIdentifier}`);
        const translationData = await translationResponse.json();

        currentSurahData = {
            arabic: arabicData.data.ayahs.map(ayah => ({ number: ayah.numberInSurah, text: ayah.text })),
            translation: translationData.data.ayahs.map(ayah => ({ number: ayah.numberInSurah, text: ayah.text }))
        };
    } catch (error) {
        console.error("Error loading surah data:", error);
        showError("Failed to load Surah data. Please check your network connection and selected script.");
    } finally {
        hideLoading();
    }
}

/**
 * Loads the audio URLs for a given Surah and Reciter.
 * @param {string} surahNumber - The number of the Surah.
 * @param {string} reciterIdentifier - The identifier for the reciter.
 */
async function loadSurahAudio(surahNumber, reciterIdentifier) {
    showLoading();
    clearError();
    try {
        const audioResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${reciterIdentifier}`);
        const audioData = await audioResponse.json();
        currentSurahAudioData = audioData.data.ayahs.map(ayah => ({ number: ayah.numberInSurah, audio: ayah.audio }));
        
        if (currentSurahAudioData.length > 0 && quranAudio) {
            quranAudio.src = currentSurahAudioData[listeningAyahIndex].audio;
        }
    } catch (error) {
        console.error("Error loading surah audio:", error);
        showError("Failed to load Surah audio. Please check your network connection and selected reciter.");
    } finally {
        hideLoading();
    }
}

/**
 * Updates the daily read ayah count in Firestore.
 */
async function updateDailyReadCount() {
    if (!userId) return; // Only track for logged-in users
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
    const docRef = doc(db, PROGRESS_COLLECTION, userId, "readingHistory", today);
    
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const currentReadCount = docSnap.data().read || 0;
            await updateDoc(docRef, { read: currentReadCount + 1, timestamp: serverTimestamp() });
        } else {
            await setDoc(docRef, { read: 1, listen: 0, timestamp: serverTimestamp() });
        }
        displayUserDashboard(); // Update dashboard after count
    } catch (error) {
        console.error("Error updating daily read count:", error); // Added this line
        showError("Failed to update daily read count. Permissions issue.");
    }
}

/**
 * Updates the daily listened ayah count in Firestore.
 */
async function updateDailyListenCount() {
    if (!userId) return; // Only track for logged-in users
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
    const docRef = doc(db, PROGRESS_COLLECTION, userId, "readingHistory", today);
    
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const currentListenCount = docSnap.data().listen || 0;
            await updateDoc(docRef, { listen: currentListenCount + 1, timestamp: serverTimestamp() });
        } else {
            await setDoc(docRef, { read: 0, listen: 1, timestamp: serverTimestamp() });
        }
        displayUserDashboard(); // Update dashboard after count
    } catch (error) {
        console.error("Error updating daily listen count:", error);
        showError("Failed to update daily listen count. Permissions issue.");
    }
}

/**
 * Loads and displays user progress data on the dashboard.
 */
async function displayUserDashboard() {
    if (!userId) {
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
        return;
    }

    let totalReadToday = 0, totalReadWeek = 0, totalReadMonth = 0, totalReadOverall = 0;
    let totalListenToday = 0, totalListenWeek = 0, totalListenMonth = 0, totalListenOverall = 0;
    
    const today = new Date();
    // Set start of week to Sunday
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0); // Reset time to beginning of day

    // Set start of month to 1st day
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0); // Reset time to beginning of day
    
    const readingHistoryRef = collection(db, PROGRESS_COLLECTION, userId, "readingHistory");
    
    try {
        const snapshot = await getDocs(readingHistoryRef);
        
        snapshot.forEach(doc => {
            const data = doc.data();
            // Parse Firestore document ID as date (assuming YYYY-MM-DD format)
            const docDate = new Date(doc.id);
            docDate.setHours(0, 0, 0, 0); // Reset time for comparison

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

/**
 * Displays the full Surah in the listen mode.
 */
function displayFullSurah() {
    if (!currentSurahData || !quranDisplay) return;
    quranDisplay.innerHTML = ''; // Clear previous content

    currentSurahData.arabic.forEach((ayah, index) => {
        const ayahElement = document.createElement('div');
        ayahElement.classList.add('ayah');
        ayahElement.dataset.index = index; // Store index for highlighting
        ayahElement.textContent = `${ayah.text} (${ayah.number})`;
        
        if (currentSurahData.translation && currentSurahData.translation[index]) {
            const translationElement = document.createElement('p');
            translationElement.classList.add('translation');
            translationElement.textContent = currentSurahData.translation[index].text;
            ayahElement.appendChild(translationElement);
        }
        quranDisplay.appendChild(ayahElement);
    });

    // Highlight the first ayah if audio is not playing
    if (quranAudio && quranAudio.paused && quranAudio.currentTime === 0) {
        highlightAyah(0);
    }
}

/**
 * Displays a single Ayah for reading mode.
 * @param {number} index - The index of the Ayah to display (0-based).
 */
function displaySingleAyah(index) {
    if (!currentSurahData || !quranDisplayRead) return;
    quranDisplayRead.innerHTML = ''; // Clear previous content
    
    const ayah = currentSurahData.arabic[index];
    const translation = currentSurahData.translation[index];
    
    if (ayah) {
        const ayahElement = document.createElement('p');
        ayahElement.classList.add('ayah-read');
        ayahElement.textContent = `${ayah.text} (${ayah.number})`;
        quranDisplayRead.appendChild(ayahElement);
    }
    
    if (translation) {
        const translationElement = document.createElement('p');
        translationElement.classList.add('translation');
        translationElement.textContent = translation.text;
        quranDisplayRead.appendChild(translationElement);
    }
    
    // Ensure ayah dropdown matches current ayah
    if (ayahSelect) {
        ayahSelect.value = index;
    }
}

/**
 * Populates the Ayah dropdown for the current Surah.
 */
function populateAyahDropdown() {
    if (!currentSurahData || !ayahSelect) return;
    ayahSelect.innerHTML = ''; // Clear previous options
    for (let i = 0; i < currentSurahData.arabic.length; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Ayah ${i + 1}`;
        ayahSelect.appendChild(option);
    }
    ayahSelect.value = currentAyahIndex; // Set to current ayah
}

/**
 * Stops audio playback and resets player state.
 */
function stopPlayback() {
    if (quranAudio) quranAudio.pause();
    isPlaying = false;
    if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
    const highlighted = quranDisplay ? quranDisplay.querySelector('.ayah.highlight') : null;
    if (highlighted) highlighted.classList.remove('highlight');
    listeningAyahIndex = 0; // Reset audio ayah index
}

/**
 * Starts recitation from the current listeningAyahIndex.
 */
async function startRecitation() {
    if (!currentSurahAudioData || currentSurahAudioData.length === 0) {
        showError("No audio available for this Surah with the selected reciter.");
        return;
    }
    isPlaying = true;
    if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
    if (quranAudio) {
        quranAudio.playbackRate = currentPlaybackSpeed;
        quranAudio.src = currentSurahAudioData[listeningAyahIndex].audio;
        // The play() promise might be rejected if the user hasn't interacted yet
        await quranAudio.play().catch(e => {
            console.error("Audio playback error:", e);
            showError("Autoplay blocked. Please click play to start recitation.");
            stopPlayback(); // Reset UI if autoplay fails
        });
    }
    highlightAyah(listeningAyahIndex);
}

/**
 * Plays the next Ayah in the sequence. Called when current Ayah audio ends.
 */
async function playNextAyah() {
    if (listeningAyahIndex < currentSurahAudioData.length - 1) {
        await updateDailyListenCount(); // Increment listen count for the just finished ayah
        listeningAyahIndex++;
        if (quranAudio) quranAudio.src = currentSurahAudioData[listeningAyahIndex].audio;
        highlightAyah(listeningAyahIndex);
        if (quranAudio) {
             await quranAudio.play().catch(e => console.error("Audio playback error on next ayah:", e));
        }
    } else {
        await updateDailyListenCount(); // Increment listen count for the last ayah
        stopPlayback();
        showConfirmation('End of Surah. Recitation completed.');
    }
}

/**
 * Highlights the current Ayah being played or read.
 * @param {number} index - The index of the Ayah to highlight.
 */
function highlightAyah(index) {
    if (!quranDisplay) return;
    const ayahs = quranDisplay.querySelectorAll('.ayah');
    ayahs.forEach(ayah => ayah.classList.remove('highlight')); // Remove existing highlight

    const currentAyah = quranDisplay.querySelector(`.ayah[data-index="${index}"]`);
    if (currentAyah) {
        currentAyah.classList.add('highlight');
        // Scroll to the highlighted ayah if it's not in view
        currentAyah.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/**
 * Updates the UI state of the "Start Reading" / "Done Reading" button.
 */
function updateReadTabUIState() {
    if (startDoneReadingBtn) {
        if (isReadingActive) {
            startDoneReadingBtn.innerHTML = '<i class="fas fa-check"></i> Done Reading';
            startDoneReadingBtn.classList.remove('bg-green-600');
            startDoneReadingBtn.classList.add('bg-red-600');
        } else {
            startDoneReadingBtn.innerHTML = '<i class="fas fa-play"></i> Start Reading';
            startDoneReadingBtn.classList.remove('bg-red-600');
            startDoneReadingBtn.classList.add('bg-green-600');
        }
    }
}

/**
 * Loads the user's last reading progress (last surah and ayah).
 */
async function loadReadingProgress() {
    if (!userId) return;
    const userProgressDocRef = doc(db, PROGRESS_COLLECTION, userId);
    try {
        const docSnap = await getDoc(userProgressDocRef);
        if (docSnap.exists() && docSnap.data().lastRead) {
            const { surahNumber, ayahIndex } = docSnap.data().lastRead;
            // Set initial dropdowns and current Ayah
            if (surahSelectRead) surahSelectRead.value = surahNumber;
            currentAyahIndex = ayahIndex;
            showConfirmation(`Resumed from Surah ${surahNumber}, Ayah ${ayahIndex + 1}.`);
        }
    } catch (error) {
        console.error("Error loading reading progress:", error);
        showError("Failed to load reading progress. Permissions issue."); // Added this line
    }
}

/**
 * Saves the user's current reading progress (current surah and ayah).
 */
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
        }, { merge: true }); // Use merge to avoid overwriting other fields
        showConfirmation("Reading progress saved!");
    } catch (error) {
        console.error("Error saving reading progress:", error);
        showError("Failed to save reading progress. Permissions issue."); // Added this line
    }
}

/**
 * Switches between "Listen" and "Read" tabs.
 * @param {string} tabName - 'listen' or 'read'.
 */
async function switchTab(tabName) {
    currentTab = tabName;
    stopPlayback(); // Stop any audio if switching tabs
    isReadingActive = false; // Reset reading state
    
    // Reset active classes for tab buttons
    if (tabListenBtn) tabListenBtn.classList.remove('active');
    if (tabReadBtn) tabReadBtn.classList.remove('active');

    // Hide all tab contents initially
    if (listenTabContent) listenTabContent.classList.add('hidden');
    if (readTabContent) readTabContent.classList.add('hidden');
    
    // Hide all specific dropdown containers initially
    if (reciterContainer) reciterContainer.classList.add('hidden');
    if (speedContainer) speedContainer.classList.add('hidden');
    if (scriptContainer) scriptContainer.classList.add('hidden');
    if (scriptContainerRead) scriptContainerRead.classList.add('hidden');

    if (tabName === 'listen') {
        if (tabListenBtn) tabListenBtn.classList.add('active');
        if (listenTabContent) listenTabContent.classList.remove('hidden');
        if (reciterContainer) reciterContainer.classList.remove('hidden');
        if (speedContainer) speedContainer.classList.remove('hidden');
        if (scriptContainer) scriptContainer.classList.remove('hidden');
        
        // Load data for listen tab
        const selectedSurah = surahSelect ? surahSelect.value : '1';
        const selectedScript = scriptSelect ? scriptSelect.value : 'en.ahmedali'; // Default to a valid script
        const selectedReciter = reciterSelect ? reciterSelect.value : 'ar.alafasy'; // Default to a valid reciter

        await loadSurahData(selectedSurah, selectedScript);
        await loadSurahAudio(selectedSurah, selectedReciter);
        displayFullSurah();

    } else { // tabName === 'read'
        if (tabReadBtn) tabReadBtn.classList.add('active');
        if (readTabContent) readTabContent.classList.remove('hidden');
        if (scriptContainerRead) scriptContainerRead.classList.remove('hidden');
        
        // Load data for read tab
        const selectedSurahRead = surahSelectRead ? surahSelectRead.value : '1';
        const selectedScriptRead = scriptSelectRead ? scriptSelectRead.value : 'en.ahmedali'; // Default to a valid script
        
        await loadSurahData(selectedSurahRead, selectedScriptRead);
        displaySingleAyah(currentAyahIndex);
        populateAyahDropdown();
    }
    updateReadTabUIState(); // Ensure button text is correct after tab switch
}

/**
 * Initializes Firebase, authenticates user, and sets up all event listeners.
 */
async function initializeAppAndListeners() {
    try {
        // Removed the conditional signInAnonymously call here.
        // onAuthStateChanged will handle initial session detection.
    } catch (e) {
        // This catch block is now mostly redundant for initial sign-in,
        // as the actual sign-in is managed within onAuthStateChanged.
        // Keeping it for any unforeseen synchronous errors during init.
        console.error("Error during initial app setup:", e);
        showError("Could not initialize app. Please check your network and Firebase Auth settings.");
    }

    // Listen for Firebase authentication state changes
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in (could be anonymously or via other methods like email/password)
            userId = user.uid;
            // Updated to pass both email and UID to display
            setDisplayUsername(user.email, user.uid); 
            console.log("onAuthStateChanged: User is authenticated. userId:", userId); // Added log
            
            // Load all necessary data concurrently
            await Promise.all([
                loadSurahs(),
                loadReciters(),
                loadScripts(),
                displayUserDashboard(), // Load user progress
                loadReadingProgress()   // Load last read position
            ]);
            // Initialize tab display after all data is loaded
            await switchTab(currentTab);

        } else {
            // User is signed out or no persisted session was found.
            // Attempt anonymous sign-in now if desired for unauthenticated users.
            try {
                const anonymousUserCredential = await signInAnonymously(auth); // Get credential
                userId = anonymousUserCredential.user.uid; // Set userId to the new anonymous UID
                // Updated to pass null for email (as it's anonymous) and the new UID
                setDisplayUsername(null, userId); 
                console.log("onAuthStateChanged: Signed in anonymously. userId:", userId); // Added log
                
                // Now load data for this anonymous user
                await Promise.all([
                    loadSurahs(),
                    loadReciters(),
                    loadScripts(),
                    displayUserDashboard(), // Load dashboard for anonymous user
                    loadReadingProgress()   // Load progress for anonymous user
                ]);
                await switchTab(currentTab);

            } catch (e) {
                console.error("Error signing in anonymously for guest user:", e);
                showError("Could not sign in as guest. Please ensure Anonymous Auth is enabled in Firebase.");
                
                // If anonymous sign-in fails, userId remains null, and dashboard will clear
                userId = null;
                setDisplayUsername("Guest User (Login Failed)", null); // Indicate login failed, no UID
                console.log("onAuthStateChanged: Anonymous sign-in failed. userId:", userId); // Added log
                
                // Still load essential UI data even without a user
                await Promise.all([
                    loadSurahs(),
                    loadReciters(),
                    loadScripts()
                ]);
                displayUserDashboard(); // Will show zeros
                await loadSurahData('1', 'en.ahmedali');
                await loadSurahAudio('1', 'ar.alafasy');
                await switchTab(currentTab);
            }
        }
    });

    // --- Event Listeners ---

    // Audio player events
    if (quranAudio) quranAudio.addEventListener('ended', playNextAyah);

    // Play/Pause and Stop buttons for audio
    if (playPauseBtn) playPauseBtn.addEventListener('click', () => {
        if (isPlaying) {
            if (quranAudio) quranAudio.pause();
            isPlaying = false;
            if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
        } else {
            // If paused and has current time, resume
            if (quranAudio && quranAudio.paused && quranAudio.currentTime > 0) {
                if (quranAudio) quranAudio.play().catch(e => console.error("Audio resume error:", e));
                isPlaying = true;
                if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
                highlightAyah(listeningAyahIndex);
            } else {
                // Otherwise, start from beginning
                listeningAyahIndex = 0;
                startRecitation();
            }
        }
    });
    if (stopBtn) stopBtn.addEventListener('click', stopPlayback);
    
    // Surah selection for Listen tab
    if (surahSelect) surahSelect.addEventListener('change', async () => {
        stopPlayback();
        listeningAyahIndex = 0; // Reset audio to first ayah of new surah
        clearError();
        const selectedSurah = surahSelect.value;
        const selectedScript = scriptSelect ? scriptSelect.value : 'en.ahmedali';
        const selectedReciter = reciterSelect ? reciterSelect.value : 'ar.alafasy';
        await loadSurahData(selectedSurah, selectedScript);
        await loadSurahAudio(selectedSurah, selectedReciter);
        displayFullSurah();
    });

    // Reciter selection for Listen tab
    if (reciterSelect) reciterSelect.addEventListener('change', async () => {
        stopPlayback();
        listeningAyahIndex = 0; // Reset audio to first ayah of new reciter
        clearError();
        const selectedSurah = surahSelect ? surahSelect.value : '1';
        const selectedReciter = reciterSelect.value;
        await loadSurahAudio(selectedSurah, selectedReciter);
    });

    // Speed selection for Listen tab
    if (speedSelect) speedSelect.addEventListener('change', () => {
        currentPlaybackSpeed = parseFloat(speedSelect.value);
        if (quranAudio) quranAudio.playbackRate = currentPlaybackSpeed;
    });

    // Script selection for Listen tab
    if (scriptSelect) scriptSelect.addEventListener('change', async () => {
        stopPlayback();
        clearError();
        const selectedSurah = surahSelect ? surahSelect.value : '1';
        const selectedScript = scriptSelect.value;
        await loadSurahData(selectedSurah, selectedScript);
        displayFullSurah();
    });
    
    // Tab switching buttons
    if (tabListenBtn) tabListenBtn.addEventListener('click', () => switchTab('listen'));
    if (tabReadBtn) tabReadBtn.addEventListener('click', () => switchTab('read'));
    
    // Surah selection for Read tab
    if (surahSelectRead) surahSelectRead.addEventListener('change', async () => {
        clearError();
        currentAyahIndex = 0; // Reset read ayah to first of new surah
        const selectedSurahRead = surahSelectRead.value;
        const selectedScriptRead = scriptSelectRead ? scriptSelectRead.value : 'en.ahmedali';
        await loadSurahData(selectedSurahRead, selectedScriptRead);
        displaySingleAyah(currentAyahIndex);
        populateAyahDropdown();
        updateReadTabUIState();
    });
    
    // Ayah selection for Read tab
    if (ayahSelect) ayahSelect.addEventListener('change', () => {
        clearError();
        currentAyahIndex = parseInt(ayahSelect.value);
        displaySingleAyah(currentAyahIndex);
        updateReadTabUIState();
    });
    
    // Script selection for Read tab
    if (scriptSelectRead) scriptSelectRead.addEventListener('change', async () => {
        clearError();
        const selectedSurahRead = surahSelectRead ? surahSelectRead.value : '1';
        const selectedScriptRead = scriptSelectRead.value;
        await loadSurahData(selectedSurahRead, selectedScriptRead);
        displaySingleAyah(currentAyahIndex);
    });
    
    // Navigation buttons for Read tab
    if (prevAyahBtn) prevAyahBtn.addEventListener('click', async () => {
        clearError();
        if (!currentSurahData) { showError('No Surah data loaded for reading.'); return; }
        
        if (currentAyahIndex > 0) {
            currentAyahIndex--;
            if (isReadingActive) await updateDailyReadCount();
        } else {
            // Go to previous surah if at the first ayah
            const currentSurahNumber = parseInt(surahSelectRead ? surahSelectRead.value : '1');
            const prevSurahNumber = currentSurahNumber - 1;
            if (prevSurahNumber >= 1) {
                const prevSurahData = surahs.find(s => s.number === prevSurahNumber);
                if (prevSurahData) {
                    if (surahSelectRead) surahSelectRead.value = prevSurahNumber;
                    currentAyahIndex = prevSurahData.numberOfAyahs - 1; // Last ayah of previous surah
                    const scriptIdentifier = scriptSelectRead ? scriptSelectRead.value : 'en.ahmedali';
                    await loadSurahData(prevSurahNumber.toString(), scriptIdentifier);
                    if (isReadingActive) await updateDailyReadCount();
                    showConfirmation(`Moved to Surah ${prevSurahNumber}, Ayah ${currentAyahIndex + 1}.`);
                } else { showError('Could not find data for the previous Surah.'); }
            } else { showError('You are at the beginning of the Quran!'); }
        }
        populateAyahDropdown(); // Update dropdown
        displaySingleAyah(currentAyahIndex);
        updateReadTabUIState();
    });
    
    if (nextAyahBtn) nextAyahBtn.addEventListener('click', async () => {
        clearError();
        if (!currentSurahData) { showError('No Surah data loaded for reading.'); return; }

        if (currentAyahIndex < currentSurahData.arabic.length - 1) {
            currentAyahIndex++;
            if (isReadingActive) await updateDailyReadCount();
        } else {
            // Go to next surah if at the last ayah
            const currentSurahNumber = parseInt(surahSelectRead ? surahSelectRead.value : '1');
            const nextSurahNumber = currentSurahNumber + 1;
            if (nextSurahNumber <= 114) {
                const nextSurahData = surahs.find(s => s.number === nextSurahNumber);
                if (nextSurahData) {
                    if (surahSelectRead) surahSelectRead.value = nextSurahNumber;
                    currentAyahIndex = 0; // First ayah of next surah
                    const scriptIdentifier = scriptSelectRead ? scriptSelectRead.value : 'en.ahmedali';
                    await loadSurahData(nextSurahNumber.toString(), scriptIdentifier);
                    if (isReadingActive) await updateDailyReadCount();
                    showConfirmation(`Moved to Surah ${nextSurahNumber}, Ayah ${currentAyahIndex + 1}.`);
                } else { showError('Could not find data for the next Surah.'); }
            } else {
                showConfirmation('You have reached the end of the Quran! Congratulations!');
                if (isReadingActive) {
                    isReadingActive = false;
                    saveReadingProgress(); // Save final progress
                }
            }
        }
        populateAyahDropdown(); // Update dropdown
        displaySingleAyah(currentAyahIndex);
        updateReadTabUIState();
    });
    
    // Start/Done Reading button
    if (startDoneReadingBtn) startDoneReadingBtn.addEventListener('click', () => {
        isReadingActive = !isReadingActive; // Toggle reading session status
        if (!isReadingActive) {
            saveReadingProgress(); // Save progress when session ends
            if (readingSummary) {
                readingSummary.textContent = "Reading session ended.";
                readingSummary.classList.remove('hidden');
                setTimeout(() => readingSummary.classList.add('hidden'), 3000);
            }
        } else {
            if (readingSummary) {
                readingSummary.textContent = "Reading session started.";
                readingSummary.classList.remove('hidden');
                setTimeout(() => readingSummary.classList.add('hidden'), 3000);
            }
        }
        updateReadTabUIState();
    });
}

// Initialize the app when the window loads
window.onload = initializeAppAndListeners;
