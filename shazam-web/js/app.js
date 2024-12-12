class App {
    constructor() {
        this.currentView = null;
        this.viewCache = {};
        this.navItems = document.querySelectorAll('.nav-item');
        this.init();
    }

    async init() {
        console.log('Initializing app...');
        // Set up navigation event listeners
        this.navItems.forEach(item => {
            item.addEventListener('click', () => {
                const viewName = item.dataset.view;
                this.navigateToView(viewName);
            });
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.view) {
                this.navigateToView(event.state.view, true);
            }
        });

        // Get initial view from URL hash or default to home
        const initialView = window.location.hash.slice(1) || 'home';
        console.log('Loading initial view:', initialView);
        await this.navigateToView(initialView);
    }

    async loadView(viewName) {
        console.log('Loading view:', viewName);
        if (this.viewCache[viewName]) {
            console.log('Using cached view:', viewName);
            return this.viewCache[viewName];
        }

        try {
            console.log('Fetching view from:', `views/${viewName}.html`);
            const response = await fetch(`views/${viewName}.html`);
            if (!response.ok) {
                console.error('Failed to load view:', viewName, response.status, response.statusText);
                throw new Error(`Failed to load view: ${viewName} - ${response.status} ${response.statusText}`);
            }
            const html = await response.text();
            console.log('View loaded successfully:', viewName);
            this.viewCache[viewName] = html;
            return html;
        } catch (error) {
            console.error('Error loading view:', error);
            return '<div class="error">Error loading view</div>';
        }
    }

    async navigateToView(viewName, skipPushState = false) {
        console.log('Navigating to view:', viewName);
        if (this.currentView === viewName) {
            console.log('Already on view:', viewName);
            return;
        }

        // Update navigation UI
        this.navItems.forEach(item => {
            if (item.dataset.view === viewName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Hide current view with animation
        if (this.currentView) {
            const currentViewElement = document.getElementById(`${this.currentView}-view`);
            if (currentViewElement) {
                currentViewElement.style.opacity = '0';
                currentViewElement.style.transform = 'translateX(-100%)';
                await new Promise(resolve => setTimeout(resolve, 300));
                currentViewElement.remove();
            }
        }

        // Load and show new view
        console.log('Loading view content for:', viewName);
        const viewContent = await this.loadView(viewName);
        
        // Create container for the new view
        const mainContainer = document.querySelector('.main-container');
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = viewContent;
        
        // Get the view element with all its classes and content
        const newViewElement = tempContainer.firstElementChild;
        mainContainer.appendChild(newViewElement);
        
        // Show new view with animation
        setTimeout(() => {
            newViewElement.style.opacity = '0';
            newViewElement.style.transform = 'translateX(100%)';
            
            // Force reflow
            void newViewElement.offsetWidth;
            
            newViewElement.style.opacity = '1';
            newViewElement.style.transform = 'translateX(0)';
            newViewElement.classList.add('active');
        }, 0);

        this.currentView = viewName;

        // Update browser history
        if (!skipPushState) {
            const url = `${window.location.pathname}#${viewName}`;
            window.history.pushState({ view: viewName }, '', url);
        }

        // Set up view-specific functionality
        if (viewName === 'home') {
            this.setupHomeView(newViewElement);
        } else if (viewName === 'search') {
            this.setupSearchView(newViewElement);
        } else if (viewName === 'history') {
            this.setupHistoryView(newViewElement);
        }

        // Dispatch event for view-specific scripts
        const event = new CustomEvent('viewLoaded', { 
            detail: { view: viewName }
        });
        document.dispatchEvent(event);
        console.log('View navigation complete:', viewName);
    }

    setupHomeView(viewElement) {
        const continueButton = viewElement.querySelector('.continue-button');
        if (continueButton) {
            continueButton.addEventListener('click', () => {
                this.navigateToView('search');
            });
        }
    }

    setupSearchView(viewElement) {
        const dropZone = viewElement.querySelector('.drop-zone');
        const fileInput = viewElement.querySelector('#videoUpload');
        const uploadButton = viewElement.querySelector('.upload-button');

        if (dropZone && fileInput) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-over');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                if (e.dataTransfer.files.length) {
                    fileInput.files = e.dataTransfer.files;
                    this.handleFileUpload(fileInput.files[0]);
                }
            });

            uploadButton.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', () => {
                if (fileInput.files.length) {
                    this.handleFileUpload(fileInput.files[0]);
                }
            });
        }
    }

    setupHistoryView(viewElement) {
        this.displaySearchHistory(viewElement);
        
        const clearButton = viewElement.querySelector('.clear-history');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clearSearchHistory();
                this.displaySearchHistory(viewElement);
            });
        }
    }

    async handleFileUpload(file) {
        this.showLoading();
        const formData = new FormData();
        formData.append('video', file);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();
            this.showResults(result);
            this.addToSearchHistory(result);
        } catch (error) {
            console.error('Upload error:', error);
            this.showMessage('Error uploading file. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showResults(data) {
        const resultsContainer = document.getElementById('results');
        if (!resultsContainer) return;

        const resultHTML = `
            <div class="result-card">
                <img src="${data.cover}" alt="${data.track}" class="result-image">
                <div class="result-info">
                    <h3>${data.track}</h3>
                    <p>${data.artist}</p>
                </div>
                <div class="result-actions">
                    <a href="${data.url}" target="_blank" class="result-button">
                        <i class="fas fa-external-link-alt"></i>
                        Open
                    </a>
                </div>
            </div>
        `;

        resultsContainer.innerHTML = resultHTML;
    }

    addToSearchHistory(result) {
        const history = this.getSearchHistory();
        const timestamp = new Date().toISOString();
        
        // Add new search to beginning of array
        history.unshift({
            ...result,
            timestamp
        });

        // Keep only the last 20 searches
        if (history.length > 20) {
            history.pop();
        }

        localStorage.setItem('searchHistory', JSON.stringify(history));

        // Update history view if it's currently visible
        if (this.currentView === 'history') {
            const historyView = document.getElementById('history-view');
            if (historyView) {
                this.displaySearchHistory(historyView);
            }
        }
    }

    getSearchHistory() {
        try {
            const history = localStorage.getItem('searchHistory');
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Error reading search history:', error);
            return [];
        }
    }

    clearSearchHistory() {
        localStorage.removeItem('searchHistory');
        this.showMessage('Search history cleared');
    }

    displaySearchHistory(viewElement) {
        const searchList = viewElement.querySelector('.search-list');
        if (!searchList) return;

        const history = this.getSearchHistory();
        
        if (history.length === 0) {
            searchList.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-music"></i>
                    <p>No songs identified yet</p>
                </div>
            `;
            return;
        }

        const formatTime = (timestamp) => {
            const date = new Date(timestamp);
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        };

        const historyHTML = history.map(item => `
            <div class="history-item">
                <img src="${item.cover}" alt="${item.track}" class="history-image">
                <div class="history-info">
                    <h3>${item.track}</h3>
                    <p>${item.artist}</p>
                    <span class="history-timestamp">${formatTime(item.timestamp)}</span>
                </div>
                <a href="${item.url}" target="_blank" class="history-button">
                    <i class="fas fa-external-link-alt"></i>
                </a>
            </div>
        `).join('');

        searchList.innerHTML = historyHTML;
    }

    showLoading() {
        const loadingHTML = `
            <div class="loading-overlay">
                <div class="loading-content">
                    <div class="spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', loadingHTML);
    }

    hideLoading() {
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => loadingOverlay.remove(), 300);
        }
    }

    showMessage(message, type = 'info') {
        const messageHTML = `
            <div class="message ${type}">
                ${message}
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', messageHTML);
        
        const messageElement = document.querySelector('.message');
        setTimeout(() => {
            messageElement.style.opacity = '0';
            messageElement.style.transform = 'translate(-50%, 20px)';
            setTimeout(() => messageElement.remove(), 300);
        }, 3000);
    }
}

// Initialize the app and make it globally available
window.app = new App();
