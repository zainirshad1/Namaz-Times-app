// public/js/auth-manager.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { showCustomMessage } from './utils.js';
import { handleDropdownToggle, handleLogin, handleLogout, updateUserName, displayUserProfile, displayChangePassword, displayQiblaDirection, displaySettings, saveSettings, userLocation } from './ui-elements.js';

let isAuthReady = false; // Flag to indicate if auth state has been determined

// DOM Elements
const userAuthSection = document.getElementById('user-auth-section');
const loginSignupBtn = document.getElementById('login-signup-btn');
const userProfileDropdown = document.getElementById('user-profile-dropdown');
const userNameDisplay = document.getElementById('user-name-display');
const logoutBtn = document.getElementById('logout-btn');
const profileLink = document.getElementById('profile-link');
const changePasswordLink = document.getElementById('change-password-link');
const qiblaBtn = document.getElementById('qibla-btn');
const settingsLink = document.getElementById('settings-link');
const quranBtn = document.getElementById('quran-btn'); // Get the Quran button

// Check if elements exist before adding listeners
if (loginSignupBtn) {
    loginSignupBtn.addEventListener('click', handleLogin);
}

if (userProfileDropdown) {
    userProfileDropdown.addEventListener('click', handleDropdownToggle);
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
}

if (profileLink) {
    profileLink.addEventListener('click', async (e) => {
        e.preventDefault();
        if (auth.currentUser) {
            await displayUserProfile(auth.currentUser);
        } else {
            showCustomMessage('You must be logged in to view your profile.', 'error');
        }
    });
}

if (changePasswordLink) {
    changePasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (auth.currentUser) {
            displayChangePassword();
        } else {
            showCustomMessage('You must be logged in to change your password.', 'error');
        }
    });
}

if (qiblaBtn) {
    qiblaBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // userLocation is imported from ui-elements.js
        if (userLocation.latitude && userLocation.longitude) {
            displayQiblaDirection(userLocation);
        } else {
            showCustomMessage('User location not available. Please allow location access.', 'error');
            console.warn("User location not set for Qibla calculation.");
            // Optionally, try to get location again or prompt the user
        }
    });
}

if (settingsLink) {
    settingsLink.addEventListener('click', async (e) => {
        e.preventDefault();
        if (auth.currentUser) {
            await displaySettings(auth.currentUser);
        } else {
            showCustomMessage('You must be logged in to access settings.', 'error');
        }
    });
}

// Fixed: Update the href for the Quran button to quran.html
if (quranBtn) {
    quranBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'quran.html';
    });
}

// Handle authentication state changes
onAuthStateChanged(auth, async (user) => {
    isAuthReady = true; // Auth state has been determined
    if (userAuthSection && loginSignupBtn && userProfileDropdown) {
        if (user) {
            // User is signed in
            loginSignupBtn.classList.add('hidden');
            userProfileDropdown.classList.remove('hidden');
            // Update user name display (handles fetching from Firestore if needed)
            await updateUserName(user);
        } else {
            // User is signed out
            loginSignupBtn.classList.remove('hidden');
            userProfileDropdown.classList.add('hidden');
            if (userNameDisplay) {
                userNameDisplay.textContent = 'Guest';
            }
        }
    }
});

export { isAuthReady };

