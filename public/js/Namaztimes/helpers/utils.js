// public/js/Namaztimes/helpers/utils.js

/**
 * Formats a 24-hour time string to a 12-hour AM/PM format.
 * @param {string} time24 - The time string in 'HH:mm' format.
 * @returns {string} The formatted time string, e.g., '05:00 AM'.
 */
export function formatTimeToAMPM(time24) {
    if (!time24 || time24 === 'N/A') return 'N/A';
    const [hours, minutes] = time24.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Generates HTML for prayer rakats.
 * @param {object} rakats - An object containing 'fard' and 'sunnah' rakat counts.
 * @returns {string} The HTML string for displaying rakats.
 */
export function formatRakatDetails(rakats) {
    let html = '';
    if (rakats.fard) {
        html += `<span class="badge bg-blue-500 text-white px-2 py-1 rounded-full text-xs mr-1">${rakats.fard} Fard</span>`;
    }
    if (rakats.sunnah) {
        html += `<span class="badge bg-yellow-500 text-white px-2 py-1 rounded-full text-xs">${rakats.sunnah} Sunnah</span>`;
    }
    return html;
}