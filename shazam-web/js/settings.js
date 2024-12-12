class SettingsView {
    constructor() {
        this.init();
    }

    init() {
        document.addEventListener('viewLoaded', (event) => {
            if (event.detail.view === 'settings') {
                this.setup();
            }
        });
    }

    setup() {
        // Load saved settings
        const settings = this.loadSettings();
        
        // Set up save tracks toggle
        const saveTracksToggle = document.getElementById('save-tracks');
        if (saveTracksToggle) {
            saveTracksToggle.checked = settings.saveTracks;
            
            // Add change handler
            saveTracksToggle.addEventListener('change', () => {
                this.updateSetting('saveTracks', saveTracksToggle.checked);
            });

            // Add animation for toggle
            const slider = saveTracksToggle.nextElementSibling;
            if (slider) {
                slider.addEventListener('click', (e) => {
                    e.preventDefault();
                    saveTracksToggle.checked = !saveTracksToggle.checked;
                    this.updateSetting('saveTracks', saveTracksToggle.checked);
                });
            }
        }

        // Set up save button
        const saveButton = document.querySelector('.save-settings');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                this.saveSettings();
            });

            // Add hover animation
            saveButton.addEventListener('mouseenter', () => {
                saveButton.style.transform = 'translateY(-2px)';
            });

            saveButton.addEventListener('mouseleave', () => {
                saveButton.style.transform = 'translateY(0)';
            });
        }

        // Add entrance animations
        const settingsOptions = document.querySelectorAll('.settings-option');
        settingsOptions.forEach((option, index) => {
            option.style.opacity = '0';
            option.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                option.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                option.style.opacity = '1';
                option.style.transform = 'translateY(0)';
            }, 100 * index);
        });

        const settingsInfo = document.querySelector('.settings-info');
        if (settingsInfo) {
            settingsInfo.style.opacity = '0';
            
            setTimeout(() => {
                settingsInfo.style.transition = 'opacity 0.3s ease';
                settingsInfo.style.opacity = '1';
            }, 300);
        }
    }

    loadSettings() {
        const defaultSettings = {
            saveTracks: true,
            theme: 'dark',
            language: 'es'
        };

        const savedSettings = localStorage.getItem('settings');
        return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
    }

    updateSetting(key, value) {
        const settings = this.loadSettings();
        settings[key] = value;
        localStorage.setItem('settings', JSON.stringify(settings));
    }

    saveSettings() {
        const saveTracksToggle = document.getElementById('save-tracks');
        const settings = {
            saveTracks: saveTracksToggle ? saveTracksToggle.checked : true,
            theme: 'dark', // For future theme implementation
            language: 'es' // For future language implementation
        };

        localStorage.setItem('settings', JSON.stringify(settings));
        
        // Show success message
        window.app.showMessage('Configuración guardada correctamente');

        // Add save animation
        const saveButton = document.querySelector('.save-settings');
        if (saveButton) {
            const icon = saveButton.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-check';
                saveButton.classList.add('saved');
                
                setTimeout(() => {
                    icon.className = 'fas fa-save';
                    saveButton.classList.remove('saved');
                }, 2000);
            }
        }
    }

    // Method to export settings (for future implementation)
    exportSettings() {
        const settings = this.loadSettings();
        const dataStr = JSON.stringify(settings, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportLink = document.createElement('a');
        exportLink.setAttribute('href', dataUri);
        exportLink.setAttribute('download', 'droptheid-settings.json');
        exportLink.click();
    }

    // Method to import settings (for future implementation)
    importSettings(jsonString) {
        try {
            const settings = JSON.parse(jsonString);
            localStorage.setItem('settings', JSON.stringify(settings));
            this.setup(); // Reload settings
            window.app.showMessage('Configuración importada correctamente');
        } catch (error) {
            window.app.showMessage('Error al importar la configuración', 'error');
        }
    }
}

// Initialize the settings view
new SettingsView();
