/**
 * Arbitrage Module - Crypto Monitor Pro
 * Handles price comparison between different exchanges for arbitrage opportunities
 */

class ArbitrageManager {
    constructor() {
        this.exchanges = {
            coingecko: {
                name: 'CoinGecko',
                apiUrl: 'https://api.coingecko.com/api/v3',
                getFeeRate: () => 0.001, // 0.1% fee
                icon: 'trending-up'
            },
            mercadopago: {
                name: 'Mercado Pago',
                // Note: Mercado Pago doesn't have a public crypto API
                // This would need to be implemented with their private API
                getFeeRate: () => 0.015, // 1.5% fee estimate
                icon: 'dollar-sign'
            },
            binance: {
                name: 'Binance',
                apiUrl: 'https://api.binance.com/api/v3',
                getFeeRate: () => 0.001, // 0.1% fee
                icon: 'activity'
            }
        };
        
        this.opportunities = new Map();
        this.minProfitMargin = 0.02; // 2% minimum profit
        this.updateInterval = null;
    }

    async compareExchangePrices(coinId, currency = 'usd') {
        try {
            const prices = await this.fetchPricesFromExchanges(coinId, currency);
            const opportunities = this.calculateArbitrageOpportunities(prices, coinId);
            
            if (opportunities.length > 0) {
                this.opportunities.set(coinId, opportunities);
                return opportunities;
            }
            
            return [];
            
        } catch (error) {
            console.error(`Failed to compare prices for ${coinId}:`, error);
            return [];
        }
    }

    async fetchPricesFromExchanges(coinId, currency) {
        const prices = {};
        
        try {
            // CoinGecko API (our primary source)
            const coingeckoPrice = await this.fetchCoinGeckoPrice(coinId, currency);
            if (coingeckoPrice) {
                prices.coingecko = {
                    exchange: 'coingecko',
                    price: coingeckoPrice,
                    fee: this.exchanges.coingecko.getFeeRate(),
                    timestamp: Date.now()
                };
            }

            // Binance API (if available)
            const binancePrice = await this.fetchBinancePrice(coinId, currency);
            if (binancePrice) {
                prices.binance = {
                    exchange: 'binance',
                    price: binancePrice,
                    fee: this.exchanges.binance.getFeeRate(),
                    timestamp: Date.now()
                };
            }

            // Note: Mercado Pago would require separate integration
            // For demonstration, we'll simulate a price difference
            if (prices.coingecko) {
                const variation = (Math.random() - 0.5) * 0.04; // ±2% variation
                prices.mercadopago = {
                    exchange: 'mercadopago',
                    price: prices.coingecko.price * (1 + variation),
                    fee: this.exchanges.mercadopago.getFeeRate(),
                    timestamp: Date.now(),
                    simulated: true
                };
            }

        } catch (error) {
            console.error('Error fetching exchange prices:', error);
        }

        return prices;
    }

    async fetchCoinGeckoPrice(coinId, currency) {
        try {
            const response = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}`
            );
            
            if (!response.ok) throw new Error('CoinGecko API error');
            
            const data = await response.json();
            return data[coinId]?.[currency];
            
        } catch (error) {
            console.error('CoinGecko price fetch error:', error);
            return null;
        }
    }

    async fetchBinancePrice(coinId, currency) {
        try {
            // Map common coin IDs to Binance symbols
            const symbolMap = {
                'bitcoin': 'BTCUSDT',
                'ethereum': 'ETHUSDT',
                'binancecoin': 'BNBUSDT',
                'cardano': 'ADAUSDT',
                'solana': 'SOLUSDT',
                'ripple': 'XRPUSDT'
            };
            
            const symbol = symbolMap[coinId];
            if (!symbol) return null;
            
            const response = await fetch(
                `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
            );
            
            if (!response.ok) throw new Error('Binance API error');
            
            const data = await response.json();
            return parseFloat(data.price);
            
        } catch (error) {
            console.error('Binance price fetch error:', error);
            return null;
        }
    }

    calculateArbitrageOpportunities(prices, coinId) {
        const opportunities = [];
        const exchanges = Object.keys(prices);
        
        if (exchanges.length < 2) return opportunities;
        
        // Compare all exchange pairs
        for (let i = 0; i < exchanges.length; i++) {
            for (let j = i + 1; j < exchanges.length; j++) {
                const buyExchange = exchanges[i];
                const sellExchange = exchanges[j];
                
                const buyPrice = prices[buyExchange];
                const sellPrice = prices[sellExchange];
                
                const opportunity = this.calculateProfitability(
                    buyPrice, sellPrice, coinId
                );
                
                if (opportunity.profitMargin >= this.minProfitMargin) {
                    opportunities.push(opportunity);
                }
                
                // Check reverse direction
                const reverseOpportunity = this.calculateProfitability(
                    sellPrice, buyPrice, coinId
                );
                
                if (reverseOpportunity.profitMargin >= this.minProfitMargin) {
                    opportunities.push(reverseOpportunity);
                }
            }
        }
        
        return opportunities.sort((a, b) => b.profitMargin - a.profitMargin);
    }

    calculateProfitability(buyData, sellData, coinId) {
        const buyPrice = buyData.price;
        const sellPrice = sellData.price;
        const buyFee = buyData.fee;
        const sellFee = sellData.fee;
        
        // Calculate effective prices after fees
        const effectiveBuyPrice = buyPrice * (1 + buyFee);
        const effectiveSellPrice = sellPrice * (1 - sellFee);
        
        // Calculate profit
        const grossProfit = effectiveSellPrice - effectiveBuyPrice;
        const profitMargin = grossProfit / effectiveBuyPrice;
        
        return {
            coinId,
            buyExchange: buyData.exchange,
            sellExchange: sellData.exchange,
            buyPrice: buyPrice,
            sellPrice: sellPrice,
            effectiveBuyPrice,
            effectiveSellPrice,
            grossProfit,
            profitMargin,
            profitPercentage: profitMargin * 100,
            buyFee: buyFee * 100,
            sellFee: sellFee * 100,
            timestamp: Date.now(),
            isSimulated: buyData.simulated || sellData.simulated
        };
    }

    formatOpportunityForDisplay(opportunity) {
        const currency = Storage.get('currency', 'usd');
        const currencySymbol = currency === 'brl' ? 'R$' : '$';
        
        return {
            ...opportunity,
            buyPriceFormatted: Formatters.formatCurrency(opportunity.buyPrice, currency),
            sellPriceFormatted: Formatters.formatCurrency(opportunity.sellPrice, currency),
            grossProfitFormatted: Formatters.formatCurrency(Math.abs(opportunity.grossProfit), currency),
            profitPercentageFormatted: `${opportunity.profitPercentage.toFixed(2)}%`,
            buyExchangeName: this.exchanges[opportunity.buyExchange]?.name || opportunity.buyExchange,
            sellExchangeName: this.exchanges[opportunity.sellExchange]?.name || opportunity.sellExchange,
            buyExchangeIcon: this.exchanges[opportunity.buyExchange]?.icon || 'trending-down',
            sellExchangeIcon: this.exchanges[opportunity.sellExchange]?.icon || 'trending-up'
        };
    }

    getTopOpportunities(limit = 10) {
        const allOpportunities = [];
        
        for (const [coinId, opportunities] of this.opportunities) {
            allOpportunities.push(...opportunities);
        }
        
        return allOpportunities
            .sort((a, b) => b.profitMargin - a.profitMargin)
            .slice(0, limit)
            .map(opp => this.formatOpportunityForDisplay(opp));
    }

    startMonitoring(coins = [], interval = 60000) {
        this.stopMonitoring();
        
        if (coins.length === 0) {
            coins = ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple'];
        }
        
        const updateOpportunities = async () => {
            console.log('🔍 Scanning for arbitrage opportunities...');
            
            for (const coinId of coins) {
                await this.compareExchangePrices(coinId);
                // Add small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            const opportunities = this.getTopOpportunities(5);
            if (opportunities.length > 0) {
                console.log(`✅ Found ${opportunities.length} arbitrage opportunities`);
                this.notifyOpportunities(opportunities);
            }
        };
        
        // Initial scan
        updateOpportunities();
        
        // Set up periodic scanning
        this.updateInterval = setInterval(updateOpportunities, interval);
    }

    stopMonitoring() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    notifyOpportunities(opportunities) {
        const topOpportunity = opportunities[0];
        if (!topOpportunity) return;
        
        const message = `Oportunidade de arbitragem: ${topOpportunity.profitPercentageFormatted} de lucro em ${topOpportunity.coinId}`;
        
        // Show notification
        if (Notifications) {
            Notifications.show(message, 'success');
        }
        
        // Update UI badge
        this.updateArbitrageBadge(opportunities.length);
    }

    updateArbitrageBadge(count) {
        const badge = document.getElementById('arbitrage-badge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        }
    }

    setMinProfitMargin(margin) {
        this.minProfitMargin = margin;
        Storage.set('arbitrageMinProfit', margin);
    }

    getMinProfitMargin() {
        return Storage.get('arbitrageMinProfit', this.minProfitMargin);
    }
}

// Create global instance
const Arbitrage = new ArbitrageManager();

// Auto-start monitoring if enabled
document.addEventListener('DOMContentLoaded', () => {
    const autoStart = Storage.get('arbitrageAutoStart', false);
    if (autoStart) {
        const watchlist = Portfolio.getPortfolioCoins();
        Arbitrage.startMonitoring(watchlist.length > 0 ? watchlist : undefined);
    }
});