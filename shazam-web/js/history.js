class HistoryView {
    constructor() {
        this.HISTORY_LIMIT = 20; // Límite consistente con app.js
        this.init();
    }

    init() {
        // Listen for view load
        document.addEventListener('viewLoaded', (event) => {
            if (event.detail.view === 'history') {
                this.setup();
            }
        });

        // Listen for settings changes
        document.addEventListener('settingsChanged', (event) => {
            if (!event.detail.saveTracks) {
                // Si se desactiva guardar tracks, limpiar el historial
                this.clearHistory();
            }
        });
    }

    setup() {
        const clearButton = document.querySelector('.clear-history');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clearHistory();
            });
        }

        this.updateHistoryList();
    }

    updateHistoryList() {
        const searchList = document.querySelector('.search-list');
        if (!searchList) return;

        const settings = this.loadSettings();
        const history = this.getHistory();

        if (!settings.saveTracks || history.length === 0) {
            searchList.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-history"></i>
                    <p>No recent searches</p>
                </div>
            `;
            return;
        }

        searchList.innerHTML = history.map((item, index) => `
            <div class="history-item" data-index="${index}">
                <img src="${item.cover !== 'Unknown' ? item.cover : 'images/solodisco.png'}" alt="${item.track}" class="history-image">
                <div class="history-info">
                    <h3>${item.track}</h3>
                    <p>${item.artist}</p>
                </div>
                ${item.url && item.url !== 'Unknown' ? `
                    <a href="${item.url}" target="_blank" class="history-button">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                ` : ''}
            </div>
        `).join('');

        // Add entrance animations
        const historyItems = searchList.querySelectorAll('.history-item');
        historyItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                item.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, 50 * index);
        });
    }

    deleteHistoryItem(index) {
        const history = this.getHistory();
        history.splice(index, 1);
        this.saveHistory(history);
        this.updateHistoryList();
        
        window.app.showMessage('Item eliminado del historial');
    }

    clearHistory() {
        this.saveHistory([]);
        this.updateHistoryList();
        window.app.showMessage('Historial limpiado');
    }

    getHistory() {
        try {
            return JSON.parse(localStorage.getItem('searchHistory') || '[]');
        } catch (error) {
            console.error('Error reading search history:', error);
            return [];
        }
    }

    saveHistory(history) {
        // Asegurar que no exceda el límite
        if (history.length > this.HISTORY_LIMIT) {
            history = history.slice(0, this.HISTORY_LIMIT);
        }
        localStorage.setItem('searchHistory', JSON.stringify(history));
    }

    loadSettings() {
        const defaultSettings = { saveTracks: true };
        try {
            const savedSettings = localStorage.getItem('settings');
            return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
        } catch (error) {
            console.error('Error loading settings:', error);
            return defaultSettings;
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        // Less than 24 hours
        if (diff < 24 * 60 * 60 * 1000) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        // Less than 7 days
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            return days[date.getDay()];
        }
        // Otherwise show date
        return date.toLocaleDateString();
    }
}

// Initialize the history view
new HistoryView();
