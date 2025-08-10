// public/js/Namaztimes/helpers/rakats.js

/**
 * Defines the rakat details (Fard, Sunnah Muakkadah, Nafil, Witr) for each prayer.
 * Each function returns an array of objects, where each object specifies the type and count of rakats.
 */
export const rakatFunctions = {
    Fajr: () => [{ type: 'sunnahMuakkadah', count: 2 }, { type: 'farz', count: 2 }],
    Dhuhr: () => [{ type: 'sunnahMuakkadah', count: 4 }, { type: 'farz', count: 4 }, { type: 'sunnahMuakkadah', count: 2 }, { type: 'nafil', count: 2 }],
    Asr: () => [{ type: 'sunnah', count: 4 }, { type: 'farz', count: 4 }],
    Maghrib: () => [{ type: 'farz', count: 3 }, { type: 'sunnahMuakkadah', count: 2 }, { type: 'nafil', count: 2 }],
    Isha: () => [{ type: 'sunnah', count: 4 }, { type: 'farz', count: 4 }, { type: 'sunnahMuakkadah', count: 2 }, { type: 'nafil', count: 2 }, { type: 'witr', count: 3 }, { type: 'nafil', count: 2 }],
    Jumuah: () => [{ type: 'sunnahMuakkadah', count: 4 }, { type: 'farz', count: 2 }, { type: 'sunnahMuakkadah', count: 4 }, { type: 'sunnahMuakkadah', count: 2 }, { type: 'nafil', count: 2 }]
};