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
            window.app.handleFileUpload(files[0]);
        }
    });

    // Click to upload
    const uploadButton = document.querySelector('.upload-button');
    uploadButton?.addEventListener('click', () => {
        fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
            window.app.handleFileUpload(file);
        }
    });
});
