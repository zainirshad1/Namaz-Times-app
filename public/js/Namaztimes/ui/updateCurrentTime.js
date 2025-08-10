// public/js/Namaztimes/ui/updateCurrentTime.js

import { updateHijriDate } from './updateHijriDate.js';
import { updateNextPrayer } from './updateNextPrayer.js';

/**
 * Updates the current time, date, and next prayer details on the page every second.
 * @param {HTMLElement} currentEnglishTimeHeader - The main time display element.
 * @param {HTMLElement} currentEnglishDayDisplay - The day display element.
 * @param {HTMLElement} currentEnglishDateDisplay - The date display element.
 * @param {HTMLElement} currentTimeMain - The main time element.
 * @param {Array} currentUserPrayerTimes - The array of current prayer times.
 */
export function updateCurrentTime(currentEnglishTimeHeader, currentEnglishDayDisplay, currentEnglishDateDisplay, currentTimeMain, currentUserPrayerTimes) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const dateString = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    if (currentEnglishTimeHeader) currentEnglishTimeHeader.textContent = timeString;
    if (currentEnglishDayDisplay) currentEnglishDayDisplay.textContent = dayName;
    if (currentEnglishDateDisplay) currentEnglishDateDisplay.textContent = dateString;

    updateHijriDate(now);
    updateNextPrayer(currentUserPrayerTimes);
}