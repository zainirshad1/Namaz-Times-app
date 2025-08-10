// public/js/Namaztimes/ui/displayQiblaDirection.js

import { toRadians } from '../helpers/toRadians.js';
import { toDegrees } from '../helpers/toDegrees.js';
import { showCustomMessage } from '../helpers/messages.js';

/**
 * Shows the Qibla direction modal and calculates the direction.
 * @param {HTMLElement} qiblaDirectionModalOverlay - The Qibla modal overlay element.
 * @param {HTMLElement} qiblaStatus - The status text element for Qibla.
 * @param {HTMLElement} qiblaIndicatorContainer - The container for the Qibla indicator.
 */
export async function displayQiblaDirection(qiblaDirectionModalOverlay, qiblaStatus, qiblaIndicatorContainer) {
    qiblaDirectionModalOverlay.classList.add('show');
    qiblaStatus.textContent = 'Calculating Qibla direction...';
    qiblaIndicatorContainer.innerHTML = '';

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            
            const kaabaLatitude = toRadians(21.4225);
            const kaabaLongitude = toRadians(39.8262);
            
            const userLatitude = toRadians(latitude);
            const userLongitude = toRadians(longitude);
            
            const deltaLongitude = kaabaLongitude - userLongitude;
            
            const y = Math.sin(deltaLongitude);
            const x = Math.cos(userLatitude) * Math.tan(kaabaLatitude) - Math.sin(userLatitude) * Math.cos(deltaLongitude);
            
            let qiblaDirection = toDegrees(Math.atan2(y, x));
            
            if (qiblaDirection < 0) {
                qiblaDirection += 360;
            }
            
            qiblaStatus.innerHTML = `Qibla direction from your location is <br class="md:hidden"/> **${qiblaDirection.toFixed(2)}°**`;

            // Create a simple compass indicator
            const compass = document.createElement('div');
            compass.className = 'w-24 h-24 border-4 border-gray-400 rounded-full mx-auto relative';
            const arrow = document.createElement('div');
            arrow.className = 'w-2 h-12 bg-red-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full';
            arrow.style.transform = `translate(-50%, -50%) rotate(${qiblaDirection}deg)`;
            compass.appendChild(arrow);
            qiblaIndicatorContainer.appendChild(compass);

        }, (error) => {
            console.error("Geolocation error:", error);
            qiblaStatus.textContent = 'Unable to get your location. Please enable location services.';
            showCustomMessage('Geolocation failed. Unable to determine Qibla direction.', 'error');
        });
    } else {
        qiblaStatus.textContent = 'Geolocation is not supported by your browser.';
        showCustomMessage('Geolocation not supported.', 'error');
    }
}