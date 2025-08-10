// public/js/main.js

import { auth } from './firebase-config.js';
import {
    populateMasjidDropdown,
    updateHeaderTimes,
    renderPrayerCards,
    updateSehriIftariDisplay,
    setMasjidLocationInfo,
    displayMasjidDetailsModal,
    updatePasswordAction, // Correctly imported
    saveSettings,
    handleLogout,
    setUserLocation,
    getAsrCalculationSchool,
    currentMasjidDetails,
    userLocation as globalUserLocation,
    closeDropdown,
    displayUserProfile, // Make sure these are imported if needed for direct calls from main.js
    displayChangePassword,
    displayQiblaDirection,
    displaySettings
} from './ui-elements.js';
import { fetchAllMasjidsFromFirestore, fetchMasjidDetails, fetchPrayerTimesFromFirestore, fetchPrayerTimesFromAlAdhan, getUserCurrentLocation } from './api.js';
import { getConsolidatedPrayerTimes, updateNextPrayer, rakatFunctions, defaultPrayerTimes } from './prayer-logic.js';
import { setupAuthListener } from './auth-manager.js';
import { showCustomMessage } from './utils.js'; // Explicitly import showCustomMessage

// DOM Elements
const masjidSelect = document.getElementById('masjid-select');
const locationBtn = document.getElementById('location-btn');
const viewDetailsBtn = document.getElementById('view-details-btn');
const directionsBtn = document.getElementById('directions-btn');
const masjidDetailsModalOverlay = document.getElementById('masjid-details-modal-overlay');
const modalCloseBtn = document.getElementById('modal-close-btn');
const profileDetailsModalOverlay = document.getElementById('profile-details-modal-overlay');
const profileModalCloseBtn = document.getElementById('profile-modal-close-btn');
const changePasswordModalOverlay = document.getElementById('change-password-modal-overlay');
const changePasswordModalCloseBtn = document.getElementById('change-password-modal-close-btn');
const updatePasswordBtn = document.getElementById('update-password-btn');
const qiblaDirectionModalOverlay = document.getElementById('qibla-direction-modal-overlay');
const qiblaDirectionModalCloseBtn = document.getElementById('qibla-direction-modal-close-btn');
const settingsModalOverlay = document.getElementById('settings-modal-overlay');
const settingsModalCloseBtn = document.getElementById('settings-modal-close-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');


// --- Main Application Logic ---

/**
 * Orchestrates fetching and displaying prayer times based on selected masjid or user location.
 * @param {string} [masjidId=''] - The ID of the selected masjid. If empty, uses user's location.
 */
async function displayPrayerTimes(masjidId = '') {
    // Clear previous displays
    setMasjidLocationInfo(null);
    renderPrayerCards([]);
    updateSehriIftariDisplay('N/A', 'N/A');
    updateNextPrayer([]);

    let fetchedMasjidDetails = null;
    let fetchedFirestoreTimes = null;
    let fetchedAlAdhanTimes = null;
    const asrSchool = getAsrCalculationSchool();

    if (masjidId) {
        try {
            fetchedMasjidDetails = await fetchMasjidDetails(masjidId);
            if (fetchedMasjidDetails) {
                setMasjidLocationInfo(fetchedMasjidDetails);
                fetchedFirestoreTimes = await fetchPrayerTimesFromFirestore(masjidId);

                const locationForAPI = (fetchedMasjidDetails.latitude && fetchedMasjidDetails.longitude) ?
                    { latitude: fetchedMasjidDetails.latitude, longitude: fetchedMasjidDetails.longitude } :
                    globalUserLocation;

                if (locationForAPI.latitude && locationForAPI.longitude) {
                    fetchedAlAdhanTimes = await fetchPrayerTimesFromAlAdhan(
                        locationForAPI.latitude,
                        locationForAPI.longitude,
                        1,
                        parseInt(asrSchool)
                    );
                }
            } else {
                console.warn(`Masjid with ID ${masjidId} not found.`);
                showCustomMessage('Selected masjid not found. Using your location for prayer times.', 'info');
            }
        } catch (error) {
            console.error(`Error loading data for masjid ID ${masjidId}:`, error);
            showCustomMessage('Error loading masjid data. Attempting to use your current location.', 'error');
        }
    }

    if (!masjidId || !fetchedMasjidDetails || (!fetchedFirestoreTimes && !fetchedAlAdhanTimes)) {
        if (!globalUserLocation.latitude || !globalUserLocation.longitude) {
            try {
                const userLoc = await getUserCurrentLocation();
                setUserLocation(userLoc);
            } catch (error) {
                console.error('Failed to get user location for default prayer times:', error);
                showCustomMessage('Could not get your location. Displaying default prayer times.', 'error');
            }
        }

        if (globalUserLocation.latitude && globalUserLocation.longitude) {
            fetchedAlAdhanTimes = await fetchPrayerTimesFromAlAdhan(
                globalUserLocation.latitude,
                globalUserLocation.longitude,
                1,
                parseInt(asrSchool)
            );
        } else {
            showCustomMessage('Cannot determine location. Displaying default prayer times.', 'error');
        }
    }

    const { prayerDetails, currentSehriTime, currentIftariTime } =
        getConsolidatedPrayerTimes(fetchedFirestoreTimes, fetchedAlAdhanTimes);

    renderPrayerCards(prayerDetails);
    updateNextPrayer(prayerDetails.map(p => ({ name: p.name, time: p.prayerTime })));
    updateSehriIftariDisplay(currentSehriTime, currentIftariTime);
}


// --- Event Listeners and Initial Setup ---

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const userLoc = await getUserCurrentLocation();
        setUserLocation(userLoc);
    } catch (error) {
        console.warn('Initial user location fetch failed:', error);
    }

    const masjids = await fetchAllMasjidsFromFirestore();
    populateMasjidDropdown(masjids);

    setupAuthListener(() => {
        const selectedMasjidId = masjidSelect.value;
        displayPrayerTimes(selectedMasjidId);
    });

    updateHeaderTimes();
    setInterval(updateHeaderTimes, 1000);

    masjidSelect.addEventListener('change', (event) => {
        const selectedMasjidId = event.target.value;
        displayPrayerTimes(selectedMasjidId);
    });

    locationBtn.addEventListener('click', async () => {
        try {
            const userLoc = await getUserCurrentLocation();
            setUserLocation(userLoc);
            displayPrayerTimes('');
        } catch (error) {
            console.error('Failed to get user location on button click:', error);
        }
    });

    viewDetailsBtn.addEventListener('click', displayMasjidDetailsModal);

    directionsBtn.addEventListener('click', () => {
        if (currentMasjidDetails && currentMasjidDetails.latitude && currentMasjidDetails.longitude) {
            const mapsUrl = `http://google.com/maps/place/${currentMasjidDetails.latitude},${currentMasjidDetails.longitude}`;
            window.open(mapsUrl, '_blank');
        } else {
            showCustomMessage('Directions not available for this masjid.', 'error');
        }
    });

    modalCloseBtn.addEventListener('click', () => masjidDetailsModalOverlay.classList.remove('show'));
    profileModalCloseBtn.addEventListener('click', () => profileDetailsModalOverlay.classList.remove('show'));
    changePasswordModalCloseBtn.addEventListener('click', () => changePasswordModalOverlay.classList.remove('show'));
    qiblaDirectionModalCloseBtn.addEventListener('click', () => qiblaDirectionModalOverlay.classList.remove('show'));
    settingsModalCloseBtn.addEventListener('click', () => settingsModalOverlay.classList.remove('show'));

    window.addEventListener('click', (event) => {
        if (event.target === masjidDetailsModalOverlay) masjidDetailsModalOverlay.classList.remove('show');
        if (event.target === profileDetailsModalOverlay) profileDetailsModalOverlay.classList.remove('show');
        if (event.target === changePasswordModalOverlay) changePasswordModalOverlay.classList.remove('show');
        if (event.target === qiblaDirectionModalOverlay) qiblaDirectionModalOverlay.classList.remove('show');
        if (event.target === settingsModalOverlay) settingsModalOverlay.classList.remove('show');

        const dropdown = document.querySelector('.dropdown');
        if (dropdown && !dropdown.contains(event.target)) {
            closeDropdown();
        }
    });

    updatePasswordBtn.addEventListener('click', updatePasswordAction);

    saveSettingsBtn.addEventListener('click', () => {
        saveSettings(auth.currentUser, () => displayPrayerTimes(masjidSelect.value));
    });
});
