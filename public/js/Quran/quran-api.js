/**
 * quran-api.js
 * This module handles all interactions with the Al Quran Cloud API.
 * It provides functions to fetch surah lists, reciters, scripts,
 * and the actual Quranic text and audio data.
 */

/**
 * Fetches the list of all Surahs from the Al Quran Cloud API.
 * @returns {Promise<Array>} A promise that resolves to an array of surah data, or an empty array if an error occurs.
 */
export async function fetchSurahs() {
    try {
        const response = await fetch('https://api.alquran.cloud/v1/surah');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Fetched Surahs Raw Data:", data.data); // Log raw data to inspect structure
        return data.data || []; // Ensure it returns an empty array if data.data is null/undefined
    } catch (error) {
        console.error("Error fetching Surahs:", error);
        return []; // Return empty array on error
    }
}

/**
 * Fetches the list of audio reciters from the Al Quran Cloud API.
 * @returns {Promise<Array>} A promise that resolves to an array of reciter data, or an empty array if an error occurs.
 */
export async function fetchReciters() {
    try {
        const response = await fetch('https://api.alquran.cloud/v1/edition/format/audio');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Fetched Reciters Raw Data:", data.data); // Log raw data to inspect structure
        return data.data || []; // Ensure it returns an empty array if data.data is null/undefined
    } catch (error) {
        console.error("Error fetching Reciters:", error);
        return []; // Return empty array on error
    }
}

/**
 * Fetches the list of available translation/script editions from the Al Quran Cloud API.
 * Filters for English text translations.
 * @returns {Promise<Array>} A promise that resolves to an array of script data, or an empty array if an error occurs.
 */
export async function fetchScripts() {
    try {
        const response = await fetch('https://api.alquran.cloud/v1/edition/type/translation');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Fetched Scripts Raw Data (before filter):", data.data); // Log raw data to inspect structure
        // Filter for English text translations
        const filteredScripts = (data.data || []).filter(s => s.language === 'en' && s.format === 'text');
        console.log("Fetched Scripts (after filter):", filteredScripts);
        return filteredScripts;
    } catch (error) {
        console.error("Error fetching Scripts:", error);
        return []; // Return empty array on error
    }
}

/**
 * Loads the Arabic text and a specified translation for a given Surah.
 * @param {string} surahNumber - The number of the Surah.
 * @param {string} scriptIdentifier - The identifier for the translation/script.
 * @returns {Promise<{arabic: Array, translation: Array}>} A promise that resolves to an object
 * containing Arabic and translation Ayah data, or an object with empty arrays if an error occurs.
 */
export async function fetchSurahData(surahNumber, scriptIdentifier) {
    try {
        // Fetch Arabic text
        const arabicResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}`);
        if (!arabicResponse.ok) {
            throw new Error(`HTTP error fetching Arabic data! status: ${arabicResponse.status}`);
        }
        const arabicData = await arabicResponse.json();

        // Fetch translation text
        const translationResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${scriptIdentifier}`);
        if (!translationResponse.ok) {
            throw new Error(`HTTP error fetching translation data! status: ${translationResponse.status}`);
        }
        const translationData = await translationResponse.json();

        // Ensure ayahs arrays exist before mapping
        const arabicAyahs = arabicData.data?.ayahs || [];
        const translationAyahs = translationData.data?.ayahs || [];

        return {
            arabic: arabicAyahs.map(ayah => ({ number: ayah.numberInSurah, text: ayah.text })),
            translation: translationAyahs.map(ayah => ({ number: ayah.numberInSurah, text: ayah.text }))
        };
    } catch (error) {
        console.error(`Error fetching Surah data for Surah ${surahNumber} and script ${scriptIdentifier}:`, error);
        return { arabic: [], translation: [] }; // Return empty data on error
    }
}

/**
 * Loads the audio URLs for a given Surah and Reciter.
 * @param {string} surahNumber - The number of the Surah.
 * @param {string} reciterIdentifier - The identifier for the reciter.
 * @returns {Promise<Array>} A promise that resolves to an array of Ayah audio data, or an empty array if an error occurs.
 */
export async function fetchSurahAudio(surahNumber, reciterIdentifier) {
    try {
        const audioResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${reciterIdentifier}`);
        if (!audioResponse.ok) {
            throw new Error(`HTTP error fetching audio data! status: ${audioResponse.status}`);
        }
        const audioData = await audioResponse.json();
        // Ensure ayahs array exists before mapping
        const audioAyahs = audioData.data?.ayahs || [];
        return audioAyahs.map(ayah => ({ number: ayah.numberInSurah, audio: ayah.audio }));
    } catch (error) {
        console.error(`Error fetching Surah audio for Surah ${surahNumber} and reciter ${reciterIdentifier}:`, error);
        return []; // Return empty array on error
    }
}
