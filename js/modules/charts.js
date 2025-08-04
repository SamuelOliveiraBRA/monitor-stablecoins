/**
 * Charts Module
 * Handles all chart rendering and visualization using Chart.js
 */

class ChartsModule {
    constructor() {
        this.charts = new Map();
        this.defaultOptions = this.getDefaultOptions();
        this.colorPalette = this.getColorPalette();
        this.gradients = new Map();
    }
    
    init() {
        console.log('📊 Charts Module initialized');
        this.setupChartDefaults();
        this.createGradients();
    }
    
    setupChartDefaults() {
        // Configure Chart.js defaults
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#d1d5db';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
        Chart.defaults.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        
        // Register custom plugins
        Chart.register({
            id: 'customTooltip',
            beforeTooltipDraw: this.customTooltipPlugin
        });
    }
    
    getDefaultOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        padding: 20,
                        color: '#d1d5db',
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#d1d5db',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: (context) => {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            const currency = Storage.get('currency', 'usd');
                            return `${label}: ${Formatters.formatCurrency(value, currency)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9ca3af',
                        maxTicksLimit: 8
                    }
                },
                y: {
                    display: true,
                    position: 'right',
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9ca3af',
                        callback: function(value) {
                            const currency = Storage.get('currency', 'usd');
                            return Formatters.formatCurrency(value, currency, true);
                        }
                    }
                }
            },
            elements: {
                point: {
                    radius: 0,
                    hoverRadius: 6,
                    hitRadius: 10
                },
                line: {
                    tension: 0.4,
                    borderWidth: 2
                }
            }
        };
    }
    
    getColorPalette() {
        return {
            primary: '#3b82f6',
            success: '#10b981',
            danger: '#ef4444',
            warning: '#f59e0b',
            info: '#06b6d4',
            purple: '#8b5cf6',
            pink: '#ec4899',
            indigo: '#6366f1',
            green: '#22c55e',
            orange: '#f97316'
        };
    }
    
    createGradients() {
        // Create reusable gradients
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Price gradient (blue)
        const priceGradient = ctx.createLinearGradient(0, 0, 0, 400);
        priceGradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
        priceGradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
        this.gradients.set('price', priceGradient);
        
        // Volume gradient (purple)
        const volumeGradient = ctx.createLinearGradient(0, 0, 0, 400);
        volumeGradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
        volumeGradient.addColorStop(1, 'rgba(139, 92, 246, 0.05)');
        this.gradients.set('volume', volumeGradient);
        
        // Positive change gradient (green)
        const positiveGradient = ctx.createLinearGradient(0, 0, 0, 400);
        positiveGradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
        positiveGradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)');
        this.gradients.set('positive', positiveGradient);
        
        // Negative change gradient (red)
        const negativeGradient = ctx.createLinearGradient(0, 0, 0, 400);
        negativeGradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
        negativeGradient.addColorStop(1, 'rgba(239, 68, 68, 0.05)');
        this.gradients.set('negative', negativeGradient);
    }
    
    // Main Chart Rendering Methods
    renderCoinChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas with id '${canvasId}' not found`);
            return null;
        }
        
        // Destroy existing chart
        this.destroyChart(canvasId);
        
        const ctx = canvas.getContext('2d');
        const chartOptions = this.mergeOptions(this.defaultOptions, {
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: (tooltipItems) => {
                            const date = tooltipItems[0].parsed.x;
                            return Formatters.formatDate(new Date(date));
                        },
                        label: (context) => {
                            const currency = Storage.get('currency', 'usd');
                            return `Preço: ${Formatters.formatCurrency(context.parsed.y, currency)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                            hour: 'HH:mm',
                            day: 'MMM dd',
                            week: 'MMM dd',
                            month: 'MMM yyyy'
                        }
                    },
                    ticks: {
                        source: 'auto',
                        maxTicksLimit: 8
                    }
                }
            },
            ...options
        });
        
        // Create gradient for the chart
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
        
        const chartData = {
            labels: data.labels,
            datasets: [{
                label: 'Preço',
                data: data.datasets[0].data,
                borderColor: this.colorPalette.primary,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                borderWidth: 2
            }]
        };
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: chartOptions
        });
        
        this.charts.set(canvasId, chart);
        return chart;
    }
    
    renderPortfolioChart(canvasId, portfolioData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !portfolioData || portfolioData.length === 0) {
            return null;
        }
        
        this.destroyChart(canvasId);
        
        const ctx = canvas.getContext('2d');
        
        // Prepare data
        const sortedData = portfolioData
            .sort((a, b) => b.currentValue - a.currentValue)
            .slice(0, 8); // Top 8 holdings
        
        const labels = sortedData.map(item => item.coinId.toUpperCase());
        const data = sortedData.map(item => item.currentValue);
        const colors = this.generatePortfolioColors(sortedData.length);
        
        const chartOptions = this.mergeOptions(this.defaultOptions, {
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const currency = Storage.get('currency', 'usd');
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${Formatters.formatCurrency(value, currency)} (${percentage}%)`;
                        }
                    }
                }
            }
        });
        
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    hoverBorderWidth: 3,
                    hoverBorderColor: 'rgba(255, 255, 255, 0.3)'
                }]
            },
            options: chartOptions
        });
        
        this.charts.set(canvasId, chart);
        return chart;
    }
    
    renderMarketOverviewChart(canvasId, marketData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !marketData) return null;
        
        this.destroyChart(canvasId);
        
        const ctx = canvas.getContext('2d');
        
        // Prepare market cap vs volume comparison
        const labels = marketData.map(coin => coin.symbol.toUpperCase());
        const marketCapData = marketData.map(coin => coin.market_cap);
        const volumeData = marketData.map(coin => coin.total_volume);
        
        const chartOptions = this.mergeOptions(this.defaultOptions, {
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    type: 'logarithmic',
                    ticks: {
                        callback: function(value) {
                            const currency = Storage.get('currency', 'usd');
                            return Formatters.formatCurrency(value, currency, true);
                        }
                    }
                }
            }
        });
        
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Market Cap',
                        data: marketCapData,
                        backgroundColor: 'rgba(59, 130, 246, 0.7)',
                        borderColor: this.colorPalette.primary,
                        borderWidth: 1
                    },
                    {
                        label: 'Volume 24h',
                        data: volumeData,
                        backgroundColor: 'rgba(139, 92, 246, 0.7)',
                        borderColor: this.colorPalette.purple,
                        borderWidth: 1
                    }
                ]
            },
            options: chartOptions
        });
        
        this.charts.set(canvasId, chart);
        return chart;
    }
    
    renderTechnicalIndicators(canvasId, data, indicators = []) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !data) return null;
        
        this.destroyChart(canvasId);
        
        const ctx = canvas.getContext('2d');
        const datasets = [];
        
        // Base price dataset
        datasets.push({
            label: 'Preço',
            data: data.prices,
            borderColor: this.colorPalette.primary,
            backgroundColor: this.gradients.get('price'),
            fill: true,
            yAxisID: 'price'
        });
        
        // Add technical indicators
        indicators.forEach((indicator, index) => {
            const color = Object.values(this.colorPalette)[index + 1] || this.colorPalette.info;
            
            datasets.push({
                label: indicator.name,
                data: indicator.data,
                borderColor: color,
                backgroundColor: 'transparent',
                fill: false,
                yAxisID: indicator.yAxis || 'price',
                borderDash: indicator.dashed ? [5, 5] : undefined
            });
        });
        
        const chartOptions = this.mergeOptions(this.defaultOptions, {
            scales: {
                x: {
                    type: 'time'
                },
                price: {
                    type: 'linear',
                    display: true,
                    position: 'right'
                },
                volume: {
                    type: 'linear',
                    display: false,
                    position: 'left',
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        });
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: datasets
            },
            options: chartOptions
        });
        
        this.charts.set(canvasId, chart);
        return chart;
    }
    
    // Utility Methods
    mergeOptions(defaultOpts, customOpts) {
        return this.deepMerge(JSON.parse(JSON.stringify(defaultOpts)), customOpts);
    }
    
    deepMerge(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                this.deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }
    
    generatePortfolioColors(count) {
        const baseColors = [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
            '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
        ];
        
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(baseColors[i % baseColors.length]);
        }
        
        return colors;
    }
    
    destroyChart(canvasId) {
        const existingChart = this.charts.get(canvasId);
        if (existingChart) {
            existingChart.destroy();
            this.charts.delete(canvasId);
        }
    }
    
    // Advanced Chart Types
    renderCandlestickChart(canvasId, ohlcData) {
        // Implementation for candlestick charts
        // This would require a candlestick chart plugin for Chart.js
        console.log('Candlestick charts require additional plugin');
    }
    
    renderHeatmap(canvasId, correlationData) {
        // Implementation for correlation heatmap
        console.log('Heatmap charts require additional implementation');
    }
    
    // Chart Animation Utilities
    animateChart(chartId, animationType = 'easeInOutQuart', duration = 1000) {
        const chart = this.charts.get(chartId);
        if (chart) {
            chart.options.animation = {
                duration: duration,
                easing: animationType
            };
            chart.update();
        }
    }
    
    // Export Chart
    exportChart(chartId, format = 'png') {
        const chart = this.charts.get(chartId);
        if (!chart) return null;
        
        const canvas = chart.canvas;
        
        switch (format) {
            case 'png':
                return canvas.toDataURL('image/png');
            case 'jpg':
                return canvas.toDataURL('image/jpeg', 0.9);
            case 'svg':
                // SVG export would require additional implementation
                console.warn('SVG export not implemented');
                return null;
            default:
                return canvas.toDataURL();
        }
    }
    
    // Responsive Chart Handling
    handleResize() {
        this.charts.forEach((chart, canvasId) => {
            chart.resize();
        });
    }
    
    // Theme Support
    updateChartsTheme(isDark) {
        const textColor = isDark ? '#d1d5db' : '#374151';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        
        Chart.defaults.color = textColor;
        Chart.defaults.borderColor = gridColor;
        
        // Update existing charts
        this.charts.forEach((chart) => {
            if (chart.options.scales) {
                Object.values(chart.options.scales).forEach(scale => {
                    if (scale.ticks) scale.ticks.color = textColor;
                    if (scale.grid) scale.grid.color = gridColor;
                });
            }
            chart.update();
        });
    }
    
    // Performance Monitoring
    getPerformanceStats() {
        return {
            activeCharts: this.charts.size,
            chartIds: Array.from(this.charts.keys()),
            memoryUsage: this.charts.size * 50 // Estimated KB per chart
        };
    }
    
    // Cleanup
    destroy() {
        this.charts.forEach((chart, canvasId) => {
            chart.destroy();
        });
        this.charts.clear();
    }
    
    // Custom Tooltip Plugin
    customTooltipPlugin = {
        beforeTooltipDraw: (chart, args, options) => {
            const { tooltip } = args;
            if (!tooltip || !tooltip.opacity) return;
            
            const { ctx } = chart;
            ctx.save();
            
            // Custom tooltip styling
            const tooltipEl = tooltip.body[0];
            if (tooltipEl) {
                // Add custom styling here
            }
            
            ctx.restore();
        }
    };
}

// Add resize listener
window.addEventListener('resize', () => {
    if (window.Charts) {
        Charts.handleResize();
    }
});

// Export for use in other modules
const Charts = new ChartsModule();
