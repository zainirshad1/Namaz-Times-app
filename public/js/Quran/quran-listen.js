/**
 * quran-listen.js
 * This module manages the UI and logic for the "Listen" tab of the Quran application.
 */

// Import necessary Firestore functions
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { fetchSurahData, fetchSurahAudio as fetchAudioData } from './quran-api.js';

/**
 * Displays the full Surah for listen mode, including Arabic and translation.
 * @param {object} currentSurahData - The current surah's Arabic and translation data.
 * @param {HTMLElement} quranDisplay - The HTML element to display the Surah.
 * @param {HTMLElement} quranAudio - The audio HTML element.
 * @param {function} highlightAyah - Callback function to highlight the current ayah.
 */
export function displayFullSurah(currentSurahData, quranDisplay, quranAudio, highlightAyah) {
    if (!currentSurahData || !quranDisplay) return;

    quranDisplay.innerHTML = ''; // Clear previous content

    currentSurahData.arabic.forEach((ayahData, index) => {
        const ayahContainer = document.createElement('div');
        ayahContainer.classList.add('ayah-container', 'mb-4', 'p-3', 'rounded-lg', 'bg-gray-50', 'shadow-sm');
        ayahContainer.dataset.index = index;

        const arabicText = document.createElement('p');
        arabicText.classList.add('arabic-text', 'text-right', 'text-2xl', 'font-arabic', 'mb-1');
        arabicText.textContent = ayahData.text;

        const translationText = document.createElement('p');
        translationText.classList.add('translation-text', 'text-lg', 'text-gray-700', 'italic');
        translationText.textContent = currentSurahData.translation[index]?.text || 'Translation not available.';

        ayahContainer.appendChild(arabicText);
        ayahContainer.appendChild(translationText);
        quranDisplay.appendChild(ayahContainer);
    });

    highlightAyah(0, quranDisplay);
}


/**
 * Stops audio playback and resets UI.
 * @param {HTMLAudioElement} quranAudio - The audio element.
 * @param {HTMLElement} playPauseBtn - The play/pause button.
 * @param {HTMLElement} quranDisplay - The Surah display element.
 * @param {number} listeningAyahIndex - The current ayah index being listened to.
 * @returns {number} The reset ayah index (0).
 */
export function stopPlayback(quranAudio, playPauseBtn, quranDisplay, listeningAyahIndex) {
    if (quranAudio) {
        quranAudio.pause();
        quranAudio.currentTime = 0;
    }
    if (playPauseBtn) {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
    }
    const highlightedAyah = quranDisplay ? quranDisplay.querySelector('.ayah-container.bg-blue-200') : null;
    if (highlightedAyah) {
        highlightedAyah.classList.remove('bg-blue-200', 'font-bold');
        highlightedAyah.classList.add('bg-gray-50');
    }
    return 0;
}

/**
 * Starts audio recitation from a given ayah index.
 * @param {object} currentSurahAudioData - Object containing audio URLs for the current surah.
 * @param {number} listeningAyahIndex - The starting ayah index for playback.
 * @param {HTMLAudioElement} quranAudio - The audio element.
 * @param {HTMLElement} playPauseBtn - The play/pause button.
 * @param {function} highlightAyah - Callback function to highlight the current ayah.
 * @param {function} showError - Callback to display an error message.
 * @param {function} stopPlaybackFunc - Reference to the stopPlayback function.
 * @param {number} currentPlaybackSpeed - The current audio playback speed.
 * @param {HTMLElement} quranDisplay - The HTML element displaying the Quran text.
 * @returns {Promise<boolean>} True if playback started, false otherwise.
 */
export async function startRecitation(
    currentSurahAudioData,
    listeningAyahIndex,
    quranAudio,
    playPauseBtn,
    highlightAyah,
    showError,
    stopPlaybackFunc,
    currentPlaybackSpeed,
    quranDisplay
) {
    if (!currentSurahAudioData || currentSurahAudioData.length === 0) {
        showError("No audio data available for this Surah/Reciter.");
        return false;
    }

    if (listeningAyahIndex >= currentSurahAudioData.length) {
        showError("End of Surah reached.");
        stopPlaybackFunc();
        return false;
    }

    const ayahAudioUrl = currentSurahAudioData[listeningAyahIndex]?.audio;
    if (!ayahAudioUrl) {
        console.warn(`Audio URL missing for Ayah ${listeningAyahIndex + 1}. Skipping.`);
        const nextAyahIndex = listeningAyahIndex + 1;
        if (nextAyahIndex < currentSurahAudioData.length) {
            return await startRecitation(
                currentSurahAudioData, nextAyahIndex, quranAudio, playPauseBtn,
                highlightAyah, showError, stopPlaybackFunc, currentPlaybackSpeed, quranDisplay
            );
        } else {
            showError("End of Surah reached, or no more valid audio URLs.");
            stopPlaybackFunc();
            return false;
        }
    }

    quranAudio.src = ayahAudioUrl;
    quranAudio.playbackRate = currentPlaybackSpeed;
    
    try {
        await quranAudio.play();
        if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        highlightAyah(listeningAyahIndex, quranDisplay);
        return true;
    } catch (error) {
        console.error("Error playing audio:", error);
        showError("Failed to play audio. Check reciter selection or network connection.");
        stopPlaybackFunc();
        return false;
    }
}


/**
 * Plays the next ayah in the sequence.
 * @param {number} listeningAyahIndex - The current 0-based index of the ayah being played.
 * @param {object} currentSurahAudioData - Object containing audio URLs for the current surah.
 * @param {HTMLAudioElement} quranAudio - The audio element.
 * @param {function} updateDailyListenCount - Callback to update the daily listen count.
 * @param {function} stopPlaybackFunc - Reference to the stopPlayback function.
 * @param {function} showConfirmation - Callback to display a confirmation message.
 * @param {function} highlightAyah - Callback function to highlight the current ayah.
 * @param {object} firestoreParams - Object containing userId, db, displayUserDashboard, showError, quranDisplay
 * @returns {Promise<{newAyahIndex: number, playbackStopped: boolean}>} The next ayah index and whether playback stopped.
 */
export async function playNextAyah(
    listeningAyahIndex,
    currentSurahAudioData,
    quranAudio,
    updateDailyListenCount,
    stopPlaybackFunc,
    showConfirmation,
    highlightAyah,
    firestoreParams
) {
    if (listeningAyahIndex < currentSurahAudioData.length - 1) {
        listeningAyahIndex++;
        const started = await startRecitation(
            currentSurahAudioData, listeningAyahIndex, quranAudio,
            firestoreParams.playPauseBtn, highlightAyah, firestoreParams.showError, stopPlaybackFunc,
            quranAudio.playbackRate, firestoreParams.quranDisplay
        );
        if (started) {
            await updateDailyListenCount(firestoreParams.userId, firestoreParams.db, firestoreParams.displayUserDashboard, firestoreParams.showError);
            return { newAyahIndex: listeningAyahIndex, playbackStopped: false };
        } else {
            return { newAyahIndex: listeningAyahIndex, playbackStopped: true };
        }
    } else {
        showConfirmation('Surah finished! Allahu Akbar!');
        stopPlaybackFunc();
        await updateDailyListenCount(firestoreParams.userId, firestoreParams.db, firestoreParams.displayUserDashboard, firestoreParams.showError);
        return { newAyahIndex: 0, playbackStopped: true };
    }
}


/**
 * Highlights the currently playing ayah and scrolls it into view.
 * @param {number} index - The 0-based index of the ayah to highlight.
 * @param {HTMLElement} quranDisplay - The HTML element containing all ayah containers.
 */
export function highlightAyah(index, quranDisplay) {
    if (!quranDisplay) return;

    const previouslyHighlighted = quranDisplay.querySelector('.ayah-container.bg-blue-200');
    if (previouslyHighlighted) {
        previouslyHighlighted.classList.remove('bg-blue-200', 'font-bold');
        previouslyHighlighted.classList.add('bg-gray-50');
    }

    const currentAyahElement = quranDisplay.querySelector(`.ayah-container[data-index="${index}"]`);
    if (currentAyahElement) {
        currentAyahElement.classList.add('bg-blue-200', 'font-bold');
        currentAyahElement.classList.remove('bg-gray-50');
        currentAyahElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/**
 * Updates the daily listen ayah count in Firestore.
 * @param {string} userId - The current user's UID.
 * @param {object} db - The Firestore database instance.
 * @param {function} displayUserDashboard - Callback to refresh the dashboard.
 * @param {function} showError - Callback to display an error message.
 */
export async function updateDailyListenCount(userId, db, displayUserDashboard, showError) {
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    
    // UPDATED PATH: users/{userId}/dailyListenLogs/{YYYY-MM-DD}
    const dailyListenDocRef = doc(db, "users", userId, "dailyListenLogs", today);
    
    try {
        const docSnap = await getDoc(dailyListenDocRef);
        if (docSnap.exists()) {
            const currentListenCount = docSnap.data().count || 0; 
            await updateDoc(dailyListenDocRef, { count: currentListenCount + 1, timestamp: serverTimestamp() });
        } else {
            await setDoc(dailyListenDocRef, { count: 1, timestamp: serverTimestamp() });
        }
        await updateRewardsEarned(userId, db, 1, showError); // Add 1 for each ayah listened
        displayUserDashboard();
    } catch (error) {
        console.error("Error updating daily listen count:", error);
        showError("Failed to update daily listen count. Permissions issue.");
    }
}

/**
 * Updates the total earned rewards in Firestore.
 * This function is duplicated here to avoid circular dependencies if quran-read.js imports this.
 * For a cleaner architecture, it should be moved to a shared utility module.
 * @param {string} userId - The current user's UID.
 * @param {object} db - The Firestore database instance.
 * @param {number} amount - The amount of rewards to add (e.g., 1 for each ayah).
 * @param {function} showError - Callback to display an error message.
 */
export async function updateRewardsEarned(userId, db, amount, showError) {
    if (!userId) return;
    // UPDATED PATH: users/{userId}/quranData/rewardsTotals
    const rewardsSummaryDocRef = doc(db, "users", userId, "quranData", "rewardsTotals"); 
    try {
        const docSnap = await getDoc(rewardsSummaryDocRef);
        let currentEarned = 0;
        let currentRedeemed = 0;

        if (docSnap.exists()) {
            const data = docSnap.data();
            currentEarned = data.rewardsEarned || 0; // Corrected field name
            currentRedeemed = data.rewardsRedeemed || 0; // Corrected field name
        }

        const newEarned = currentEarned + amount;
        const newAvailable = newEarned - currentRedeemed; 

        await setDoc(rewardsSummaryDocRef, {
            rewardsEarned: newEarned, // Corrected field name
            rewardsRedeemed: currentRedeemed, // Corrected field name
            rewardsAvailable: newAvailable, // Corrected field name
            lastUpdated: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error("Error updating rewards earned (from quran-listen.js):", error);
        showError("Failed to update rewards. Permissions issue.");
    }
}
