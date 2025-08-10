// public/js/api.js

import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js"; // Updated version
import { showCustomMessage } from './utils.js';

// Default prayer times (fallback)
const defaultPrayerTimes = {
    Fajr: { name: "Fajr", prayerTime: "05:30", azanTime: "05:00", endTime: "06:30" },
    Dhuhr: { name: "Dhuhr", prayerTime: "12:30", azanTime: "12:00", endTime: "14:30" },
    Asr: { name: "Asr", prayerTime: "15:45", azanTime: "15:15", endTime: "17:45" },
    Maghrib: { name: "Maghrib", prayerTime: "18:30", azanTime: "18:20", endTime: "19:30" },
    Isha: { name: "Isha", prayerTime: "19:45", azanTime: "19:30", endTime: "21:45" },
    Jumuah: { name: "Jumuah", prayerTime: "13:15", azanTime: "13:00", endTime: "14:15" }
};

/**
 * Fetches all masjids from Firestore.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of masjid objects.
 */
async function fetchAllMasjidsFromFirestore() {
    try {
        // Ensure db is defined before calling collection
        if (!db) {
            console.error("Firestore DB is not initialized. Cannot fetch masjids.");
            showCustomMessage('Failed to connect to database. Please try again later.', 'error');
            return [];
        }
        const masjidsCol = collection(db, 'masjids');
        const masjidSnapshot = await getDocs(masjidsCol);
        const masjids = masjidSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            ...doc.data()
        }));
        return masjids;
    } catch (error) {
        console.error('Error fetching masjids from Firestore:', error);
        showCustomMessage('Failed to load masjids. Please try again.', 'error');
        return [];
    }
}

/**
 * Fetches specific masjid details from Firestore by ID.
 * @param {string} masjidId - The ID of the masjid.
 * @returns {Promise<Object|null>} A promise that resolves to the masjid data or null if not found.
 */
async function fetchMasjidDetails(masjidId) {
    try {
        if (!db) {
            console.error("Firestore DB is not initialized. Cannot fetch masjid details.");
            showCustomMessage('Failed to connect to database. Please try again later.', 'error');
            return null;
        }
        const masjidDocRef = doc(db, 'masjids', masjidId);
        const masjidDocSnap = await getDoc(masjidDocRef);
        if (masjidDocSnap.exists()) {
            return { id: masjidDocSnap.id, ...masjidDocSnap.data() };
        }
        return null;
    } catch (error) {
        console.error(`Error fetching masjid details for ID ${masjidId}:`, error);
        showCustomMessage(`Failed to load masjid details.`, 'error');
        return null;
    }
}

/**
 * Fetches prayer times from Firestore for a specific masjid.
 * @param {string} masjidId - The ID of the masjid.
 * @returns {Promise<Object|null>} A promise that resolves to the prayer times data or null if not found.
 */
async function fetchPrayerTimesFromFirestore(masjidId) {
    try {
        if (!db) {
            console.error("Firestore DB is not initialized. Cannot fetch prayer times.");
            showCustomMessage('Failed to connect to database. Please try again later.', 'error');
            return null;
        }
        const prayerTimesDocRef = doc(db, 'prayerTimes', masjidId);
        const prayerTimesDocSnap = await getDoc(prayerTimesDocRef);
        if (prayerTimesDocSnap.exists()) {
            return prayerTimesDocSnap.data();
        }
        return null;
    } catch (error) {
        console.error(`Error fetching prayer times from Firestore for ID ${masjidId}:`, error);
        showCustomMessage(`Failed to load masjid prayer times.`, 'error');
        return null;
    }
}

/**
 * Fetches prayer times from the AlAdhan API.
 * @param {number} latitude - User or masjid latitude.
 * @param {number} longitude - User or masjid longitude.
 * @param {number} method - Calculation method for AlAdhan API (default 1 for Islamic World League).
 * @param {number} school - Asr calculation school (0 for Shafi, 1 for Hanafi).
 * @returns {Promise<Object|null>} A promise that resolves to the prayer timings or null on error.
 */
async function fetchPrayerTimesFromAlAdhan(latitude, longitude, method = 1, school = 1) {
    if (!latitude || !longitude) {
        showCustomMessage('Location not available for AlAdhan API.', 'error');
        return null;
    }
    const today = new Date();
    const timestamp = Math.floor(today.getTime() / 1000);
    const apiUrl = `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${latitude}&longitude=${longitude}&method=${method}&school=${school}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.status === 'OK' && data.data && data.data.timings) {
            const timings = data.data.timings;
            const fajrTime = timings.Fajr || defaultPrayerTimes.Fajr.prayerTime;
            const sunriseTime = timings.Sunrise || defaultPrayerTimes.Fajr.endTime;
            const dhuhrTime = timings.Dhuhr || defaultPrayerTimes.Dhuhr.prayerTime;
            const asrTime = timings.Asr || defaultPrayerTimes.Asr.prayerTime;
            const maghribTime = timings.Maghrib || defaultPrayerTimes.Maghrib.prayerTime;
            const ishaTime = timings.Isha || defaultPrayerTimes.Isha.prayerTime;

            return {
                Fajr: { azanTime: fajrTime, prayerTime: fajrTime, endTime: sunriseTime },
                Dhuhr: { azanTime: dhuhrTime, prayerTime: dhuhrTime, endTime: asrTime },
                Asr: { azanTime: asrTime, prayerTime: asrTime, endTime: maghribTime },
                Maghrib: { azanTime: maghribTime, prayerTime: maghribTime, endTime: ishaTime },
                Isha: { azanTime: ishaTime, prayerTime: ishaTime, endTime: defaultPrayerTimes.Isha.endTime },
                Jumuah: { azanTime: defaultPrayerTimes.Jumuah.azanTime, prayerTime: defaultPrayerTimes.Jumuah.prayerTime, endTime: defaultPrayerTimes.Jumuah.endTime },
                Sehri: fajrTime,
                Iftari: maghribTime
            };
        } else {
            showCustomMessage('Failed to fetch prayer times from AlAdhan API.', 'error');
            console.error('AlAdhan API response error:', data);
            return null;
        }
    } catch (error) {
        console.error('Error fetching from AlAdhan API:', error);
        showCustomMessage('Error fetching prayer times from external API. Using default.', 'error');
        return null;
    }
}

/**
 * Gets the user's current location (latitude, longitude, and reverse geocoded area/city/country).
 * @returns {Promise<Object>} A promise that resolves to an object with location details.
 */
async function getUserCurrentLocation() {
    const userCurrentLocationDisplay = document.getElementById('user-current-location');
    if (userCurrentLocationDisplay.textContent === "Getting location...") {
        return; // Prevent multiple calls
    }
    userCurrentLocationDisplay.textContent = "Getting location...";

    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                let locationDetails = { latitude, longitude, city: null, country: null, area: null };

                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
                    const data = await response.json();
                    let areaText = "";
                    if (data.address) {
                        const address = data.address;
                        locationDetails.city = address.city || address.town || address.village || address.county || '';
                        locationDetails.country = address.country || '';

                        if (address.suburb) locationDetails.area = address.suburb;
                        else if (address.city_district) locationDetails.area = address.city_district;
                        else if (locationDetails.city) areaText += locationDetails.city; // Corrected: use locationDetails.city
                        else areaText += data.display_name.split(',')[0];
                        areaText = locationDetails.area; // Ensure areaText is set from locationDetails.area
                    } else {
                        areaText = "Unknown Area";
                    }
                    userCurrentLocationDisplay.textContent = areaText;
                    resolve(locationDetails);
                } catch (error) {
                    console.error('Error in reverse geocoding:', error);
                    userCurrentLocationDisplay.textContent = "Unable to determine area.";
                    showCustomMessage('Unable to determine your current area.', 'error');
                    resolve(locationDetails);
                }
            }, (error) => {
                console.error('Error getting user location:', error);
                userCurrentLocationDisplay.textContent = "Geolocation denied or unavailable.";
                showCustomMessage('Geolocation denied or unavailable.', 'error');
                reject(error);
            });
        } else {
            userCurrentLocationDisplay.textContent = "Geolocation not supported by browser.";
            showCustomMessage('Geolocation not supported by your browser.', 'error');
            reject(new Error('Geolocation not supported.'));
        }
    });
}

export { fetchAllMasjidsFromFirestore, fetchMasjidDetails, fetchPrayerTimesFromFirestore, fetchPrayerTimesFromAlAdhan, getUserCurrentLocation };
