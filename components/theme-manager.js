
class ThemeManager {
    constructor() {
        this.currentTheme = 'dark';
        this.themeToggle = null;
        this.themeLabel = null;
    }

    init(toggleElement, labelElement) {
        this.themeToggle = toggleElement;
        this.themeLabel = labelElement;
        
        if (!this.themeToggle || !this.themeLabel) {
            console.warn('ThemeManager: Required elements not found');
            return;
        }

        // Load saved theme or default to dark
        this.currentTheme = localStorage.getItem('stig-mapper-theme') || 'dark';
        this.applyTheme(this.currentTheme);
        
        // Set up event listener for toggle
        this.themeToggle.addEventListener('change', () => {
            this.toggle();
        });
        
        console.log('ThemeManager initialized with event listeners');
    }

    toggle() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        if (theme !== 'light' && theme !== 'dark') {
            console.warn(`ThemeManager: Invalid theme "${theme}". Using "dark" instead.`);
            theme = 'dark';
        }

        this.currentTheme = theme;
        this.applyTheme(theme);
        this.saveTheme(theme);
    }

    applyTheme(theme) {
        const isLight = theme === 'light';
        
        // Update document theme attribute
        document.documentElement.setAttribute('data-theme', theme);
        
        // Update toggle state
        if (this.themeToggle) {
            this.themeToggle.checked = isLight;
        }
        
        // Update label text
        if (this.themeLabel) {
            this.themeLabel.textContent = isLight ? 'Light Mode' : 'Dark Mode';
        }

        // Dispatch theme change event for other components
        document.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme, isLight }
        }));
    }

    saveTheme(theme) {
        try {
            localStorage.setItem('stig-mapper-theme', theme);
        } catch (error) {
            console.warn('ThemeManager: Failed to save theme preference:', error);
        }
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    isLightTheme() {
        return this.currentTheme === 'light';
    }

    isDarkTheme() {
        return this.currentTheme === 'dark';
    }
}

// Make available globally
window.ThemeManager = ThemeManager;
