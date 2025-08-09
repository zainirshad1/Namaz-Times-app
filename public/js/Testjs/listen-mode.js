// listen-mode.js

// Import shared utilities and global state
import { userId, surahs, scripts, showLoading, hideLoading, showError, clearError, showConfirmation, displayUserDashboard } from "./quran-app.js";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// Global variables for listen mode
let reciters = [];
let currentSurahData = null;
let currentSurahAudioData = null;
let listeningAyahIndex = 0;
let isPlaying = false;
let currentPlaybackSpeed = 1.0;

// HTML element references
const reciterSelect = document.getElementById('reciter-select');
const surahSelect = document.getElementById('surah-select');
const speedSelect = document.getElementById('speed-select');
const scriptSelect = document.getElementById('script-select');
const playPauseBtn = document.getElementById('play-pause-btn');
const stopBtn = document.getElementById('stop-btn');
const quranAudio = document.getElementById('quran-audio');
const quranDisplay = document.getElementById('quran-display');
const reciterContainer = document.getElementById('reciter-container');
const speedContainer = document.getElementById('speed-container');
const scriptContainer = document.getElementById('script-container');

// Firestore collection name
const PROGRESS_COLLECTION = "userProgress";

export async function loadListenModeData() {
    const selectedSurah = surahSelect ? surahSelect.value : '1';
    const selectedScript = scriptSelect ? scriptSelect.value : 'en.ahmedali';
    const selectedReciter = reciterSelect ? reciterSelect.value : 'ar.alafasy';
    
    await Promise.all([
        loadReciters(),
        loadSurahData(selectedSurah, selectedScript),
        loadSurahAudio(selectedSurah, selectedReciter)
    ]);
    displayFullSurah();
}

export function initializeListenMode() {
    // Populate the dropdowns from the globally loaded data
    populateSurahDropdown();
    populateScriptDropdown();
    // Set up event listeners specific to listen mode
    setupEventListeners();
}

function populateSurahDropdown() {
    if (surahSelect) {
        surahSelect.innerHTML = '';
        surahs.forEach(surah => {
            const option = document.createElement('option');
            option.value = surah.number;
            option.textContent = `${surah.number}. ${surah.name} (${surah.englishName})`;
            surahSelect.appendChild(option);
        });
    }
}

function populateScriptDropdown() {
    if (scriptSelect) {
        scriptSelect.innerHTML = '';
        scripts.forEach(script => {
            const option = document.createElement('option');
            option.value = script.identifier;
            option.textContent = script.englishName;
            scriptSelect.appendChild(option);
        });
    }
}

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
        showError("Failed to load reciter list.");
    } finally {
        hideLoading();
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
        showError("Failed to load Surah audio.");
    } finally {
        hideLoading();
    }
}

function displayFullSurah() {
    if (!currentSurahData || !quranDisplay) return;
    quranDisplay.innerHTML = '';
    currentSurahData.arabic.forEach((ayah, index) => {
        const ayahElement = document.createElement('div');
        ayahElement.classList.add('ayah');
        ayahElement.dataset.index = index;
        ayahElement.textContent = `${ayah.text} (${ayah.number})`;
        if (currentSurahData.translation && currentSurahData.translation[index]) {
            const translationElement = document.createElement('p');
            translationElement.classList.add('translation');
            translationElement.textContent = currentSurahData.translation[index].text;
            ayahElement.appendChild(translationElement);
        }
        quranDisplay.appendChild(ayahElement);
    });
    if (quranAudio && quranAudio.paused && quranAudio.currentTime === 0) {
        highlightAyah(0);
    }
}

function highlightAyah(index) {
    if (!quranDisplay) return;
    const ayahs = quranDisplay.querySelectorAll('.ayah');
    ayahs.forEach(ayah => ayah.classList.remove('highlight'));
    const currentAyah = quranDisplay.querySelector(`.ayah[data-index="${index}"]`);
    if (currentAyah) {
        currentAyah.classList.add('highlight');
        currentAyah.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

export function stopPlayback() {
    if (quranAudio) quranAudio.pause();
    isPlaying = false;
    if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
    const highlighted = quranDisplay ? quranDisplay.querySelector('.ayah.highlight') : null;
    if (highlighted) highlighted.classList.remove('highlight');
    listeningAyahIndex = 0;
}

async function startRecitation() {
    if (!currentSurahAudioData || currentSurahAudioData.length === 0) {
        showError("No audio available for this Surah.");
        return;
    }
    isPlaying = true;
    if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
    if (quranAudio) {
        quranAudio.playbackRate = currentPlaybackSpeed;
        quranAudio.src = currentSurahAudioData[listeningAyahIndex].audio;
        await quranAudio.play().catch(e => {
            console.error("Audio playback error:", e);
            showError("Autoplay blocked. Please click play to start recitation.");
            stopPlayback();
        });
    }
    highlightAyah(listeningAyahIndex);
}

async function playNextAyah() {
    if (listeningAyahIndex < currentSurahAudioData.length - 1) {
        await updateDailyListenCount();
        listeningAyahIndex++;
        if (quranAudio) quranAudio.src = currentSurahAudioData[listeningAyahIndex].audio;
        highlightAyah(listeningAyahIndex);
        if (quranAudio) await quranAudio.play().catch(e => console.error("Audio playback error on next ayah:", e));
    } else {
        await updateDailyListenCount();
        stopPlayback();
        showConfirmation('End of Surah. Recitation completed.');
    }
}

async function updateDailyListenCount() {
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    const docRef = doc(db, PROGRESS_COLLECTION, userId, "readingHistory", today);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const currentListenCount = docSnap.data().listen || 0;
            await updateDoc(docRef, { listen: currentListenCount + 1, timestamp: serverTimestamp() });
        } else {
            await setDoc(docRef, { read: 0, listen: 1, timestamp: serverTimestamp() });
        }
        displayUserDashboard();
    } catch (error) {
        console.error("Error updating daily listen count:", error);
        showError("Failed to update daily listen count.");
    }
}

function setupEventListeners() {
    if (quranAudio) quranAudio.addEventListener('ended', playNextAyah);
    if (playPauseBtn) playPauseBtn.addEventListener('click', () => {
        if (isPlaying) {
            if (quranAudio) quranAudio.pause();
            isPlaying = false;
            if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
        } else {
            if (quranAudio && quranAudio.paused && quranAudio.currentTime > 0) {
                if (quranAudio) quranAudio.play().catch(e => console.error("Audio resume error:", e));
                isPlaying = true;
                if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
                highlightAyah(listeningAyahIndex);
            } else {
                listeningAyahIndex = 0;
                startRecitation();
            }
        }
    });
    if (stopBtn) stopBtn.addEventListener('click', stopPlayback);
    if (surahSelect) surahSelect.addEventListener('change', async () => {
        stopPlayback();
        listeningAyahIndex = 0;
        await loadListenModeData();
    });
    if (reciterSelect) reciterSelect.addEventListener('change', async () => {
        stopPlayback();
        listeningAyahIndex = 0;
        clearError();
        const selectedSurah = surahSelect ? surahSelect.value : '1';
        const selectedReciter = reciterSelect.value;
        await loadSurahAudio(selectedSurah, selectedReciter);
    });
    if (speedSelect) speedSelect.addEventListener('change', () => {
        currentPlaybackSpeed = parseFloat(speedSelect.value);
        if (quranAudio) quranAudio.playbackRate = currentPlaybackSpeed;
    });
    if (scriptSelect) scriptSelect.addEventListener('change', async () => {
        stopPlayback();
        clearError();
        const selectedSurah = surahSelect ? surahSelect.value : '1';
        const selectedScript = scriptSelect.value;
        await loadSurahData(selectedSurah, selectedScript);
        displayFullSurah();
    });
}
