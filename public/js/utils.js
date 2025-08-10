// public/js/utils.js

const customMessageBox = document.getElementById('custom-message-box');

/**
 * Displays a custom message box with a given message and type.
 * @param {string} message - The message to display.
 * @param {'success'|'error'|'info'} type - The type of message (determines background color).
 * @param {number} duration - How long the message should be displayed in milliseconds.
 */
function showCustomMessage(message, type = 'success', duration = 3000) {
    if (!customMessageBox) {
        console.error('Custom message box element not found.');
        return;
    }
    customMessageBox.textContent = message;
    customMessageBox.classList.remove('success', 'error', 'info');
    customMessageBox.classList.add(type);
    customMessageBox.classList.add('show');
    setTimeout(() => {
        customMessageBox.classList.remove('show');
    }, duration);
}

/**
 * Formats a 24-hour time string (e.g., "13:30") to 12-hour AM/PM format (e.g., "1:30 PM").
 * @param {string} timeStr - The time string in "HH:MM" format.
 * @returns {string} The formatted time string or 'N/A'.
 */
function formatTimeToAMPM(timeStr) {
    if (!timeStr || timeStr === 'N/A') return 'N/A';
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
        console.warn(`Invalid time string passed to formatTimeToAMPM: "${timeStr}"`);
        return 'N/A';
    }
    const date = new Date(); // Use a dummy date for formatting
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    const options = { hour: 'numeric', minute: 'numeric', hour12: true };
    return date.toLocaleTimeString([], options);
}

/**
 * Creates a Date object for today with the given time string.
 * @param {string} timeStr - The time string in "HH:MM" format.
 * @param {Date} baseDate - The base date to use for year, month, and day.
 * @returns {Date} A Date object with the specified time.
 */
function createDateFromTime(timeStr, baseDate) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(baseDate);
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
}

/**
 * Formats rakat details into an HTML unordered list.
 * @param {Array<Object>} rakats - An array of rakat objects ({ type: string, count: number }).
 * @returns {string} HTML string of formatted rakat details.
 */
function formatRakatDetails(rakats) {
    const rakatDetails = [];
    rakats.forEach(rakat => {
        let type = rakat.type.charAt(0).toUpperCase() + rakat.type.slice(1);
        let typeClass = '';
        if (type.toLowerCase() === 'sunnahmuakkadah') {
            type = 'Sunnah';
            typeClass = 'rakat-type-sunnah';
        } else if (type.toLowerCase() === 'farz') {
            typeClass = 'rakat-type-farz';
        } else if (type.toLowerCase() === 'witr') {
            typeClass = 'rakat-type-witr';
        } else {
            typeClass = 'rakat-type-nafil';
        }
        const count = rakat.count;
        rakatDetails.push(`<li class="${typeClass}">${type}: ${count}</li>`);
    });
    return `<ul class="list-disc list-inside text-sm font-medium">${rakatDetails.join('')}</ul>`;
}

/**
 * Closes the user dropdown menu.
 */
function closeDropdown() {
    const dropdownContent = document.getElementById('user-dropdown-content');
    if (dropdownContent) {
        dropdownContent.classList.remove('show');
    }
}

/**
 * Converts degrees to radians.
 * @param {number} degrees
 * @returns {number}
 */
function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * Converts radians to degrees.
 * @param {number} radians
 * @returns {number}
 */
function toDegrees(radians) {
    return radians * 180 / Math.PI;
}

export { showCustomMessage, formatTimeToAMPM, createDateFromTime, formatRakatDetails, closeDropdown, toRadians, toDegrees };
