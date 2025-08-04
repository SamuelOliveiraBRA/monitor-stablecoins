/**
 * Validators Utility
 * Provides validation functions for various data types and crypto-specific formats
 */

class ValidatorsUtil {
    constructor() {
        // Common regex patterns
        this.patterns = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
            hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
            ipAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
            alphanumeric: /^[a-zA-Z0-9]+$/,
            alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
            phoneNumber: /^\+?[\d\s\-\(\)]+$/,
            
            // Crypto-specific patterns
            bitcoinAddress: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/,
            ethereumAddress: /^0x[a-fA-F0-9]{40}$/,
            bitcoinPrivateKey: /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$|^[a-fA-F0-9]{64}$/,
            transactionHash: /^[a-fA-F0-9]{64}$/,
            mnemonic: /^(\w+\s){11}\w+$|^(\w+\s){23}\w+$/
        };
        
        // Supported cryptocurrencies and their validation rules
        this.cryptoCurrencies = {
            bitcoin: {
                symbol: 'BTC',
                decimals: 8,
                addressPattern: this.patterns.bitcoinAddress,
                minAmount: 0.00000001,
                maxAmount: 21000000
            },
            ethereum: {
                symbol: 'ETH',
                decimals: 18,
                addressPattern: this.patterns.ethereumAddress,
                minAmount: 0.000000000000000001,
                maxAmount: null
            },
            cardano: {
                symbol: 'ADA',
                decimals: 6,
                addressPattern: /^addr1[a-z0-9]{98}$/,
                minAmount: 0.000001,
                maxAmount: 45000000000
            },
            ripple: {
                symbol: 'XRP',
                decimals: 6,
                addressPattern: /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/,
                minAmount: 0.000001,
                maxAmount: 100000000000
            },
            litecoin: {
                symbol: 'LTC',
                decimals: 8,
                addressPattern: /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/,
                minAmount: 0.00000001,
                maxAmount: 84000000
            }
        };
        
        // Fiat currencies
        this.fiatCurrencies = [
            'usd', 'eur', 'gbp', 'jpy', 'brl', 'cad', 'aud', 'chf', 'cny', 'inr'
        ];
        
        // Error messages
        this.errorMessages = {
            required: 'Este campo é obrigatório',
            email: 'Formato de email inválido',
            url: 'URL inválida',
            number: 'Deve ser um número válido',
            positiveNumber: 'Deve ser um número positivo',
            integer: 'Deve ser um número inteiro',
            minLength: 'Deve ter pelo menos {min} caracteres',
            maxLength: 'Deve ter no máximo {max} caracteres',
            minValue: 'Deve ser pelo menos {min}',
            maxValue: 'Deve ser no máximo {max}',
            pattern: 'Formato inválido',
            cryptoAmount: 'Quantidade de criptomoeda inválida',
            cryptoAddress: 'Endereço de criptomoeda inválido',
            percentage: 'Deve ser uma porcentagem válida (0-100)',
            password: 'Senha muito fraca',
            confirmPassword: 'Senhas não coincidem',
            fileSize: 'Arquivo muito grande',
            fileType: 'Tipo de arquivo não suportado'
        };
    }
    
    // Basic Validation Methods
    isRequired(value) {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        return true;
    }
    
    isEmail(email) {
        if (!email || typeof email !== 'string') return false;
        return this.patterns.email.test(email.trim());
    }
    
    isUrl(url) {
        if (!url || typeof url !== 'string') return false;
        return this.patterns.url.test(url.trim());
    }
    
    isNumber(value) {
        if (value === null || value === undefined || value === '') return false;
        return !isNaN(parseFloat(value)) && isFinite(value);
    }
    
    isInteger(value) {
        if (!this.isNumber(value)) return false;
        return Number.isInteger(parseFloat(value));
    }
    
    isPositiveNumber(value) {
        return this.isNumber(value) && parseFloat(value) > 0;
    }
    
    isNonNegativeNumber(value) {
        return this.isNumber(value) && parseFloat(value) >= 0;
    }
    
    isInRange(value, min, max) {
        if (!this.isNumber(value)) return false;
        const num = parseFloat(value);
        return num >= min && num <= max;
    }
    
    isPercentage(value) {
        return this.isInRange(value, 0, 100);
    }
    
    hasMinLength(value, minLength) {
        if (!value) return false;
        return value.toString().length >= minLength;
    }
    
    hasMaxLength(value, maxLength) {
        if (!value) return true;
        return value.toString().length <= maxLength;
    }
    
    isLengthBetween(value, min, max) {
        const length = value ? value.toString().length : 0;
        return length >= min && length <= max;
    }
    
    matchesPattern(value, pattern) {
        if (!value || typeof value !== 'string') return false;
        return pattern.test(value);
    }
    
    // Crypto-specific Validations
    isCryptoCurrency(symbol) {
        if (!symbol || typeof symbol !== 'string') return false;
        return Object.values(this.cryptoCurrencies).some(
            crypto => crypto.symbol.toLowerCase() === symbol.toLowerCase()
        );
    }
    
    isFiatCurrency(currency) {
        if (!currency || typeof currency !== 'string') return false;
        return this.fiatCurrencies.includes(currency.toLowerCase());
    }
    
    isCryptoAmount(amount, cryptoSymbol) {
        if (!this.isPositiveNumber(amount)) return false;
        
        const crypto = Object.values(this.cryptoCurrencies).find(
            c => c.symbol.toLowerCase() === cryptoSymbol.toLowerCase()
        );
        
        if (!crypto) return true; // Unknown crypto, basic validation only
        
        const numAmount = parseFloat(amount);
        
        // Check minimum amount
        if (numAmount < crypto.minAmount) return false;
        
        // Check maximum amount (if specified)
        if (crypto.maxAmount && numAmount > crypto.maxAmount) return false;
        
        // Check decimal places
        const decimalPlaces = (amount.toString().split('.')[1] || '').length;
        if (decimalPlaces > crypto.decimals) return false;
        
        return true;
    }
    
    isCryptoAddress(address, cryptoType = 'bitcoin') {
        if (!address || typeof address !== 'string') return false;
        
        const crypto = this.cryptoCurrencies[cryptoType.toLowerCase()];
        if (!crypto) return false;
        
        return crypto.addressPattern.test(address);
    }
    
    isTransactionHash(hash) {
        if (!hash || typeof hash !== 'string') return false;
        return this.patterns.transactionHash.test(hash);
    }
    
    isMnemonic(phrase) {
        if (!phrase || typeof phrase !== 'string') return false;
        const trimmed = phrase.trim();
        return this.patterns.mnemonic.test(trimmed);
    }
    
    isPrivateKey(key) {
        if (!key || typeof key !== 'string') return false;
        return this.patterns.bitcoinPrivateKey.test(key);
    }
    
    // Portfolio Validations
    isValidPortfolioEntry(entry) {
        const errors = [];
        
        if (!entry.coinId || typeof entry.coinId !== 'string') {
            errors.push('ID da moeda é obrigatório');
        }
        
        if (!this.isPositiveNumber(entry.amount)) {
            errors.push('Quantidade deve ser um número positivo');
        }
        
        if (entry.buyPrice !== null && entry.buyPrice !== undefined && !this.isPositiveNumber(entry.buyPrice)) {
            errors.push('Preço de compra deve ser um número positivo');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // Alert Validations
    isValidAlertValue(value, alertType) {
        if (!this.isPositiveNumber(value)) return false;
        
        switch (alertType) {
            case 'percentage':
                return this.isInRange(value, 0, 1000); // Allow up to 1000% change
            case 'price':
                return this.isPositiveNumber(value);
            case 'volume':
                return this.isPositiveNumber(value);
            case 'market_cap':
                return this.isPositiveNumber(value);
            default:
                return this.isPositiveNumber(value);
        }
    }
    
    // Form Validations
    validateForm(formData, rules) {
        const errors = {};
        let isValid = true;
        
        for (const [field, fieldRules] of Object.entries(rules)) {
            const value = formData[field];
            const fieldErrors = [];
            
            // Check each rule for the field
            for (const rule of fieldRules) {
                const result = this.validateField(value, rule);
                if (!result.isValid) {
                    fieldErrors.push(result.error);
                    isValid = false;
                }
            }
            
            if (fieldErrors.length > 0) {
                errors[field] = fieldErrors;
            }
        }
        
        return {
            isValid: isValid,
            errors: errors
        };
    }
    
    validateField(value, rule) {
        switch (rule.type) {
            case 'required':
                return {
                    isValid: this.isRequired(value),
                    error: rule.message || this.errorMessages.required
                };
                
            case 'email':
                return {
                    isValid: !value || this.isEmail(value),
                    error: rule.message || this.errorMessages.email
                };
                
            case 'url':
                return {
                    isValid: !value || this.isUrl(value),
                    error: rule.message || this.errorMessages.url
                };
                
            case 'number':
                return {
                    isValid: !value || this.isNumber(value),
                    error: rule.message || this.errorMessages.number
                };
                
            case 'positiveNumber':
                return {
                    isValid: !value || this.isPositiveNumber(value),
                    error: rule.message || this.errorMessages.positiveNumber
                };
                
            case 'integer':
                return {
                    isValid: !value || this.isInteger(value),
                    error: rule.message || this.errorMessages.integer
                };
                
            case 'minLength':
                return {
                    isValid: !value || this.hasMinLength(value, rule.value),
                    error: rule.message || this.errorMessages.minLength.replace('{min}', rule.value)
                };
                
            case 'maxLength':
                return {
                    isValid: !value || this.hasMaxLength(value, rule.value),
                    error: rule.message || this.errorMessages.maxLength.replace('{max}', rule.value)
                };
                
            case 'minValue':
                return {
                    isValid: !value || (this.isNumber(value) && parseFloat(value) >= rule.value),
                    error: rule.message || this.errorMessages.minValue.replace('{min}', rule.value)
                };
                
            case 'maxValue':
                return {
                    isValid: !value || (this.isNumber(value) && parseFloat(value) <= rule.value),
                    error: rule.message || this.errorMessages.maxValue.replace('{max}', rule.value)
                };
                
            case 'pattern':
                return {
                    isValid: !value || this.matchesPattern(value, rule.value),
                    error: rule.message || this.errorMessages.pattern
                };
                
            case 'cryptoAmount':
                return {
                    isValid: !value || this.isCryptoAmount(value, rule.crypto || 'BTC'),
                    error: rule.message || this.errorMessages.cryptoAmount
                };
                
            case 'cryptoAddress':
                return {
                    isValid: !value || this.isCryptoAddress(value, rule.crypto || 'bitcoin'),
                    error: rule.message || this.errorMessages.cryptoAddress
                };
                
            case 'percentage':
                return {
                    isValid: !value || this.isPercentage(value),
                    error: rule.message || this.errorMessages.percentage
                };
                
            case 'custom':
                const result = rule.validator(value);
                return {
                    isValid: result === true || (typeof result === 'object' && result.isValid),
                    error: typeof result === 'object' ? result.error : (rule.message || this.errorMessages.pattern)
                };
                
            default:
                return { isValid: true, error: null };
        }
    }
    
    // Password Validation
    validatePassword(password) {
        const errors = [];
        
        if (!password) {
            errors.push('Senha é obrigatória');
            return { isValid: false, errors: errors, strength: 0 };
        }
        
        let strength = 0;
        
        // Length check
        if (password.length < 8) {
            errors.push('Senha deve ter pelo menos 8 caracteres');
        } else if (password.length >= 12) {
            strength += 2;
        } else {
            strength += 1;
        }
        
        // Character type checks
        if (/[a-z]/.test(password)) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
        
        // Common patterns check
        if (/(.)\1{2,}/.test(password)) {
            errors.push('Senha não deve ter caracteres repetidos consecutivos');
            strength -= 1;
        }
        
        const commonPasswords = ['123456', 'password', 'qwerty', 'abc123', 'admin'];
        if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
            errors.push('Senha muito comum');
            strength -= 2;
        }
        
        strength = Math.max(0, Math.min(5, strength));
        
        return {
            isValid: errors.length === 0 && strength >= 3,
            errors: errors,
            strength: strength
        };
    }
    
    // File Validation
    validateFile(file, options = {}) {
        const errors = [];
        
        if (!file) {
            if (options.required) {
                errors.push('Arquivo é obrigatório');
            }
            return { isValid: errors.length === 0, errors: errors };
        }
        
        // Size validation
        if (options.maxSize && file.size > options.maxSize) {
            errors.push(this.errorMessages.fileSize);
        }
        
        // Type validation
        if (options.allowedTypes) {
            const fileType = file.type || '';
            const fileName = file.name || '';
            const fileExtension = fileName.split('.').pop()?.toLowerCase();
            
            const isTypeAllowed = options.allowedTypes.some(type => {
                if (type.startsWith('.')) {
                    return fileExtension === type.slice(1);
                }
                return fileType.startsWith(type);
            });
            
            if (!isTypeAllowed) {
                errors.push(this.errorMessages.fileType);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // JSON Validation
    isValidJSON(jsonString) {
        if (!jsonString || typeof jsonString !== 'string') return false;
        
        try {
            JSON.parse(jsonString);
            return true;
        } catch {
            return false;
        }
    }
    
    // Date Validation
    isValidDate(date) {
        if (!date) return false;
        
        const dateObj = date instanceof Date ? date : new Date(date);
        return dateObj instanceof Date && !isNaN(dateObj.getTime());
    }
    
    isDateInRange(date, minDate, maxDate) {
        if (!this.isValidDate(date)) return false;
        
        const dateObj = new Date(date);
        const min = minDate ? new Date(minDate) : null;
        const max = maxDate ? new Date(maxDate) : null;
        
        if (min && dateObj < min) return false;
        if (max && dateObj > max) return false;
        
        return true;
    }
    
    // Utility Methods
    sanitizeInput(input, options = {}) {
        if (!input || typeof input !== 'string') return '';
        
        let sanitized = input.trim();
        
        if (options.removeHTML) {
            sanitized = sanitized.replace(/<[^>]*>/g, '');
        }
        
        if (options.removeSpecialChars) {
            sanitized = sanitized.replace(/[^\w\s.-]/g, '');
        }
        
        if (options.maxLength) {
            sanitized = sanitized.slice(0, options.maxLength);
        }
        
        return sanitized;
    }
    
    // Get validation error message
    getErrorMessage(field, rule, value) {
        const result = this.validateField(value, rule);
        return result.error;
    }
    
    // Crypto utility methods
    getSupportedCryptos() {
        return Object.keys(this.cryptoCurrencies);
    }
    
    getCryptoInfo(symbol) {
        return Object.values(this.cryptoCurrencies).find(
            crypto => crypto.symbol.toLowerCase() === symbol.toLowerCase()
        );
    }
    
    // Clear validation caches if needed
    clearCache() {
        // Implementation for clearing any cached validation results
        console.log('Validation cache cleared');
    }
}

// Create and export singleton instance
const Validators = new ValidatorsUtil();

// Freeze the object to prevent modification
Object.freeze(Validators);

