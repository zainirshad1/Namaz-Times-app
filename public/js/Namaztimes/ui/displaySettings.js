// public/js/Namaztimes/ui/displaySettings.js

import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { asrCalculationSchool } from '../helpers/globals.js';

/**
 * Displays the settings modal and loads user's saved settings.
 * @param {HTMLElement} settingsModalOverlay - The settings modal element.
 * @param {object} auth - The Firebase Auth service object.
 * @param {object} db - The Firestore service object.
 * @param {HTMLInputElement} asrHanafiRadio - The radio button for Hanafi school.
 * @param {HTMLInputElement} asrShafiRadio - The radio button for Shafi'i school.
 */
export async function displaySettings(settingsModalOverlay, auth, db, asrHanafiRadio, asrShafiRadio) {
    settingsModalOverlay.classList.add('show');
    const user = auth.currentUser;

    if (user) {
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.asrCalculationSchool === '0') {
                    asrHanafiRadio.checked = true;
                } else {
                    asrShafiRadio.checked = true;
                }
            }
        } catch (error) {
            console.error("Error loading user settings:", error);
        }
    } else {
        // Default to Shafi'i if not logged in
        asrShafiRadio.checked = true;
    }
}