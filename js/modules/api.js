/**
 * API Module
 * Handles all external API communications with caching and error handling
 */

class APIModule {
    constructor() {
        this.baseURL = 'https://api.coingecko.com/api/v3';
        this.cache = new Map();
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
        this.requestQueue = new Map();
        this.rateLimitDelay = 1000; // 1 second between requests
        this.lastRequestTime = 0;
    }
    
    init() {
        console.log('🔌 API Module initialized');
        this.setupRequestInterceptor();
    }
    
    setupRequestInterceptor() {
        // Override fetch to add rate limiting
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            await this.enforceRateLimit();
            return originalFetch.apply(window, args);
        };
    }
    
    async enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.rateLimitDelay) {
            const delay = this.rateLimitDelay - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        this.lastRequestTime = Date.now();
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const cacheKey = `${url}_${JSON.stringify(options)}`;
        
        // Check cache first
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        // Check if request is already in progress
        if (this.requestQueue.has(cacheKey)) {
            return this.requestQueue.get(cacheKey);
        }
        
        // Make the request
        const requestPromise = this.makeRequest(url, options);
        this.requestQueue.set(cacheKey, requestPromise);
        
        try {
            const data = await requestPromise;
            this.setCache(cacheKey, data);
            return data;
        } finally {
            this.requestQueue.delete(cacheKey);
        }
    }
    
    async makeRequest(url, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            ...options
        };
        
        try {
            const response = await fetch(url, defaultOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
            
        } catch (error) {
            console.error(`API request failed: ${url}`, error);
            
            // Return cached data if available, even if expired
            const cacheKey = `${url}_${JSON.stringify(options)}`;
            const staleCache = this.cache.get(cacheKey);
            if (staleCache) {
                console.warn('Returning stale cached data due to API error');
                return staleCache.data;
            }
            
            throw new APIError(error.message, url, error);
        }
    }
    
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        const isExpired = Date.now() - cached.timestamp > this.cacheDuration;
        if (isExpired) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }
    
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
        
        // Clean up old cache entries
        if (this.cache.size > 100) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }
    
    clearCache() {
        this.cache.clear();
    }
    
    // API Methods
    async getMarketData(currency = 'usd') {
        try {
            return await this.request(`/global`);
        } catch (error) {
            console.error('Failed to fetch market data:', error);
            return this.getFallbackMarketData();
        }
    }
    
    async getCryptocurrencyData(currency = 'usd', limit = 100) {
        try {
            const params = new URLSearchParams({
                vs_currency: currency,
                order: 'market_cap_desc',
                per_page: limit.toString(),
                page: '1',
                sparkline: 'false',
                price_change_percentage: '24h'
            });
            
            return await this.request(`/coins/markets?${params}`);
        } catch (error) {
            console.error('Failed to fetch cryptocurrency data:', error);
            return this.getFallbackCryptoData();
        }
    }
    
    async getCoinDetail(coinId) {
        try {
            const params = new URLSearchParams({
                localization: 'false',
                tickers: 'false',
                market_data: 'true',
                community_data: 'false',
                developer_data: 'false',
                sparkline: 'false'
            });
            
            return await this.request(`/coins/${coinId}?${params}`);
        } catch (error) {
            console.error(`Failed to fetch coin detail for ${coinId}:`, error);
            throw error;
        }
    }
    
    async getHistoricalData(coinId, days = 30, currency = 'usd') {
        try {
            const params = new URLSearchParams({
                vs_currency: currency,
                days: days.toString(),
                interval: days <= 1 ? 'hourly' : 'daily'
            });
            
            const data = await this.request(`/coins/${coinId}/market_chart?${params}`);
            
            // Transform data for Chart.js
            return {
                labels: data.prices.map(([timestamp]) => new Date(timestamp)),
                datasets: [{
                    label: 'Price',
                    data: data.prices.map(([, price]) => price),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            };
        } catch (error) {
            console.error(`Failed to fetch historical data for ${coinId}:`, error);
            return this.getFallbackHistoricalData();
        }
    }
    
    async getCoinsList() {
        try {
            return await this.request('/coins/list');
        } catch (error) {
            console.error('Failed to fetch coins list:', error);
            return this.getFallbackCoinsList();
        }
    }
    
    async searchCoins(query) {
        try {
            return await this.request(`/search?query=${encodeURIComponent(query)}`);
        } catch (error) {
            console.error('Failed to search coins:', error);
            return { coins: [] };
        }
    }
    
    async getTrendingCoins() {
        try {
            return await this.request('/search/trending');
        } catch (error) {
            console.error('Failed to fetch trending coins:', error);
            return { coins: [] };
        }
    }
    
    async getExchangeRates(currency = 'usd') {
        try {
            return await this.request(`/exchange_rates`);
        } catch (error) {
            console.error('Failed to fetch exchange rates:', error);
            return { rates: {} };
        }
    }
    
    // Fallback Data Methods
    getFallbackMarketData() {
        return {
            data: {
                total_market_cap: { usd: 0 },
                total_volume: { usd: 0 },
                market_cap_percentage: { btc: 0, eth: 0 },
                market_cap_change_percentage_24h_usd: 0,
                active_cryptocurrencies: 0,
                markets: 0
            }
        };
    }
    
    getFallbackCryptoData() {
        return [];
    }
    
    getFallbackHistoricalData() {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        
        return {
            labels: Array.from({ length: 30 }, (_, i) => new Date(now - (29 - i) * oneDay)),
            datasets: [{
                label: 'Price',
                data: Array.from({ length: 30 }, () => Math.random() * 1000),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4
            }]
        };
    }
    
    getFallbackCoinsList() {
        return [
            { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' },
            { id: 'ethereum', symbol: 'eth', name: 'Ethereum' },
            { id: 'cardano', symbol: 'ada', name: 'Cardano' },
            { id: 'ripple', symbol: 'xrp', name: 'XRP' },
            { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin' }
        ];
    }
    
    // Utility Methods
    isOnline() {
        return navigator.onLine;
    }
    
    async healthCheck() {
        try {
            await this.request('/ping');
            return true;
        } catch {
            return false;
        }
    }
    
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }
    
    // Price Alert Helpers
    async getCurrentPrice(coinId, currency = 'usd') {
        try {
            const params = new URLSearchParams({
                ids: coinId,
                vs_currencies: currency,
                include_24hr_change: 'true'
            });
            
            const data = await this.request(`/simple/price?${params}`);
            return data[coinId];
        } catch (error) {
            console.error(`Failed to get current price for ${coinId}:`, error);
            return null;
        }
    }
    
    async getMultiplePrices(coinIds, currency = 'usd') {
        try {
            const params = new URLSearchParams({
                ids: coinIds.join(','),
                vs_currencies: currency,
                include_24hr_change: 'true',
                include_market_cap: 'true',
                include_24hr_vol: 'true'
            });
            
            return await this.request(`/simple/price?${params}`);
        } catch (error) {
            console.error('Failed to get multiple prices:', error);
            return {};
        }
    }
}

// Custom Error Class
class APIError extends Error {
    constructor(message, url, originalError) {
        super(message);
        this.name = 'APIError';
        this.url = url;
        this.originalError = originalError;
        this.timestamp = new Date().toISOString();
    }
}

// Export for use in other modules
const API = new APIModule();
