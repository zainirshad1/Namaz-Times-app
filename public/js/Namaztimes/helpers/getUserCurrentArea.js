// public/js/Namaztimes/helpers/getUserCurrentArea.js

import { userLocation } from './globals.js';
import { showCustomMessage } from './messages.js';

export async function getUserCurrentArea(element) {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                const apiUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;

                try {
                    const response = await fetch(apiUrl);
                    const data = await response.json();

                    userLocation.latitude = latitude;
                    userLocation.longitude = longitude;
                    userLocation.city = data.address.city || data.address.town || data.address.village || '';
                    userLocation.country = data.address.country || '';

                    // Extract and format the location string
                    let locationString = '';
                    const area = data.address.suburb || data.address.city_district || '';
                    const city = data.address.city || data.address.town || data.address.village || '';
                    const state = data.address.state || '';
                    
                    if (area) locationString += area;
                    if (city) locationString += (locationString ? ', ' : '') + city;
                    if (state) locationString += (locationString ? ', ' : '') + state;

                    element.textContent = locationString;
                    showCustomMessage(`Location updated to ${userLocation.city}, ${userLocation.country}`, 'success');

                } catch (error) {
                    console.error("Error fetching location details:", error);
                    element.textContent = 'Location not available';
                    showCustomMessage('Failed to get location details.', 'error');
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                element.textContent = 'Location access denied.';
                showCustomMessage('Please enable location services to get local prayer times.', 'error');
            }
        );
    } else {
        element.textContent = 'Geolocation not supported';
        showCustomMessage('Geolocation is not supported by your browser.', 'error');
    }
}
