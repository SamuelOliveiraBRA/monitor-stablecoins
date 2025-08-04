/**
 * Alerts Module
 * Manages price alerts and notifications for cryptocurrencies
 */

class AlertsModule {
    constructor() {
        this.alerts = new Map();
        this.checkInterval = null;
        this.lastPrices = new Map();
        this.soundEnabled = true;
        this.audioContext = null;
        this.alertSound = null;
    }
    
    init() {
        console.log('🔔 Alerts Module initialized');
        this.loadAlerts();
        this.setupAudioContext();
        this.startPriceMonitoring();
        this.requestNotificationPermission();
    }
    
    setupAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createAlertSound();
        } catch (error) {
            console.warn('Audio context not supported:', error);
        }
    }
    
    createAlertSound() {
        if (!this.audioContext) return;
        
        // Create a simple beep sound
        this.alertSound = (frequency = 800, duration = 200) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration / 1000);
        };
    }
    
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    console.log('Notification permission granted');
                } else {
                    console.log('Notification permission denied');
                }
            } catch (error) {
                console.error('Error requesting notification permission:', error);
            }
        }
    }
    
    // Alert Management
    loadAlerts() {
        try {
            const saved = Storage.get('alerts', {});
            this.alerts.clear();
            
            Object.entries(saved).forEach(([alertId, data]) => {
                this.alerts.set(alertId, {
                    id: alertId,
                    coinId: data.coinId,
                    type: data.type, // 'above', 'below', 'change'
                    value: data.value,
                    isActive: data.isActive !== false,
                    createdAt: data.createdAt || new Date().toISOString(),
                    triggeredAt: data.triggeredAt || null,
                    lastTriggered: data.lastTriggered || null,
                    conditions: data.conditions || {},
                    ...data
                });
            });
            
            console.log(`🔔 Loaded ${this.alerts.size} alerts`);
            
        } catch (error) {
            console.error('Failed to load alerts:', error);
        }
    }
    
    saveAlerts() {
        try {
            const alertsObj = {};
            this.alerts.forEach((data, alertId) => {
                alertsObj[alertId] = data;
            });
            
            Storage.set('alerts', alertsObj);
            
        } catch (error) {
            console.error('Failed to save alerts:', error);
        }
    }
    
    async createAlert(coinId, type, value, conditions = {}) {
        if (!coinId || !type || !value) {
            throw new Error('Invalid alert parameters');
        }
        
        // Validate alert type
        const validTypes = ['above', 'below', 'change', 'volume'];
        if (!validTypes.includes(type)) {
            throw new Error('Invalid alert type');
        }
        
        // Validate value
        if (typeof value !== 'number' || value <= 0) {
            throw new Error('Alert value must be a positive number');
        }
        
        // Generate unique ID
        const alertId = `${coinId}_${type}_${Date.now()}`;
        
        // Get current price for reference
        try {
            const currentPrice = await API.getCurrentPrice(coinId);
            
            const alert = {
                id: alertId,
                coinId: coinId,
                type: type,
                value: value,
                currentPrice: currentPrice?.usd || 0,
                isActive: true,
                createdAt: new Date().toISOString(),
                triggeredAt: null,
                lastTriggered: null,
                conditions: {
                    repeat: conditions.repeat || false,
                    cooldown: conditions.cooldown || 300000, // 5 minutes default
                    ...conditions
                }
            };
            
            this.alerts.set(alertId, alert);
            this.saveAlerts();
            
            // Analytics.trackEvent('alert_created', 'alerts', 'create_alert', `${coinId}_${type}`);
            
            return alertId;
            
        } catch (error) {
            console.error('Failed to create alert:', error);
            throw error;
        }
    }
    
    removeAlert(alertId) {
        if (!this.alerts.has(alertId)) {
            return false;
        }
        
        this.alerts.delete(alertId);
        this.saveAlerts();
        
        // Analytics.trackEvent('alert_removed', 'alerts', 'remove_alert', alertId);
        
        return true;
    }
    
    toggleAlert(alertId, isActive = null) {
        const alert = this.alerts.get(alertId);
        if (!alert) {
            return false;
        }
        
        alert.isActive = isActive !== null ? isActive : !alert.isActive;
        this.alerts.set(alertId, alert);
        this.saveAlerts();
        
        return true;
    }
    
    // Price Monitoring
    startPriceMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        // Check every 30 seconds
        this.checkInterval = setInterval(() => {
            this.checkAlerts();
        }, 30000);
        
        // Initial check
        this.checkAlerts();
    }
    
    stopPriceMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
    
    async checkAlerts() {
        const activeAlerts = Array.from(this.alerts.values()).filter(alert => alert.isActive);
        
        if (activeAlerts.length === 0) {
            return;
        }
        
        try {
            // Group alerts by coin to minimize API calls
            const coinIds = [...new Set(activeAlerts.map(alert => alert.coinId))];
            const pricesData = await API.getMultiplePrices(coinIds);
            
            for (const alert of activeAlerts) {
                const priceData = pricesData[alert.coinId];
                if (!priceData) continue;
                
                const currentPrice = priceData.usd;
                const previousPrice = this.lastPrices.get(alert.coinId) || currentPrice;
                
                if (this.shouldTriggerAlert(alert, currentPrice, previousPrice, priceData)) {
                    await this.triggerAlert(alert, currentPrice, priceData);
                }
                
                this.lastPrices.set(alert.coinId, currentPrice);
            }
            
        } catch (error) {
            console.error('Failed to check alerts:', error);
        }
    }
    
    shouldTriggerAlert(alert, currentPrice, previousPrice, priceData) {
        const now = Date.now();
        const lastTriggered = alert.lastTriggered ? new Date(alert.lastTriggered).getTime() : 0;
        const cooldownPeriod = alert.conditions.cooldown || 300000; // 5 minutes
        
        // Check cooldown
        if (now - lastTriggered < cooldownPeriod) {
            return false;
        }
        
        switch (alert.type) {
            case 'above':
                return currentPrice >= alert.value && previousPrice < alert.value;
                
            case 'below':
                return currentPrice <= alert.value && previousPrice > alert.value;
                
            case 'change':
                const change24h = Math.abs(priceData.usd_24h_change || 0);
                return change24h >= alert.value;
                
            case 'volume':
                const volume = priceData.usd_24h_vol || 0;
                return volume >= alert.value;
                
            default:
                return false;
        }
    }
    
    async triggerAlert(alert, currentPrice, priceData) {
        try {
            // Update alert
            alert.lastTriggered = new Date().toISOString();
            if (!alert.conditions.repeat) {
                alert.isActive = false;
            }
            
            this.alerts.set(alert.id, alert);
            this.saveAlerts();
            
            // Create notification message
            const message = this.createAlertMessage(alert, currentPrice, priceData);
            
            // Show notifications
            await this.showAlertNotification(alert, message);
            
            // Play sound
            if (this.soundEnabled && this.alertSound) {
                this.alertSound();
            }
            
            // Track event
            // Analytics.trackEvent('alert_triggered', 'alerts', 'trigger', `${alert.coinId}_${alert.type}`);
            
            // Update notifications badge
            this.updateNotificationsBadge();
            
        } catch (error) {
            console.error('Failed to trigger alert:', error);
        }
    }
    
    createAlertMessage(alert, currentPrice, priceData) {
        const currency = Storage.get('currency', 'usd');
        const coinName = alert.coinId.charAt(0).toUpperCase() + alert.coinId.slice(1);
        const formattedPrice = Formatters.formatCurrency(currentPrice, currency);
        
        switch (alert.type) {
            case 'above':
                return `${coinName} subiu para ${formattedPrice} (acima de ${Formatters.formatCurrency(alert.value, currency)})`;
                
            case 'below':
                return `${coinName} caiu para ${formattedPrice} (abaixo de ${Formatters.formatCurrency(alert.value, currency)})`;
                
            case 'change':
                const change = priceData.usd_24h_change || 0;
                return `${coinName} teve variação de ${change >= 0 ? '+' : ''}${change.toFixed(2)}% (${formattedPrice})`;
                
            case 'volume':
                return `${coinName} atingiu volume de ${Formatters.formatCurrency(priceData.usd_24h_vol, currency, true)}`;
                
            default:
                return `Alerta para ${coinName}: ${formattedPrice}`;
        }
    }
    
    async showAlertNotification(alert, message) {
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('Cripto Monitor Pro - Alerta de Preço', {
                body: message,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: alert.id,
                renotify: true,
                requireInteraction: false,
                silent: false
            });
            
            notification.onclick = () => {
                window.focus();
                // Open coin details
                if (window.app && window.app.openCoinDetail) {
                    window.app.openCoinDetail(alert.coinId);
                }
                notification.close();
            };
            
            // Auto close after 10 seconds
            setTimeout(() => notification.close(), 10000);
        }
        
        // In-app notification
        if (window.Notifications) {
            Notifications.show(message, 'info', 8000);
        }
    }
    
    updateNotificationsBadge() {
        const badge = document.getElementById('notifications-badge');
        if (!badge) return;
        
        const unreadCount = this.getUnreadAlertsCount();
        
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
    
    // Alert Queries
    getActiveAlerts() {
        return Array.from(this.alerts.values()).filter(alert => alert.isActive);
    }
    
    getAlertsByCoin(coinId) {
        return Array.from(this.alerts.values()).filter(alert => alert.coinId === coinId);
    }
    
    getRecentAlerts(limit = 10) {
        return Array.from(this.alerts.values())
            .filter(alert => alert.lastTriggered)
            .sort((a, b) => new Date(b.lastTriggered) - new Date(a.lastTriggered))
            .slice(0, limit);
    }
    
    getUnreadAlertsCount() {
        return Array.from(this.alerts.values())
            .filter(alert => alert.lastTriggered && !alert.isRead).length;
    }
    
    markAlertAsRead(alertId) {
        const alert = this.alerts.get(alertId);
        if (alert) {
            alert.isRead = true;
            this.alerts.set(alertId, alert);
            this.saveAlerts();
            this.updateNotificationsBadge();
        }
    }
    
    markAllAlertsAsRead() {
        this.alerts.forEach((alert, alertId) => {
            if (alert.lastTriggered) {
                alert.isRead = true;
                this.alerts.set(alertId, alert);
            }
        });
        this.saveAlerts();
        this.updateNotificationsBadge();
    }
    
    // Settings
    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
        Storage.set('alertSoundEnabled', enabled);
    }
    
    isSoundEnabled() {
        return Storage.get('alertSoundEnabled', true);
    }
    
    // Advanced Alert Types
    createSmartAlert(coinId, conditions) {
        // Smart alerts based on technical indicators
        const alertId = `smart_${coinId}_${Date.now()}`;
        
        const alert = {
            id: alertId,
            coinId: coinId,
            type: 'smart',
            isActive: true,
            createdAt: new Date().toISOString(),
            conditions: {
                rsi: conditions.rsi || null, // RSI threshold
                macd: conditions.macd || null, // MACD signal
                volume: conditions.volume || null, // Volume spike
                support: conditions.support || null, // Support level
                resistance: conditions.resistance || null, // Resistance level
                ...conditions
            }
        };
        
        this.alerts.set(alertId, alert);
        this.saveAlerts();
        
        return alertId;
    }
    
    // Import/Export
    exportData() {
        return {
            alerts: Object.fromEntries(this.alerts),
            settings: {
                soundEnabled: this.soundEnabled
            },
            exportDate: new Date().toISOString()
        };
    }
    
    async importData(data) {
        try {
            if (!data.alerts) {
                throw new Error('Invalid alerts data');
            }
            
            this.alerts.clear();
            
            Object.entries(data.alerts).forEach(([alertId, alertData]) => {
                this.alerts.set(alertId, {
                    id: alertId,
                    coinId: alertData.coinId,
                    type: alertData.type,
                    value: alertData.value,
                    isActive: alertData.isActive !== false,
                    createdAt: alertData.createdAt || new Date().toISOString(),
                    conditions: alertData.conditions || {}
                });
            });
            
            if (data.settings) {
                this.soundEnabled = data.settings.soundEnabled !== false;
            }
            
            this.saveAlerts();
            this.updateNotificationsBadge();
            
            return true;
            
        } catch (error) {
            console.error('Failed to import alerts data:', error);
            throw error;
        }
    }
    
    // Cleanup
    clearExpiredAlerts() {
        const now = Date.now();
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        
        let removedCount = 0;
        
        this.alerts.forEach((alert, alertId) => {
            const createdAt = new Date(alert.createdAt).getTime();
            if (now - createdAt > maxAge && !alert.isActive) {
                this.alerts.delete(alertId);
                removedCount++;
            }
        });
        
        if (removedCount > 0) {
            this.saveAlerts();
            console.log(`🧹 Cleaned up ${removedCount} expired alerts`);
        }
    }
    
    destroy() {
        this.stopPriceMonitoring();
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// Export for use in other modules
const Alerts = new AlertsModule();
