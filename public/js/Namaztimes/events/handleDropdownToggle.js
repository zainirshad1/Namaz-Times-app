// public/js/Namaztimes/events/handleDropdownToggle.js

/**
 * Toggles the visibility of the user dropdown content.
 */
export function handleDropdownToggle() {
    const dropdownContent = document.getElementById('user-dropdown-content');
    if (dropdownContent) {
        dropdownContent.classList.toggle('hidden');
    }
}