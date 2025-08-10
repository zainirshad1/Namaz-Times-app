// public/js/Namaztimes/events/saveSettings.js

import { doc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { showCustomMessage } from '../helpers/messages.js';
import { displayPrayerTimes } from '../ui/displayPrayerTimes.js';
import { asrCalculationSchool } from '../helpers/globals.js';

/**
 * Saves user settings (e.g., Asr calculation method) to Firestore.
 * @param {object} auth - The Firebase Auth service object.
 * @param {object} db - The Firestore service object.
 * @param {HTMLInputElement} asrHanafiRadio - The radio button for Hanafi school.
 * @param {HTMLInputElement} asrShafiRadio - The radio button for Shafi'i school.
 * @param {HTMLElement} settingsModalOverlay - The settings modal element.
 * @param {Function} displayPrayerTimes - The function to refresh prayer times display.
 */
export async function saveSettings(auth, db, asrHanafiRadio, asrShafiRadio, settingsModalOverlay, displayPrayerTimes) {
    const user = auth.currentUser;
    if (!user) {
        showCustomMessage('You must be logged in to save settings.', 'error');
        return;
    }

    const newAsrSchool = asrHanafiRadio.checked ? '0' : '1';

    try {
        let userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
            asrCalculationSchool: newAsrSchool
        });
        asrCalculationSchool = newAsrSchool; // Update the global variable
        showCustomMessage('Settings saved successfully.', 'success');
        settingsModalOverlay.classList.remove('show');
        
        // Refresh prayer times with the new setting
        const masjidSelect = document.getElementById('masjid-select');
        displayPrayerTimes(masjidSelect.value, db, null, asrCalculationSchool, null, null, null, null, null, null, null, null, null, null);

    } catch (error) {
        console.error("Error saving settings:", error);
        showCustomMessage(`Failed to save settings: ${error.message}`, 'error');
    }
}