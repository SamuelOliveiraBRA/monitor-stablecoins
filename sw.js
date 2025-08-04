/**
 * Service Worker for Crypto Monitor Pro PWA
 * Handles caching, offline functionality, and background notifications
 */

const CACHE_NAME = 'crypto-monitor-pro-v1.0.1';
const STATIC_CACHE_NAME = 'crypto-monitor-static-v1.0.1';
const DYNAMIC_CACHE_NAME = 'crypto-monitor-dynamic-v1.0.1';
const API_CACHE_NAME = 'crypto-monitor-api-v1.0.1';

// Files to cache immediately on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/js/modules/api.js',
    '/js/modules/portfolio.js',
    '/js/modules/alerts.js',
    '/js/modules/charts.js',
    '/js/modules/theme.js',
    '/js/modules/storage.js',
    '/js/modules/notifications.js',
    '/js/modules/analytics.js',
    '/js/utils/formatters.js',
    '/js/utils/validators.js',
    '/manifest.json',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/feather-icons',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap'
];

// API endpoints to cache
const API_ENDPOINTS = [
    'https://api.coingecko.com/api/v3/global',
    'https://api.coingecko.com/api/v3/coins/markets',
    'https://api.coingecko.com/api/v3/coins/list',
    'https://api.coingecko.com/api/v3/search/trending',
    'https://api.coingecko.com/api/v3/simple/price'
];

// Cache duration settings (in milliseconds)
const CACHE_DURATIONS = {
    static: 24 * 60 * 60 * 1000, // 24 hours
    api: 5 * 60 * 1000, // 5 minutes
    dynamic: 60 * 60 * 1000, // 1 hour
    images: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE_NAME),
            caches.open(DYNAMIC_CACHE_NAME),
            caches.open(API_CACHE_NAME)
        ]).then(([staticCache, dynamicCache, apiCache]) => {
            return staticCache.addAll(STATIC_ASSETS.map(url => {
                return new Request(url, { cache: 'reload' });
            }));
        }).then(() => {
            console.log('✅ Static assets cached successfully');
            return self.skipWaiting();
        }).catch((error) => {
            console.error('❌ Failed to cache static assets:', error);
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== STATIC_CACHE_NAME && 
                        cacheName !== DYNAMIC_CACHE_NAME && 
                        cacheName !== API_CACHE_NAME) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-http requests
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // Handle different types of requests
    if (isAPIRequest(url)) {
        event.respondWith(handleAPIRequest(request));
    } else if (isStaticAsset(url)) {
        event.respondWith(handleStaticAsset(request));
    } else if (isImageRequest(url)) {
        event.respondWith(handleImageRequest(request));
    } else {
        event.respondWith(handleDynamicRequest(request));
    }
});

// API request handler - Cache first with network fallback
async function handleAPIRequest(request) {
    const cache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // Check if cached response is still valid
    if (cachedResponse && !isCacheExpired(cachedResponse, CACHE_DURATIONS.api)) {
        console.log('📦 Serving API from cache:', request.url);
        
        // Update cache in background
        updateAPICache(request, cache);
        
        return cachedResponse;
    }
    
    try {
        console.log('🌐 Fetching API from network:', request.url);
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Clone response for caching
            const responseToCache = networkResponse.clone();
            
            // Add cache timestamp
            const headers = new Headers(responseToCache.headers);
            headers.set('sw-cache-timestamp', Date.now().toString());
            
            const cachedResponse = new Response(responseToCache.body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers
            });
            
            cache.put(request, cachedResponse);
        }
        
        return networkResponse;
    } catch (error) {
        console.log('📦 Network failed, serving stale cache:', request.url);
        
        // Return stale cache if available
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline fallback for API requests
        return new Response(JSON.stringify({
            error: 'Offline',
            message: 'Network unavailable. Please check your connection.',
            cached: false
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Static asset handler - Cache first
async function handleStaticAsset(request) {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        console.log('📦 Serving static asset from cache:', request.url);
        return cachedResponse;
    }
    
    try {
        console.log('🌐 Fetching static asset from network:', request.url);
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('❌ Failed to fetch static asset:', request.url);
        
        // Return offline page for HTML requests
        if (request.destination === 'document') {
            return cache.match('/index.html');
        }
        
        return new Response('Asset not available offline', { status: 503 });
    }
}

// Image request handler - Cache first with long expiration
async function handleImageRequest(request) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isCacheExpired(cachedResponse, CACHE_DURATIONS.images)) {
        console.log('📦 Serving image from cache:', request.url);
        return cachedResponse;
    }
    
    try {
        console.log('🌐 Fetching image from network:', request.url);
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const headers = new Headers(networkResponse.headers);
            headers.set('sw-cache-timestamp', Date.now().toString());
            
            const cachedResponse = new Response(networkResponse.body, {
                status: networkResponse.status,
                statusText: networkResponse.statusText,
                headers: headers
            });
            
            cache.put(request, cachedResponse);
        }
        
        return networkResponse;
    } catch (error) {
        console.log('📦 Network failed, serving cached image:', request.url);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return placeholder for failed images
        return new Response('', { status: 404 });
    }
}

// Dynamic request handler - Network first with cache fallback
async function handleDynamicRequest(request) {
    try {
        console.log('🌐 Fetching dynamic content from network:', request.url);
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('📦 Network failed, trying cache:', request.url);
        
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline fallback
        if (request.destination === 'document') {
            const cache = await caches.open(STATIC_CACHE_NAME);
            return cache.match('/index.html');
        }
        
        return new Response('Content not available offline', { status: 503 });
    }
}

// Background API cache update
async function updateAPICache(request, cache) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const headers = new Headers(networkResponse.headers);
            headers.set('sw-cache-timestamp', Date.now().toString());
            
            const cachedResponse = new Response(networkResponse.body, {
                status: networkResponse.status,
                statusText: networkResponse.statusText,
                headers: headers
            });
            
            cache.put(request, cachedResponse);
            console.log('🔄 Background cache update completed:', request.url);
        }
    } catch (error) {
        console.log('⚠️ Background cache update failed:', request.url);
    }
}

// Check if cache is expired
function isCacheExpired(response, maxAge) {
    const cacheTimestamp = response.headers.get('sw-cache-timestamp');
    
    if (!cacheTimestamp) {
        return true;
    }
    
    const age = Date.now() - parseInt(cacheTimestamp);
    return age > maxAge;
}

// Check if request is for API
function isAPIRequest(url) {
    return API_ENDPOINTS.some(endpoint => url.href.startsWith(endpoint)) ||
           url.hostname === 'api.coingecko.com' ||
           url.pathname.includes('/api/');
}

// Check if request is for static asset
function isStaticAsset(url) {
    return STATIC_ASSETS.some(asset => url.pathname === asset) ||
           url.pathname.endsWith('.js') ||
           url.pathname.endsWith('.css') ||
           url.pathname.endsWith('.html') ||
           url.hostname === 'cdn.jsdelivr.net' ||
           url.hostname === 'cdn.tailwindcss.com' ||
           url.hostname === 'unpkg.com' ||
           url.hostname === 'fonts.googleapis.com' ||
           url.hostname === 'fonts.gstatic.com';
}

// Check if request is for image
function isImageRequest(url) {
    return url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i) ||
           url.searchParams.has('image') ||
           url.pathname.includes('/images/');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('🔄 Background sync triggered:', event.tag);
    
    if (event.tag === 'portfolio-sync') {
        event.waitUntil(syncPortfolioData());
    } else if (event.tag === 'alerts-sync') {
        event.waitUntil(syncAlertsData());
    } else if (event.tag === 'price-update') {
        event.waitUntil(updatePriceData());
    }
});

// Sync portfolio data when back online
async function syncPortfolioData() {
    try {
        console.log('🔄 Syncing portfolio data...');
        
        // Get pending portfolio updates from IndexedDB
        const updates = await getPendingUpdates('portfolio');
        
        for (const update of updates) {
            try {
                // Process each update
                await processPortfolioUpdate(update);
                
                // Remove from pending updates
                await removePendingUpdate('portfolio', update.id);
                
            } catch (error) {
                console.error('Failed to sync portfolio update:', error);
            }
        }
        
        console.log('✅ Portfolio sync completed');
        
        // Notify clients about sync completion
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'PORTFOLIO_SYNC_COMPLETE',
                    success: true
                });
            });
        });
        
    } catch (error) {
        console.error('❌ Portfolio sync failed:', error);
    }
}

// Sync alerts data when back online
async function syncAlertsData() {
    try {
        console.log('🔄 Syncing alerts data...');
        
        const updates = await getPendingUpdates('alerts');
        
        for (const update of updates) {
            try {
                await processAlertsUpdate(update);
                await removePendingUpdate('alerts', update.id);
            } catch (error) {
                console.error('Failed to sync alerts update:', error);
            }
        }
        
        console.log('✅ Alerts sync completed');
        
    } catch (error) {
        console.error('❌ Alerts sync failed:', error);
    }
}

// Update price data in background
async function updatePriceData() {
    try {
        console.log('🔄 Updating price data in background...');
        
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,cardano,ripple&vs_currencies=usd&include_24hr_change=true');
        
        if (response.ok) {
            const data = await response.json();
            
            // Cache the updated data
            const cache = await caches.open(API_CACHE_NAME);
            const headers = new Headers(response.headers);
            headers.set('sw-cache-timestamp', Date.now().toString());
            
            const cachedResponse = new Response(JSON.stringify(data), {
                status: 200,
                headers: headers
            });
            
            cache.put(response.url, cachedResponse);
            
            // Notify clients about price updates
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'PRICE_UPDATE',
                        data: data
                    });
                });
            });
            
            console.log('✅ Background price update completed');
        }
        
    } catch (error) {
        console.error('❌ Background price update failed:', error);
    }
}

// Push notification handling
self.addEventListener('push', (event) => {
    console.log('📬 Push notification received');
    
    let notificationData = {
        title: 'Cripto Monitor Pro',
        body: 'Nova atualização disponível',
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: 'crypto-monitor',
        requireInteraction: false,
        actions: [
            {
                action: 'view',
                title: 'Ver Detalhes'
            },
            {
                action: 'dismiss',
                title: 'Dispensar'
            }
        ]
    };
    
    if (event.data) {
        try {
            const payload = event.data.json();
            notificationData = { ...notificationData, ...payload };
        } catch (error) {
            console.error('Failed to parse push data:', error);
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(notificationData.title, notificationData)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    console.log('🔔 Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (event.action === 'dismiss') {
        // Just close the notification
        return;
    } else {
        // Default action - open the app
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then(clientList => {
                // Focus existing window if available
                for (const client of clientList) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    }
    
    // Notify the main app about notification interaction
    clients.matchAll().then(clientList => {
        clientList.forEach(client => {
            client.postMessage({
                type: 'NOTIFICATION_CLICK',
                action: event.action,
                payload: event.notification.data
            });
        });
    });
});

// Message handling from main app
self.addEventListener('message', (event) => {
    const { data } = event;
    
    switch (data.type) {
        case 'CACHE_UPDATE':
            handleCacheUpdate(data.payload);
            break;
            
        case 'CLEAR_CACHE':
            handleClearCache(data.payload);
            break;
            
        case 'PREFETCH_URLS':
            handlePrefetchUrls(data.payload);
            break;
            
        case 'GET_CACHE_STATUS':
            handleGetCacheStatus(event);
            break;
            
        default:
            console.log('Unknown message type:', data.type);
    }
});

// Handle cache update requests
async function handleCacheUpdate(payload) {
    try {
        const { cacheName, urls } = payload;
        const cache = await caches.open(cacheName);
        
        await cache.addAll(urls);
        console.log('✅ Cache updated:', cacheName, urls.length, 'URLs');
        
    } catch (error) {
        console.error('❌ Cache update failed:', error);
    }
}

// Handle cache clearing requests
async function handleClearCache(payload) {
    try {
        if (payload.cacheName) {
            await caches.delete(payload.cacheName);
            console.log('✅ Cache cleared:', payload.cacheName);
        } else {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('✅ All caches cleared');
        }
        
    } catch (error) {
        console.error('❌ Cache clear failed:', error);
    }
}

// Handle URL prefetching
async function handlePrefetchUrls(urls) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        
        for (const url of urls) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    cache.put(url, response);
                }
            } catch (error) {
                console.warn('Failed to prefetch:', url);
            }
        }
        
        console.log('✅ Prefetch completed:', urls.length, 'URLs');
        
    } catch (error) {
        console.error('❌ Prefetch failed:', error);
    }
}

// Handle cache status requests
async function handleGetCacheStatus(event) {
    try {
        const cacheNames = await caches.keys();
        const status = {};
        
        for (const name of cacheNames) {
            const cache = await caches.open(name);
            const keys = await cache.keys();
            status[name] = keys.length;
        }
        
        event.ports[0].postMessage({
            type: 'CACHE_STATUS',
            data: status
        });
        
    } catch (error) {
        console.error('❌ Get cache status failed:', error);
        event.ports[0].postMessage({
            type: 'CACHE_STATUS_ERROR',
            error: error.message
        });
    }
}

// Utility functions for IndexedDB operations
async function getPendingUpdates(type) {
    // Implementation would depend on IndexedDB structure
    // This is a placeholder for the actual implementation
    return [];
}

async function removePendingUpdate(type, id) {
    // Implementation would depend on IndexedDB structure
    // This is a placeholder for the actual implementation
    return true;
}

async function processPortfolioUpdate(update) {
    // Implementation would depend on the actual portfolio update logic
    // This is a placeholder for the actual implementation
    return true;
}

async function processAlertsUpdate(update) {
    // Implementation would depend on the actual alerts update logic
    // This is a placeholder for the actual implementation
    return true;
}

// Periodic cache cleanup
setInterval(async () => {
    try {
        console.log('🧹 Performing periodic cache cleanup...');
        
        const cacheNames = [API_CACHE_NAME, DYNAMIC_CACHE_NAME];
        
        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            
            for (const request of requests) {
                const response = await cache.match(request);
                
                if (response && isCacheExpired(response, CACHE_DURATIONS.api)) {
                    await cache.delete(request);
                    console.log('🗑️ Removed expired cache entry:', request.url);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Cache cleanup failed:', error);
    }
}, 60 * 60 * 1000); // Run every hour

console.log('✅ Service Worker script loaded');

