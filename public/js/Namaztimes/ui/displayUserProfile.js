// public/js/Namaztimes/ui/displayUserProfile.js

import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { showCustomMessage } from '../helpers/messages.js';
import { updateUserName } from './updateUserName.js';

/**
 * Displays the user profile modal and loads user data.
 * @param {object} user - The current Firebase user object.
 * @param {object} db - The Firestore service object.
 * @param {HTMLElement} profileDetailsModalBody - The modal body element for profile.
 * @param {HTMLElement} profileDetailsModalOverlay - The modal overlay element for profile.
 * @param {object} userProfileData - Global object to store user profile data.
 * @param {object} auth - The Firebase Auth service object.
 */
export async function displayUserProfile(user, db, profileDetailsModalBody, profileDetailsModalOverlay, userProfileData, auth) {
    if (!user) {
        showCustomMessage('No user is currently logged in.', 'error');
        return;
    }

    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
            userProfileData = userDocSnap.data();
        } else {
            // Create a basic profile if one doesn't exist
            userProfileData = {
                firstName: '',
                lastName: '',
                email: user.email,
                role: 'user',
                asrCalculationSchool: '1'
            };
            await updateDoc(userDocRef, userProfileData, { merge: true });
        }

        profileDetailsModalBody.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label for="profile-first-name" class="block text-sm font-medium text-gray-700">First Name</label>
                    <input type="text" id="profile-first-name" value="${userProfileData.firstName || ''}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                </div>
                <div>
                    <label for="profile-last-name" class="block text-sm font-medium text-gray-700">Last Name</label>
                    <input type="text" id="profile-last-name" value="${userProfileData.lastName || ''}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Email</label>
                    <p class="mt-1 p-2 bg-gray-100 rounded-md">${user.email}</p>
                </div>
                <button id="save-profile-btn" class="w-full bg-green-700 text-white py-2 rounded-lg hover:bg-green-600">Save Profile</button>
            </div>
        `;
        profileDetailsModalOverlay.classList.add('show');

        document.getElementById('save-profile-btn').addEventListener('click', async () => {
            const firstName = document.getElementById('profile-first-name').value;
            const lastName = document.getElementById('profile-last-name').value;
            
            try {
                await updateDoc(userDocRef, {
                    firstName: firstName,
                    lastName: lastName
                });
                updateUserName(auth, db); // Update the name displayed in the header
                showCustomMessage('Profile saved successfully.', 'success');
                profileDetailsModalOverlay.classList.remove('show');
            } catch (error) {
                console.error("Error saving profile:", error);
                showCustomMessage(`Failed to save profile: ${error.message}`, 'error');
            }
        });

    } catch (error) {
        console.error("Error fetching user profile:", error);
        showCustomMessage('Failed to load user profile.', 'error');
    }
}