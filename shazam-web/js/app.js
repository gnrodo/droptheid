class App {
    constructor() {
        this.currentView = null;
        this.viewCache = {};
        this.navItems = document.querySelectorAll('.nav-item');
        this.lastSearchResult = null;
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
            return '<div class="error">Error al cargar la vista</div>';
        }
    }

    async navigateToView(viewName, skipPushState = false) {
        console.log('Navigating to view:', viewName);
        if (this.currentView === viewName) {
            console.log('Already on view:', viewName);
            return;
        }

        // Prevent multiple navigations while transition is happening
        if (this.isNavigating) {
            console.log('Navigation already in progress');
            return;
        }
        this.isNavigating = true;

        try {
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
            newViewElement.style.opacity = '0';
            newViewElement.style.transform = 'translateX(100%)';
            
            // Force reflow
            void newViewElement.offsetWidth;
            
            newViewElement.style.transition = 'all 0.3s ease-out';
            newViewElement.style.opacity = '1';
            newViewElement.style.transform = 'translateX(0)';
            newViewElement.classList.add('active');

            this.currentView = viewName;

            // Update browser history
            if (!skipPushState) {
                const url = `${window.location.pathname}#${viewName}`;
                window.history.pushState({ view: viewName }, '', url);
            }

            // Set up view-specific functionality
            if (viewName === 'search') {
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

            // Wait for animation to complete before allowing new navigation
            await new Promise(resolve => setTimeout(resolve, 300));
        } finally {
            this.isNavigating = false;
        }
    }

    setupSearchView(viewElement) {
        const dropZone = viewElement.querySelector('.drop-zone');
        const fileInput = viewElement.querySelector('#videoUpload');
        const uploadButton = viewElement.querySelector('.upload-button');
								const resultsContainer = viewElement.querySelector('#results');

        // Restore last search result if exists
        if (this.lastSearchResult && resultsContainer) {
            this.showResults(this.lastSearchResult);
        }

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
        // Check file size before uploading (50MB limit)
        const MAX_FILE_SIZE = 52428800; // 50MB in bytes
        if (file.size > MAX_FILE_SIZE) {
												this.showMessage('El archivo es demasiado grande. El tamaño máximo permitido es 50MB.', 'error');
            return;
        }

        this.showLoading();
        const formData = new FormData();
        formData.append('video', file);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Subida fallida');
            }

            const result = await response.json();
            this.showResults(result);
            this.addToSearchHistory(result);
        } catch (error) {
            console.error('Error de subida:', error);
            this.showMessage('Error al subir el archivo. Por favor intenta de nuevo.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showResults(data) {
        const resultsContainer = document.getElementById('results');
        if (!resultsContainer) return;

        // Store the result for persistence
        this.lastSearchResult = data;

        // Declare variables first
        let coverImage, trackName, artistName;
        // Trim and convert to lowercase for comparison
        const track = (data.track || '').trim().toLowerCase();
        const isUnknown = track === 'unknown' || !track;

        // Then assign values based on isUnknown
        if (isUnknown) {
            coverImage = 'images/solodisco.png';
            trackName = 'Pista Desconocida';
            artistName = 'Artista Desconocido';
        } else {
            coverImage = data.cover;
            trackName = data.track;
            artistName = data.artist;
        }

        const timestamp = new Date().toISOString();
        const formatTime = (timestamp) => {
            const date = new Date(timestamp);
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        };

        const resultHTML = `
            <div class="history-item">
                <img src="${coverImage}" alt="${trackName}" class="history-image">
                <div class="history-info">
                    <h3>${trackName}</h3>
                    <p>${artistName}</p>
																</div>
                <div class="history-actions">
                    ${!isUnknown ? `
                        <a href="${data.url}" target="_blank" class="history-button">
                            <i class="fas fa-external-link-alt"></i>
                        </a>
                    ` : ''}
                    <button class="history-button delete-item">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;

        resultsContainer.innerHTML = resultHTML;
        
                // Add click handler for delete button in search results
                const deleteButton = resultsContainer.querySelector('.delete-item');
                if (deleteButton) {
                    deleteButton.addEventListener('click', () => {
                        resultsContainer.innerHTML = '';
                        this.lastSearchResult = null;
                        this.showMessage('Resultado eliminado');
                    });
                }
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
        this.showMessage('Historial borrado');
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

        const historyHTML = history.map((item, index) => {
            // Trim and convert to lowercase for comparison
            const track = (item.track || '').trim().toLowerCase();
            const isUnknown = track === 'unknown' || !track;
            const coverImage = isUnknown ? 'images/solodisco.png' : item.cover;
            const trackName = isUnknown ? 'Pista Desconocida' : item.track;
            const artistName = isUnknown ? 'Artista Desconocido' : item.artist;

            return `
                <div class="history-item">
                    <img src="${coverImage}" alt="${trackName}" class="history-image">
                    <div class="history-info">
                        <h3>${trackName}</h3>
                        <p>${artistName}</p>
                        <span class="history-timestamp">${formatTime(item.timestamp)}</span>
                    </div>
                    <div class="history-actions">
                        ${!isUnknown ? `
                            <a href="${item.url}" target="_blank" class="history-button">
                                <i class="fas fa-external-link-alt"></i>
                            </a>
                        ` : ''}
                        <button class="history-button delete-item" data-index="${index}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        searchList.innerHTML = historyHTML;
        
                // Add click handlers for delete buttons
                const deleteButtons = searchList.querySelectorAll('.delete-item');
                deleteButtons.forEach(button => {
                    button.addEventListener('click', (e) => {
                        e.preventDefault();
                        const index = parseInt(button.dataset.index);
                        const history = this.getSearchHistory();
                        history.splice(index, 1);
                        localStorage.setItem('searchHistory', JSON.stringify(history));
                        this.displaySearchHistory(viewElement);
                        this.showMessage('Item eliminado del historial');
                    });
                });
    }

    showLoading() {
        const loadingHTML = `
            <div class="loading-overlay">
                <div class="loading-content">
                    <div class="spinner"></div>
                    <p>Cargando...</p>
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
        // Remove any existing messages first
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        const messageHTML = `
            <div class="message ${type}">
                ${message}
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', messageHTML);
        
        const messageElement = document.querySelector('.message');
        setTimeout(() => {
            messageElement.style.opacity = '0';
            setTimeout(() => messageElement.remove(), 300);
        }, 1500);
    }
}

// Initialize the app and make it globally available
window.app = new App();
