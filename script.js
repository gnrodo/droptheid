document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    const continueButton = document.querySelector('.continue-button');
    const uploadBox = document.querySelector('.upload-box');
    const fileInput = document.getElementById('videoUpload');
    const searchList = document.querySelector('.search-list');
    const saveTracksToggle = document.getElementById('save-tracks');
    const saveSettingsButton = document.querySelector('.save-settings');

    // Load saved settings
    const savedSettings = JSON.parse(localStorage.getItem('settings') || '{"saveTracks": true}');
    saveTracksToggle.checked = savedSettings.saveTracks;

    // Navigation handling
    function showView(viewId) {
        views.forEach(view => {
            if (view.id === viewId) {
                view.classList.remove('hidden');
            } else {
                view.classList.add('hidden');
            }
        });

        navItems.forEach(item => {
            if (item.dataset.view === viewId.replace('-view', '')) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.dataset.view + '-view';
            showView(viewId);
        });
    });

    // Continue button in home view
    continueButton?.addEventListener('click', () => {
        showView('search-view');
        navItems.forEach(item => {
            if (item.dataset.view === 'search') {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    });

    // File upload handling
    uploadBox?.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadBox.classList.add('dragging');
    });

    uploadBox?.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadBox.classList.remove('dragging');
    });

    uploadBox?.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadBox.classList.remove('dragging');
        
        const files = e.dataTransfer?.files;
        if (files && files[0]) {
            fileInput.files = files;
            handleFile(files[0]);
        }
    });

    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    });

    // Settings handling
    saveSettingsButton?.addEventListener('click', () => {
        const settings = {
            saveTracks: saveTracksToggle.checked
        };
        localStorage.setItem('settings', JSON.stringify(settings));
        showMessage('Configuración guardada');
    });

    // File handling
    async function handleFile(file) {
        if (!file.type.includes('video/')) {
            showMessage('Por favor, selecciona un archivo de video');
            return;
        }

        showLoading();
        const formData = new FormData();
        formData.append('video', file);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Error al procesar el video');
            }

            const data = await response.json();
            if (saveTracksToggle.checked) {
                saveToHistory(data);
            }
            showMessage(`¡Identificado! ${data.track} - ${data.artist}`);
            updateHistoryView();
        } catch (error) {
            showMessage(error.message);
        } finally {
            hideLoading();
        }
    }

    // History handling
    function saveToHistory(data) {
        const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        history.unshift({
            track: data.track,
            artist: data.artist,
            cover: data.cover,
            duration: data.duration,
            url: data.url,
            timestamp: new Date().toISOString()
        });
        // Keep only last 10 searches
        if (history.length > 10) history.pop();
        localStorage.setItem('searchHistory', JSON.stringify(history));
    }

    function updateHistoryView() {
        const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        if (searchList) {
            searchList.innerHTML = history.map(item => `
                <div class="search-item">
                    <div class="song-cover">
                        <img src="${item.cover !== 'Unknown' ? item.cover : 'images/default-cover.png'}" alt="Album cover">
                    </div>
                    <div class="song-info">
                        <div class="song-title">${item.track}</div>
                        <div class="artist-name">${item.artist}</div>
                        ${item.duration !== 'Unknown' ? `<div class="song-duration">${item.duration}</div>` : ''}
                    </div>
                    <a href="${item.url}" target="_blank" class="play-button" ${item.url === 'Unknown' ? 'style="display:none;"' : ''}>
                        <i class="fas fa-play"></i>
                    </a>
                </div>
            `).join('');
        }
    }

    // Initialize history view
    updateHistoryView();

    // UI feedback
    function showMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        setTimeout(() => messageDiv.remove(), 3000);
    }

    function showLoading() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-overlay';
        loadingDiv.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p>Identificando canción...</p>
            </div>
        `;
        document.body.appendChild(loadingDiv);
    }

    function hideLoading() {
        const loadingDiv = document.querySelector('.loading-overlay');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }
});
