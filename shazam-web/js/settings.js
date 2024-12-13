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
                // Notificar al historial del cambio
                document.dispatchEvent(new CustomEvent('settingsChanged', {
                    detail: { saveTracks: saveTracksToggle.checked }
                }));
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
            saveTracks: true
        };

        const savedSettings = localStorage.getItem('settings');
        return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
    }

    updateSetting(key, value) {
        const settings = this.loadSettings();
        settings[key] = value;
        localStorage.setItem('settings', JSON.stringify(settings));
        window.app.showMessage('Configuración actualizada');
    }
}

// Initialize the settings view
new SettingsView();
