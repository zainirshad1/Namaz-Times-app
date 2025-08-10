// public/js/Namaztimes/helpers/globals.js

export let userLocation = { latitude: null, longitude: null, city: '', country: '' };
export let currentMasjidDetails = null;
export let currentUserPrayerTimes = [];
export let userProfileData = {};
export let currentUserRole = null;
export let asrCalculationSchool = '1';

// fetchPrayerTimesFromAlAdhan function has been removed from here
// as it's now in public/js/Namaztimes/api/alAdhanApi.js