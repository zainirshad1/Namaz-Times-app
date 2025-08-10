// public/js/quran-auth-display.js

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const quranUserNameSpan = document.getElementById('quran-user-name');
const quranLogoutBtn = document.getElementById('quran-logout-btn');
const quranLoginBtn = document.getElementById('quran-login-btn');

/**
 * Updates the UI based on the user's authentication status.
 * Displays user's name or "Guest", and toggles login/logout buttons.
 * @param {Object|null} user - The Firebase User object, or null if logged out.
 */
async function updateQuranAuthUI(user) {
    if (user) {
        let firstName = sessionStorage.getItem('userFirstName');
        let lastName = sessionStorage.getItem('userLastName');

        if (firstName && lastName) {
            // If name is in sessionStorage, use it
            quranUserNameSpan.textContent = `${firstName} ${lastName}`;
        } else {
            // If not in sessionStorage, try fetching from Firestore
            try {
                if (db) {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        firstName = userData.firstName || '';
                        lastName = userData.lastName || '';
                        if (firstName || lastName) {
                            quranUserNameSpan.textContent = `${firstName} ${lastName}`.trim();
                            // Store in sessionStorage for future use within this session
                            sessionStorage.setItem('userFirstName', firstName);
                            sessionStorage.setItem('userLastName', lastName);
                        } else {
                            quranUserNameSpan.textContent = user.email || 'User';
                        }
                    } else {
                        quranUserNameSpan.textContent = user.email || 'User';
                    }
                } else {
                     quranUserNameSpan.textContent = user.email || 'User';
                     console.warn("Firestore DB not initialized for user profile fetch on Quran page.");
                }
            } catch (error) {
                console.error('Error fetching user profile for Quran page:', error);
                quranUserNameSpan.textContent = user.email || 'User';
            }
        }
        quranLogoutBtn.classList.remove('hidden');
        quranLoginBtn.classList.add('hidden');
    } else {
        // User is logged out
        quranUserNameSpan.textContent = 'Guest';
        quranLogoutBtn.classList.add('hidden');
        quranLoginBtn.classList.remove('hidden');
        // Clear session storage if logged out
        sessionStorage.removeItem('userFirstName');
        sessionStorage.removeItem('userLastName');
    }
}

// Set up the Firebase Auth state listener
onAuthStateChanged(auth, updateQuranAuthUI);

// Add event listener for the logout button on the Quran page
if (quranLogoutBtn) {
    quranLogoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log('User logged out from Quran page.');
            // UI will be updated by the onAuthStateChanged listener
            // Optionally, redirect to index.html or login.html
            // window.location.href = 'index.html';
        }).catch((error) => {
            console.error('Error signing out from Quran page:', error);
        });
    });
}
