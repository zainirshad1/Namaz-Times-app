// public/js/auth-manager.js

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
    updateUserName,
    handleDropdownToggle,
    handleLogin,
    handleLogout,
    displayUserProfile,
    displaySettings,
    displayChangePassword,
    displayQiblaDirection,
    closeDropdown,
    setUserLocation,
    getAsrCalculationSchool,
    currentMasjidDetails,
    userLocation as globalUserLocation
} from './ui-elements.js';

// DOM Elements
const userAuthSection = document.getElementById('user-auth-section');

let currentUserRole = null;

/**
 * Sets up the authentication state listener and updates UI based on user status.
 * @param {function()} refreshPrayerTimesCallback - Callback function to refresh prayer times based on user settings.
 */
function setupAuthListener(refreshPrayerTimesCallback) {
    onAuthStateChanged(auth, async (user) => {
        userAuthSection.innerHTML = ''; // Clear previous auth buttons/dropdown

        // Always show the Quran button
        const quranBtn = document.createElement('button');
        quranBtn.id = 'quran-btn';
        quranBtn.className = 'bg-white hover:bg-gray-200 text-green-700 font-bold py-2 px-4 rounded-full shadow-md transition-colors';
        quranBtn.innerHTML = '<i class="fas fa-book-open mr-2"></i>Quran';
        quranBtn.addEventListener('click', () => {
            // Data is already stored in sessionStorage by updateUserName
            window.location.href = 'Quran3.html';
        });
        userAuthSection.appendChild(quranBtn);

        if (user) {
            // User is signed in
            const userDocRef = doc(db, 'users', user.uid);
            try {
                const userDocSnap = await getDoc(userDocRef);
                let userName = 'User Profile';
                let firstName = '';
                let lastName = '';
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    currentUserRole = userData.role || 'user';
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
                } else {
                    currentUserRole = 'user'; // Default role if no profile exists
                }

                // Store first and last name in sessionStorage immediately upon auth state change
                sessionStorage.setItem('userFirstName', firstName);
                sessionStorage.setItem('userLastName', lastName);

                // Create and append user dropdown
                const dropdownDiv = document.createElement('div');
                dropdownDiv.className = 'dropdown ml-4 relative';
                dropdownDiv.innerHTML = `
                    <button id="user-name-display" class="bg-white hover:bg-gray-200 text-green-700 font-bold py-2 px-4 rounded-full shadow-md transition-colors flex items-center">
                        <i class="fas fa-user-circle text-xl mr-2"></i>
                        <span class="hidden sm:inline-block">${userName}</span>
                    </button>
                    <div id="user-dropdown-content" class="dropdown-content absolute right-0 mt-2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <button id="show-profile-btn" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">Show Profile</button>
                        <button id="settings-btn" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">Settings</button>
                        <button id="change-password-btn" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">Change Password</button>
                        <button id="qibla-direction-btn" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">Qibla Direction</button>
                        <button id="logout-btn" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">Logout</button>
                    </div>
                `;
                userAuthSection.appendChild(dropdownDiv);

                // Add event listeners for dropdown buttons
                document.getElementById('user-name-display').addEventListener('click', handleDropdownToggle);
                document.getElementById('show-profile-btn').addEventListener('click', () => { closeDropdown(); displayUserProfile(user); });
                document.getElementById('settings-btn').addEventListener('click', () => { closeDropdown(); displaySettings(user); });
                document.getElementById('change-password-btn').addEventListener('click', () => { closeDropdown(); displayChangePassword(); });
                document.getElementById('qibla-direction-btn').addEventListener('click', () => { closeDropdown(); displayQiblaDirection(globalUserLocation); });
                document.getElementById('logout-btn').addEventListener('click', () => { closeDropdown(); handleLogout(); });

            } catch (error) {
                console.error('Error fetching user profile in auth listener:', error);
                showCustomMessage('Error loading user data.', 'error');
                currentUserRole = 'user'; // Default to user role on error
            }
        } else {
            // User is signed out
            currentUserRole = null;
            // Create and append login button
            const loginBtn = document.createElement('button');
            loginBtn.id = 'login-btn';
            loginBtn.className = 'bg-white hover:bg-gray-200 text-green-700 font-bold py-2 px-4 rounded-full shadow-md transition-colors ml-4';
            loginBtn.textContent = 'Login';
            loginBtn.addEventListener('click', handleLogin);
            userAuthSection.appendChild(loginBtn);

            // Clear sessionStorage on logout
            sessionStorage.removeItem('userFirstName');
            sessionStorage.removeItem('userLastName');
        }

        refreshPrayerTimesCallback();
    });
}

/**
 * Gets the current user's role.
 * @returns {string|null} The user's role (e.g., 'admin', 'user') or null if not logged in.
 */
function getUserRole() {
    return currentUserRole;
}

export { setupAuthListener, getUserRole };
