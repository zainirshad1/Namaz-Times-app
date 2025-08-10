// public/js/Namaztimes/ui/updateUserName.js

import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { userProfileData } from '../helpers/globals.js';

export async function updateUserName(auth, db) {
    const user = auth.currentUser;
    if (user) {
        const docRef = doc(db, 'users', user.uid);
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const userData = docSnap.data();
                userProfileData.email = user.email;
                userProfileData.firstName = userData.firstName || 'User';
                userProfileData.lastName = userData.lastName || '';
                userProfileData.phone = userData.phone || '';

                const userNameDisplay = document.getElementById('user-name-display');
                if (userNameDisplay) {
                    // Display the first and last name
                    userNameDisplay.textContent = `${userProfileData.firstName} ${userProfileData.lastName}`;
                }
            } else {
                console.log("No such user profile document!");
                const userNameDisplay = document.getElementById('user-name-display');
                if (userNameDisplay) {
                    userNameDisplay.textContent = 'User';
                }
            }
        } catch (error) {
            console.error("Error getting user profile:", error);
        }
    }
}