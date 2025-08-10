// public/js/Namaztimes/events/closeDropdown.js

/**
 * Closes the user dropdown menu if it is open.
 */
export function closeDropdown() {
    const dropdownContent = document.getElementById('user-dropdown-content');
    if (dropdownContent && !dropdownContent.classList.contains('hidden')) {
        dropdownContent.classList.add('hidden');
    }
}
