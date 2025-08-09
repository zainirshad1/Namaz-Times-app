// Firebase config

import firebaseConfig from './firebase-config.js'; // Import your config file

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

function showError(msg) {
  const errorMsg = document.getElementById('error-msg');
  if (errorMsg) {
    errorMsg.style.color = 'red';
    errorMsg.textContent = msg;
  }
}

// Login page logic
if (document.getElementById('login-btn')) {
  document.getElementById('login-btn').addEventListener('click', () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) {
      showError('Please enter email and password.');
      return;
    }
    auth.signInWithEmailAndPassword(email, password)
      .then(() => window.location.href = 'index.html')
      .catch(e => showError(e.message));
  });

  document.getElementById('forgot-password').addEventListener('click', () => {
    const email = document.getElementById('email').value.trim();
    if (!email) {
      showError('Please enter your email to reset password.');
      return;
    }
    auth.sendPasswordResetEmail(email)
      .then(() => {
        const errorMsg = document.getElementById('error-msg');
        errorMsg.style.color = 'green';
        errorMsg.textContent = 'Password reset email sent.';
      })
      .catch(e => showError(e.message));
  });
}

// Register page logic
if (document.getElementById('register-btn')) {
  document.getElementById('register-btn').addEventListener('click', () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    if (!email || !password || !confirmPassword) {
      showError('Please fill all fields.');
      return;
    }
    if (password !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }
    auth.createUserWithEmailAndPassword(email, password)
      .then(async (userCredential) => {
        await db.collection('users').doc(userCredential.user.uid).set({
          role: 'normalUser',
          masjidId: null
        });
        window.location.href = 'login.html';
      })
      .catch(e => showError(e.message));
  });
}
