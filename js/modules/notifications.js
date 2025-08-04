/**
 * Notifications Module
 * Manages in-app notifications, browser notifications, and notification queue
 */

class NotificationsModule {
    constructor() {
        this.notifications = [];
        this.maxNotifications = 5;
        this.defaultDuration = 5000;
        this.container = null;
        this.isEnabled = true;
        this.soundEnabled = true;
        this.position = 'top-right';
        this.notificationQueue = [];
        this.isProcessingQueue = false;
    }
    
    init() {
        console.log('🔔 Notifications Module initialized');
        this.createContainer();
        this.loadSettings();
        this.requestBrowserPermission();
        this.setupServiceWorkerMessaging();
    }
    
    createContainer() {
        // Use existing container or create new one
        this.container = document.getElementById('toast-container');
        
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'fixed top-20 right-4 z-50 space-y-2';
            document.body.appendChild(this.container);
        }
    }
    
    loadSettings() {
        this.isEnabled = Storage.get('notificationsEnabled', true);
        this.soundEnabled = Storage.get('notificationSoundEnabled', true);
        this.position = Storage.get('notificationPosition', 'top-right');
        
        this.updateContainerPosition();
    }
    
    updateContainerPosition() {
        if (!this.container) return;
        
        // Remove existing position classes
        this.container.className = this.container.className
            .replace(/(?:top|bottom)-\d+|(?:left|right)-\d+/g, '');
        
        const positions = {
            'top-right': 'fixed top-20 right-4 z-50 space-y-2',
            'top-left': 'fixed top-20 left-4 z-50 space-y-2',
            'bottom-right': 'fixed bottom-4 right-4 z-50 space-y-2',
            'bottom-left': 'fixed bottom-4 left-4 z-50 space-y-2',
            'top-center': 'fixed top-20 left-1/2 transform -translate-x-1/2 z-50 space-y-2',
            'bottom-center': 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2'
        };
        
        this.container.className = positions[this.position] || positions['top-right'];
    }
    
    async requestBrowserPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                console.log('Notification permission:', permission);
                return permission === 'granted';
            } catch (error) {
                console.error('Failed to request notification permission:', error);
                return false;
            }
        }
        
        return Notification.permission === 'granted';
    }
    
    setupServiceWorkerMessaging() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
                    this.handleNotificationClick(event.data.payload);
                }
            });
        }
    }
    
    // Core Notification Methods
    show(message, type = 'info', duration = null, options = {}) {
        if (!this.isEnabled) return null;
        
        const notification = {
            id: Date.now() + Math.random(),
            message: message,
            type: type,
            duration: duration || this.defaultDuration,
            timestamp: new Date(),
            persistent: options.persistent || false,
            action: options.action || null,
            icon: options.icon || null,
            ...options
        };
        
        // Add to queue if too many notifications
        if (this.notifications.length >= this.maxNotifications) {
            this.notificationQueue.push(notification);
            this.processQueue();
            return notification.id;
        }
        
        return this.displayNotification(notification);
    }
    
    displayNotification(notification) {
        const element = this.createNotificationElement(notification);
        this.container.appendChild(element);
        
        // Add to active notifications
        this.notifications.push(notification);
        
        // Animate in
        setTimeout(() => {
            element.classList.add('show');
        }, 10);
        
        // Auto dismiss (unless persistent)
        if (!notification.persistent && notification.duration > 0) {
            setTimeout(() => {
                this.dismiss(notification.id);
            }, notification.duration);
        }
        
        // Play sound if enabled
        if (this.soundEnabled) {
            this.playNotificationSound(notification.type);
        }
        
        // Track notification
        Analytics.trackEvent('notification_shown', 'ui', 'notification', notification.type);
        
        return notification.id;
    }
    
    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `toast glassmorphism p-4 rounded-xl shadow-lg transform translate-x-full transition-transform duration-300 ${this.getTypeClass(notification.type)}`;
        element.dataset.notificationId = notification.id;
        
        const iconHtml = notification.icon ? 
            `<i data-feather="${notification.icon}" class="w-5 h-5 mr-3 flex-shrink-0"></i>` : 
            this.getTypeIcon(notification.type);
        
        const actionHtml = notification.action ? 
            `<button class="ml-3 px-3 py-1 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition-colors" onclick="notifications.handleAction('${notification.id}', '${notification.action.type}')">
                ${notification.action.label}
            </button>` : '';
        
        element.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex items-center flex-1">
                    ${iconHtml}
                    <div class="flex-1">
                        <p class="text-sm font-medium text-white">${this.escapeHtml(notification.message)}</p>
                        ${notification.subtitle ? `<p class="text-xs text-gray-300 mt-1">${this.escapeHtml(notification.subtitle)}</p>` : ''}
                    </div>
                    ${actionHtml}
                </div>
                <button class="ml-3 p-1 hover:bg-white/20 rounded transition-colors" onclick="notifications.dismiss('${notification.id}')">
                    <i data-feather="x" class="w-4 h-4"></i>
                </button>
            </div>
            ${notification.progress !== undefined ? `
                <div class="mt-3">
                    <div class="w-full bg-white/20 rounded-full h-1">
                        <div class="bg-white h-1 rounded-full transition-all duration-300" style="width: ${notification.progress}%"></div>
                    </div>
                </div>
            ` : ''}
        `;
        
        // Initialize feather icons
        if (window.feather) {
            feather.replace();
        }
        
        return element;
    }
    
    getTypeClass(type) {
        const classes = {
            success: 'bg-green-500/90 border-green-400/50',
            error: 'bg-red-500/90 border-red-400/50',
            warning: 'bg-yellow-500/90 border-yellow-400/50',
            info: 'bg-blue-500/90 border-blue-400/50',
            loading: 'bg-purple-500/90 border-purple-400/50'
        };
        
        return classes[type] || classes.info;
    }
    
    getTypeIcon(type) {
        const icons = {
            success: '<i data-feather="check-circle" class="w-5 h-5 mr-3 flex-shrink-0 text-green-200"></i>',
            error: '<i data-feather="alert-circle" class="w-5 h-5 mr-3 flex-shrink-0 text-red-200"></i>',
            warning: '<i data-feather="alert-triangle" class="w-5 h-5 mr-3 flex-shrink-0 text-yellow-200"></i>',
            info: '<i data-feather="info" class="w-5 h-5 mr-3 flex-shrink-0 text-blue-200"></i>',
            loading: '<i data-feather="loader" class="w-5 h-5 mr-3 flex-shrink-0 text-purple-200 animate-spin"></i>'
        };
        
        return icons[type] || icons.info;
    }
    
    dismiss(notificationId) {
        const notification = this.notifications.find(n => n.id == notificationId);
        if (!notification) return;
        
        const element = this.container.querySelector(`[data-notification-id="${notificationId}"]`);
        if (element) {
            element.classList.remove('show');
            element.classList.add('translate-x-full');
            
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }, 300);
        }
        
        // Remove from active notifications
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        
        // Process queue
        this.processQueue();
    }
    
    dismissAll() {
        const currentNotifications = [...this.notifications];
        currentNotifications.forEach(notification => {
            this.dismiss(notification.id);
        });
    }
    
    // Queue Management
    processQueue() {
        if (this.isProcessingQueue || this.notificationQueue.length === 0) return;
        
        this.isProcessingQueue = true;
        
        setTimeout(() => {
            if (this.notifications.length < this.maxNotifications && this.notificationQueue.length > 0) {
                const nextNotification = this.notificationQueue.shift();
                this.displayNotification(nextNotification);
            }
            
            this.isProcessingQueue = false;
            
            // Continue processing if queue has items
            if (this.notificationQueue.length > 0) {
                this.processQueue();
            }
        }, 100);
    }
    
    // Specialized Notification Types
    success(message, options = {}) {
        return this.show(message, 'success', 4000, {
            icon: 'check-circle',
            ...options
        });
    }
    
    error(message, options = {}) {
        return this.show(message, 'error', 8000, {
            icon: 'alert-circle',
            persistent: options.persistent !== false,
            ...options
        });
    }
    
    warning(message, options = {}) {
        return this.show(message, 'warning', 6000, {
            icon: 'alert-triangle',
            ...options
        });
    }
    
    info(message, options = {}) {
        return this.show(message, 'info', 5000, {
            icon: 'info',
            ...options
        });
    }
    
    loading(message, options = {}) {
        return this.show(message, 'loading', 0, {
            icon: 'loader',
            persistent: true,
            ...options
        });
    }
    
    // Progress Notifications
    showProgress(message, progress = 0, options = {}) {
        return this.show(message, 'loading', 0, {
            persistent: true,
            progress: Math.max(0, Math.min(100, progress)),
            ...options
        });
    }
    
    updateProgress(notificationId, progress, message = null) {
        const notification = this.notifications.find(n => n.id == notificationId);
        if (!notification) return;
        
        const element = this.container.querySelector(`[data-notification-id="${notificationId}"]`);
        if (!element) return;
        
        // Update progress bar
        const progressBar = element.querySelector('.bg-white');
        if (progressBar) {
            progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
        }
        
        // Update message if provided
        if (message) {
            const messageElement = element.querySelector('.text-sm.font-medium');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
        
        notification.progress = progress;
        
        // Auto-dismiss when complete
        if (progress >= 100) {
            setTimeout(() => {
                this.dismiss(notificationId);
            }, 1000);
        }
    }
    
    // Browser Notifications
    async showBrowserNotification(title, options = {}) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return null;
        }
        
        try {
            const notification = new Notification(title, {
                body: options.body || '',
                icon: options.icon || '/favicon.ico',
                badge: '/favicon.ico',
                tag: options.tag || 'crypto-monitor',
                renotify: options.renotify || false,
                requireInteraction: options.requireInteraction || false,
                silent: options.silent || false,
                data: options.data || {},
                ...options
            });
            
            // Handle clicks
            notification.onclick = (event) => {
                event.preventDefault();
                window.focus();
                
                if (options.onClick) {
                    options.onClick(event);
                }
                
                notification.close();
            };
            
            // Auto close
            if (options.duration) {
                setTimeout(() => {
                    notification.close();
                }, options.duration);
            }
            
            return notification;
            
        } catch (error) {
            console.error('Browser notification failed:', error);
            return null;
        }
    }
    
    // Action Handling
    handleAction(notificationId, actionType) {
        const notification = this.notifications.find(n => n.id == notificationId);
        if (!notification || !notification.action) return;
        
        try {
            if (typeof notification.action.handler === 'function') {
                notification.action.handler(notification);
            } else {
                // Default actions
                switch (actionType) {
                    case 'retry':
                        window.location.reload();
                        break;
                    case 'dismiss':
                        this.dismiss(notificationId);
                        break;
                    case 'view':
                        if (notification.action.url) {
                            window.open(notification.action.url, '_blank');
                        }
                        break;
                }
            }
            
            Analytics.trackEvent('notification_action', 'ui', 'notification_click', actionType);
            
        } catch (error) {
            console.error('Notification action failed:', error);
        }
    }
    
    handleNotificationClick(payload) {
        // Handle clicks from service worker notifications
        if (payload.action && payload.action.handler) {
            payload.action.handler(payload);
        }
    }
    
    // Settings
    setEnabled(enabled) {
        this.isEnabled = enabled;
        Storage.set('notificationsEnabled', enabled);
        
        if (!enabled) {
            this.dismissAll();
        }
    }
    
    isEnabled() {
        return this.isEnabled;
    }
    
    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
        Storage.set('notificationSoundEnabled', enabled);
    }
    
    setPosition(position) {
        this.position = position;
        Storage.set('notificationPosition', position);
        this.updateContainerPosition();
    }
    
    setMaxNotifications(max) {
        this.maxNotifications = Math.max(1, Math.min(10, max));
        
        // Dismiss excess notifications
        while (this.notifications.length > this.maxNotifications) {
            this.dismiss(this.notifications[0].id);
        }
    }
    
    // Sound Effects
    playNotificationSound(type) {
        if (!this.soundEnabled) return;
        
        try {
            // Use Web Audio API for better sound control
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Different frequencies for different types
            const frequencies = {
                success: 800,
                error: 400,
                warning: 600,
                info: 500,
                loading: 700
            };
            
            oscillator.frequency.value = frequencies[type] || 500;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            
        } catch (error) {
            console.warn('Could not play notification sound:', error);
        }
    }
    
    // Utility Methods
    escapeHtml(unsafe) {
        const div = document.createElement('div');
        div.textContent = unsafe;
        return div.innerHTML;
    }
    
    getHistory() {
        return [...this.notifications].reverse();
    }
    
    clearHistory() {
        this.notifications = [];
    }
    
    // Bulk Operations
    showAll(notifications) {
        notifications.forEach(notification => {
            this.show(
                notification.message,
                notification.type || 'info',
                notification.duration,
                notification.options || {}
            );
        });
    }
    
    // Export/Import
    exportSettings() {
        return {
            enabled: this.isEnabled,
            soundEnabled: this.soundEnabled,
            position: this.position,
            maxNotifications: this.maxNotifications
        };
    }
    
    importSettings(settings) {
        if (settings.enabled !== undefined) {
            this.setEnabled(settings.enabled);
        }
        
        if (settings.soundEnabled !== undefined) {
            this.setSoundEnabled(settings.soundEnabled);
        }
        
        if (settings.position) {
            this.setPosition(settings.position);
        }
        
        if (settings.maxNotifications) {
            this.setMaxNotifications(settings.maxNotifications);
        }
    }
    
    // Cleanup
    destroy() {
        this.dismissAll();
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        this.notifications = [];
        this.notificationQueue = [];
    }
}

// Export for use in other modules
const Notifications = new NotificationsModule();

// Make available globally for inline handlers
window.notifications = Notifications;
