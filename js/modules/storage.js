/**
 * Storage Module
 * Handles local storage, session storage, and IndexedDB operations with fallbacks
 */

class StorageModule {
    constructor() {
        this.storagePrefix = 'cryptoMonitor_';
        this.version = '1.0.0';
        this.dbName = 'CryptoMonitorDB';
        this.dbVersion = 1;
        this.db = null;
        this.isIndexedDBAvailable = false;
        this.cache = new Map();
        this.compressionEnabled = true;
    }
    
    init() {
        console.log('💾 Storage Module initialized');
        this.checkStorageAvailability();
        this.initializeIndexedDB();
        this.performMigrations();
        this.setupStorageEventListener();
        this.cleanupExpiredData();
    }
    
    checkStorageAvailability() {
        // Check localStorage
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            this.localStorageAvailable = true;
        } catch {
            this.localStorageAvailable = false;
            console.warn('localStorage not available, using memory cache');
        }
        
        // Check sessionStorage
        try {
            sessionStorage.setItem('test', 'test');
            sessionStorage.removeItem('test');
            this.sessionStorageAvailable = true;
        } catch {
            this.sessionStorageAvailable = false;
        }
        
        // Check IndexedDB
        this.isIndexedDBAvailable = 'indexedDB' in window;
    }
    
    async initializeIndexedDB() {
        if (!this.isIndexedDBAvailable) return;
        
        try {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('IndexedDB initialization failed');
                this.isIndexedDBAvailable = false;
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ IndexedDB initialized successfully');
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
                
                if (!db.objectStoreNames.contains('cache')) {
                    const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
                    cacheStore.createIndex('expires', 'expires', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('history')) {
                    const historyStore = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
                    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                    historyStore.createIndex('type', 'type', { unique: false });
                }
            };
            
        } catch (error) {
            console.error('IndexedDB setup failed:', error);
            this.isIndexedDBAvailable = false;
        }
    }
    
    // Core Storage Methods (localStorage/fallback)
    set(key, value, options = {}) {
        const prefixedKey = this.storagePrefix + key;
        const data = {
            value: value,
            timestamp: Date.now(),
            version: this.version,
            expires: options.expires || null,
            compressed: false
        };
        
        try {
            let serialized = JSON.stringify(data);
            
            // Compress large data if enabled
            if (this.compressionEnabled && serialized.length > 10000) {
                serialized = this.compress(serialized);
                data.compressed = true;
                serialized = JSON.stringify(data);
            }
            
            if (this.localStorageAvailable) {
                localStorage.setItem(prefixedKey, serialized);
            }
            
            // Cache in memory
            this.cache.set(key, { ...data, value: value });
            
            // Store in IndexedDB for large/important data
            if (options.persistent && this.isIndexedDBAvailable) {
                this.setIndexedDB(key, value, options);
            }
            
            return true;
            
        } catch (error) {
            console.error('Storage set failed:', error);
            
            // Try to clear space and retry
            if (error.name === 'QuotaExceededError') {
                this.clearExpiredData();
                try {
                    if (this.localStorageAvailable) {
                        localStorage.setItem(prefixedKey, JSON.stringify(data));
                    }
                    return true;
                } catch (retryError) {
                    console.error('Storage retry failed:', retryError);
                }
            }
            
            return false;
        }
    }
    
    get(key, defaultValue = null) {
        const prefixedKey = this.storagePrefix + key;
        
        try {
            // Check memory cache first
            const cached = this.cache.get(key);
            if (cached && !this.isExpired(cached)) {
                return cached.value;
            }
            
            // Check localStorage
            let data = null;
            if (this.localStorageAvailable) {
                const stored = localStorage.getItem(prefixedKey);
                if (stored) {
                    data = JSON.parse(stored);
                    
                    // Decompress if needed
                    if (data.compressed) {
                        const decompressed = this.decompress(data.value);
                        data = JSON.parse(decompressed);
                    }
                }
            }
            
            if (data && !this.isExpired(data)) {
                // Update cache
                this.cache.set(key, data);
                return data.value;
            }
            
            // Don't fallback to IndexedDB in synchronous get method to avoid Promise return
            // if (this.isIndexedDBAvailable) {
            //     return this.getIndexedDB(key, defaultValue);
            // }
            
            return defaultValue;
            
        } catch (error) {
            console.error('Storage get failed:', error);
            return defaultValue;
        }
    }
    
    remove(key) {
        const prefixedKey = this.storagePrefix + key;
        
        try {
            if (this.localStorageAvailable) {
                localStorage.removeItem(prefixedKey);
            }
            
            this.cache.delete(key);
            
            if (this.isIndexedDBAvailable) {
                this.removeIndexedDB(key);
            }
            
            return true;
        } catch (error) {
            console.error('Storage remove failed:', error);
            return false;
        }
    }
    
    has(key) {
        return this.get(key) !== null;
    }
    
    clear() {
        try {
            if (this.localStorageAvailable) {
                // Remove only prefixed keys
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(this.storagePrefix)) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));
            }
            
            this.cache.clear();
            
            if (this.isIndexedDBAvailable) {
                this.clearIndexedDB();
            }
            
            return true;
        } catch (error) {
            console.error('Storage clear failed:', error);
            return false;
        }
    }
    
    // IndexedDB Methods
    async setIndexedDB(key, value, options = {}) {
        if (!this.db) return false;
        
        try {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            
            const data = {
                key: key,
                value: value,
                timestamp: Date.now(),
                expires: options.expires || null
            };
            
            await new Promise((resolve, reject) => {
                const request = store.put(data);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            return true;
        } catch (error) {
            console.error('IndexedDB set failed:', error);
            return false;
        }
    }
    
    async getIndexedDB(key, defaultValue = null) {
        if (!this.db) return defaultValue;
        
        try {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            
            const data = await new Promise((resolve, reject) => {
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            if (data && !this.isExpired(data)) {
                return data.value;
            }
            
            return defaultValue;
        } catch (error) {
            console.error('IndexedDB get failed:', error);
            return defaultValue;
        }
    }
    
    async removeIndexedDB(key) {
        if (!this.db) return false;
        
        try {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            
            await new Promise((resolve, reject) => {
                const request = store.delete(key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            return true;
        } catch (error) {
            console.error('IndexedDB remove failed:', error);
            return false;
        }
    }
    
    async clearIndexedDB() {
        if (!this.db) return false;
        
        try {
            const transaction = this.db.transaction(['settings', 'cache', 'history'], 'readwrite');
            
            await Promise.all([
                new Promise(resolve => {
                    const request = transaction.objectStore('settings').clear();
                    request.onsuccess = () => resolve();
                }),
                new Promise(resolve => {
                    const request = transaction.objectStore('cache').clear();
                    request.onsuccess = () => resolve();
                }),
                new Promise(resolve => {
                    const request = transaction.objectStore('history').clear();
                    request.onsuccess = () => resolve();
                })
            ]);
            
            return true;
        } catch (error) {
            console.error('IndexedDB clear failed:', error);
            return false;
        }
    }
    
    // Cache Management
    async setCache(key, value, ttl = 3600000) { // Default 1 hour TTL
        const expires = Date.now() + ttl;
        return this.set(`cache_${key}`, value, { expires });
    }
    
    getCache(key) {
        return this.get(`cache_${key}`);
    }
    
    removeCache(key) {
        return this.remove(`cache_${key}`);
    }
    
    // Session Storage Methods
    setSession(key, value) {
        if (!this.sessionStorageAvailable) {
            return this.set(`session_${key}`, value);
        }
        
        try {
            const prefixedKey = this.storagePrefix + key;
            sessionStorage.setItem(prefixedKey, JSON.stringify({
                value: value,
                timestamp: Date.now()
            }));
            return true;
        } catch (error) {
            console.error('Session storage set failed:', error);
            return false;
        }
    }
    
    getSession(key, defaultValue = null) {
        if (!this.sessionStorageAvailable) {
            return this.get(`session_${key}`, defaultValue);
        }
        
        try {
            const prefixedKey = this.storagePrefix + key;
            const stored = sessionStorage.getItem(prefixedKey);
            if (stored) {
                const data = JSON.parse(stored);
                return data.value;
            }
            return defaultValue;
        } catch (error) {
            console.error('Session storage get failed:', error);
            return defaultValue;
        }
    }
    
    // Utility Methods
    isExpired(data) {
        if (!data.expires) return false;
        return Date.now() > data.expires;
    }
    
    getStorageInfo() {
        const info = {
            localStorage: {
                available: this.localStorageAvailable,
                usage: 0,
                quota: 0
            },
            sessionStorage: {
                available: this.sessionStorageAvailable,
                usage: 0
            },
            indexedDB: {
                available: this.isIndexedDBAvailable,
                connected: !!this.db
            },
            cache: {
                size: this.cache.size,
                keys: Array.from(this.cache.keys())
            }
        };
        
        // Calculate localStorage usage
        if (this.localStorageAvailable) {
            try {
                let total = 0;
                for (let key in localStorage) {
                    if (key.startsWith(this.storagePrefix)) {
                        total += localStorage[key].length;
                    }
                }
                info.localStorage.usage = total;
                
                // Estimate quota (usually 5-10MB)
                info.localStorage.quota = 10 * 1024 * 1024; // 10MB estimate
            } catch (error) {
                console.error('Failed to calculate storage usage:', error);
            }
        }
        
        return info;
    }
    
    // Data Compression (simple base64 encoding for now)
    compress(data) {
        try {
            return btoa(encodeURIComponent(data));
        } catch (error) {
            console.error('Compression failed:', error);
            return data;
        }
    }
    
    decompress(data) {
        try {
            return decodeURIComponent(atob(data));
        } catch (error) {
            console.error('Decompression failed:', error);
            return data;
        }
    }
    
    // Migration and Maintenance
    performMigrations() {
        const currentVersion = this.get('appVersion', '0.0.0');
        
        if (currentVersion !== this.version) {
            console.log(`🔄 Migrating from version ${currentVersion} to ${this.version}`);
            
            // Perform version-specific migrations
            this.migrateData(currentVersion, this.version);
            
            // Update version
            this.set('appVersion', this.version);
        }
    }
    
    migrateData(fromVersion, toVersion) {
        // Implement version-specific data migrations
        if (fromVersion === '0.0.0') {
            // Initial setup migrations
            this.set('migrationDate', new Date().toISOString());
        }
        
        // Add more migration logic as needed
    }
    
    cleanupExpiredData() {
        if (!this.localStorageAvailable) return;
        
        try {
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.storagePrefix)) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        if (this.isExpired(data)) {
                            keysToRemove.push(key);
                        }
                    } catch (error) {
                        // Remove corrupted data
                        keysToRemove.push(key);
                    }
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            if (keysToRemove.length > 0) {
                console.log(`🧹 Cleaned up ${keysToRemove.length} expired/corrupted entries`);
            }
            
        } catch (error) {
            console.error('Cleanup failed:', error);
        }
    }
    
    clearExpiredData() {
        this.cleanupExpiredData();
        
        // Also clean memory cache
        const expiredKeys = [];
        this.cache.forEach((data, key) => {
            if (this.isExpired(data)) {
                expiredKeys.push(key);
            }
        });
        
        expiredKeys.forEach(key => this.cache.delete(key));
    }
    
    // Event Handling
    setupStorageEventListener() {
        if (typeof window !== 'undefined') {
            window.addEventListener('storage', (event) => {
                if (event.key && event.key.startsWith(this.storagePrefix)) {
                    const key = event.key.replace(this.storagePrefix, '');
                    
                    // Update cache if key exists
                    if (this.cache.has(key)) {
                        if (event.newValue) {
                            try {
                                const data = JSON.parse(event.newValue);
                                this.cache.set(key, data);
                            } catch (error) {
                                this.cache.delete(key);
                            }
                        } else {
                            this.cache.delete(key);
                        }
                    }
                    
                    // Dispatch custom event
                    document.dispatchEvent(new CustomEvent('storageChange', {
                        detail: {
                            key: key,
                            oldValue: event.oldValue,
                            newValue: event.newValue
                        }
                    }));
                }
            });
        }
    }
    
    // Backup and Restore
    exportData() {
        const data = {};
        
        if (this.localStorageAvailable) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.storagePrefix)) {
                    const cleanKey = key.replace(this.storagePrefix, '');
                    try {
                        const stored = localStorage.getItem(key);
                        const parsed = JSON.parse(stored);
                        data[cleanKey] = parsed.value;
                    } catch (error) {
                        console.error(`Failed to export key ${cleanKey}:`, error);
                    }
                }
            }
        }
        
        return {
            data: data,
            version: this.version,
            exportDate: new Date().toISOString(),
            storageInfo: this.getStorageInfo()
        };
    }
    
    importData(backup) {
        if (!backup.data || typeof backup.data !== 'object') {
            throw new Error('Invalid backup data format');
        }
        
        try {
            Object.entries(backup.data).forEach(([key, value]) => {
                this.set(key, value);
            });
            
            console.log(`📥 Imported ${Object.keys(backup.data).length} storage entries`);
            return true;
        } catch (error) {
            console.error('Import failed:', error);
            throw error;
        }
    }
}

// Export for use in other modules
const Storage = new StorageModule();
