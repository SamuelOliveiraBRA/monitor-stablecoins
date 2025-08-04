/**
 * Main Application Controller
 * Coordinates all modules and handles global application state
 */

class CryptoMonitorApp {
    constructor() {
        this.isInitialized = false;
        this.updateInterval = null;
        this.lastUpdateTime = null;
        this.visibilityChangeHandler = this.handleVisibilityChange.bind(this);
        
        // Initialize app when DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    async init() {
        try {
            console.log('🚀 Initializing Crypto Monitor Pro...');
            
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize analytics first
            await this.initializeAnalytics();
            
            // Initialize core modules
            await this.initializeModules();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Start periodic updates
            this.startPeriodicUpdates();
            
            // Setup visibility change handling
            this.setupVisibilityHandling();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            this.isInitialized = true;
            console.log('✅ Crypto Monitor Pro initialized successfully');
            
            // Ensure theme is properly applied after initialization
            setTimeout(() => {
                if (window.Theme) {
                    Theme.ensureThemeApplied();
                }
            }, 200);
            
            // Track initialization (temporarily disabled)
            // Analytics.trackEvent('app_initialized', 'app', 'startup');
            
            // Show welcome notification
            Notifications.show('Bem-vindo ao Cripto Monitor Pro!', 'success');
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.handleInitializationError(error);
        }
    }
    
    async initializeAnalytics() {
        try {
            // Get GA measurement ID from environment or use fallback
            const measurementId = window.VITE_GA_MEASUREMENT_ID || 'G-Z5MGGMQVZL';
            Analytics.init(measurementId);
        } catch (error) {
            console.warn('Analytics initialization failed:', error);
        }
    }
    
    async initializeModules() {
        // Initialize in dependency order
        Storage.init();
        Theme.init();
        Notifications.init();
        API.init();
        Portfolio.init();
        Alerts.init();
        Charts.init();
    }
    
    setupEventListeners() {
        // Navigation controls
        document.getElementById('refresh-btn')?.addEventListener('click', () => this.handleRefresh());
        document.getElementById('settings-btn')?.addEventListener('click', () => this.openSettings());
        document.getElementById('notifications-btn')?.addEventListener('click', () => this.openNotifications());
        
        // Search and filters
        document.getElementById('search-input')?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('sort-select')?.addEventListener('change', (e) => this.handleSort(e.target.value));
        document.getElementById('filter-select')?.addEventListener('change', (e) => this.handleFilter(e.target.value));
        document.getElementById('currency-select')?.addEventListener('change', (e) => this.handleCurrencyChange(e.target.value));
        
        // Portfolio actions
        document.getElementById('add-coin-btn')?.addEventListener('click', () => this.openAddCoinModal());
        document.getElementById('portfolio-settings-btn')?.addEventListener('click', () => this.openPortfolioSettings());
        
        // Arbitrage controls
        document.getElementById('start-arbitrage-btn')?.addEventListener('click', () => this.startArbitrageMonitoring());
        document.getElementById('stop-arbitrage-btn')?.addEventListener('click', () => this.stopArbitrageMonitoring());
        document.getElementById('arbitrage-settings-btn')?.addEventListener('click', () => this.openArbitrageSettings());
        
        // Modal controls
        this.setupModalControls();
        
        // Settings controls
        this.setupSettingsControls();
        
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Error handling
        window.addEventListener('error', (event) => this.handleGlobalError(event));
        window.addEventListener('unhandledrejection', (event) => this.handleUnhandledRejection(event));
    }
    
    setupModalControls() {
        // Add coin modal
        document.getElementById('close-add-modal')?.addEventListener('click', () => this.closeModal('add-coin-modal'));
        document.getElementById('cancel-add')?.addEventListener('click', () => this.closeModal('add-coin-modal'));
        document.getElementById('add-coin-form')?.addEventListener('submit', (e) => this.handleAddCoin(e));
        
        // Coin detail modal
        document.getElementById('close-detail-modal')?.addEventListener('click', () => this.closeModal('coin-detail-modal'));
        document.getElementById('alert-form')?.addEventListener('submit', (e) => this.handleCreateAlert(e));
        
        // Settings modal
        document.getElementById('close-settings-modal')?.addEventListener('click', () => this.closeModal('settings-modal'));
        document.getElementById('save-settings')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('reset-settings')?.addEventListener('click', () => this.resetSettings());
        
        // Export/Import
        document.getElementById('export-data')?.addEventListener('click', () => this.exportData());
        document.getElementById('import-data')?.addEventListener('click', () => this.triggerImport());
        document.getElementById('import-file')?.addEventListener('change', (e) => this.handleImport(e));
        
        // Close modals on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }
    
    setupSettingsControls() {
        // Theme toggle
        document.getElementById('theme-toggle')?.addEventListener('click', () => Theme.toggle());
        document.getElementById('dark-mode-toggle')?.addEventListener('change', (e) => {
            Theme.setTheme(e.target.checked ? 'dark' : 'light');
        });
        
        // Notifications toggle
        document.getElementById('notifications-toggle')?.addEventListener('change', (e) => {
            Notifications.setEnabled(e.target.checked);
        });
        
        // Update interval
        document.getElementById('update-interval')?.addEventListener('change', (e) => {
            this.setUpdateInterval(parseInt(e.target.value) * 1000);
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escape key closes modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            
            // Ctrl/Cmd + R for refresh
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                this.handleRefresh();
            }
            
            // Ctrl/Cmd + S for settings
            if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault();
                this.openSettings();
            }
            
            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('search-input')?.focus();
            }
        });
    }
    
    async loadInitialData() {
        try {
            // Load market data
            await this.loadMarketData();
            
            // Load portfolio data
            await Portfolio.loadPortfolio();
            
            // Load user settings
            await this.loadUserSettings();
            
            // Update UI
            this.updateLastUpdateTime();
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            Notifications.show('Erro ao carregar dados iniciais', 'error');
        }
    }
    
    async loadMarketData() {
        try {
            const currency = Storage.get('currency', 'usd');
            
            // Clear API cache to ensure fresh data
            API.clearCache();
            
            const marketData = await API.getMarketData(currency);
            const cryptoData = await API.getCryptocurrencyData(currency);
            
            // Validate data before rendering
            if (!Array.isArray(cryptoData)) {
                console.error('Invalid crypto data received:', cryptoData);
                throw new Error('Invalid cryptocurrency data format');
            }
            
            this.renderMarketStats(marketData);
            this.renderCryptoGrid(cryptoData);
            
            // Update portfolio values
            Portfolio.updatePortfolioValues(cryptoData);
            
        } catch (error) {
            console.error('Failed to load market data:', error);
            this.renderErrorState();
        }
    }
    
    renderMarketStats(data) {
        const container = document.getElementById('market-stats');
        if (!container) return;
        
        const stats = [
            {
                label: 'Market Cap Total',
                value: Formatters.formatCurrency(data.total_market_cap?.usd || 0),
                change: data.market_cap_change_percentage_24h_usd || 0
            },
            {
                label: 'Volume 24h',
                value: Formatters.formatCurrency(data.total_volume?.usd || 0),
                change: null
            },
            {
                label: 'Dominância BTC',
                value: `${(data.market_cap_percentage?.btc || 0).toFixed(1)}%`,
                change: null
            },
            {
                label: 'Dominância ETH',
                value: `${(data.market_cap_percentage?.eth || 0).toFixed(1)}%`,
                change: null
            },
            {
                label: 'Criptomoedas Ativas',
                value: Formatters.formatNumber(data.active_cryptocurrencies || 0),
                change: null
            },
            {
                label: 'Exchanges Ativas',
                value: Formatters.formatNumber(data.markets || 0),
                change: null
            }
        ];
        
        container.innerHTML = stats.map(stat => `
            <div class="stat-card">
                <div class="stat-value ${stat.change !== null ? (stat.change >= 0 ? 'trend-up' : 'trend-down') : ''}">
                    ${stat.value}
                    ${stat.change !== null ? `<span class="text-sm ml-1">(${stat.change >= 0 ? '+' : ''}${stat.change.toFixed(2)}%)</span>` : ''}
                </div>
                <div class="stat-label">${stat.label}</div>
            </div>
        `).join('');
    }
    
    renderCryptoGrid(cryptos) {
        const container = document.getElementById('crypto-grid');
        if (!container) return;
        
        // Debug logging
        console.log('Rendering crypto grid with:', cryptos?.length, 'coins');
        if (cryptos?.length > 0) {
            console.log('First crypto sample:', cryptos[0]);
        }
        
        const currency = Storage.get('currency', 'usd');
        const portfolioCoins = Portfolio.getPortfolioCoins();
        
        container.innerHTML = cryptos.map(crypto => {
            // Validate crypto object
            if (!crypto || typeof crypto !== 'object') {
                console.error('Invalid crypto object:', crypto);
                return '';
            }
            
            const isInPortfolio = portfolioCoins.includes(crypto.id);
            const change24h = crypto.price_change_percentage_24h || 0;
            const trendClass = change24h >= 0 ? 'trend-up' : 'trend-down';
            const trendIcon = change24h >= 0 ? 'trending-up' : 'trending-down';
            
            return `
                <div class="coin-card card-hover" data-coin-id="${crypto.id}">
                    <div class="quick-actions">
                        <button class="action-btn" onclick="app.togglePortfolio('${crypto.id}')" title="${isInPortfolio ? 'Remover do portfólio' : 'Adicionar ao portfólio'}">
                            <i data-feather="${isInPortfolio ? 'heart' : 'heart'}" class="${isInPortfolio ? 'text-red-500' : ''}"></i>
                        </button>
                        <button class="action-btn" onclick="app.openCoinDetail('${crypto.id}')" title="Ver detalhes">
                            <i data-feather="info"></i>
                        </button>
                        <button class="action-btn" onclick="app.createQuickAlert('${crypto.id}')" title="Criar alerta">
                            <i data-feather="bell"></i>
                        </button>
                    </div>
                    
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <div class="coin-icon ${crypto.id}" title="${crypto.name}">
                                ${crypto.symbol.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 class="coin-name">${crypto.name}</h3>
                                <p class="text-sm text-gray-400 uppercase">${crypto.symbol}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-sm text-gray-400">#${crypto.market_cap_rank || '--'}</p>
                        </div>
                    </div>
                    
                    <div class="space-y-3">
                        <div>
                            <p class="text-2xl font-bold price-display">
                                ${Formatters.formatCurrency(crypto.current_price, currency)}
                            </p>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="${trendClass} flex items-center gap-1">
                                    <i data-feather="${trendIcon}" class="w-4 h-4"></i>
                                    ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%
                                </span>
                                <span class="text-sm text-gray-400">24h</span>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p class="text-gray-400">Market Cap</p>
                                <p class="font-semibold">${Formatters.formatCurrency(crypto.market_cap, currency, true)}</p>
                            </div>
                            <div>
                                <p class="text-gray-400">Volume 24h</p>
                                <p class="font-semibold">${Formatters.formatCurrency(crypto.total_volume, currency, true)}</p>
                            </div>
                        </div>
                        
                        ${isInPortfolio ? `
                            <div class="mt-3 p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
                                <p class="text-xs text-blue-300 mb-1">No seu portfólio</p>
                                <div id="portfolio-info-${crypto.id}">
                                    <!-- Portfolio info will be populated -->
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Re-initialize feather icons
        feather.replace();
        
        // Update portfolio info for coins in portfolio
        portfolioCoins.forEach(coinId => {
            Portfolio.updateCoinPortfolioInfo(coinId);
        });
    }
    
    renderErrorState() {
        const container = document.getElementById('crypto-grid');
        if (!container) return;
        
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="glassmorphism p-8 rounded-2xl max-w-md mx-auto">
                    <i data-feather="wifi-off" class="w-16 h-16 mx-auto mb-4 text-gray-400"></i>
                    <h3 class="text-xl font-bold mb-2">Erro ao carregar dados</h3>
                    <p class="text-gray-400 mb-4">Verifique sua conexão com a internet e tente novamente.</p>
                    <button onclick="app.handleRefresh()" class="btn-primary">
                        <i data-feather="refresh-cw" class="w-4 h-4 mr-2"></i>
                        Tentar Novamente
                    </button>
                </div>
            </div>
        `;
        
        feather.replace();
    }
    
    startPeriodicUpdates() {
        const interval = Storage.get('updateInterval', 60000); // Default: 1 minute
        this.setUpdateInterval(interval);
    }
    
    setUpdateInterval(interval) {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                this.loadMarketData();
            }
        }, interval);
        
        // Save to storage
        Storage.set('updateInterval', interval);
    }
    
    setupVisibilityHandling() {
        document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    }
    
    handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            // Page became visible, refresh data if it's been a while
            const now = Date.now();
            const timeSinceUpdate = now - (this.lastUpdateTime || 0);
            
            if (timeSinceUpdate > 300000) { // 5 minutes
                this.loadMarketData();
            }
        }
    }
    
    updateLastUpdateTime() {
        this.lastUpdateTime = Date.now();
        const element = document.getElementById('last-update');
        if (element) {
            element.textContent = Formatters.formatTime(new Date());
        }
    }
    
    // Event Handlers
    async handleRefresh() {
        const button = document.getElementById('refresh-btn');
        if (!button) return;
        
        // Add loading state
        const originalContent = button.innerHTML;
        button.innerHTML = '<i data-feather="loader" class="w-4 h-4 mr-2 animate-spin"></i>Atualizando...';
        button.disabled = true;
        
        try {
            await this.loadMarketData();
            Notifications.show('Dados atualizados com sucesso!', 'success');
            Analytics.trackEvent('data_refresh', 'user_action', 'manual_refresh');
        } catch (error) {
            console.error('Refresh failed:', error);
            Notifications.show('Erro ao atualizar dados', 'error');
        } finally {
            // Restore button state
            button.innerHTML = originalContent;
            button.disabled = false;
            feather.replace();
        }
    }
    
    handleSearch(query) {
        const cards = document.querySelectorAll('.coin-card');
        const normalizedQuery = query.toLowerCase().trim();
        
        cards.forEach(card => {
            const coinId = card.dataset.coinId;
            const coinName = card.querySelector('.coin-name')?.textContent.toLowerCase() || '';
            const coinSymbol = card.querySelector('.text-gray-400')?.textContent.toLowerCase() || '';
            
            const matches = !normalizedQuery || 
                          coinName.includes(normalizedQuery) || 
                          coinSymbol.includes(normalizedQuery) ||
                          coinId.includes(normalizedQuery);
            
            card.style.display = matches ? 'block' : 'none';
        });
        
        Analytics.trackEvent('search', 'user_action', 'crypto_search', query.length);
    }
    
    handleSort(sortBy) {
        // Implementation for sorting
        Analytics.trackEvent('sort', 'user_action', 'crypto_sort', sortBy);
        // This would require re-fetching data with sort parameters
        this.loadMarketData();
    }
    
    handleFilter(filterBy) {
        const cards = document.querySelectorAll('.coin-card');
        const portfolioCoins = Portfolio.getPortfolioCoins();
        
        cards.forEach(card => {
            const coinId = card.dataset.coinId;
            let show = true;
            
            switch (filterBy) {
                case 'portfolio':
                    show = portfolioCoins.includes(coinId);
                    break;
                case 'gainers':
                    const changeElement = card.querySelector('.trend-up');
                    show = !!changeElement;
                    break;
                case 'losers':
                    const lossElement = card.querySelector('.trend-down');
                    show = !!lossElement;
                    break;
                case 'all':
                default:
                    show = true;
            }
            
            card.style.display = show ? 'block' : 'none';
        });
        
        Analytics.trackEvent('filter', 'user_action', 'crypto_filter', filterBy);
    }
    
    handleCurrencyChange(currency) {
        Storage.set('currency', currency);
        this.loadMarketData();
        Analytics.trackEvent('currency_change', 'user_action', 'currency_switch', currency);
    }
    
    // Modal Management
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            // Focus management
            const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        document.body.style.overflow = '';
    }
    
    openSettings() {
        this.openModal('settings-modal');
        this.loadSettingsUI();
    }
    
    openNotifications() {
        // Implementation for notifications panel
        Notifications.showAll();
    }
    
    openAddCoinModal() {
        this.openModal('add-coin-modal');
        this.loadCoinSelectOptions();
    }
    
    openPortfolioSettings() {
        // Implementation for portfolio settings
        Portfolio.openSettings();
    }
    
    // Arbitrage Methods
    async startArbitrageMonitoring() {
        try {
            const watchlist = Portfolio.getPortfolioCoins();
            const coins = watchlist.length > 0 ? watchlist : ['bitcoin', 'ethereum', 'binancecoin', 'solana'];
            
            await Arbitrage.startMonitoring(coins, 60000); // Monitor every minute
            
            // Update UI
            document.getElementById('start-arbitrage-btn').classList.add('hidden');
            document.getElementById('stop-arbitrage-btn').classList.remove('hidden');
            
            // Listen for opportunities
            this.setupArbitrageUpdates();
            
            Notifications.show('Monitoramento de arbitragem iniciado!', 'success');
            
        } catch (error) {
            console.error('Failed to start arbitrage monitoring:', error);
            Notifications.show('Erro ao iniciar monitoramento', 'error');
        }
    }
    
    stopArbitrageMonitoring() {
        Arbitrage.stopMonitoring();
        
        // Update UI
        document.getElementById('start-arbitrage-btn').classList.remove('hidden');
        document.getElementById('stop-arbitrage-btn').classList.add('hidden');
        
        // Clear opportunities display
        this.updateArbitrageDisplay([]);
        
        if (this.arbitrageUpdateInterval) {
            clearInterval(this.arbitrageUpdateInterval);
            this.arbitrageUpdateInterval = null;
        }
        
        Notifications.show('Monitoramento parado', 'info');
    }
    
    setupArbitrageUpdates() {
        // Update arbitrage display every 30 seconds
        this.arbitrageUpdateInterval = setInterval(() => {
            const opportunities = Arbitrage.getTopOpportunities(6);
            this.updateArbitrageDisplay(opportunities);
        }, 30000);
        
        // Initial update
        setTimeout(() => {
            const opportunities = Arbitrage.getTopOpportunities(6);
            this.updateArbitrageDisplay(opportunities);
        }, 2000);
    }
    
    updateArbitrageDisplay(opportunities) {
        const grid = document.getElementById('arbitrage-grid');
        const empty = document.getElementById('arbitrage-empty');
        
        if (!grid || !empty) return;
        
        if (opportunities.length === 0) {
            grid.classList.add('hidden');
            empty.classList.remove('hidden');
            return;
        }
        
        grid.classList.remove('hidden');
        empty.classList.add('hidden');
        
        grid.innerHTML = opportunities.map(opp => `
            <div class="opportunity-card glassmorphism p-4 rounded-xl">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <div class="coin-icon ${opp.coinId}" title="${opp.coinId}">
                            ${opp.coinId.charAt(0).toUpperCase()}
                        </div>
                        <h3 class="font-semibold capitalize">${opp.coinId}</h3>
                        ${opp.isSimulated ? '<span class="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">SIM</span>' : ''}
                    </div>
                    <div class="text-right">
                        <span class="text-lg font-bold text-green-400">+${opp.profitPercentageFormatted}</span>
                    </div>
                </div>
                
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-400">Comprar em:</span>
                        <div class="flex items-center gap-2">
                            <i data-feather="${opp.buyExchangeIcon}" class="w-4 h-4"></i>
                            <span>${opp.buyExchangeName}</span>
                            <span class="font-mono">${opp.buyPriceFormatted}</span>
                        </div>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Vender em:</span>
                        <div class="flex items-center gap-2">
                            <i data-feather="${opp.sellExchangeIcon}" class="w-4 h-4"></i>
                            <span>${opp.sellExchangeName}</span>
                            <span class="font-mono">${opp.sellPriceFormatted}</span>
                        </div>
                    </div>
                    <div class="flex justify-between pt-2 border-t border-gray-600">
                        <span class="text-gray-400">Lucro estimado:</span>
                        <span class="font-semibold text-green-400">${opp.grossProfitFormatted}</span>
                    </div>
                </div>
                
                <div class="mt-3 pt-3 border-t border-gray-600">
                    <button class="btn-primary w-full text-sm" onclick="app.executeArbitrage('${opp.coinId}', '${opp.buyExchange}', '${opp.sellExchange}')">
                        <i data-feather="trending-up" class="w-4 h-4 mr-2"></i>
                        Executar Arbitragem
                    </button>
                </div>
            </div>
        `).join('');
        
        // Re-initialize feather icons
        feather.replace();
    }
    
    executeArbitrage(coinId, buyExchange, sellExchange) {
        // This would integrate with actual exchange APIs
        const message = `Para executar esta arbitragem:\n\n1. Compre ${coinId} em ${buyExchange}\n2. Transfira para ${sellExchange}\n3. Venda por lucro\n\nLembre-se de considerar taxas de transferência e tempo de confirmação.`;
        
        alert(message);
        
        // Track the execution attempt
        console.log(`Arbitrage execution attempted: ${coinId} ${buyExchange} -> ${sellExchange}`);
    }
    
    openArbitrageSettings() {
        // This would open a modal for arbitrage settings
        const minProfit = prompt('Margem mínima de lucro (%):', (Arbitrage.getMinProfitMargin() * 100).toFixed(1));
        
        if (minProfit !== null) {
            const margin = parseFloat(minProfit) / 100;
            if (!isNaN(margin) && margin >= 0) {
                Arbitrage.setMinProfitMargin(margin);
                Notifications.show(`Margem mínima atualizada para ${minProfit}%`, 'success');
            }
        }
    }
    
    async openCoinDetail(coinId) {
        this.openModal('coin-detail-modal');
        await this.loadCoinDetail(coinId);
    }
    
    async loadCoinDetail(coinId) {
        try {
            const coinData = await API.getCoinDetail(coinId);
            const historicalData = await API.getHistoricalData(coinId, 30);
            
            // Update modal content
            document.getElementById('detail-coin-name').textContent = coinData.name;
            document.getElementById('detail-coin-symbol').textContent = coinData.symbol;
            document.getElementById('detail-current-price').textContent = Formatters.formatCurrency(coinData.market_data.current_price.usd);
            document.getElementById('detail-24h-change').textContent = `${coinData.market_data.price_change_percentage_24h >= 0 ? '+' : ''}${coinData.market_data.price_change_percentage_24h.toFixed(2)}%`;
            
            // Update coin icon
            const iconElement = document.getElementById('detail-coin-icon');
            iconElement.className = `coin-icon ${coinId}`;
            iconElement.textContent = coinData.symbol.charAt(0).toUpperCase();
            
            // Render chart
            Charts.renderCoinChart('detail-chart', historicalData);
            
            // Render additional stats
            this.renderCoinStats(coinData);
            
        } catch (error) {
            console.error('Failed to load coin detail:', error);
            Notifications.show('Erro ao carregar detalhes da moeda', 'error');
        }
    }
    
    renderCoinStats(coinData) {
        const container = document.getElementById('detail-stats');
        if (!container) return;
        
        const stats = [
            { label: 'Market Cap', value: Formatters.formatCurrency(coinData.market_data.market_cap.usd, 'usd', true) },
            { label: 'Volume 24h', value: Formatters.formatCurrency(coinData.market_data.total_volume.usd, 'usd', true) },
            { label: 'Supply Circulante', value: Formatters.formatNumber(coinData.market_data.circulating_supply) },
            { label: 'Supply Total', value: Formatters.formatNumber(coinData.market_data.total_supply) },
            { label: 'ATH', value: Formatters.formatCurrency(coinData.market_data.ath.usd) },
            { label: 'ATL', value: Formatters.formatCurrency(coinData.market_data.atl.usd) }
        ];
        
        container.innerHTML = stats.map(stat => `
            <div class="flex justify-between py-2 border-b border-white/10">
                <span class="text-gray-400">${stat.label}</span>
                <span class="font-semibold">${stat.value}</span>
            </div>
        `).join('');
    }
    
    // Form Handlers
    async handleAddCoin(event) {
        event.preventDefault();
        
        const coinId = document.getElementById('coin-select').value;
        const amount = parseFloat(document.getElementById('coin-amount').value);
        const buyPrice = parseFloat(document.getElementById('coin-buy-price').value) || null;
        
        if (!coinId || !amount || amount <= 0) {
            Notifications.show('Por favor, preencha todos os campos obrigatórios', 'warning');
            return;
        }
        
        try {
            await Portfolio.addCoin(coinId, amount, buyPrice);
            this.closeModal('add-coin-modal');
            Notifications.show('Moeda adicionada ao portfólio!', 'success');
            
            // Refresh display
            await this.loadMarketData();
            
        } catch (error) {
            console.error('Failed to add coin:', error);
            Notifications.show('Erro ao adicionar moeda ao portfólio', 'error');
        }
    }
    
    async handleCreateAlert(event) {
        event.preventDefault();
        
        const coinId = document.querySelector('#coin-detail-modal').dataset.coinId;
        const alertType = document.getElementById('alert-type').value;
        const alertValue = parseFloat(document.getElementById('alert-value').value);
        
        if (!alertValue) {
            Notifications.show('Por favor, insira um valor para o alerta', 'warning');
            return;
        }
        
        try {
            await Alerts.createAlert(coinId, alertType, alertValue);
            Notifications.show('Alerta criado com sucesso!', 'success');
            
            // Reset form
            document.getElementById('alert-form').reset();
            
        } catch (error) {
            console.error('Failed to create alert:', error);
            Notifications.show('Erro ao criar alerta', 'error');
        }
    }
    
    // Utility Methods
    async loadCoinSelectOptions() {
        const select = document.getElementById('coin-select');
        if (!select) return;
        
        try {
            const coins = await API.getCoinsList();
            select.innerHTML = '<option value="">Selecione uma moeda...</option>' +
                coins.map(coin => `<option value="${coin.id}">${coin.name} (${coin.symbol.toUpperCase()})</option>`).join('');
        } catch (error) {
            console.error('Failed to load coin options:', error);
        }
    }
    
    loadSettingsUI() {
        // Load current settings into UI
        const darkMode = Theme.getCurrentTheme() === 'dark';
        const notificationsEnabled = Notifications.isEnabled();
        const updateInterval = Storage.get('updateInterval', 60000) / 1000;
        
        document.getElementById('dark-mode-toggle').checked = darkMode;
        document.getElementById('notifications-toggle').checked = notificationsEnabled;
        document.getElementById('update-interval').value = updateInterval.toString();
    }
    
    async loadUserSettings() {
        // Apply saved settings
        const theme = Storage.get('theme', 'dark');
        Theme.setTheme(theme);
        
        const currency = Storage.get('currency', 'usd');
        document.getElementById('currency-select').value = currency;
    }
    
    saveSettings() {
        const darkMode = document.getElementById('dark-mode-toggle').checked;
        const notificationsEnabled = document.getElementById('notifications-toggle').checked;
        const updateInterval = parseInt(document.getElementById('update-interval').value) * 1000;
        
        Theme.setTheme(darkMode ? 'dark' : 'light');
        Notifications.setEnabled(notificationsEnabled);
        this.setUpdateInterval(updateInterval);
        
        this.closeModal('settings-modal');
        Notifications.show('Configurações salvas!', 'success');
    }
    
    resetSettings() {
        if (confirm('Tem certeza que deseja restaurar as configurações padrão?')) {
            Storage.clear();
            Theme.setTheme('dark');
            Notifications.setEnabled(true);
            this.setUpdateInterval(60000);
            
            this.loadSettingsUI();
            Notifications.show('Configurações restauradas!', 'success');
        }
    }
    
    exportData() {
        try {
            const data = {
                portfolio: Portfolio.exportData(),
                alerts: Alerts.exportData(),
                settings: {
                    theme: Theme.getCurrentTheme(),
                    currency: Storage.get('currency', 'usd'),
                    updateInterval: Storage.get('updateInterval', 60000),
                    notifications: Notifications.isEnabled()
                },
                exportDate: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `crypto-monitor-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            
            Notifications.show('Dados exportados com sucesso!', 'success');
            Analytics.trackEvent('data_export', 'user_action', 'export_success');
            
        } catch (error) {
            console.error('Export failed:', error);
            Notifications.show('Erro ao exportar dados', 'error');
        }
    }
    
    triggerImport() {
        document.getElementById('import-file').click();
    }
    
    async handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!data.portfolio || !data.alerts || !data.settings) {
                throw new Error('Invalid backup file format');
            }
            
            // Import data
            await Portfolio.importData(data.portfolio);
            await Alerts.importData(data.alerts);
            
            // Apply settings
            Theme.setTheme(data.settings.theme);
            Storage.set('currency', data.settings.currency);
            this.setUpdateInterval(data.settings.updateInterval);
            Notifications.setEnabled(data.settings.notifications);
            
            // Refresh UI
            await this.loadMarketData();
            this.loadSettingsUI();
            
            Notifications.show('Dados importados com sucesso!', 'success');
            Analytics.trackEvent('data_import', 'user_action', 'import_success');
            
        } catch (error) {
            console.error('Import failed:', error);
            Notifications.show('Erro ao importar dados. Verifique o formato do arquivo.', 'error');
        }
        
        // Reset file input
        event.target.value = '';
    }
    
    // Quick Actions
    togglePortfolio(coinId) {
        const portfolioCoins = Portfolio.getPortfolioCoins();
        
        if (portfolioCoins.includes(coinId)) {
            Portfolio.removeCoin(coinId);
            Notifications.show('Moeda removida do portfólio', 'info');
        } else {
            // For quick add, we'll open the modal with the coin pre-selected
            this.openAddCoinModal();
            setTimeout(() => {
                document.getElementById('coin-select').value = coinId;
            }, 100);
        }
    }
    
    createQuickAlert(coinId) {
        this.openCoinDetail(coinId);
        setTimeout(() => {
            document.getElementById('alert-value').focus();
        }, 100);
    }
    
    // Error Handling
    handleInitializationError(error) {
        document.getElementById('loading-screen').innerHTML = `
            <div class="text-center">
                <div class="text-red-500 text-6xl mb-4">⚠️</div>
                <h2 class="text-2xl font-bold mb-2">Erro ao Inicializar</h2>
                <p class="text-gray-400 mb-4">Ocorreu um erro ao carregar o aplicativo.</p>
                <button onclick="location.reload()" class="btn-primary">
                    Recarregar Página
                </button>
                <details class="mt-4 text-left">
                    <summary class="cursor-pointer text-sm text-gray-500">Detalhes do erro</summary>
                    <pre class="mt-2 text-xs bg-gray-800 p-4 rounded overflow-auto">${error.stack || error.message}</pre>
                </details>
            </div>
        `;
    }
    
    handleGlobalError(event) {
        console.error('Global error:', event.error);
        Notifications.show('Ocorreu um erro inesperado', 'error');
        Analytics.trackEvent('error', 'app', 'global_error', event.error.message);
    }
    
    handleUnhandledRejection(event) {
        console.error('Unhandled promise rejection:', event.reason);
        Notifications.show('Erro de conexão ou processamento', 'error');
        Analytics.trackEvent('error', 'app', 'unhandled_rejection', event.reason.toString());
    }
    
    // Loading Screen
    showLoadingScreen() {
        const screen = document.getElementById('loading-screen');
        if (screen) {
            screen.classList.remove('hidden');
        }
    }
    
    hideLoadingScreen() {
        const screen = document.getElementById('loading-screen');
        if (screen) {
            setTimeout(() => {
                screen.style.opacity = '0';
                setTimeout(() => {
                    screen.classList.add('hidden');
                    screen.style.opacity = '1';
                }, 300);
            }, 500);
        }
    }
    
    // Cleanup
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
        
        // Cleanup modules
        Charts.destroy();
        Notifications.destroy();
    }
}

// Initialize the app
const app = new CryptoMonitorApp();

// Make app globally available for inline event handlers
window.app = app;

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    app.destroy();
});
