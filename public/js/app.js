// app.js

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc, query, where, FieldPath } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const authSection = document.getElementById('auth-section');
const masjidSelect = document.getElementById('masjid-select');
const addMasjidBtn = document.getElementById('add-masjid-btn');
const addPrayerBtn = document.getElementById('add-prayer-btn');
const prayerTimesDiv = document.getElementById('prayer-times');

// Use onAuthStateChanged from the modular API
onAuthStateChanged(auth, async user => {
  authSection.innerHTML = '';
  if (user) {
    const userEmail = document.createElement('span');
    userEmail.textContent = user.email;
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Logout';
    logoutBtn.className = 'bg-red-600 px-3 py-1 rounded hover:bg-red-700';
    logoutBtn.onclick = () => auth.signOut(); // signOut is still a method on auth
    authSection.appendChild(userEmail);
    authSection.appendChild(logoutBtn);

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const role = userDoc.data().role;
      if (role === 'superadmin') {
        addMasjidBtn.classList.remove('hidden');
        addPrayerBtn.classList.remove('hidden');
        loadMasjids();
      } else if (role === 'masjidAdmin') {
        addMasjidBtn.classList.remove('hidden');
        addPrayerBtn.classList.remove('hidden');
        loadMasjids([userDoc.data().masjidId]);
      } else {
        addMasjidBtn.classList.add('hidden');
        addPrayerBtn.classList.add('hidden');
        loadMasjids();
      }
    } else {
      addMasjidBtn.classList.add('hidden');
      addPrayerBtn.classList.add('hidden');
      loadMasjids();
    }
  } else {
    const loginBtn = document.createElement('button');
    loginBtn.textContent = 'Login';
    loginBtn.className = 'bg-green-600 px-3 py-1 rounded hover:bg-green-700';
    loginBtn.onclick = () => window.location.href = 'login.html';
    authSection.appendChild(loginBtn);

    addMasjidBtn.classList.add('hidden');
    addPrayerBtn.classList.add('hidden');
    loadMasjids();
  }
});

async function loadMasjids(filterIds) {
  const masjidsCollection = collection(db, 'masjids');
  let masjidsQuery = masjidsCollection;

  if (filterIds && filterIds.length > 0) {
    masjidsQuery = query(masjidsCollection, where(FieldPath.documentId(), 'in', filterIds));
  }
  const snapshot = await getDocs(masjidsQuery);

  masjidSelect.innerHTML = '<option value="">Choose nearby masjid</option>';
  snapshot.forEach(doc => {
    const option = document.createElement('option');
    option.value = doc.id;
    option.textContent = doc.data().name;
    masjidSelect.appendChild(option);
  });
}

masjidSelect.addEventListener('change', async () => {
  const masjidId = masjidSelect.value;
  if (!masjidId) {
    prayerTimesDiv.innerHTML = '';
    return;
  }
  const masjidRef = doc(db, 'masjids', masjidId);
  const docSnap = await getDoc(masjidRef);

  if (!docSnap.exists()) {
    prayerTimesDiv.innerHTML = '<p>No prayer times found.</p>';
    return;
  }
  const data = docSnap.data();
  prayerTimesDiv.innerHTML = `
    <div class="prayer-card">
      <div><h3>Fajr</h3><p>${data.Fajr || 'N/A'}</p></div>
      <div><h3>Dhuhr</h3><p>${data.Dhuhr || 'N/A'}</p></div>
      <div><h3>Asr</h3><p>${data.Asr || 'N/A'}</p></div>
      <div><h3>Maghrib</h3><p>${data.Maghrib || 'N/A'}</p></div>
      <div><h3>Isha</h3><p>${data.Isha || 'N/A'}</p></div>
      <div><h3>Jumuah</h3><p>${data.Jumuah || 'N/A'}</p></div>
    </div>
  `;
});
