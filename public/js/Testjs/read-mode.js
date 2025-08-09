// read-mode.js

// Import shared utilities and global state
import { userId, surahs, scripts, showLoading, hideLoading, showError, clearError, showConfirmation, displayUserDashboard } from "./quran-app.js";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// Global variables for read mode
let currentSurahData = null;
let currentAyahIndex = 0;
let isReadingActive = false;

// HTML element references
const surahSelectRead = document.getElementById('surah-select-read');
const ayahSelect = document.getElementById('ayah-select');
const scriptSelectRead = document.getElementById('script-select-read');
const prevAyahBtn = document.getElementById('prev-ayah-btn');
const nextAyahBtn = document.getElementById('next-ayah-btn');
const startDoneReadingBtn = document.getElementById('start-done-reading-btn');
const quranDisplayRead = document.getElementById('quran-display-read');
const readingSummary = document.getElementById('reading-summary');
const scriptContainerRead = document.getElementById('script-container-read');

// Firestore collection name
const PROGRESS_COLLECTION = "userProgress";

export async function loadReadModeData() {
    const selectedSurahRead = surahSelectRead ? surahSelectRead.value : '1';
    const selectedScriptRead = scriptSelectRead ? scriptSelectRead.value : 'en.ahmedali';
    
    await loadSurahData(selectedSurahRead, selectedScriptRead);
    displaySingleAyah(currentAyahIndex);
    populateAyahDropdown();
    updateReadTabUIState();
}

export function initializeReadMode() {
    // Populate the dropdowns from the globally loaded data
    populateSurahDropdown();
    populateScriptDropdown();
    // Set up event listeners specific to read mode
    setupEventListeners();
}

function populateSurahDropdown() {
    if (surahSelectRead) {
        surahSelectRead.innerHTML = '';
        surahs.forEach(surah => {
            const option = document.createElement('option');
            option.value = surah.number;
            option.textContent = `${surah.number}. ${surah.name} (${surah.englishName})`;
            surahSelectRead.appendChild(option);
        });
    }
}

function populateScriptDropdown() {
    if (scriptSelectRead) {
        scriptSelectRead.innerHTML = '';
        scripts.forEach(script => {
            const option = document.createElement('option');
            option.value = script.identifier;
            option.textContent = script.englishName;
            scriptSelectRead.appendChild(option);
        });
    }
}

async function loadSurahData(surahNumber, scriptIdentifier) {
    showLoading();
    clearError();
    try {
        const [arabicResponse, translationResponse] = await Promise.all([
            fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}`),
            fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${scriptIdentifier}`)
        ]);
        const arabicData = await arabicResponse.json();
        const translationData = await translationResponse.json();
        currentSurahData = {
            arabic: arabicData.data.ayahs.map(ayah => ({ number: ayah.numberInSurah, text: ayah.text })),
            translation: translationData.data.ayahs.map(ayah => ({ number: ayah.numberInSurah, text: ayah.text }))
        };
    } catch (error) {
        console.error("Error loading surah data:", error);
        showError("Failed to load Surah data.");
    } finally {
        hideLoading();
    }
}

function displaySingleAyah(index) {
    if (!currentSurahData || !quranDisplayRead) return;
    quranDisplayRead.innerHTML = '';
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
    if (ayahSelect) ayahSelect.value = index;
}

function populateAyahDropdown() {
    if (!currentSurahData || !ayahSelect) return;
    ayahSelect.innerHTML = '';
    for (let i = 0; i < currentSurahData.arabic.length; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Ayah ${i + 1}`;
        ayahSelect.appendChild(option);
    }
    ayahSelect.value = currentAyahIndex;
}

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

export async function loadReadingProgress() {
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
        showError("Failed to load reading progress.");
    }
}

export async function saveReadingProgress() {
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
        showError("Failed to save reading progress.");
    }
}

async function updateDailyReadCount() {
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    const docRef = doc(db, PROGRESS_COLLECTION, userId, "readingHistory", today);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const currentReadCount = docSnap.data().read || 0;
            await updateDoc(docRef, { read: currentReadCount + 1, timestamp: serverTimestamp() });
        } else {
            await setDoc(docRef, { read: 1, listen: 0, timestamp: serverTimestamp() });
        }
        displayUserDashboard();
    } catch (error) {
        console.error("Error updating daily read count:", error);
        showError("Failed to update daily read count.");
    }
}

function setupEventListeners() {
    if (surahSelectRead) surahSelectRead.addEventListener('change', async () => {
        clearError();
        currentAyahIndex = 0;
        const selectedSurahRead = surahSelectRead.value;
        const selectedScriptRead = scriptSelectRead ? scriptSelectRead.value : 'en.ahmedali';
        await loadSurahData(selectedSurahRead, selectedScriptRead);
        displaySingleAyah(currentAyahIndex);
        populateAyahDropdown();
        updateReadTabUIState();
    });
    if (ayahSelect) ayahSelect.addEventListener('change', () => {
        clearError();
        currentAyahIndex = parseInt(ayahSelect.value);
        displaySingleAyah(currentAyahIndex);
        updateReadTabUIState();
    });
    if (scriptSelectRead) scriptSelectRead.addEventListener('change', async () => {
        clearError();
        const selectedSurahRead = surahSelectRead ? surahSelectRead.value : '1';
        const selectedScriptRead = scriptSelectRead.value;
        await loadSurahData(selectedSurahRead, selectedScriptRead);
        displaySingleAyah(currentAyahIndex);
    });
    if (prevAyahBtn) prevAyahBtn.addEventListener('click', async () => {
        clearError();
        if (!currentSurahData) { showError('No Surah data loaded for reading.'); return; }
        if (currentAyahIndex > 0) {
            currentAyahIndex--;
            if (isReadingActive) await updateDailyReadCount();
        } else {
            const currentSurahNumber = parseInt(surahSelectRead ? surahSelectRead.value : '1');
            const prevSurahNumber = currentSurahNumber - 1;
            if (prevSurahNumber >= 1) {
                const prevSurahData = surahs.find(s => s.number === prevSurahNumber);
                if (prevSurahData) {
                    if (surahSelectRead) surahSelectRead.value = prevSurahNumber;
                    currentAyahIndex = prevSurahData.numberOfAyahs - 1;
                    const scriptIdentifier = scriptSelectRead ? scriptSelectRead.value : 'en.ahmedali';
                    await loadSurahData(prevSurahNumber.toString(), scriptIdentifier);
                    if (isReadingActive) await updateDailyReadCount();
                    showConfirmation(`Moved to Surah ${prevSurahNumber}, Ayah ${currentAyahIndex + 1}.`);
                } else { showError('Could not find data for the previous Surah.'); }
            } else { showError('You are at the beginning of the Quran!'); }
        }
        populateAyahDropdown();
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
            const currentSurahNumber = parseInt(surahSelectRead ? surahSelectRead.value : '1');
            const nextSurahNumber = currentSurahNumber + 1;
            if (nextSurahNumber <= 114) {
                const nextSurahData = surahs.find(s => s.number === nextSurahNumber);
                if (nextSurahData) {
                    if (surahSelectRead) surahSelectRead.value = nextSurahNumber;
                    currentAyahIndex = 0;
                    const scriptIdentifier = scriptSelectRead ? scriptSelectRead.value : 'en.ahmedali';
                    await loadSurahData(nextSurahNumber.toString(), scriptIdentifier);
                    if (isReadingActive) await updateDailyReadCount();
                    showConfirmation(`Moved to Surah ${nextSurahNumber}, Ayah ${currentAyahIndex + 1}.`);
                } else { showError('Could not find data for the next Surah.'); }
            } else {
                showConfirmation('You have reached the end of the Quran! Congratulations!');
                if (isReadingActive) {
                    isReadingActive = false;
                    saveReadingProgress();
                }
            }
        }
        populateAyahDropdown();
        displaySingleAyah(currentAyahIndex);
        updateReadTabUIState();
    });
    if (startDoneReadingBtn) startDoneReadingBtn.addEventListener('click', () => {
        isReadingActive = !isReadingActive;
        if (!isReadingActive) {
            saveReadingProgress();
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
