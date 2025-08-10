// public/js/ui-elements.js

import { auth } from './firebase-config.js';
import { signOut, updatePassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { showCustomMessage, formatTimeToAMPM, toRadians, toDegrees, closeDropdown as utilsCloseDropdown, formatRakatDetails } from './utils.js';
import { db } from './firebase-config.js';

// DOM Elements (Centralized access)
const DOM = {
    userAuthSection: document.getElementById('user-auth-section'),
    viewDetailsBtn: document.getElementById('view-details-btn'),
    directionsBtn: document.getElementById('directions-btn'),
    masjidDetailsModalOverlay: document.getElementById('masjid-details-modal-overlay'),
    masjidDetailsModalBody: document.getElementById('masjid-details-modal-body'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    currentEnglishTimeHeader: document.getElementById('current-time-header'),
    currentEnglishDayDisplay: document.getElementById('current-day'),
    currentEnglishDateDisplay: document.getElementById('current-date'),
    masjidLocationInfo: document.getElementById('masjid-location-info'),
    userCurrentLocationDisplay: document.getElementById('user-current-location'),
    profileDetailsModalOverlay: document.getElementById('profile-details-modal-overlay'),
    profileDetailsModalBody: document.getElementById('profile-details-modal-body'),
    profileModalCloseBtn: document.getElementById('profile-modal-close-btn'),
    currentTimeMain: document.getElementById('current-time-main'),
    changePasswordModalOverlay: document.getElementById('change-password-modal-overlay'),
    changePasswordModalCloseBtn: document.getElementById('change-password-modal-close-btn'),
    newPasswordInput: document.getElementById('new-password'),
    confirmPasswordInput: document.getElementById('confirm-password'),
    updatePasswordBtn: document.getElementById('update-password-btn'),
    qiblaDirectionModalOverlay: document.getElementById('qibla-direction-modal-overlay'),
    qiblaDirectionModalCloseBtn: document.getElementById('qibla-direction-modal-close-btn'),
    qiblaStatus: document.getElementById('qibla-status'),
    qiblaIndicatorContainer: document.getElementById('qibla-indicator-container'),
    settingsModalOverlay: document.getElementById('settings-modal-overlay'),
    settingsModalCloseBtn: document.getElementById('settings-modal-close-btn'),
    asrHanafiRadio: document.getElementById('asr-hanafi'),
    asrShafiRadio: document.getElementById('asr-shafi'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),
    sehriTimeDisplay: document.getElementById('sehri-time'),
    iftariTimeDisplay: document.getElementById('iftari-time'),
    prayerTimesDiv: document.getElementById('prayer-times')
};

let currentMasjidDetails = null;
let userLocation = { latitude: null, longitude: null, city: null, country: null };
let asrCalculationSchool = '1';

/**
 * Populates the masjid dropdown with options fetched from Firestore.
 * @param {Array<Object>} masjids - An array of masjid objects.
 */
function populateMasjidDropdown(masjids) {
    const masjidSelect = document.getElementById('masjid-select');
    if (!masjidSelect) return;

    masjidSelect.innerHTML = '<option value="">Choose nearby masjid</option>';
    if (masjids.length > 0) {
        masjids.forEach(masjid => {
            const option = document.createElement('option');
            option.value = masjid.id;
            option.textContent = masjid.name;
            masjidSelect.appendChild(option);
        });
    } else {
        masjidSelect.innerHTML = '<option value="">No masjids found</option>';
    }
}

/**
 * Updates the current time, day, and date displayed in the header and main section.
 */
function updateHeaderTimes() {
    const now = new Date();
    const englishTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const englishDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const englishDate = now.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

    if (DOM.currentEnglishTimeHeader) DOM.currentEnglishTimeHeader.textContent = `${englishTime}`;
    if (DOM.currentEnglishDayDisplay) DOM.currentEnglishDayDisplay.textContent = `${englishDay}`;
    if (DOM.currentEnglishDateDisplay) DOM.currentEnglishDateDisplay.textContent = `${englishDate}`;
    if (DOM.currentTimeMain) DOM.currentTimeMain.textContent = `${englishTime}`;

    updateHijriDate(now);
}

/**
 * Updates the Hijri date display.
 * @param {Date} date - The current date object.
 */
function updateHijriDate(date) {
    try {
        const hijriDate = new Intl.DateTimeFormat('en-TN-u-ca-islamic', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
        document.getElementById('hijri-date').textContent = `${hijriDate}`;
    } catch (e) {
        console.error('Could not format Hijri date:', e);
        document.getElementById('hijri-date').textContent = '';
    }
}

/**
 * Renders individual prayer cards to the DOM.
 * @param {Array<Object>} prayerDetails - Array of prayer objects to display.
 */
function renderPrayerCards(prayerDetails) {
    DOM.prayerTimesDiv.innerHTML = ''; // Clear previous cards

    prayerDetails.forEach(prayer => {
        const prayerCard = document.createElement('div');
        prayerCard.className = 'prayer-card';
        const formattedAzanTime = prayer.azanTime ? formatTimeToAMPM(prayer.azanTime) : 'N/A';
        const formattedPrayerTime = prayer.prayerTime ? formatTimeToAMPM(prayer.prayerTime) : 'N/A';
        const formattedEndTime = prayer.endTime ? formatTimeToAMPM(prayer.endTime) : 'N/A';

        prayerCard.innerHTML = `
            <div class="flex items-center space-x-4 flex-grow">
                <i class="fas fa-mosque text-green-700 text-2xl"></i>
                <div>
                    <h3 class="font-bold text-lg text-gray-800">${prayer.name}</h3>
                    <p class="text-sm text-gray-500">Azan: <span class="font-medium text-gray-700">${formattedAzanTime}</span></p>
                    <p class="text-sm text-gray-500">Prayer: <span class="font-bold text-green-700">${formattedPrayerTime}</span></p>
                    <p class="text-xs text-gray-400">Ends: ${formattedEndTime}</p>
                </div>
            </div>
            <div class="rakat-container">
                ${formatRakatDetails(prayer.rakats)}
            </div>
        `;
        DOM.prayerTimesDiv.appendChild(prayerCard);
    });
}

/**
 * Updates the Sehri and Iftari time displays.
 * @param {string} sehriTime - Formatted Sehri time.
 * @param {string} iftariTime - Formatted Iftari time.
 */
function updateSehriIftariDisplay(sehriTime, iftariTime) {
    DOM.sehriTimeDisplay.textContent = formatTimeToAMPM(sehriTime);
    DOM.iftariTimeDisplay.textContent = formatTimeToAMPM(iftariTime);
}

/**
 * Sets the current masjid location information.
 * @param {Object|null} masjidDetails - Details of the selected masjid.
 */
function setMasjidLocationInfo(masjidDetails) {
    if (masjidDetails) {
        const area = masjidDetails.area || 'N/A';
        const city = masjidDetails.city ? masjidDetails.city.substring(0, 3).toUpperCase() : 'N/A';

        let stateCode = 'N/A';
        // Check if masjidDetails.state exists and is either a string or an object with a 'state' property that is a string
        if (typeof masjidDetails.state === 'string') {
            stateCode = masjidDetails.state.substring(0, 3).toUpperCase();
        } else if (typeof masjidDetails.state === 'object' && masjidDetails.state !== null && typeof masjidDetails.state.state === 'string') {
            stateCode = masjidDetails.state.state.substring(0, 3).toUpperCase();
        }
        
        DOM.masjidLocationInfo.textContent = `${area}, ${city}, ${stateCode}`;
        DOM.viewDetailsBtn.classList.remove('hidden');
        DOM.directionsBtn.classList.remove('hidden');
        currentMasjidDetails = masjidDetails;
    } else {
        DOM.masjidLocationInfo.textContent = '';
        DOM.viewDetailsBtn.classList.add('hidden');
        DOM.directionsBtn.classList.add('hidden');
        currentMasjidDetails = null;
    }
}

/**
 * Displays the Masjid Details modal.
 */
function displayMasjidDetailsModal() {
    if (currentMasjidDetails) {
        const detailsHtml = `
            <p><strong>Name:</strong> ${currentMasjidDetails.name || 'N/A'}</p>
            <p><strong>Address:</strong> ${currentMasjidDetails.address || 'N/A'}</p>
            <p><strong>Area:</strong> ${currentMasjidDetails.area || 'N/A'}</p>
            <p><strong>City:</strong> ${currentMasjidDetails.city || 'N/A'}</p>
            <p><strong>State:</strong> ${currentMasjidDetails.state?.state || currentMasjidDetails.state || 'N/A'}</p>
            <p><strong>Contact:</strong> ${currentMasjidDetails.contact || 'N/A'}</p>
        `;
        DOM.masjidDetailsModalBody.innerHTML = detailsHtml;
        DOM.masjidDetailsModalOverlay.classList.add('show');
    } else {
        showCustomMessage('Please select a masjid first.', 'info');
    }
}

/**
 * Handles showing the user profile modal and populating it with data.
 * @param {Object} user - The Firebase user object.
 */
async function displayUserProfile(user) {
    if (!user) {
        showCustomMessage('You must be logged in to view your profile.', 'error');
        return;
    }
    showCustomMessage('Fetching your profile...', 'info');
    try {
        if (!db) {
            console.error("Firestore DB is not initialized. Cannot display user profile.");
            showCustomMessage('Failed to connect to database. Please try again later.', 'error');
            return;
        }
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        let profileHtml = '';
        let userProfileData = null;

        if (userDocSnap.exists()) {
            userProfileData = userDocSnap.data();
            profileHtml = `
                <form id="profile-edit-form">
                    <p class="mb-2"><strong>Email:</strong> ${userProfileData.email || 'N/A'}</p>
                    <label for="firstName" class="block text-sm font-medium text-gray-700">First Name</label>
                    <input type="text" id="firstName" name="firstName" value="${userProfileData.firstName || ''}" class="w-full p-2 border border-gray-300 rounded mb-2">
                    <label for="lastName" class="block text-sm font-medium text-gray-700">Last Name</label>
                    <input type="text" id="lastName" name="lastName" value="${userProfileData.lastName || ''}" class="w-full p-2 border border-gray-300 rounded mb-2">
                    <label for="masjidId" class="block text-sm font-medium text-gray-700">Masjid ID</label>
                    <input type="text" id="masjidId" name="masjidId" value="${userProfileData.masjidId || ''}" class="w-full p-2 border border-gray-300 rounded mb-2">
                    <label for="role" class="block text-sm font-medium text-gray-700">Role</label>
                    <input type="text" id="role" name="role" value="${userProfileData.role || ''}" class="w-full p-2 border border-gray-300 rounded mb-4" disabled>
                    <button type="submit" class="mt-4 bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Update Profile</button>
                </form>
            `;
        } else {
            profileHtml = `
                <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                <p class="mt-2 text-red-500">No additional profile data found in Firestore.</p>
            `;
        }
        DOM.profileDetailsModalBody.innerHTML = profileHtml;
        DOM.profileDetailsModalOverlay.classList.add('show');

        if (document.getElementById('profile-edit-form')) {
            document.getElementById('profile-edit-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const updatedData = {
                    firstName: document.getElementById('firstName').value,
                    lastName: document.getElementById('lastName').value,
                    masjidId: document.getElementById('masjidId').value
                };
                try {
                    if (!db) {
                        console.error("Firestore DB is not initialized. Cannot update user profile.");
                        showCustomMessage('Failed to connect to database. Please try again later.', 'error');
                        return;
                    }
                    const userDocRef = doc(db, 'users', user.uid);
                    await updateDoc(userDocRef, updatedData);
                    showCustomMessage('Profile updated successfully!', 'success');
                    DOM.profileDetailsModalOverlay.classList.remove('show');
                    updateUserName(user);
                } catch (error) {
                    console.error('Error updating profile:', error);
                    showCustomMessage('Failed to update profile.', 'error');
                }
            });
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        showCustomMessage('Failed to fetch user profile.', 'error');
    }
}

/**
 * Displays the Change Password modal.
 */
function displayChangePassword() {
    DOM.changePasswordModalOverlay.classList.add('show');
}

/**
 * Handles the password update action.
 */
async function updatePasswordAction() {
    const user = auth.currentUser;
    const newPassword = DOM.newPasswordInput.value;
    const confirmPassword = DOM.confirmPasswordInput.value;
    if (newPassword.length < 6) {
        showCustomMessage('Password should be at least 6 characters.', 'error');
        return;
    }
    if (newPassword !== confirmPassword) {
        showCustomMessage('Passwords do not match.', 'error');
        return;
    }
    try {
        if (!auth.currentUser) {
            showCustomMessage('You must be logged in to change your password.', 'error');
            return;
        }
        await updatePassword(auth.currentUser, newPassword);
        showCustomMessage('Password updated successfully!', 'success');
        DOM.changePasswordModalOverlay.classList.remove('show');
        DOM.newPasswordInput.value = '';
        DOM.confirmPasswordInput.value = '';
    } catch (error) {
        console.error('Error updating password:', error);
        showCustomMessage(`Failed to update password: ${error.message}`, 'error');
    }
}

/**
 * Displays the Qibla Direction modal and calculates Qibla.
 * @param {Object} currentUserLocation - The user's current location {latitude, longitude}.
 */
function displayQiblaDirection(currentUserLocation) {
    DOM.qiblaDirectionModalOverlay.classList.add('show');
    DOM.qiblaStatus.textContent = 'Getting your location...';
    DOM.qiblaIndicatorContainer.innerHTML = '';

    if (currentUserLocation.latitude && currentUserLocation.longitude) {
        const lat = currentUserLocation.latitude;
        const lon = currentUserLocation.longitude;
        const meccaLat = 21.4225;
        const meccaLon = 39.8262;
        const latRad = toRadians(lat);
        const lonRad = toRadians(lon);
        const meccaLatRad = toRadians(meccaLat);
        const meccaLonRad = toRadians(meccaLon);
        const deltaLon = meccaLonRad - lonRad;
        const qiblaAngle = toDegrees(
            Math.atan2(
                Math.sin(deltaLon),
                (Math.cos(latRad) * Math.tan(meccaLatRad)) - (Math.sin(latRad) * Math.cos(deltaLon))
            )
        );
        const normalizedQiblaAngle = (qiblaAngle + 360) % 360;
        DOM.qiblaStatus.innerHTML = `Qibla direction is <span class="font-bold text-green-700">${normalizedQiblaAngle.toFixed(2)}°</span> from North.`;

        DOM.qiblaIndicatorContainer.innerHTML = `
            <div class="relative w-24 h-24 mx-auto">
                <div class="absolute w-full h-full border-4 border-green-500 rounded-full flex items-center justify-center">
                    <span class="absolute top-0 text-xs text-green-700 font-bold">N</span>
                </div>
                <div class="absolute w-full h-full transform transition-transform duration-500" style="transform: rotate(${normalizedQiblaAngle}deg);">
                    <div class="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-[24px] border-b-green-700 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full"></div>
                </div>
            </div>
        `;
    } else {
        DOM.qiblaStatus.textContent = 'Unable to get location for Qibla direction.';
        showCustomMessage('Please allow location access to determine Qibla direction.', 'error');
    }
}

/**
 * Displays the settings modal and loads user's saved settings.
 * @param {Object} user - The Firebase user object.
 */
async function displaySettings(user) {
    DOM.settingsModalOverlay.classList.add('show');
    if (user) {
        try {
            if (!db) {
                console.error("Firestore DB is not initialized. Cannot display settings.");
                showCustomMessage('Failed to connect to database. Please try again later.', 'error');
                return;
            }
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                asrCalculationSchool = userData.asrCalculationSchool || '1';
            }
        } catch (error) {
            console.error('Error fetching user settings:', error);
            showCustomMessage('Failed to load settings.', 'error');
        }
    }
    if (asrCalculationSchool === '1') {
        DOM.asrHanafiRadio.checked = true;
    } else {
        DOM.asrShafiRadio.checked = true;
    }
}

/**
 * Saves user settings (Asr calculation method) to Firestore.
 * @param {Object} user - The Firebase user object.
 * @param {function(string)} refreshPrayerTimesCallback - Callback to refresh prayer times after saving settings.
 */
async function saveSettings(user, refreshPrayerTimesCallback) {
    if (!user) {
        showCustomMessage('You must be logged in to save settings.', 'error');
        return;
    }
    const selectedSchool = DOM.asrHanafiRadio.checked ? '1' : '0';
    asrCalculationSchool = selectedSchool;
    try {
        if (!db) {
            console.error("Firestore DB is not initialized. Cannot save settings.");
            showCustomMessage('Failed to connect to database. Please try again later.', 'error');
            return;
        }
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { asrCalculationSchool: selectedSchool });
        showCustomMessage('Settings saved successfully!', 'success');
        DOM.settingsModalOverlay.classList.remove('show');
        refreshPrayerTimesCallback();
    } catch (error) {
        console.error('Error saving settings:', error);
        showCustomMessage('Failed to save settings.', 'error');
    }
}

/**
 * Handles user logout.
 */
function handleLogout() {
    signOut(auth).then(() => {
        showCustomMessage('Logged out successfully.', 'success');
        DOM.profileDetailsModalOverlay.classList.remove('show');
        DOM.changePasswordModalOverlay.classList.remove('show');
        DOM.qiblaDirectionModalOverlay.classList.remove('show');
        DOM.settingsModalOverlay.classList.remove('show');
        sessionStorage.removeItem('userFirstName');
        sessionStorage.removeItem('userLastName');
    }).catch((error) => {
        console.error('Logout error:', error);
        showCustomMessage('Logout failed. Please try again.', 'error');
    });
}

/**
 * Updates the displayed user name in the header.
 * @param {Object} user - The Firebase user object.
 */
async function updateUserName(user) {
    try {
        if (!db) {
            console.error("Firestore DB is not initialized. Cannot update username.");
            return;
        }
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        let userName = 'User Profile';
        let firstName = '';
        let lastName = '';
        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.firstName && userData.lastName) {
                userName = `${userData.firstName} ${userData.lastName}`;
                firstName = userData.firstName;
                lastName = userData.lastName;
            } else if (userData.name) {
                userName = userData.name;
                const nameParts = userData.name.split(' ');
                firstName = nameParts[0] || '';
                lastName = nameParts.slice(1).join(' ') || '';
            }
        }
        const nameDisplay = document.getElementById('user-name-display');
        if (nameDisplay) {
            nameDisplay.textContent = userName;
        }
        sessionStorage.setItem('userFirstName', firstName);
        sessionStorage.setItem('userLastName', lastName);
    } catch (error) {
        console.error('Error fetching user name for header:', error);
    }
}

/**
 * Toggles the visibility of the user dropdown menu.
 */
function handleDropdownToggle() {
    const dropdownContent = document.getElementById('user-dropdown-content');
    if (dropdownContent) {
        // Toggle the 'show' class
        const isShowing = dropdownContent.classList.toggle('show');

        // After a small delay, apply display: 'none' if it's not showing
        // This allows the opacity transition to complete before it's removed from layout
        if (!isShowing) {
            setTimeout(() => {
                if (!dropdownContent.classList.contains('show')) { // Double check it's still not showing
                    dropdownContent.style.display = 'none';
                }
            }, 300); // Match this delay to your CSS transition duration
        } else {
            dropdownContent.style.display = 'block'; // Make sure it's block before showing for transition
        }
    }
}


/**
 * Handles navigation to the login page.
 */
function handleLogin() {
    window.location.href = 'login.html';
}

/**
 * Sets the current user location state.
 * @param {Object} location - The user's current location object.
 */
function setUserLocation(location) {
    userLocation = location;
}

/**
 * Gets the current Asr calculation school.
 * @returns {string} The ASR calculation school ('0' for Shafi, '1' for Hanafi).
 */
function getAsrCalculationSchool() {
    return asrCalculationSchool;
}

export {
    populateMasjidDropdown,
    updateHeaderTimes,
    updateHijriDate,
    renderPrayerCards,
    updateSehriIftariDisplay,
    setMasjidLocationInfo,
    displayMasjidDetailsModal,
    displayUserProfile,
    displayChangePassword,
    updatePasswordAction,
    displayQiblaDirection,
    displaySettings,
    saveSettings,
    handleLogout,
    updateUserName,
    handleDropdownToggle,
    handleLogin,
    setUserLocation,
    getAsrCalculationSchool,
    currentMasjidDetails,
    userLocation,
    utilsCloseDropdown as closeDropdown
};
