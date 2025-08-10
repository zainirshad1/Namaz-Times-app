// public/js/Namaztimes/auth/updatePasswordAction.js

import { updatePassword } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { showCustomMessage } from '../helpers/messages.js';

/**
 * Handles the password update process.
 * @param {object} auth - The Firebase Auth service object.
 * @param {HTMLInputElement} newPasswordInput - The input element for the new password.
 * @param {HTMLInputElement} confirmPasswordInput - The input element for the confirmed password.
 * @param {HTMLElement} modalOverlay - The modal element to be closed.
 */
export async function updatePasswordAction(auth, newPasswordInput, confirmPasswordInput, modalOverlay) {
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const user = auth.currentUser;

    if (!user) {
        showCustomMessage('No user is currently logged in.', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showCustomMessage('New password and confirm password do not match.', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showCustomMessage('Password must be at least 6 characters long.', 'error');
        return;
    }

    try {
        await updatePassword(user, newPassword);
        showCustomMessage('Password updated successfully.', 'success');
        modalOverlay.classList.remove('show');
    } catch (error) {
        console.error("Error updating password:", error);
        showCustomMessage(`Failed to update password: ${error.message}`, 'error');
    }
}