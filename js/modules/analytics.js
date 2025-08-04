/**
 * Analytics Module
 * Handles Google Analytics and custom event tracking with privacy controls
 */

class AnalyticsModule {
    constructor() {
        this.measurementId = null;
        this.isInitialized = false;
        this.isEnabled = true;
        this.queue = [];
        this.sessionId = this.generateSessionId();
        this.userId = this.getUserId();
        this.debugMode = false;
        this.customDimensions = new Map();
    }
    
    init(measurementId) {
        if (!measurementId) {
            console.warn('Analytics: No measurement ID provided');
            return;
        }
        
        // Temporarily disable analytics to prevent errors  
        this.isEnabled = false;
        this.measurementId = measurementId;
        this.loadSettings();
        
        console.log('📊 Analytics Module initialized (disabled)');
    }
    
    loadSettings() {
        this.isEnabled = Storage.get('analyticsEnabled', true);
        this.debugMode = Storage.get('analyticsDebugMode', false);
        
        // Load custom dimensions
        const savedDimensions = Storage.get('analyticsCustomDimensions', {});
        Object.entries(savedDimensions).forEach(([key, value]) => {
            this.customDimensions.set(key, value);
        });
    }
    
    saveSettings() {
        Storage.set('analyticsEnabled', this.isEnabled);
        Storage.set('analyticsDebugMode', this.debugMode);
        
        // Save custom dimensions
        const dimensionsObj = Object.fromEntries(this.customDimensions);
        Storage.set('analyticsCustomDimensions', dimensionsObj);
    }
    
    initializeGoogleAnalytics() {
        if (this.isInitialized) return;
        
        try {
            // Create gtag script
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
            document.head.appendChild(script);
            
            // Initialize gtag
            window.dataLayer = window.dataLayer || [];
            window.gtag = function() {
                window.dataLayer.push(arguments);
            };
            
            window.gtag('js', new Date());
            window.gtag('config', this.measurementId, {
                page_title: document.title,
                page_location: window.location.href,
                custom_map: this.getCustomDimensionsMap(),
                debug_mode: this.debugMode
            });
            
            this.isInitialized = true;
            
            // Process queued events
            this.processQueue();
            
            // Set up enhanced ecommerce
            this.setupEnhancedEcommerce();
            
            // Track initial page view
            this.trackPageView(window.location.pathname);
            
        } catch (error) {
            console.error('Failed to initialize Google Analytics:', error);
        }
    }
    
    setupEnhancedEcommerce() {
        // Configure enhanced ecommerce tracking
        if (window.gtag) {
            window.gtag('config', this.measurementId, {
                allow_enhanced_conversions: true,
                enhanced_conversions: true
            });
        }
    }
    
    // Core Tracking Methods
    trackEvent(action, category = 'general', label = '', value = null, customParameters = {}) {
        if (!this.isEnabled) {
            if (this.debugMode) {
                console.log('Analytics disabled - would track:', { action, category, label, value });
            }
            return;
        }
        
        // Completely disabled to prevent unhandled promise rejections
        return;
        
        const eventData = {
            event_category: category,
            event_label: label,
            value: value,
            session_id: this.sessionId,
            user_id: this.userId,
            timestamp: Date.now(),
            ...this.getCustomDimensionsData(),
            ...customParameters
        };
        
        // Remove null/undefined values
        Object.keys(eventData).forEach(key => {
            if (eventData[key] === null || eventData[key] === undefined) {
                delete eventData[key];
            }
        });
        
        if (this.isInitialized && window.gtag) {
            window.gtag('event', action, eventData);
            
            if (this.debugMode) {
                console.log('📊 Event tracked:', action, eventData);
            }
        } else {
            // Queue event for later
            this.queue.push({ type: 'event', action, data: eventData });
        }
        
        // Store event locally for analytics (temporarily disabled to prevent errors)
        // this.storeLocalEvent(action, category, label, value, eventData);
    }
    
    trackPageView(page, title = null, customParameters = {}) {
        if (!this.isEnabled) return;
        
        const pageData = {
            page_title: title || document.title,
            page_location: window.location.href,
            page_path: page,
            session_id: this.sessionId,
            user_id: this.userId,
            ...this.getCustomDimensionsData(),
            ...customParameters
        };
        
        if (this.isInitialized && window.gtag) {
            window.gtag('config', this.measurementId, pageData);
            
            if (this.debugMode) {
                console.log('📊 Page view tracked:', page, pageData);
            }
        } else {
            this.queue.push({ type: 'pageview', page, data: pageData });
        }
    }
    
    trackTiming(name, value, category = 'timing', label = '') {
        if (!this.isEnabled) return;
        
        this.trackEvent('timing_complete', category, label, value, {
            name: name,
            value: value
        });
    }
    
    trackException(description, fatal = false) {
        if (!this.isEnabled) return;
        
        const exceptionData = {
            description: description,
            fatal: fatal,
            session_id: this.sessionId,
            user_id: this.userId,
            timestamp: Date.now(),
            page: window.location.pathname,
            user_agent: navigator.userAgent
        };
        
        if (this.isInitialized && window.gtag) {
            window.gtag('event', 'exception', exceptionData);
        } else {
            this.queue.push({ type: 'exception', data: exceptionData });
        }
        
        // Also log locally for debugging
        console.error('Analytics Exception:', exceptionData);
    }
    
    // Crypto-specific Tracking
    trackCryptoEvent(action, coinId, data = {}) {
        this.trackEvent(action, 'crypto', coinId, null, {
            coin_id: coinId,
            currency: Storage.get('currency', 'usd'),
            ...data
        });
    }
    
    trackPortfolioEvent(action, data = {}) {
        const portfolioStats = window.Portfolio ? Portfolio.getPortfolioStats() : {};
        
        this.trackEvent(action, 'portfolio', '', null, {
            portfolio_value: portfolioStats.totalValue || 0,
            portfolio_coins: portfolioStats.totalCoins || 0,
            ...data
        });
    }
    
    trackAlertEvent(action, coinId, alertType) {
        this.trackEvent(action, 'alerts', `${coinId}_${alertType}`, null, {
            coin_id: coinId,
            alert_type: alertType
        });
    }
    
    trackThemeEvent(theme) {
        this.trackEvent('theme_change', 'ui', theme, null, {
            theme: theme,
            system_preference: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        });
    }
    
    trackPerformanceMetrics() {
        if (!this.isEnabled || !window.performance) return;
        
        const navigation = window.performance.getEntriesByType('navigation')[0];
        if (navigation) {
            this.trackTiming('page_load', Math.round(navigation.loadEventEnd - navigation.fetchStart), 'performance', 'total');
            this.trackTiming('dom_ready', Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart), 'performance', 'dom');
            this.trackTiming('first_paint', Math.round(navigation.responseStart - navigation.fetchStart), 'performance', 'first_paint');
        }
        
        // Track memory usage if available
        if (window.performance.memory) {
            this.trackEvent('memory_usage', 'performance', 'used', Math.round(window.performance.memory.usedJSHeapSize / 1048576)); // MB
        }
    }
    
    // Enhanced E-commerce for Crypto
    trackCryptoView(coinId, value = null) {
        if (!this.isEnabled) return;
        
        const itemData = {
            currency: Storage.get('currency', 'USD').toUpperCase(),
            value: value || 0,
            items: [{
                item_id: coinId,
                item_name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
                item_category: 'cryptocurrency',
                quantity: 1,
                price: value || 0
            }]
        };
        
        if (this.isInitialized && window.gtag) {
            window.gtag('event', 'view_item', itemData);
        }
    }
    
    trackPortfolioAdd(coinId, amount, value) {
        if (!this.isEnabled) return;
        
        const purchaseData = {
            currency: Storage.get('currency', 'USD').toUpperCase(),
            value: value,
            items: [{
                item_id: coinId,
                item_name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
                item_category: 'cryptocurrency',
                quantity: amount,
                price: value / amount
            }]
        };
        
        if (this.isInitialized && window.gtag) {
            window.gtag('event', 'add_to_cart', purchaseData);
        }
    }
    
    // User Identification
    setUserId(userId) {
        this.userId = userId;
        Storage.set('analyticsUserId', userId);
        
        if (this.isInitialized && window.gtag) {
            window.gtag('config', this.measurementId, {
                user_id: userId
            });
        }
    }
    
    setUserProperties(properties) {
        if (!this.isEnabled || !this.isInitialized || !window.gtag) return;
        
        window.gtag('config', this.measurementId, {
            custom_map: properties
        });
    }
    
    // Custom Dimensions
    setCustomDimension(index, value) {
        this.customDimensions.set(`custom_parameter_${index}`, value);
        this.saveSettings();
    }
    
    getCustomDimensionsMap() {
        const map = {};
        this.customDimensions.forEach((value, key) => {
            map[key] = value;
        });
        return map;
    }
    
    getCustomDimensionsData() {
        const data = {};
        this.customDimensions.forEach((value, key) => {
            data[key] = value;
        });
        return data;
    }
    
    // Privacy and Consent
    setAnalyticsEnabled(enabled) {
        this.isEnabled = enabled;
        this.saveSettings();
        
        if (enabled && !this.isInitialized) {
            this.initializeGoogleAnalytics();
        } else if (!enabled && this.isInitialized) {
            this.disableAnalytics();
        }
    }
    
    disableAnalytics() {
        if (window.gtag) {
            window.gtag('consent', 'update', {
                analytics_storage: 'denied'
            });
        }
        
        // Clear analytics cookies
        this.clearAnalyticsCookies();
    }
    
    enableAnalytics() {
        if (window.gtag) {
            window.gtag('consent', 'update', {
                analytics_storage: 'granted'
            });
        }
        
        this.setAnalyticsEnabled(true);
    }
    
    clearAnalyticsCookies() {
        const cookies = document.cookie.split(';');
        
        cookies.forEach(cookie => {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            
            if (name.startsWith('_ga') || name.startsWith('_gid')) {
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            }
        });
    }
    
    // Utility Methods
    generateSessionId() {
        return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    getUserId() {
        let userId = Storage.get('analyticsUserId', null);
        
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            Storage.set('analyticsUserId', userId);
        }
        
        return userId;
    }
    
    processQueue() {
        while (this.queue.length > 0) {
            const item = this.queue.shift();
            
            switch (item.type) {
                case 'event':
                    this.trackEvent(item.action, item.data.event_category, item.data.event_label, item.data.value, item.data);
                    break;
                case 'pageview':
                    this.trackPageView(item.page, item.data.page_title, item.data);
                    break;
                case 'exception':
                    if (window.gtag) {
                        window.gtag('event', 'exception', item.data);
                    }
                    break;
            }
        }
    }
    
    storeLocalEvent(action, category, label, value, data) {
        // Completely disabled to prevent unhandled promise rejections
        return;
    }
    
    // Debug and Development
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.saveSettings();
        
        if (this.isInitialized && window.gtag) {
            window.gtag('config', this.measurementId, {
                debug_mode: enabled
            });
        }
    }
    
    getAnalyticsInfo() {
        return {
            measurementId: this.measurementId,
            isInitialized: this.isInitialized,
            isEnabled: this.isEnabled,
            sessionId: this.sessionId,
            userId: this.userId,
            debugMode: this.debugMode,
            queueSize: this.queue.length,
            customDimensions: Object.fromEntries(this.customDimensions)
        };
    }
    
    getLocalEvents(limit = 50) {
        const events = Storage.get('analyticsLocalEvents', []);
        return events.slice(-limit).reverse();
    }
    
    clearLocalEvents() {
        Storage.remove('analyticsLocalEvents');
    }
    
    // Export Analytics Data
    exportAnalyticsData() {
        return {
            settings: {
                enabled: this.isEnabled,
                debugMode: this.debugMode,
                customDimensions: Object.fromEntries(this.customDimensions)
            },
            session: {
                sessionId: this.sessionId,
                userId: this.userId
            },
            localEvents: this.getLocalEvents(100)
        };
    }
    
    importAnalyticsData(data) {
        if (data.settings) {
            this.isEnabled = data.settings.enabled !== false;
            this.debugMode = data.settings.debugMode || false;
            
            if (data.settings.customDimensions) {
                this.customDimensions.clear();
                Object.entries(data.settings.customDimensions).forEach(([key, value]) => {
                    this.customDimensions.set(key, value);
                });
            }
        }
        
        if (data.session && data.session.userId) {
            this.setUserId(data.session.userId);
        }
        
        this.saveSettings();
    }
}

// Export for use in other modules
const Analytics = new AnalyticsModule();
