document.addEventListener('DOMContentLoaded', () => {
    const uploadBox = document.querySelector('.upload-box');
    const fileInput = document.getElementById('videoUpload');
    const resultsContainer = document.getElementById('results');

    // Drag and drop handling
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

    // Click to upload
    const chooseButton = document.querySelector('.choose-video');
    chooseButton?.addEventListener('click', () => {
        fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    });

    // File handling
    async function handleFile(file) {
        if (!file.type.includes('video/') && !file.type.includes('audio/')) {
            showMessage('Por favor, selecciona un archivo de video o audio');
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
                throw new Error('Error al procesar el archivo');
            }

            const data = await response.json();
            
            // Crear y mostrar la tarjeta de resultado
            showResult(data);

            showMessage('¡Canción identificada!');

            // Guardar en el historial si está habilitado
            const settings = JSON.parse(localStorage.getItem('settings') || '{"saveTracks": true}');
            if (settings.saveTracks) {
                saveToHistory(data);
            }

        } catch (error) {
            showMessage(error.message);
        } finally {
            hideLoading();
        }
    }

    // Crear y mostrar la tarjeta de resultado
    function showResult(data) {
        // Limpiar resultados anteriores
        resultsContainer.innerHTML = '';

        const resultCard = document.createElement('div');
        resultCard.className = 'result-card';
        resultCard.innerHTML = `
            <img class="cover-art" src="${data.cover !== 'Unknown' ? data.cover : 'images/logo.png'}" alt="Album Cover">
            <div class="song-info">
                <h3 class="song-title">${data.track}</h3>
                <p class="artist-name">${data.artist}</p>
                ${data.url !== 'Unknown' ? `
                    <button onclick="window.open('${data.url}', '_blank')" class="listen-button">
                        <i class="fas fa-headphones"></i>
                        Listen
                    </button>
                ` : ''}
            </div>
        `;

        resultsContainer.appendChild(resultCard);
    }

    // History handling
    function saveToHistory(data) {
        const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        history.unshift({
            track: data.track,
            artist: data.artist,
            cover: data.cover,
            url: data.url,
            timestamp: new Date().toISOString()
        });
        if (history.length > 10) history.pop();
        localStorage.setItem('searchHistory', JSON.stringify(history));
    }

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
