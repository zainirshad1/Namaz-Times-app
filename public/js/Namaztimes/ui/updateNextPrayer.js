// public/js/Namaztimes/ui/updateNextPrayer.js

/**
 * Updates the display for the next prayer and time remaining.
 * @param {Array} prayerDetailsArray - An array of prayer time objects.
 */
export function updateNextPrayer(prayerDetailsArray) {
    const now = new Date();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

    let nextPrayer = null;
    let timeRemainingMinutes = Infinity;

    for (const prayer of prayerDetailsArray) {
        const [hours, minutes] = prayer.time.split(':').map(Number);
        const prayerTimeMinutes = hours * 60 + minutes;

        if (prayerTimeMinutes > currentTimeMinutes) {
            const remaining = prayerTimeMinutes - currentTimeMinutes;
            if (remaining < timeRemainingMinutes) {
                timeRemainingMinutes = remaining;
                nextPrayer = prayer;
            }
        }
    }

    // Handle case where all prayers for the day have passed
    if (!nextPrayer) {
        // Assume next prayer is Fajr of the next day
        const fajrTime = prayerDetailsArray[0]?.time;
        if (fajrTime) {
            const [fajrHours, fajrMinutes] = fajrTime.split(':').map(Number);
            const fajrTimeMinutes = fajrHours * 60 + fajrMinutes;
            timeRemainingMinutes = (24 * 60 - currentTimeMinutes) + fajrTimeMinutes;
            nextPrayer = prayerDetailsArray[0];
        } else {
            document.getElementById('next-prayer-name').textContent = 'N/A';
            document.getElementById('next-prayer-time').textContent = '--:-- --';
            document.getElementById('duration-left').textContent = '--:--';
            return;
        }
    }

    document.getElementById('next-prayer-name').textContent = nextPrayer.name;
    document.getElementById('next-prayer-time').textContent = nextPrayer.time;

    const remainingHours = Math.floor(timeRemainingMinutes / 60);
    const remainingMinutes = timeRemainingMinutes % 60;
    const formattedTimeLeft = `${String(remainingHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
    document.getElementById('duration-left').textContent = formattedTimeLeft;
}