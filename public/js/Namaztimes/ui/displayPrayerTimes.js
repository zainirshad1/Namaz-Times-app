// public/js/Namaztimes/ui/displayPrayerTimes.js

import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { formatTimeToAMPM, formatRakatDetails } from '../helpers/utils.js';
import { updateNextPrayer } from './updateNextPrayer.js';
import { showCustomMessage } from '../helpers/messages.js';

// Global variables from helpers
import { userLocation, currentMasjidDetails, currentUserPrayerTimes, asrCalculationSchool } from '../helpers/globals.js';

// Import rakatFunctions from its dedicated file
import { rakatFunctions } from '../helpers/rakats.js';

// API functions
import { fetchPrayerTimesFromAlAdhan } from '../api/alAdhanApi.js';

/**
 * Displays prayer times for the selected masjid or a default location.
 * @param {string} masjidId - The ID of the selected masjid.
 * @param {object} db - The Firestore service object.
 * @param {object} userLocation - Object with user's latitude and longitude.
 * @param {string} asrCalculationSchool - The Asr school setting ('0' for Hanafi, '1' for Shafi'i).
 * @param {object} rakatFunctions - Functions to get rakat details.
 * @param {HTMLElement} viewDetailsBtn - The masjid details button.
 * @param {HTMLElement} directionsBtn - The directions button.
 * @param {HTMLElement} masjidLocationInfo - The masjid location info display element.
 * @param {Array} currentUserPrayerTimes - Global array to store prayer times.
 * @param {object} currentMasjidDetails - Global object to store masjid details.
 * @param {Function} fetchPrayerTimesFromAlAdhan - Function to fetch times from the API.
 */
export async function displayPrayerTimes(masjidId, db, userLocation, asrCalculationSchool, rakatFunctions, viewDetailsBtn, directionsBtn, masjidLocationInfo, currentUserPrayerTimes, currentMasjidDetails, fetchPrayerTimesFromAlAdhan) {
    const prayerTimesDiv = document.getElementById('prayer-times');
    let prayerTimes = null;
    let masjidDetails = null;

    // Get the new Sehri and Iftari display elements
    const sehriTimeDisplay = document.getElementById('sehri-time-display');
    const iftariTimeDisplay = document.getElementById('iftari-time-display');

    // ... (masjidId logic remains the same)
    if (masjidId) {
        try {
            const masjidDoc = await getDoc(doc(db, 'masjids', masjidId));
            if (masjidDoc.exists()) {
                masjidDetails = masjidDoc.data();
                prayerTimes = masjidDetails.prayerTimes;
            } else {
                showCustomMessage('Selected masjid not found in database.', 'error');
            }
        } catch (error) {
            console.error("Error fetching masjid details:", error);
            showCustomMessage('Failed to load masjid details.', 'error');
        }
    }

    if (masjidDetails) {
        if (masjidLocationInfo) masjidLocationInfo.textContent = masjidDetails.address || 'Location not specified';
        if (viewDetailsBtn) viewDetailsBtn.classList.remove('hidden');
        if (directionsBtn) {
            if (masjidDetails.latitude && masjidDetails.longitude) {
                directionsBtn.classList.remove('hidden');
            } else {
                directionsBtn.classList.add('hidden');
            }
        }
        currentMasjidDetails = masjidDetails;
    } else {
        // Fallback to user location or a hardcoded location if no masjid is selected.
        if (masjidLocationInfo) masjidLocationInfo.textContent = 'Masjid not selected';
        if (viewDetailsBtn) viewDetailsBtn.classList.add('hidden');
        if (directionsBtn) directionsBtn.classList.add('hidden');
        currentMasjidDetails = null;

        let lat = userLocation.latitude;
        let lon = userLocation.longitude;
        let locationName = userLocation.city ? `${userLocation.city}, ${userLocation.country}` : 'your current location';
        let customMessage = `Showing prayer times based on ${locationName}.`;

        if (!lat || !lon) {
            lat = 12.9716;  // Latitude for Bangalore, India
            lon = 77.5946; // Longitude for Bangalore, India
            customMessage = 'Location services unavailable. Showing prayer times for Bangalore, India.';
        }

        const alAdhanTimes = await fetchPrayerTimesFromAlAdhan(lat, lon, 1, asrCalculationSchool); // Use method 1 for India
        if (alAdhanTimes) {
            prayerTimes = {
                Fajr: { azanTime: alAdhanTimes.Fajr.azanTime, prayerTime: alAdhanTimes.Fajr.azanTime, endTime: alAdhanTimes.Fajr.endTime },
                Dhuhr: { azanTime: alAdhanTimes.Dhuhr.azanTime, prayerTime: alAdhanTimes.Dhuhr.azanTime, endTime: alAdhanTimes.Dhuhr.endTime },
                Asr: { azanTime: alAdhanTimes.Asr.azanTime, prayerTime: alAdhanTimes.Asr.azanTime, endTime: alAdhanTimes.Asr.endTime },
                Maghrib: { azanTime: alAdhanTimes.Maghrib.azanTime, prayerTime: alAdhanTimes.Maghrib.azanTime, endTime: alAdhanTimes.Maghrib.endTime },
                Isha: { azanTime: alAdhanTimes.Isha.azanTime, prayerTime: alAdhanTimes.Isha.azanTime, endTime: "23:59" }
            };
            
            // Set Sehri and Iftari times
            if (sehriTimeDisplay) sehriTimeDisplay.textContent = formatTimeToAMPM(alAdhanTimes.Sehri);
            if (iftariTimeDisplay) iftariTimeDisplay.textContent = formatTimeToAMPM(alAdhanTimes.Iftari);

            showCustomMessage(customMessage, 'info');
        } else {
            showCustomMessage('Failed to fetch prayer times. Please try again later.', 'error');
        }
    }
    
    if (prayerTimesDiv) prayerTimesDiv.innerHTML = '';
    
    const prayerOrder = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    currentUserPrayerTimes.length = 0;

    if (prayerTimes) { 
        prayerOrder.forEach(prayerName => {
            const prayer = prayerTimes[prayerName]; 
            if (prayer) {
                const prayerCard = document.createElement('div');
                prayerCard.className = 'prayer-card p-4 rounded-lg shadow-md bg-white';
                const rakats = rakatFunctions[prayerName] ? rakatFunctions[prayerName]() : {};

prayerCard.innerHTML = `
    <div class="flex items-center justify-between">
        <div>
            <h4 class="text-lg font-semibold text-gray-800">${prayerName}</h4>
            <div class="rakat-container mt-2">
                ${formatRakatDetails(rakats)}
            </div>
        </div>
        <div class="text-right">
            <p class="text-sm text-gray-500">Adhan</p>
            <p class="text-2xl font-bold text-green-700 prayer-time-text">${formatTimeToAMPM(prayer.azanTime)}</p>
        </div>
        <div class="text-right ml-4">
            <p class="text-sm text-gray-500">Iqamah</p>
            <p class="text-2xl font-bold text-blue-700 prayer-time-text">${formatTimeToAMPM(prayer.prayerTime)}</p>
        </div>
        <div class="text-right ml-4">
            <p class="text-sm text-gray-500">End</p>
            <p class="text-2xl font-bold text-red-700 prayer-time-text">${formatTimeToAMPM(prayer.endTime)}</p>
        </div>
    </div>
`;
                if (prayerTimesDiv) prayerTimesDiv.appendChild(prayerCard);
                
                currentUserPrayerTimes.push({
                    name: prayerName,
                    time: prayer.azanTime
                });
            }
        });
    } else {
        showCustomMessage('No prayer times could be loaded.', 'error');
    }

    if (currentUserPrayerTimes.length > 0) {
        updateNextPrayer(currentUserPrayerTimes);
    } else {
        showCustomMessage('No prayer times could be loaded.', 'error');
    }
}