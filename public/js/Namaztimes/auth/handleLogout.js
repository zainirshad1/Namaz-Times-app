// public/js/Namaztimes/auth/handleLogout.js

import { signOut } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { showCustomMessage } from '../helpers/messages.js';

/**
 * Handles the logout action by signing the user out and closing any open modals.
 * @param {object} auth - The Firebase Auth service object.
 * @param {HTMLElement} profileDetailsModalOverlay - The user profile modal element.
 * @param {HTMLElement} changePasswordModalOverlay - The change password modal element.
 * @param {HTMLElement} qiblaDirectionModalOverlay - The Qibla direction modal element.
 * @param {HTMLElement} settingsModalOverlay - The settings modal element.
 */
export function handleLogout(auth, profileDetailsModalOverlay, changePasswordModalOverlay, qiblaDirectionModalOverlay, settingsModalOverlay) {
    signOut(auth)
        .then(() => {
            console.log("User signed out successfully.");
            showCustomMessage('You have been signed out.', 'success');
            
            // Close any open modals
            profileDetailsModalOverlay.classList.remove('show');
            changePasswordModalOverlay.classList.remove('show');
            qiblaDirectionModalOverlay.classList.remove('show');
            settingsModalOverlay.classList.remove('show');

            // Redirect to login page or home page
            window.location.href = 'index.html'; 
        })
        .catch((error) => {
            console.error("Error signing out:", error);
            showCustomMessage('Logout failed. Please try again.', 'error');
        });
}