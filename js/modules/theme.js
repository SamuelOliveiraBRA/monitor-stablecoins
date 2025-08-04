/**
 * Theme Module
 * Manages dark/light theme switching with smooth transitions
 */

class ThemeModule {
    constructor() {
        this.currentTheme = 'dark';
        this.systemPreference = 'dark';
        this.observers = new Set();
        this.transitionDuration = 300;
    }
    
    init() {
        console.log('🎨 Theme Module initialized');
        this.detectSystemPreference();
        this.loadSavedTheme();
        this.setupSystemPreferenceListener();
        this.setupToggleButtons();
        this.applyTheme(this.currentTheme, false);
        
        // Ensure theme is properly applied after DOM is ready
        setTimeout(() => {
            this.updateToggleButtons();
            this.applyTheme(this.currentTheme, false);
        }, 100);
        
        // Additional check after a longer delay to ensure everything is loaded
        setTimeout(() => {
            this.forceThemeApplication();
        }, 500);
        
        // Final check to ensure theme is applied correctly
        setTimeout(() => {
            this.ensureThemeApplied();
        }, 1000);
    }
    
    detectSystemPreference() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.systemPreference = mediaQuery.matches ? 'dark' : 'light';
        }
    }
    
    loadSavedTheme() {
        const savedTheme = Storage.get('theme', null);
        
        if (savedTheme && ['dark', 'light', 'auto'].includes(savedTheme)) {
            this.currentTheme = savedTheme;
        } else {
            // Default to system preference
            this.currentTheme = 'auto';
        }
    }
    
    setupSystemPreferenceListener() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            mediaQuery.addEventListener('change', (e) => {
                this.systemPreference = e.matches ? 'dark' : 'light';
                
                if (this.currentTheme === 'auto') {
                    this.applyTheme('auto');
                }
            });
        }
    }
    
    setupToggleButtons() {
        // Main theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggle());
        }
        
        // Settings modal theme toggle
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', (e) => {
                const newTheme = e.target.checked ? 'dark' : 'light';
                this.setTheme(newTheme);
            });
        }
    }
    
    // Core Theme Methods
    setTheme(theme, animate = true) {
        if (!['dark', 'light', 'auto'].includes(theme)) {
            console.warn(`Invalid theme: ${theme}`);
            return;
        }
        
        this.currentTheme = theme;
        this.applyTheme(theme, animate);
        this.saveTheme();
        this.updateToggleButtons();
        this.notifyObservers();
        
        // Analytics.trackEvent('theme_change', 'ui', 'theme_switch', theme);
    }
    
    applyTheme(theme, animate = true) {
        const effectiveTheme = this.getEffectiveTheme(theme);
        
        if (animate) {
            this.animateThemeTransition(() => {
                this.applyThemeStyles(effectiveTheme);
            });
        } else {
            this.applyThemeStyles(effectiveTheme);
        }
        
        // Update Charts theme if available
        if (window.Charts) {
            Charts.updateChartsTheme(effectiveTheme === 'dark');
        }
    }
    
    getEffectiveTheme(theme) {
        if (theme === 'auto') {
            return this.systemPreference;
        }
        return theme;
    }
    
    applyThemeStyles(theme) {
        const root = document.documentElement;
        const body = document.body;
        
        // Remove existing theme classes
        body.classList.remove('dark', 'light');
        root.removeAttribute('data-theme');
        
        // Apply new theme
        body.classList.add(theme);
        root.setAttribute('data-theme', theme);
        
        // Update CSS custom properties
        this.updateCSSVariables(theme);
        
        // Update meta theme-color for mobile browsers
        this.updateMetaThemeColor(theme);
        
        // Force a reflow to ensure styles are applied
        root.offsetHeight;
        
        // Dispatch custom event for theme change
        document.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme: theme } 
        }));
    }
    
    updateCSSVariables(theme) {
        const root = document.documentElement;
        
        const themes = {
            dark: {
                '--bg-primary': '#111827',
                '--bg-secondary': '#1f2937',
                '--bg-tertiary': '#374151',
                '--text-primary': '#ffffff',
                '--text-secondary': '#d1d5db',
                '--text-muted': '#9ca3af',
                '--border-color': 'rgba(255, 255, 255, 0.1)',
                '--glass-bg': 'rgba(255, 255, 255, 0.08)',
                '--glass-border': 'rgba(255, 255, 255, 0.1)'
            },
            light: {
                '--bg-primary': '#f8fafc',
                '--bg-secondary': '#ffffff',
                '--bg-tertiary': '#f1f5f9',
                '--text-primary': '#1e293b',
                '--text-secondary': '#475569',
                '--text-muted': '#64748b',
                '--border-color': 'rgba(0, 0, 0, 0.1)',
                '--glass-bg': 'rgba(255, 255, 255, 0.8)',
                '--glass-border': 'rgba(0, 0, 0, 0.1)'
            }
        };
        
        const themeVars = themes[theme];
        if (themeVars) {
            Object.entries(themeVars).forEach(([property, value]) => {
                root.style.setProperty(property, value);
            });
        }
    }
    
    updateMetaThemeColor(theme) {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = theme === 'dark' ? '#111827' : '#f8fafc';
        }
    }
    
    animateThemeTransition(callback) {
        // Add transition class to body
        document.body.classList.add('theme-transitioning');
        
        // Create a temporary overlay for smooth transition
        const overlay = document.createElement('div');
        overlay.className = 'theme-transition-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--bg-primary);
            opacity: 0;
            pointer-events: none;
            z-index: 9999;
            transition: opacity ${this.transitionDuration}ms ease-in-out;
        `;
        
        document.body.appendChild(overlay);
        
        // Force reflow
        overlay.offsetHeight;
        
        // Start transition
        overlay.style.opacity = '0.5';
        
        setTimeout(() => {
            callback();
            
            // Fade out overlay
            overlay.style.opacity = '0';
            
            setTimeout(() => {
                document.body.removeChild(overlay);
                document.body.classList.remove('theme-transitioning');
            }, this.transitionDuration);
            
        }, this.transitionDuration / 2);
    }
    
    // Toggle Methods
    toggle() {
        const nextTheme = this.getNextTheme();
        this.setTheme(nextTheme);
    }
    
    getNextTheme() {
        const sequence = ['dark', 'light', 'auto'];
        const currentIndex = sequence.indexOf(this.currentTheme);
        return sequence[(currentIndex + 1) % sequence.length];
    }
    
    // UI Updates
    updateToggleButtons() {
        // Update main theme toggle icon
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('[data-feather]');
            if (icon) {
                const effectiveTheme = this.getEffectiveTheme(this.currentTheme);
                const iconName = this.getThemeIcon(effectiveTheme);
                icon.setAttribute('data-feather', iconName);
                
                // Re-render feather icons
                if (window.feather) {
                    feather.replace();
                }
            }
        }
        
        // Update settings toggle
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            const effectiveTheme = this.getEffectiveTheme(this.currentTheme);
            // Ensure the toggle reflects the actual theme state
            darkModeToggle.checked = effectiveTheme === 'dark';
            
            // Force update the toggle state
            darkModeToggle.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Update toggle button title
        if (themeToggle) {
            themeToggle.title = this.getThemeTooltip();
        }
    }
    
    getThemeIcon(theme) {
        const icons = {
            dark: 'moon',
            light: 'sun',
            auto: 'monitor'
        };
        return icons[theme] || 'sun';
    }
    
    getThemeTooltip() {
        const tooltips = {
            dark: 'Mudar para tema claro',
            light: 'Mudar para automático',
            auto: 'Mudar para tema escuro'
        };
        return tooltips[this.currentTheme] || 'Mudar tema';
    }
    
    // Persistence
    saveTheme() {
        Storage.set('theme', this.currentTheme);
    }
    
    // Observer Pattern
    addObserver(callback) {
        if (typeof callback === 'function') {
            this.observers.add(callback);
        }
    }
    
    removeObserver(callback) {
        this.observers.delete(callback);
    }
    
    notifyObservers() {
        const effectiveTheme = this.getEffectiveTheme(this.currentTheme);
        this.observers.forEach(callback => {
            try {
                callback(effectiveTheme, this.currentTheme);
            } catch (error) {
                console.error('Theme observer error:', error);
            }
        });
    }
    
    // Getters
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    getEffectiveCurrentTheme() {
        return this.getEffectiveTheme(this.currentTheme);
    }
    
    getSystemPreference() {
        return this.systemPreference;
    }
    
    isDark() {
        return this.getEffectiveTheme(this.currentTheme) === 'dark';
    }
    
    forceThemeApplication() {
        const effectiveTheme = this.getEffectiveTheme(this.currentTheme);
        const root = document.documentElement;
        const body = document.body;
        
        // Force apply theme styles
        body.classList.remove('dark', 'light');
        root.removeAttribute('data-theme');
        
        body.classList.add(effectiveTheme);
        root.setAttribute('data-theme', effectiveTheme);
        
        // Update CSS variables
        this.updateCSSVariables(effectiveTheme);
        
        // Update toggle buttons
        this.updateToggleButtons();
        
        console.log('🎨 Theme forced to:', effectiveTheme);
    }
    
    ensureThemeApplied() {
        const root = document.documentElement;
        const body = document.body;
        const effectiveTheme = this.getEffectiveTheme(this.currentTheme);
        
        // Check if theme is properly applied
        const currentDataTheme = root.getAttribute('data-theme');
        const currentBodyClass = body.className;
        
        if (currentDataTheme !== effectiveTheme || !currentBodyClass.includes(effectiveTheme)) {
            console.log('🎨 Theme not properly applied, fixing...');
            this.forceThemeApplication();
        } else {
            console.log('🎨 Theme properly applied:', effectiveTheme);
        }
        
        // Ensure toggle buttons are in sync
        this.updateToggleButtons();
    }
    
    isLight() {
        return this.getEffectiveTheme(this.currentTheme) === 'light';
    }
    
    // Advanced Theme Features
    setCustomTheme(themeName, themeConfig) {
        // Allow for custom theme configurations
        const customThemes = Storage.get('customThemes', {});
        customThemes[themeName] = themeConfig;
        Storage.set('customThemes', customThemes);
    }
    
    getAvailableThemes() {
        const builtInThemes = ['dark', 'light', 'auto'];
        const customThemes = Object.keys(Storage.get('customThemes', {}));
        return [...builtInThemes, ...customThemes];
    }
    
    // Accessibility Features
    enableHighContrast(enabled = true) {
        document.body.classList.toggle('high-contrast', enabled);
        Storage.set('highContrast', enabled);
        
        // Analytics.trackEvent('accessibility', 'ui', 'high_contrast', enabled ? 'enabled' : 'disabled');
    }
    
    setFontSize(size) {
        const validSizes = ['small', 'medium', 'large', 'extra-large'];
        if (!validSizes.includes(size)) return;
        
        document.documentElement.classList.remove(...validSizes.map(s => `font-${s}`));
        document.documentElement.classList.add(`font-${size}`);
        
        Storage.set('fontSize', size);
        // Analytics.trackEvent('accessibility', 'ui', 'font_size', size);
    }
    
    enableReducedMotion(enabled = true) {
        document.documentElement.classList.toggle('reduce-motion', enabled);
        Storage.set('reducedMotion', enabled);
        
        // Analytics.trackEvent('accessibility', 'ui', 'reduced_motion', enabled ? 'enabled' : 'disabled');
    }
    
    // Theme Scheduling
    enableAutoSchedule(schedule) {
        // Automatically switch themes based on time
        const { lightStart, darkStart } = schedule;
        
        const now = new Date();
        const currentHour = now.getHours();
        
        const lightHour = parseInt(lightStart.split(':')[0]);
        const darkHour = parseInt(darkStart.split(':')[0]);
        
        let targetTheme;
        if (currentHour >= lightHour && currentHour < darkHour) {
            targetTheme = 'light';
        } else {
            targetTheme = 'dark';
        }
        
        if (this.getEffectiveTheme(this.currentTheme) !== targetTheme) {
            this.setTheme(targetTheme);
        }
        
        Storage.set('themeSchedule', schedule);
    }
    
    disableAutoSchedule() {
        Storage.remove('themeSchedule');
    }
    
    // Export/Import Theme Settings
    exportThemeSettings() {
        return {
            currentTheme: this.currentTheme,
            customThemes: Storage.get('customThemes', {}),
            accessibility: {
                highContrast: Storage.get('highContrast', false),
                fontSize: Storage.get('fontSize', 'medium'),
                reducedMotion: Storage.get('reducedMotion', false)
            },
            schedule: Storage.get('themeSchedule', null)
        };
    }
    
    importThemeSettings(settings) {
        if (settings.currentTheme) {
            this.setTheme(settings.currentTheme);
        }
        
        if (settings.customThemes) {
            Storage.set('customThemes', settings.customThemes);
        }
        
        if (settings.accessibility) {
            const { highContrast, fontSize, reducedMotion } = settings.accessibility;
            
            if (typeof highContrast === 'boolean') {
                this.enableHighContrast(highContrast);
            }
            
            if (fontSize) {
                this.setFontSize(fontSize);
            }
            
            if (typeof reducedMotion === 'boolean') {
                this.enableReducedMotion(reducedMotion);
            }
        }
        
        if (settings.schedule) {
            this.enableAutoSchedule(settings.schedule);
        }
    }
    
    // Initialize accessibility settings
    initializeAccessibility() {
        const highContrast = Storage.get('highContrast', false);
        const fontSize = Storage.get('fontSize', 'medium');
        const reducedMotion = Storage.get('reducedMotion', false);
        
        if (highContrast) {
            this.enableHighContrast(true);
        }
        
        if (fontSize !== 'medium') {
            this.setFontSize(fontSize);
        }
        
        if (reducedMotion) {
            this.enableReducedMotion(true);
        }
        
        // Check for system reduced motion preference
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.enableReducedMotion(true);
        }
    }
}

// Export for use in other modules
const Theme = new ThemeModule();
