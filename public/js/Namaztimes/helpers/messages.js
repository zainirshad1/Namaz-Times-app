// public/js/Namaztimes/helpers/messages.js

/**
 * Displays a custom message in a styled box on the page.
 * @param {string} message - The message to display.
 * @param {string} type - The type of message ('success', 'error', 'info').
 */
export function showCustomMessage(message, type) {
    const msgDiv = document.getElementById('custom-message');
    if (msgDiv) {
        msgDiv.textContent = message;
        msgDiv.className = `fixed bottom-4 right-4 p-3 rounded-lg shadow-lg z-50 text-white ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`;
        msgDiv.classList.remove('hidden');
        setTimeout(() => {
            msgDiv.classList.add('hidden');
        }, 3000);
    }
}