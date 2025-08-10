// public/js/Namaztimes/api/alAdhanApi.js

export async function fetchPrayerTimesFromAlAdhan(latitude, longitude, method, asrMethod) {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Use method 1 (University of Islamic Sciences, Karachi) for better accuracy in India.
    // We are hardcoding it here, but it could be a configurable setting as well.
    const newMethod = 1;

    const apiUrl = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${latitude}&longitude=${longitude}&method=${newMethod}&school=${asrMethod}`;
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.data) {
            const timings = data.data.timings;
            return {
                Fajr: { azanTime: timings.Fajr, prayerTime: timings.Fajr, endTime: timings.Sunrise },
                Dhuhr: { azanTime: timings.Dhuhr, prayerTime: timings.Dhuhr, endTime: timings.Asr },
                Asr: { azanTime: timings.Asr, prayerTime: timings.Asr, endTime: timings.Maghrib },
                Maghrib: { azanTime: timings.Maghrib, prayerTime: timings.Maghrib, endTime: timings.Isha },
                Isha: { azanTime: timings.Isha, prayerTime: timings.Isha, endTime: "23:59" },
                Sehri: timings.Fajr,
                Iftari: timings.Maghrib
            };
        }
    } catch (error) {
        console.error("Error fetching prayer times from AlAdhan API:", error);
        return null;
    }
}
