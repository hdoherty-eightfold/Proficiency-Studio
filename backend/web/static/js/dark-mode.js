// Dark Mode Toggle Functionality

// Check for saved dark mode preference or default to light mode
function initializeDarkMode() {
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedMode === 'dark' || (!savedMode && prefersDark)) {
        document.documentElement.classList.add('dark');
        updateDarkModeToggle(true);
    } else {
        document.documentElement.classList.remove('dark');
        updateDarkModeToggle(false);
    }
}

// Toggle dark mode
function toggleDarkMode() {
    const isDark = document.documentElement.classList.contains('dark');
    
    if (isDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'light');
        updateDarkModeToggle(false);
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'dark');
        updateDarkModeToggle(true);
    }
}

// Update toggle button appearance
function updateDarkModeToggle(isDark) {
    const icon = document.getElementById('dark-mode-icon');
    const text = document.getElementById('dark-mode-text');
    
    if (icon && text) {
        if (isDark) {
            icon.className = 'fas fa-sun mr-1';
            text.textContent = 'Light';
        } else {
            icon.className = 'fas fa-moon mr-1';
            text.textContent = 'Dark';
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeDarkMode();
});

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    if (!localStorage.getItem('darkMode')) {
        if (e.matches) {
            document.documentElement.classList.add('dark');
            updateDarkModeToggle(true);
        } else {
            document.documentElement.classList.remove('dark');
            updateDarkModeToggle(false);
        }
    }
});