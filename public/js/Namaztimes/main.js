// public/js/Namaztimes/main.js

import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

// Firebase configuration from a separate file
import { firebaseApp } from '../firebase-config.js';

// Auth functions
import { handleLogin } from './auth/handleLogin.js';
import { handleLogout } from './auth/handleLogout.js';
import { updatePasswordAction } from './auth/updatePasswordAction.js';

// UI functions
import { displayPrayerTimes } from './ui/displayPrayerTimes.js';
import { updateCurrentTime } from './ui/updateCurrentTime.js';
import { updateHijriDate } from './ui/updateHijriDate.js';
import { displayUserProfile } from './ui/displayUserProfile.js';
import { displayChangePassword } from './ui/displayChangePassword.js';
import { displayQiblaDirection } from './ui/displayQiblaDirection.js';
import { displaySettings } from './ui/displaySettings.js';
import { updateUserName } from './ui/updateUserName.js';

// Event functions
import { closeDropdown } from './events/closeDropdown.js';
import { handleDropdownToggle } from './events/handleDropdownToggle.js';
import { saveSettings } from './events/saveSettings.js';

// Helper functions
import { showCustomMessage } from './helpers/messages.js';
import { getUserCurrentArea } from './helpers/getUserCurrentArea.js';

// Import rakatFunctions from its dedicated file
import { rakatFunctions } from './helpers/rakats.js';

// Global variables
import { userLocation, currentMasjidDetails, currentUserPrayerTimes, userProfileData, currentUserRole, asrCalculationSchool } from './helpers/globals.js';

// API functions
import { fetchPrayerTimesFromAlAdhan } from './api/alAdhanApi.js';


// Initialize Firebase services
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// DOM element references
const userAuthSection = document.getElementById('user-auth-section');
const masjidSelect = document.getElementById('masjid-select');
const locationButton = document.getElementById('location-btn');
const viewDetailsBtn = document.getElementById('view-details-btn');
const directionsBtn = document.getElementById('directions-btn');
const masjidDetailsModalOverlay = document.getElementById('masjid-details-modal-overlay');
const masjidDetailsModalBody = document.getElementById('masjid-details-modal-body');
const masjidLocationInfo = document.getElementById('masjid-location-info');
const profileDetailsModalOverlay = document.getElementById('profile-details-modal-overlay');
const profileDetailsModalBody = document.getElementById('profile-details-modal-body');
const changePasswordModalOverlay = document.getElementById('change-password-modal-overlay');
const qiblaDirectionModalOverlay = document.getElementById('qibla-direction-modal-overlay');
const settingsModalOverlay = document.getElementById('settings-modal-overlay');
const closeButtons = document.querySelectorAll('.close-btn');

// Time and date display elements
const currentEnglishTimeHeader = document.getElementById('current-english-time-header');
const currentEnglishDayDisplay = document.getElementById('current-english-day');
const currentEnglishDateDisplay = document.getElementById('current-english-date');

// Settings modal elements
const asrHanafiRadio = document.getElementById('asr-hanafi');
const asrShafiRadio = document.getElementById('asr-shafi');

async function populateMasjidDropdown() {
    try {
        const masjidsCollection = collection(db, 'masjids');
        const masjidSnapshot = await getDocs(masjidsCollection);
        masjidSnapshot.forEach(doc => {
            const masjid = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = masjid.name;
            masjidSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error fetching masjids:", error);
        showCustomMessage('Failed to load the list of masjids.', 'error');
    }
}

function createAuthHeader(user) {
    const authUI = `
        <a href="quran.html" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors duration-300 mr-4">Quran</a>
        <div class="relative inline-block text-left" id="user-dropdown">
            <button id="user-dropdown-btn" class="flex items-center text-white focus:outline-none">
                <i class="fas fa-user-circle text-2xl mr-2"></i>
                <span id="user-name-display"></span>
                <i class="fas fa-chevron-down ml-2 text-xs"></i>
            </button>
            <div id="user-dropdown-content" class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 hidden">
                <a href="#" id="view-profile-btn" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile</a>
                <a href="#" id="change-password-btn" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Change Password</a>
                <a href="#" id="settings-btn" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Settings</a>
                <a href="#" id="qibla-direction-btn" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Qibla Direction</a>
                <a href="#" id="logout-btn" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Logout</a>
            </div>
        </div>
    `;
    userAuthSection.innerHTML = authUI;

    const userDropdownBtn = document.getElementById('user-dropdown-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const viewProfileBtn = document.getElementById('view-profile-btn');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const qiblaDirectionBtn = document.getElementById('qibla-direction-btn');
    const updatePasswordBtn = document.getElementById('update-password-btn');

    userDropdownBtn.addEventListener('click', handleDropdownToggle);
    logoutBtn.addEventListener('click', () => handleLogout(auth, profileDetailsModalOverlay, changePasswordModalOverlay, qiblaDirectionModalOverlay, settingsModalOverlay));
    viewProfileBtn.addEventListener('click', () => displayUserProfile(auth.currentUser, db, profileDetailsModalBody, profileDetailsModalOverlay, userProfileData, auth));
    changePasswordBtn.addEventListener('click', () => displayChangePassword(changePasswordModalOverlay));
    settingsBtn.addEventListener('click', () => displaySettings(settingsModalOverlay, auth, db, asrHanafiRadio, asrShafiRadio));

    if (updatePasswordBtn) {
        updatePasswordBtn.addEventListener('click', () => {
            const newPasswordInput = document.getElementById('new-password');
            const confirmPasswordInput = document.getElementById('confirm-password');
            updatePasswordAction(auth, newPasswordInput, confirmPasswordInput, changePasswordModalOverlay);
        });
    }

    qiblaDirectionBtn.addEventListener('click', () => {
        const qiblaStatus = document.getElementById('qibla-status');
        const qiblaIndicatorContainer = document.getElementById('qibla-indicator-container');
        displayQiblaDirection(qiblaDirectionModalOverlay, qiblaStatus, qiblaIndicatorContainer);
    });

    // Call the function to update the username with first and last name
    updateUserName(auth, db);

    document.addEventListener('click', (event) => {
        const userDropdown = document.getElementById('user-dropdown');
        if (userDropdown && !userDropdown.contains(event.target)) {
            closeDropdown();
        }
    });
}

function createLoginHeader() {
    userAuthSection.innerHTML = `
        <button id="login-btn" class="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition-colors duration-300">
            Login
        </button>
    `;
    document.getElementById('login-btn').addEventListener('click', handleLogin);
}

document.addEventListener('DOMContentLoaded', async () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            createAuthHeader(user);
        } else {
            createLoginHeader();
        }
    });

    await populateMasjidDropdown();

    // Call getUserCurrentArea with the correct element to display the location
    await getUserCurrentArea(document.getElementById('user-current-area'));

    // Initial call to display prayer times, which will handle both masjid and location-based logic
    displayPrayerTimes(masjidSelect.value, db, userLocation, asrCalculationSchool, rakatFunctions, viewDetailsBtn, directionsBtn, masjidLocationInfo, currentUserPrayerTimes, currentMasjidDetails, fetchPrayerTimesFromAlAdhan);

    setInterval(() => {
        const now = new Date();
        updateCurrentTime(currentEnglishTimeHeader, currentEnglishDayDisplay, currentEnglishDateDisplay, null, currentUserPrayerTimes);
        updateHijriDate(now);
    }, 1000);
});

// Event listener for the masjid dropdown to load new prayer times
masjidSelect.addEventListener('change', () => {
    displayPrayerTimes(masjidSelect.value, db, userLocation, asrCalculationSchool, rakatFunctions, viewDetailsBtn, directionsBtn, masjidLocationInfo, currentUserPrayerTimes, currentMasjidDetails, fetchPrayerTimesFromAlAdhan);
});

locationButton.addEventListener('click', async () => {
    // Correct element passed to getUserCurrentArea
    await getUserCurrentArea(document.getElementById('user-current-area'));
    // Call displayPrayerTimes with an empty masjidId to trigger location-based lookup
    displayPrayerTimes('', db, userLocation, asrCalculationSchool, rakatFunctions, viewDetailsBtn, directionsBtn, masjidLocationInfo, currentUserPrayerTimes, currentMasjidDetails, fetchPrayerTimesFromAlAdhan);
});

viewDetailsBtn.addEventListener('click', async () => {
    if (currentMasjidDetails) {
        const modalBody = document.getElementById('masjid-details-modal-body');
        modalBody.innerHTML = `
            <p><strong>Address:</strong> ${currentMasjidDetails.address || 'N/A'}</p>
            <p><strong>City:</strong> ${currentMasjidDetails.city || 'N/A'}</p>
            <p><strong>Contact:</strong> ${currentMasjidDetails.contact || 'N/A'}</p>
        `;
        masjidDetailsModalOverlay.classList.add('show');
    }
});

directionsBtn.addEventListener('click', () => {
    if (currentMasjidDetails && currentMasjidDetails.latitude && currentMasjidDetails.longitude) {
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${currentMasjidDetails.latitude},${currentMasjidDetails.longitude}`;
        window.open(directionsUrl, '_blank');
    } else {
        showCustomMessage('Masjid location is not available.', 'error');
    }
});

closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        btn.closest('.modal-overlay').classList.remove('show');
    });
});

document.getElementById('save-settings-btn')?.addEventListener('click', () => {
    saveSettings(auth, db, asrHanafiRadio, asrShafiRadio, settingsModalOverlay, displayPrayerTimes);
});
