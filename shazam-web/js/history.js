class HistoryView {
    constructor() {
        this.init();
    }

    init() {
        // Listen for view load
        document.addEventListener('viewLoaded', (event) => {
            if (event.detail.view === 'history') {
                this.setup();
            }
        });

        // Listen for history updates from search view
        document.addEventListener('historyUpdated', () => {
            this.updateHistoryList();
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

        const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');

        if (history.length === 0) {
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
                <div class="play-button">
                    <i class="fas fa-play"></i>
                </div>
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
                if (historyItem.url) {
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
            }, 50 * index); // Stagger the animations
        });
    }

    deleteHistoryItem(index) {
        const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        history.splice(index, 1);
        localStorage.setItem('searchHistory', JSON.stringify(history));
        this.updateHistoryList();
        
        window.app.showMessage('Item eliminado del historial');
    }

    clearHistory() {
        localStorage.setItem('searchHistory', '[]');
        this.updateHistoryList();
        
        window.app.showMessage('Historial limpiado');
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
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return days[date.getDay()];
        }
        // Otherwise show date
        return date.toLocaleDateString();
    }
}

// Initialize the history view
new HistoryView();
