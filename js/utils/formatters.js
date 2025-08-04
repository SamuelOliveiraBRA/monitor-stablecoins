/**
 * Formatters Utility
 * Provides currency, number, date, and other formatting functions
 */

class FormattersUtil {
    constructor() {
        this.numberFormatCache = new Map();
        this.currencyFormatCache = new Map();
        this.dateFormatCache = new Map();
        
        // Supported currencies with their symbols and formatting
        this.currencies = {
            usd: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
            eur: { symbol: '€', name: 'Euro', locale: 'de-DE' },
            gbp: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
            jpy: { symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
            brl: { symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
            cad: { symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
            aud: { symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
            chf: { symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH' },
            cny: { symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
            inr: { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' }
        };
        
        // Number suffixes for large numbers
        this.numberSuffixes = [
            { value: 1e12, suffix: 'T' },
            { value: 1e9, suffix: 'B' },
            { value: 1e6, suffix: 'M' },
            { value: 1e3, suffix: 'K' }
        ];
    }
    
    // Currency Formatting
    formatCurrency(amount, currency = 'usd', compact = false, precision = null) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return this.currencies[currency]?.symbol + '0.00' || '$0.00';
        }
        
        const currencyInfo = this.currencies[currency.toLowerCase()] || this.currencies.usd;
        const cacheKey = `${currency}_${compact}_${precision}`;
        
        let formatter = this.currencyFormatCache.get(cacheKey);
        
        if (!formatter) {
            const options = {
                style: 'currency',
                currency: currency.toUpperCase(),
                minimumFractionDigits: precision !== null ? precision : (compact ? 0 : 2),
                maximumFractionDigits: precision !== null ? precision : (compact ? 2 : 8)
            };
            
            if (compact && Math.abs(amount) >= 1000) {
                options.notation = 'compact';
                options.compactDisplay = 'short';
            }
            
            try {
                formatter = new Intl.NumberFormat(currencyInfo.locale, options);
                this.currencyFormatCache.set(cacheKey, formatter);
            } catch (error) {
                // Fallback to manual formatting
                return this.formatCurrencyFallback(amount, currencyInfo, compact);
            }
        }
        
        try {
            return formatter.format(amount);
        } catch (error) {
            return this.formatCurrencyFallback(amount, currencyInfo, compact);
        }
    }
    
    formatCurrencyFallback(amount, currencyInfo, compact = false) {
        if (compact && Math.abs(amount) >= 1000) {
            const { value, suffix } = this.getCompactValue(amount);
            return `${currencyInfo.symbol}${value}${suffix}`;
        }
        
        const formatted = Math.abs(amount) >= 1 
            ? amount.toFixed(2) 
            : amount.toFixed(8).replace(/\.?0+$/, '');
            
        return `${currencyInfo.symbol}${formatted}`;
    }
    
    // Number Formatting
    formatNumber(number, decimals = 0, compact = false) {
        if (number === null || number === undefined || isNaN(number)) {
            return '0';
        }
        
        if (compact && Math.abs(number) >= 1000) {
            const { value, suffix } = this.getCompactValue(number);
            return `${value}${suffix}`;
        }
        
        const cacheKey = `number_${decimals}`;
        let formatter = this.numberFormatCache.get(cacheKey);
        
        if (!formatter) {
            formatter = new Intl.NumberFormat('en-US', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
            this.numberFormatCache.set(cacheKey, formatter);
        }
        
        return formatter.format(number);
    }
    
    getCompactValue(number) {
        const abs = Math.abs(number);
        
        for (const { value, suffix } of this.numberSuffixes) {
            if (abs >= value) {
                const compactValue = number / value;
                const decimals = compactValue >= 100 ? 0 : compactValue >= 10 ? 1 : 2;
                return {
                    value: compactValue.toFixed(decimals),
                    suffix: suffix
                };
            }
        }
        
        return {
            value: number.toFixed(2),
            suffix: ''
        };
    }
    
    // Percentage Formatting
    formatPercentage(value, decimals = 2, showSign = true) {
        if (value === null || value === undefined || isNaN(value)) {
            return '0.00%';
        }
        
        const sign = showSign && value > 0 ? '+' : '';
        return `${sign}${value.toFixed(decimals)}%`;
    }
    
    // Date and Time Formatting
    formatDate(date, options = {}) {
        if (!date) return '--';
        
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return 'Invalid Date';
        
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...options
        };
        
        const cacheKey = JSON.stringify(defaultOptions);
        let formatter = this.dateFormatCache.get(cacheKey);
        
        if (!formatter) {
            formatter = new Intl.DateTimeFormat('pt-BR', defaultOptions);
            this.dateFormatCache.set(cacheKey, formatter);
        }
        
        return formatter.format(dateObj);
    }
    
    formatTime(date, options = {}) {
        if (!date) return '--';
        
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return 'Invalid Time';
        
        const defaultOptions = {
            hour: '2-digit',
            minute: '2-digit',
            ...options
        };
        
        const formatter = new Intl.DateTimeFormat('pt-BR', defaultOptions);
        return formatter.format(dateObj);
    }
    
    formatDateTime(date, options = {}) {
        if (!date) return '--';
        
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return 'Invalid DateTime';
        
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            ...options
        };
        
        const formatter = new Intl.DateTimeFormat('pt-BR', defaultOptions);
        return formatter.format(dateObj);
    }
    
    formatRelativeTime(date) {
        if (!date) return '--';
        
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return 'Invalid Date';
        
        const now = new Date();
        const diffInSeconds = Math.floor((now - dateObj) / 1000);
        
        const intervals = [
            { label: 'ano', seconds: 31536000 },
            { label: 'mês', seconds: 2592000 },
            { label: 'dia', seconds: 86400 },
            { label: 'hora', seconds: 3600 },
            { label: 'minuto', seconds: 60 },
            { label: 'segundo', seconds: 1 }
        ];
        
        for (const interval of intervals) {
            const count = Math.floor(diffInSeconds / interval.seconds);
            if (count > 0) {
                const plural = count > 1 ? 's' : '';
                return `há ${count} ${interval.label}${plural}`;
            }
        }
        
        return 'agora';
    }
    
    // Crypto-specific Formatting
    formatCryptoAmount(amount, decimals = 8) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '0';
        }
        
        // For very small amounts, use scientific notation
        if (Math.abs(amount) < 0.00000001 && amount !== 0) {
            return amount.toExponential(2);
        }
        
        // For regular amounts, remove trailing zeros
        const formatted = amount.toFixed(decimals);
        return formatted.replace(/\.?0+$/, '');
    }
    
    formatMarketCap(marketCap, currency = 'usd') {
        return this.formatCurrency(marketCap, currency, true);
    }
    
    formatVolume(volume, currency = 'usd') {
        return this.formatCurrency(volume, currency, true);
    }
    
    formatPriceChange(change, isPercentage = false) {
        if (change === null || change === undefined || isNaN(change)) {
            return '0.00' + (isPercentage ? '%' : '');
        }
        
        const sign = change > 0 ? '+' : '';
        const formatted = Math.abs(change) >= 0.01 ? change.toFixed(2) : change.toFixed(4);
        
        return `${sign}${formatted}${isPercentage ? '%' : ''}`;
    }
    
    // Address Formatting
    formatWalletAddress(address, startChars = 6, endChars = 4) {
        if (!address || typeof address !== 'string') {
            return 'Invalid Address';
        }
        
        if (address.length <= startChars + endChars) {
            return address;
        }
        
        return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
    }
    
    // Hash Formatting
    formatTransactionHash(hash, length = 8) {
        if (!hash || typeof hash !== 'string') {
            return 'Invalid Hash';
        }
        
        return hash.length > length ? `${hash.slice(0, length)}...` : hash;
    }
    
    // File Size Formatting
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Duration Formatting
    formatDuration(milliseconds) {
        if (!milliseconds || milliseconds < 0) return '0s';
        
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    // Social Media Formatting
    formatSocialHandle(handle, platform) {
        if (!handle) return '';
        
        const prefixes = {
            twitter: '@',
            telegram: '@',
            discord: '#',
            reddit: 'r/'
        };
        
        const prefix = prefixes[platform] || '';
        return handle.startsWith(prefix) ? handle : prefix + handle;
    }
    
    // URL Formatting
    formatUrl(url, maxLength = 50) {
        if (!url) return '';
        
        try {
            const urlObj = new URL(url);
            let formatted = urlObj.hostname + urlObj.pathname;
            
            if (formatted.length > maxLength) {
                formatted = formatted.slice(0, maxLength - 3) + '...';
            }
            
            return formatted;
        } catch {
            return url.slice(0, maxLength);
        }
    }
    
    // Input Sanitization for Display
    sanitizeText(text, maxLength = null) {
        if (!text || typeof text !== 'string') return '';
        
        // Basic HTML escaping
        const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
        
        if (maxLength && escaped.length > maxLength) {
            return escaped.slice(0, maxLength - 3) + '...';
        }
        
        return escaped;
    }
    
    // Utility Methods
    getCurrencySymbol(currency) {
        return this.currencies[currency.toLowerCase()]?.symbol || '$';
    }
    
    getSupportedCurrencies() {
        return Object.keys(this.currencies);
    }
    
    isValidCurrency(currency) {
        return currency && this.currencies.hasOwnProperty(currency.toLowerCase());
    }
    
    // Cache Management
    clearFormatCache() {
        this.numberFormatCache.clear();
        this.currencyFormatCache.clear();
        this.dateFormatCache.clear();
    }
    
    getCacheStats() {
        return {
            numberFormats: this.numberFormatCache.size,
            currencyFormats: this.currencyFormatCache.size,
            dateFormats: this.dateFormatCache.size,
            totalCached: this.numberFormatCache.size + this.currencyFormatCache.size + this.dateFormatCache.size
        };
    }
}

// Create and export singleton instance
const Formatters = new FormattersUtil();

// Freeze the object to prevent modification
Object.freeze(Formatters);

