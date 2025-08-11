/**
 * quran-read.js
 * This module manages the UI and logic for the "Read" tab of the Quran application.
 */

// Import necessary Firestore functions
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { fetchSurahData } from './quran-api.js';

/**
 * Displays a single Ayah for reading mode.
 * @param {number} index - The index of the Ayah to display (0-based).
 * @param {object} currentSurahData - The current surah's Arabic and translation data.
 * @param {HTMLElement} quranDisplayRead - The HTML element to display the Ayah.
 * @param {HTMLElement} ayahSelect - The dropdown for selecting Ayahs.
 */
export function displaySingleAyah(index, currentSurahData, quranDisplayRead, ayahSelect) {
    if (!currentSurahData || !quranDisplayRead) {
        console.warn("displaySingleAyah: Missing currentSurahData or quranDisplayRead.");
        quranDisplayRead.innerHTML = '<p class="text-red-500">Error: Could not load Ayah data.</p>';
        return;
    }
    quranDisplayRead.innerHTML = ''; // Clear previous content
    
    const ayah = currentSurahData.arabic[index];
    const translation = currentSurahData.translation[index];
    
    let ayahElement = null; 

    if (ayah) {
        ayahElement = document.createElement('p'); 
        ayahElement.classList.add('ayah-read', 'text-2xl', 'font-arabic', 'mb-2');
        ayahElement.textContent = `${ayah.text} (${ayah.number})`;
        quranDisplayRead.appendChild(ayahElement);
    } else {
        console.warn(`Ayah data missing for index ${index}.`);
        quranDisplayRead.innerHTML += '<p class="text-red-400">Arabic text missing for this Ayah.</p>';
    }
    
    if (translation) {
        const translationElement = document.createElement('p');
        translationElement.classList.add('translation', 'text-gray-700', 'text-lg', 'italic');
        translationElement.textContent = translation.text;
        quranDisplayRead.appendChild(translationElement); 
    } else {
        console.warn(`Translation data missing for index ${index}.`);
        quranDisplayRead.innerHTML += '<p class="text-red-400">Translation missing for this Ayah.</p>';
    }
    
    if (ayahSelect) {
        ayahSelect.value = index;
    }
}

/**
 * Populates the Ayah dropdown for the current Surah.
 * @param {object} currentSurahData - The current surah's Arabic and translation data.
 * @param {HTMLElement} ayahSelect - The dropdown for selecting Ayahs.
 * @param {number} currentAyahIndex - The current 0-based index of the ayah.
 */
export function populateAyahDropdown(currentSurahData, ayahSelect, currentAyahIndex) {
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
 * Updates the UI state of the "Start Reading" / "Done Reading" button.
 * @param {HTMLElement} startDoneReadingBtn - The button element.
 * @param {boolean} isReadingActive - Current status of the reading session.
 */
export function updateReadTabUIState(startDoneReadingBtn, isReadingActive) {
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
 * Updates the daily read ayah count in Firestore.
 * @param {string} userId - The current user's UID.
 * @param {object} db - The Firestore database instance.
 * @param {function} displayUserDashboard - Callback to refresh the dashboard.
 * @param {function} showError - Callback to display an error message.
 */
export async function updateDailyReadCount(userId, db, displayUserDashboard, showError) {
    if (!userId) return; // Only track for logged-in users
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
    
    // Path: users/{userId}/dailyReadLogs/{YYYY-MM-DD} - 4 segments (Document)
    const dailyReadDocRef = doc(db, "users", userId, "dailyReadLogs", today);
    console.log("Attempting to update daily read count at:", dailyReadDocRef.path);
    
    try {
        const docSnap = await getDoc(dailyReadDocRef);
        if (docSnap.exists()) {
            const currentReadCount = docSnap.data().count || 0; 
            await updateDoc(dailyReadDocRef, { count: currentReadCount + 1, timestamp: serverTimestamp() });
            console.log("Daily read count updated for today:", currentReadCount + 1);
        } else {
            await setDoc(dailyReadDocRef, { count: 1, timestamp: serverTimestamp() });
            console.log("Daily read count initialized for today: 1");
        }
        await updateRewardsEarned(userId, db, 1, showError); // Add 1 for each ayah read
        displayUserDashboard(); // Update dashboard after count
    } catch (error) {
        console.error("Error updating daily read count:", error);
        showError("Failed to update daily read count. Permissions issue.");
    }
}

/**
 * Loads the user's last reading progress (last surah and ayah) from Firestore.
 * @param {string} userId - The current user's UID.
 * @param {object} db - The Firestore database instance.
 * @param {HTMLElement} surahSelectRead - The surah select dropdown for the read tab.
 * @param {function} showConfirmation - Callback to display a confirmation message.
 * @param {function} showError - Callback to display an error message.
 * @returns {Promise<{surahNumber: number, ayahIndex: number} | null>} A promise resolving to the last read data or null.
 */
export async function loadReadingProgress(userId, db, surahSelectRead, showConfirmation, showError) {
    if (!userId) {
        console.log("LoadReadingProgress: No user ID, cannot load progress.");
        return null;
    }
    // Path: users/{userId}/quranData/lastReadProgress - 4 segments (Document)
    const userProgressDocRef = doc(db, "users", userId, "quranData", "lastReadProgress"); 
    console.log("Attempting to load reading progress from:", userProgressDocRef.path);

    try {
        const docSnap = await getDoc(userProgressDocRef);
        if (docSnap.exists() && docSnap.data().surahNumber) { 
            const { surahNumber, ayahIndex } = docSnap.data(); 
            console.log("Loaded raw progress data:", docSnap.data());
            if (surahSelectRead) surahSelectRead.value = surahNumber;
            showConfirmation(`Resumed from Surah ${surahNumber}, Ayah ${ayahIndex + 1}.`);
            return { surahNumber: surahNumber, ayahIndex: ayahIndex };
        } else {
            console.log("No existing reading progress found or data incomplete at:", userProgressDocRef.path);
            return null;
        }
    } catch (error) {
        console.error("Error loading reading progress:", error);
        showError("Failed to load reading progress. Permissions issue.");
        return null;
    }
}

/**
 * Saves the user's current reading progress (current surah and ayah) to Firestore.
 * @param {string} userId - The current user's UID.
 * @param {object} db - The Firestore database instance.
 * @param {HTMLElement} surahSelectRead - The surah select dropdown for the read tab.
 * @param {number} currentAyahIndex - The current 0-based index of the ayah.
 * @param {function} showConfirmation - Callback to display a confirmation message.
 * @param {function} showError - Callback to display an error message.
 */
export async function saveReadingProgress(userId, db, surahSelectRead, currentAyahIndex, showConfirmation, showError) {
    if (!userId || !surahSelectRead) {
        console.warn("SaveReadingProgress: Missing userId or surahSelectRead, cannot save progress.");
        return;
    }
    // Path: users/{userId}/quranData/lastReadProgress - 4 segments (Document)
    const userProgressDocRef = doc(db, "users", userId, "quranData", "lastReadProgress"); 
    console.log("Attempting to save reading progress to:", userProgressDocRef.path);
    console.log("Saving Surah:", parseInt(surahSelectRead.value), "Ayah:", currentAyahIndex);

    try {
        await setDoc(userProgressDocRef, {
            surahNumber: parseInt(surahSelectRead.value), 
            ayahIndex: currentAyahIndex, 
            updatedAt: serverTimestamp()
        }, { merge: true }); 
        console.log("Reading progress successfully saved!");
        showConfirmation("Reading progress saved!");
    } catch (error) {
        console.error("Error saving reading progress:", error);
        showError("Failed to save reading progress. Permissions issue.");
    }
}

/**
 * Updates the total earned rewards in Firestore.
 * @param {string} userId - The current user's UID.
 * @param {object} db - The Firestore database instance.
 * @param {number} amount - The amount of rewards to add (e.g., 1 for each ayah).
 * @param {function} showError - Callback to display an error message.
 */
export async function updateRewardsEarned(userId, db, amount, showError) {
    if (!userId) return;
    // Path: users/{userId}/quranData/rewardsTotals - 4 segments (Document)
    const rewardsSummaryDocRef = doc(db, "users", userId, "quranData", "rewardsTotals"); 
    console.log("Attempting to update rewards at:", rewardsSummaryDocRef.path);
    try {
        const docSnap = await getDoc(rewardsSummaryDocRef);
        let currentEarned = 0;
        let currentRedeemed = 0;

        if (docSnap.exists()) {
            const data = docSnap.data();
            currentEarned = data.rewardsEarned || 0; 
            currentRedeemed = data.rewardsRedeemed || 0; 
        }

        const newEarned = currentEarned + amount;
        const newAvailable = newEarned - currentRedeemed; 

        await setDoc(rewardsSummaryDocRef, {
            rewardsEarned: newEarned, 
            rewardsRedeemed: currentRedeemed, 
            rewardsAvailable: newAvailable, 
            lastUpdated: serverTimestamp()
        }, { merge: true });
        console.log("Rewards updated: Earned", newEarned, "Available", newAvailable);
    } catch (error) {
        console.error("Error updating rewards earned:", error);
        showError("Failed to update rewards. Permissions issue.");
    }
}

/**
 * Handles navigation to the previous Ayah or Surah in read mode.
 * @param {object} params - Object containing necessary parameters.
 * @param {number} params.currentAyahIndex - Current Ayah index.
 * @param {Array} params.currentSurahData - Current surah data.
 * @param {Array} params.surahs - All surahs data.
 * @param {HTMLElement} params.surahSelectRead - Surah select element for read tab.
 * @param {HTMLElement} params.scriptSelectRead - Script select element for read tab.
 * @param {function} params.updateDailyReadCount - Function to update daily read count.
 * @param {function} params.showError - Function to show error message.
 * @param {function} params.showConfirmation - Function to show confirmation message.
 * @param {function} params.displaySingleAyah - Function to display a single ayah.
 * @param {function} params.populateAyahDropdown - Function to populate ayah dropdown.
 * @param {function} params.updateReadTabUIState - Function to update read tab UI.
 * @param {string} params.userId - The current user's UID.
 * @param {object} params.db - The Firestore database instance.
 * @param {function} params.displayUserDashboard - Function to display the user dashboard.
 * @param {HTMLElement} params.ayahSelect - The ayah select dropdown for the read tab.
 * @param {HTMLElement} params.quranDisplayRead - The quran display element for read mode.
 * @returns {Promise<{newAyahIndex: number, newSurahData: object|null}>} New ayah index and surah data, or null.
 */
export async function navigatePreviousAyah({
    currentAyahIndex, currentSurahData, surahs, surahSelectRead, scriptSelectRead,
    updateDailyReadCount, showError, showConfirmation, displaySingleAyah,
    populateAyahDropdown, updateReadTabUIState, userId, db, displayUserDashboard,
    ayahSelect, quranDisplayRead
}) {
    let newAyahIndex = currentAyahIndex;
    let newSurahData = currentSurahData;
    let newSurahNumber = parseInt(surahSelectRead ? surahSelectRead.value : '1');

    if (!currentSurahData) {
        showError('No Surah data loaded for reading.');
        return { newAyahIndex, newSurahData };
    }
    
    if (newAyahIndex > 0) {
        newAyahIndex--;
        if (updateDailyReadCount) await updateDailyReadCount(userId, db, displayUserDashboard, showError);
    } else {
        const prevSurahNumber = newSurahNumber - 1;
        if (prevSurahNumber >= 1) {
            const prevSurahDataInfo = surahs.find(s => s.number === prevSurahNumber);
            if (prevSurahDataInfo) {
                if (surahSelectRead) surahSelectRead.value = prevSurahNumber;
                newAyahIndex = prevSurahDataInfo.numberOfAyahs - 1; // Last ayah of previous surah
                const scriptIdentifier = scriptSelectRead ? scriptSelectRead.value : 'en.ahmedali';
                newSurahData = await fetchSurahData(prevSurahNumber.toString(), scriptIdentifier);
                if (updateDailyReadCount) await updateDailyReadCount(userId, db, displayUserDashboard, showError);
                showConfirmation(`Moved to Surah ${prevSurahNumber}, Ayah ${newAyahIndex + 1}.`);
            } else {
                showError('Could not find data for the previous Surah.');
            }
        } else {
            showError('You are at the beginning of the Quran!');
        }
    }
    populateAyahDropdown(newSurahData, ayahSelect, newAyahIndex); 
    displaySingleAyah(newAyahIndex, newSurahData, quranDisplayRead, ayahSelect); 
    
    return { newAyahIndex, newSurahData };
}

/**
 * Handles navigation to the next Ayah or Surah in read mode.
 * @param {object} params - Object containing necessary parameters.
 * @param {number} params.currentAyahIndex - Current Ayah index.
 * @param {Array} params.currentSurahData - Current surah data.
 * @param {Array} params.surahs - All surahs data.
 * @param {HTMLElement} params.surahSelectRead - Surah select element for read tab.
 * @param {HTMLElement} params.scriptSelectRead - Script select element for read tab.
 * @param {boolean} params.isReadingActive - Current status of reading session.
 * @param {function} params.updateDailyReadCount - Function to update daily read count.
 * @param {function} params.saveReadingProgress - Function to save reading progress.
 * @param {function} params.showError - Function to show error message.
 * @param {function} params.showConfirmation - Function to show confirmation message.
 * @param {function} params.displaySingleAyah - Function to display a single ayah.
 * @param {function} params.populateAyahDropdown - Function to populate ayah dropdown.
 * @param {function} params.pdateReadTabUIState - Function to update read tab UI.
 * @param {string} params.userId - The current user's UID.
 * @param {object} params.db - The Firestore database instance.
 * @param {function} params.displayUserDashboard - Function to display the user dashboard.
 * @param {HTMLElement} params.ayahSelect - The ayah select dropdown for the read tab.
 * @param {HTMLElement} params.quranDisplayRead - The quran display element for read mode.
 * @returns {Promise<{newAyahIndex: number, newSurahData: object|null}>} New ayah index and surah data, or null.
 */
export async function navigateNextAyah({
    currentAyahIndex, currentSurahData, surahs, surahSelectRead, scriptSelectRead,
    isReadingActive, updateDailyReadCount, saveReadingProgress, showError, showConfirmation,
    displaySingleAyah, populateAyahDropdown, updateReadTabUIState, userId, db, displayUserDashboard,
    ayahSelect, quranDisplayRead
}) {
    let newAyahIndex = currentAyahIndex;
    let newSurahData = currentSurahData;
    let newSurahNumber = parseInt(surahSelectRead ? surahSelectRead.value : '1');

    if (!currentSurahData) {
        showError('No Surah data loaded for reading.');
        return { newAyahIndex, newSurahData };
    }

    if (newAyahIndex < currentSurahData.arabic.length - 1) {
        newAyahIndex++;
        if (updateDailyReadCount) await updateDailyReadCount(userId, db, displayUserDashboard, showError);
    } else {
        const nextSurahNumber = newSurahNumber + 1;
        if (nextSurahNumber <= 114) {
            const nextSurahDataInfo = surahs.find(s => s.number === nextSurahNumber);
            if (nextSurahDataInfo) {
                if (surahSelectRead) surahSelectRead.value = nextSurahNumber;
                newAyahIndex = 0; // First ayah of next surah
                const scriptIdentifier = scriptSelectRead ? scriptSelectRead.value : 'en.ahmedali';
                newSurahData = await fetchSurahData(nextSurahNumber.toString(), scriptIdentifier);
                if (updateDailyReadCount) await updateDailyReadCount(userId, db, displayUserDashboard, showError);
                showConfirmation(`Moved to Surah ${nextSurahNumber}, Ayah ${newAyahIndex + 1}.`);
            } else {
                showError('Could not find data for the next Surah.');
            }
        } else {
            showConfirmation('You have reached the end of the Quran! Congratulations!');
            if (isReadingActive) {
                if (saveReadingProgress) await saveReadingProgress(userId, db, surahSelectRead, newAyahIndex, showConfirmation, showError);
            }
        }
    }
    populateAyahDropdown(newSurahData, ayahSelect, newAyahIndex); 
    displaySingleAyah(newAyahIndex, newSurahData, quranDisplayRead, ayahSelect); 

    return { newAyahIndex, newSurahData };
}
