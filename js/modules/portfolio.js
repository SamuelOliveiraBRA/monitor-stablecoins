/**
 * Portfolio Module
 * Manages user's cryptocurrency portfolio with detailed tracking
 */

class PortfolioModule {
    constructor() {
        this.portfolio = new Map();
        this.totalValue = 0;
        this.totalChange = 0;
        this.totalChangePercent = 0;
        this.lastUpdateTime = null;
        this.chartInstance = null;
    }
    
    init() {
        console.log('💼 Portfolio Module initialized');
        this.loadPortfolio();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for portfolio updates
        document.addEventListener('portfolioUpdate', () => {
            this.updatePortfolioDisplay();
        });
    }
    
    // Core Portfolio Management
    loadPortfolio() {
        try {
            const saved = Storage.get('portfolio', {});
            this.portfolio.clear();
            
            Object.entries(saved).forEach(([coinId, data]) => {
                this.portfolio.set(coinId, {
                    amount: data.amount || 0,
                    buyPrice: data.buyPrice || null,
                    buyDate: data.buyDate || new Date().toISOString(),
                    currentPrice: data.currentPrice || 0,
                    currentValue: 0,
                    profitLoss: 0,
                    profitLossPercent: 0,
                    ...data
                });
            });
            
            console.log(`📊 Loaded ${this.portfolio.size} coins in portfolio`);
            return this.portfolio;
            
        } catch (error) {
            console.error('Failed to load portfolio:', error);
            return new Map();
        }
    }
    
    savePortfolio() {
        try {
            const portfolioObj = {};
            this.portfolio.forEach((data, coinId) => {
                portfolioObj[coinId] = data;
            });
            
            Storage.set('portfolio', portfolioObj);
            
            // Dispatch update event
            document.dispatchEvent(new CustomEvent('portfolioUpdate'));
            
        } catch (error) {
            console.error('Failed to save portfolio:', error);
        }
    }
    
    async addCoin(coinId, amount, buyPrice = null) {
        if (!coinId || !amount || amount <= 0) {
            throw new Error('Invalid coin data');
        }
        
        try {
            // Validate coin exists
            const coinData = await API.getCurrentPrice(coinId);
            if (!coinData) {
                throw new Error('Coin not found');
            }
            
            const currentPrice = coinData.usd || 0;
            const effectiveBuyPrice = buyPrice || currentPrice;
            
            // Check if coin already exists in portfolio
            if (this.portfolio.has(coinId)) {
                const existing = this.portfolio.get(coinId);
                
                // Calculate average buy price
                const totalValue = (existing.amount * existing.buyPrice) + (amount * effectiveBuyPrice);
                const totalAmount = existing.amount + amount;
                const avgBuyPrice = totalValue / totalAmount;
                
                existing.amount = totalAmount;
                existing.buyPrice = avgBuyPrice;
                existing.currentPrice = currentPrice;
                
                this.portfolio.set(coinId, existing);
            } else {
                // Add new coin
                this.portfolio.set(coinId, {
                    amount: amount,
                    buyPrice: effectiveBuyPrice,
                    buyDate: new Date().toISOString(),
                    currentPrice: currentPrice,
                    currentValue: amount * currentPrice,
                    profitLoss: (currentPrice - effectiveBuyPrice) * amount,
                    profitLossPercent: ((currentPrice - effectiveBuyPrice) / effectiveBuyPrice) * 100
                });
            }
            
            this.savePortfolio();
            this.updatePortfolioValues();
            
            // Analytics.trackEvent('portfolio_add_coin', 'portfolio', 'add_coin', coinId);
            
            return true;
            
        } catch (error) {
            console.error('Failed to add coin to portfolio:', error);
            throw error;
        }
    }
    
    removeCoin(coinId) {
        if (!this.portfolio.has(coinId)) {
            return false;
        }
        
        this.portfolio.delete(coinId);
        this.savePortfolio();
        this.updatePortfolioValues();
        
        // Analytics.trackEvent('portfolio_remove_coin', 'portfolio', 'remove_coin', coinId);
        
        return true;
    }
    
    updateCoinAmount(coinId, newAmount) {
        if (!this.portfolio.has(coinId) || newAmount < 0) {
            return false;
        }
        
        if (newAmount === 0) {
            return this.removeCoin(coinId);
        }
        
        const coin = this.portfolio.get(coinId);
        coin.amount = newAmount;
        coin.currentValue = newAmount * coin.currentPrice;
        coin.profitLoss = (coin.currentPrice - coin.buyPrice) * newAmount;
        
        this.portfolio.set(coinId, coin);
        this.savePortfolio();
        this.updatePortfolioValues();
        
        return true;
    }
    
    // Portfolio Calculations
    async updatePortfolioValues(cryptoData = null) {
        if (this.portfolio.size === 0) {
            this.resetPortfolioValues();
            return;
        }
        
        try {
            // Get current prices for all portfolio coins
            const coinIds = Array.from(this.portfolio.keys());
            const pricesData = cryptoData || await API.getMultiplePrices(coinIds);
            
            let totalValue = 0;
            let totalInvested = 0;
            
            this.portfolio.forEach((coin, coinId) => {
                const priceData = pricesData[coinId];
                if (priceData) {
                    coin.currentPrice = priceData.usd || 0;
                    coin.currentValue = coin.amount * coin.currentPrice;
                    coin.profitLoss = coin.currentValue - (coin.amount * coin.buyPrice);
                    coin.profitLossPercent = coin.buyPrice > 0 ? 
                        ((coin.currentPrice - coin.buyPrice) / coin.buyPrice) * 100 : 0;
                    coin.change24h = priceData.usd_24h_change || 0;
                    
                    totalValue += coin.currentValue;
                    totalInvested += coin.amount * coin.buyPrice;
                    
                    this.portfolio.set(coinId, coin);
                }
            });
            
            this.totalValue = totalValue;
            this.totalChange = totalValue - totalInvested;
            this.totalChangePercent = totalInvested > 0 ? 
                (this.totalChange / totalInvested) * 100 : 0;
            this.lastUpdateTime = new Date();
            
            this.savePortfolio();
            this.updatePortfolioDisplay();
            
        } catch (error) {
            console.error('Failed to update portfolio values:', error);
        }
    }
    
    resetPortfolioValues() {
        this.totalValue = 0;
        this.totalChange = 0;
        this.totalChangePercent = 0;
        this.updatePortfolioDisplay();
    }
    
    // Display Updates
    updatePortfolioDisplay() {
        this.updatePortfolioSummary();
        this.updatePortfolioChart();
        this.updateCoinPortfolioInfo();
    }
    
    updatePortfolioSummary() {
        const totalValueElement = document.getElementById('total-value');
        const portfolioChangeElement = document.getElementById('portfolio-change');
        const portfolioPercentageElement = document.getElementById('portfolio-percentage');
        
        if (totalValueElement) {
            const currency = Storage.get('currency', 'usd');
            totalValueElement.textContent = Formatters.formatCurrency(this.totalValue, currency);
        }
        
        if (portfolioChangeElement) {
            const currency = Storage.get('currency', 'usd');
            portfolioChangeElement.textContent = Formatters.formatCurrency(this.totalChange, currency);
            portfolioChangeElement.className = this.totalChange >= 0 ? 'trend-up' : 'trend-down';
        }
        
        if (portfolioPercentageElement) {
            portfolioPercentageElement.textContent = `${this.totalChangePercent >= 0 ? '+' : ''}${this.totalChangePercent.toFixed(2)}%`;
            portfolioPercentageElement.className = this.totalChangePercent >= 0 ? 'trend-up' : 'trend-down';
        }
    }
    
    updatePortfolioChart() {
        const canvas = document.getElementById('portfolio-chart');
        if (!canvas || this.portfolio.size === 0) {
            if (this.chartInstance) {
                this.chartInstance.destroy();
                this.chartInstance = null;
            }
            return;
        }
        
        // Prepare data for pie chart
        const portfolioArray = Array.from(this.portfolio.entries())
            .filter(([, coin]) => coin.currentValue > 0)
            .sort((a, b) => b[1].currentValue - a[1].currentValue)
            .slice(0, 10); // Top 10 holdings
        
        const labels = portfolioArray.map(([coinId]) => coinId.toUpperCase());
        const data = portfolioArray.map(([, coin]) => coin.currentValue);
        const colors = this.generateChartColors(portfolioArray.length);
        
        const config = {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const coin = portfolioArray[context.dataIndex][1];
                                const currency = Storage.get('currency', 'usd');
                                const percentage = ((coin.currentValue / this.totalValue) * 100).toFixed(1);
                                return `${context.label}: ${Formatters.formatCurrency(coin.currentValue, currency)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        };
        
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }
        
        this.chartInstance = new Chart(canvas, config);
    }
    
    updateCoinPortfolioInfo() {
        this.portfolio.forEach((coin, coinId) => {
            const infoElement = document.getElementById(`portfolio-info-${coinId}`);
            if (infoElement) {
                const currency = Storage.get('currency', 'usd');
                const profitLossClass = coin.profitLoss >= 0 ? 'trend-up' : 'trend-down';
                
                infoElement.innerHTML = `
                    <div class="flex justify-between text-xs">
                        <span>Quantidade:</span>
                        <span>${Formatters.formatNumber(coin.amount, 8)}</span>
                    </div>
                    <div class="flex justify-between text-xs">
                        <span>Valor:</span>
                        <span>${Formatters.formatCurrency(coin.currentValue, currency)}</span>
                    </div>
                    <div class="flex justify-between text-xs ${profitLossClass}">
                        <span>P&L:</span>
                        <span>${coin.profitLoss >= 0 ? '+' : ''}${Formatters.formatCurrency(coin.profitLoss, currency)} (${coin.profitLossPercent.toFixed(1)}%)</span>
                    </div>
                `;
            }
        });
    }
    
    // Utility Methods
    getPortfolioCoins() {
        return Array.from(this.portfolio.keys());
    }
    
    getCoinHolding(coinId) {
        return this.portfolio.get(coinId) || null;
    }
    
    getPortfolioStats() {
        const stats = {
            totalCoins: this.portfolio.size,
            totalValue: this.totalValue,
            totalChange: this.totalChange,
            totalChangePercent: this.totalChangePercent,
            lastUpdate: this.lastUpdateTime,
            holdings: []
        };
        
        this.portfolio.forEach((coin, coinId) => {
            stats.holdings.push({
                coinId,
                ...coin,
                allocation: this.totalValue > 0 ? (coin.currentValue / this.totalValue) * 100 : 0
            });
        });
        
        stats.holdings.sort((a, b) => b.currentValue - a.currentValue);
        
        return stats;
    }
    
    generateChartColors(count) {
        const colors = [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
            '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
            '#14b8a6', '#eab308', '#d946ef', '#06b6d4', '#22c55e'
        ];
        
        return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
    }
    
    // Advanced Features
    getTopPerformers(limit = 5) {
        return Array.from(this.portfolio.entries())
            .filter(([, coin]) => coin.profitLossPercent > 0)
            .sort((a, b) => b[1].profitLossPercent - a[1].profitLossPercent)
            .slice(0, limit);
    }
    
    getWorstPerformers(limit = 5) {
        return Array.from(this.portfolio.entries())
            .filter(([, coin]) => coin.profitLossPercent < 0)
            .sort((a, b) => a[1].profitLossPercent - b[1].profitLossPercent)
            .slice(0, limit);
    }
    
    getLargestHoldings(limit = 5) {
        return Array.from(this.portfolio.entries())
            .sort((a, b) => b[1].currentValue - a[1].currentValue)
            .slice(0, limit);
    }
    
    getRebalanceRecommendations() {
        const target = 100 / this.portfolio.size; // Equal weight target
        const recommendations = [];
        
        this.portfolio.forEach((coin, coinId) => {
            const currentAllocation = this.totalValue > 0 ? (coin.currentValue / this.totalValue) * 100 : 0;
            const difference = currentAllocation - target;
            
            if (Math.abs(difference) > 5) { // 5% threshold
                recommendations.push({
                    coinId,
                    currentAllocation,
                    targetAllocation: target,
                    difference,
                    action: difference > 0 ? 'sell' : 'buy',
                    amount: Math.abs(difference * this.totalValue / 100)
                });
            }
        });
        
        return recommendations.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
    }
    
    // Import/Export
    exportData() {
        return {
            portfolio: Object.fromEntries(this.portfolio),
            totalValue: this.totalValue,
            totalChange: this.totalChange,
            totalChangePercent: this.totalChangePercent,
            lastUpdateTime: this.lastUpdateTime,
            exportDate: new Date().toISOString()
        };
    }
    
    async importData(data) {
        try {
            if (!data.portfolio) {
                throw new Error('Invalid portfolio data');
            }
            
            this.portfolio.clear();
            
            Object.entries(data.portfolio).forEach(([coinId, coinData]) => {
                this.portfolio.set(coinId, {
                    amount: coinData.amount || 0,
                    buyPrice: coinData.buyPrice || 0,
                    buyDate: coinData.buyDate || new Date().toISOString(),
                    currentPrice: coinData.currentPrice || 0,
                    currentValue: 0,
                    profitLoss: 0,
                    profitLossPercent: 0
                });
            });
            
            this.savePortfolio();
            await this.updatePortfolioValues();
            
            return true;
            
        } catch (error) {
            console.error('Failed to import portfolio data:', error);
            throw error;
        }
    }
    
    // Settings and Preferences
    openSettings() {
        // Implementation for portfolio-specific settings
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50';
        modal.innerHTML = `
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="glassmorphism p-6 rounded-2xl w-full max-w-md">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xl font-bold">Configurações do Portfólio</h3>
                        <button onclick="this.closest('.fixed').remove()" class="p-1 hover:bg-white/10 rounded">
                            <i data-feather="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-2">Rebalanceamento Automático</label>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-2">Alertas de Performance</label>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" class="sr-only peer" checked>
                                <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        
                        <div class="pt-4 border-t border-white/10">
                            <button onclick="portfolio.clearPortfolio()" class="w-full btn-secondary text-red-400 hover:bg-red-500/20">
                                Limpar Portfólio
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        feather.replace();
    }
    
    clearPortfolio() {
        if (confirm('Tem certeza que deseja limpar todo o portfólio? Esta ação não pode ser desfeita.')) {
            this.portfolio.clear();
            this.savePortfolio();
            this.resetPortfolioValues();
            
            Notifications.show('Portfólio limpo com sucesso', 'info');
            // Analytics.trackEvent('portfolio_clear', 'portfolio', 'clear_all');
        }
    }
}

// Export for use in other modules
const Portfolio = new PortfolioModule();
