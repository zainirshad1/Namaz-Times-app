// public/js/prayer-logic.js

import { createDateFromTime, formatTimeToAMPM } from './utils.js';

// Rakat lookup object
const rakatFunctions = {
    Fajr: () => [{ type: 'sunnahMuakkadah', count: 2 }, { type: 'farz', count: 2 }],
    Dhuhr: () => [{ type: 'sunnahMuakkadah', count: 4 }, { type: 'farz', count: 4 }, { type: 'sunnahMuakkadah', count: 2 }, { type: 'nafil', count: 2 }],
    Asr: () => [{ type: 'sunnah', count: 4 }, { type: 'farz', count: 4 }],
    Maghrib: () => [{ type: 'farz', count: 3 }, { type: 'sunnahMuakkadah', count: 2 }, { type: 'nafil', count: 2 }],
    Isha: () => [{ type: 'sunnah', count: 4 }, { type: 'farz', count: 4 }, { type: 'sunnahMuakkadah', count: 2 }, { type: 'nafil', count: 2 }, { type: 'witr', count: 3 }, { type: 'nafil', count: 2 }],
    Jumuah: () => [{ type: 'sunnahMuakkadah', count: 4 }, { type: 'farz', count: 2 }, { type: 'sunnahMuakkadah', count: 4 }, { type: 'sunnahMuakkadah', count: 2 }, { type: 'nafil', count: 2 }]
};

// Default prayer times (fallback) - Define here if prayer-logic needs direct access to these defaults for structure
const defaultPrayerTimes = {
    Fajr: { name: "Fajr", prayerTime: "05:30", azanTime: "05:00", endTime: "06:30" },
    Dhuhr: { name: "Dhuhr", prayerTime: "12:30", azanTime: "12:00", endTime: "14:30" },
    Asr: { name: "Asr", prayerTime: "15:45", azanTime: "15:15", endTime: "17:45" },
    Maghrib: { name: "Maghrib", prayerTime: "18:30", azanTime: "18:20", endTime: "19:30" },
    Isha: { name: "Isha", prayerTime: "19:45", azanTime: "19:30", endTime: "21:45" },
    Jumuah: { name: "Jumuah", prayerTime: "13:15", azanTime: "13:00", endTime: "14:15" }
};

/**
 * Consolidates and prepares prayer details from Firestore and AlAdhan API data.
 * Prioritizes Firestore data, then AlAdhan, then default.
 * @param {Object|null} firestoreData - Prayer times fetched from Firestore.
 * @param {Object|null} alAdhanData - Prayer times fetched from AlAdhan API.
 * @returns {Object} An object containing consolidated prayer details, sehri, and iftari times.
 */
function getConsolidatedPrayerTimes(firestoreData, alAdhanData) {
    const prayerDetails = Object.keys(defaultPrayerTimes).map(prayerName => {
        const defaultP = defaultPrayerTimes[prayerName];
        let azanTime, prayerTime, endTime;

        if (firestoreData && firestoreData[`${prayerName}Azan`]) {
            azanTime = firestoreData[`${prayerName}Azan`];
            prayerTime = firestoreData[`${prayerName}Prayer`];
            endTime = firestoreData[`${prayerName}EndTime`] || (alAdhanData && alAdhanData[prayerName] ? alAdhanData[prayerName].endTime : defaultP.endTime);
        } else if (alAdhanData && alAdhanData[prayerName]) {
            azanTime = alAdhanData[prayerName].azanTime;
            prayerTime = alAdhanData[prayerName].prayerTime;
            endTime = alAdhanData[prayerName].endTime;
        } else {
            azanTime = defaultP.azanTime;
            prayerTime = defaultP.prayerTime;
            endTime = defaultP.endTime;
        }

        return {
            name: prayerName,
            azanTime: azanTime,
            prayerTime: prayerTime, // This is what is passed to updateNextPrayer
            endTime: endTime,
            rakats: rakatFunctions[prayerName]()
        };
    });

    const currentSehriTime = (alAdhanData && alAdhanData.Sehri) || (firestoreData && firestoreData.SehriTime) || defaultPrayerTimes.Fajr.azanTime;
    const currentIftariTime = (alAdhanData && alAdhanData.Iftari) || (firestoreData && firestoreData.IftariTime) || defaultPrayerTimes.Maghrib.azanTime;

    return { prayerDetails, currentSehriTime, currentIftariTime };
}


/**
 * Updates the display for the next prayer and duration left.
 * @param {Array<Object>} prayerDetailsArray - An array of prayer objects with 'name' and 'time' (24hr string).
 */
function updateNextPrayer(prayerDetailsArray) {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 for Sunday, 5 for Friday, 6 for Saturday

    let nextPrayerName = 'None';
    let nextPrayerTimeStr = '--:-- --';
    let durationLeftStr = '--:--';
    let nextPrayerDateTime = null;

    const prayerCards = document.querySelectorAll('.prayer-card');
    prayerCards.forEach(card => card.classList.remove('current-prayer-card'));

    let futurePrayersToday = [];
    for (const prayer of prayerDetailsArray) {
        const prayerName = prayer.name;
        // FIX: Use prayer.time instead of prayer.prayerTime here
        const prayerTimeStr = (prayerName === 'Jumuah') ? prayer.time : prayer.time || '00:00';
        const prayerDate = createDateFromTime(prayerTimeStr, now);
        if (prayerDate > now) {
            futurePrayersToday.push({ name: prayerName, time: prayerDate });
        }
    }

    futurePrayersToday.sort((a, b) => a.time.getTime() - b.time.getTime());

    if (futurePrayersToday.length > 0) {
        nextPrayerName = futurePrayersToday[0].name;
        nextPrayerTimeStr = formatTimeToAMPM(futurePrayersToday[0].time.getHours() + ':' + futurePrayersToday[0].time.getMinutes());
        nextPrayerDateTime = futurePrayersToday[0].time;
    } else if (prayerDetailsArray.length > 0) {
        // If no more prayers today, find tomorrow's Fajr
        const fajrPrayer = prayerDetailsArray.find(p => p.name === 'Fajr');
        // FIX: Ensure fajrPrayer.time is used, fallback to default if not found
        const fajrTimeStr = fajrPrayer ? fajrPrayer.time : defaultPrayerTimes.Fajr.prayerTime;

        const [fajrHours, fajrMinutes] = fajrTimeStr.split(':').map(Number);
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1); // Set to tomorrow's date
        const fajrTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), fajrHours, fajrMinutes, 0);

        nextPrayerName = 'Fajr';
        nextPrayerTimeStr = formatTimeToAMPM(fajrTomorrow.getHours() + ':' + fajrTomorrow.getMinutes());
        nextPrayerDateTime = fajrTomorrow;
    }

    // Highlight the current prayer card
    prayerCards.forEach(card => {
        const prayerNameInCard = card.querySelector('h3').textContent.trim();
        if (prayerNameInCard === nextPrayerName) {
            card.classList.add('current-prayer-card');
        }
    });

    // Calculate duration left
    if (nextPrayerDateTime) {
        const diffMs = nextPrayerDateTime - now;
        const diffSeconds = Math.floor(diffMs / 1000);
        const minutes = Math.floor(diffSeconds / 60);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        durationLeftStr = `${hours}h ${remainingMinutes}m`;
    }

    // Update DOM elements
    document.getElementById('next-prayer-name').textContent = nextPrayerName;
    document.getElementById('next-prayer-time').textContent = nextPrayerTimeStr;
    document.getElementById('duration-left').textContent = durationLeftStr;
}

export { getConsolidatedPrayerTimes, updateNextPrayer, rakatFunctions, defaultPrayerTimes };
