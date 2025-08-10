// public/js/Namaztimes/ui/updateHijriDate.js

/**
 * Updates the Hijri date display.
 * @param {Date} date - The current date object.
 */
export function updateHijriDate(date) {
    try {
        const hijriDate = new Intl.DateTimeFormat('en-TN-u-ca-islamic', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
        document.getElementById('hijri-date').textContent = ` | ${hijriDate}`;
    } catch (e) {
        console.error('Could not format Hijri date:', e);
        document.getElementById('hijri-date').textContent = '';
    }
}