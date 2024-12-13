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
            <div class="search-item" data-index="${index}">
                <img src="${item.cover !== 'Unknown' ? item.cover : 'images/logo.png'}" alt="${item.track}" class="history-image">
                <div class="song-info">
                    <div class="song-title">${item.track}</div>
                    <div class="artist-name">${item.artist}</div>
                    <div class="search-time">${this.formatTime(item.timestamp)}</div>
                </div>
                <button class="icon-button delete-item" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        // Add click handlers for delete buttons
        const deleteButtons = searchList.querySelectorAll('.delete-item');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = button.dataset.index;
                this.deleteHistoryItem(index);
            });
        });

        // Add click handlers for search items
        const searchItems = searchList.querySelectorAll('.search-item');
        searchItems.forEach(item => {
            item.addEventListener('click', () => {
                const index = item.dataset.index;
                const historyItem = history[index];
                if (historyItem.url && historyItem.url !== 'Unknown') {
                    window.open(historyItem.url, '_blank');
                }
            });
        });

        // Add entrance animations
        searchItems.forEach((item, index) => {
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
