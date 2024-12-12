class HomeView {
    constructor() {
        this.init();
    }

    init() {
        // Listen for when this view is loaded
        document.addEventListener('viewLoaded', (event) => {
            if (event.detail.view === 'home') {
                this.setup();
            }
        });
    }

    setup() {
        // Set up continue button
        const continueButton = document.querySelector('.continue-button');
        if (continueButton) {
            // Add click handler
            continueButton.addEventListener('click', () => {
                // Navigate to search view
                window.app.navigateToView('search');
                
                // Update navigation UI
                const searchNavItem = document.querySelector('.nav-item[data-view="search"]');
                if (searchNavItem) {
                    document.querySelectorAll('.nav-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    searchNavItem.classList.add('active');
                }
            });

            // Add hover animations
            continueButton.addEventListener('mouseenter', () => {
                const icon = continueButton.querySelector('i');
                if (icon) {
                    icon.style.transform = 'translateX(6px)';
                }
                continueButton.style.transform = 'translateY(-3px)';
            });

            continueButton.addEventListener('mouseleave', () => {
                const icon = continueButton.querySelector('i');
                if (icon) {
                    icon.style.transform = 'translateX(0)';
                }
                continueButton.style.transform = 'translateY(0)';
            });

            // Add click animation
            continueButton.addEventListener('mousedown', () => {
                continueButton.style.transform = 'translateY(-1px)';
            });

            continueButton.addEventListener('mouseup', () => {
                continueButton.style.transform = 'translateY(-3px)';
            });
        }

        // Add entrance animations
        const logoContainer = document.querySelector('.logo-container');
        if (logoContainer) {
            logoContainer.style.opacity = '0';
            logoContainer.style.transform = 'translateY(-30px)';
            
            // Trigger animation after a small delay
            setTimeout(() => {
                logoContainer.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                logoContainer.style.opacity = '1';
                logoContainer.style.transform = 'translateY(0)';
            }, 100);

            // Add hover effect for the music icon
            const musicIcon = logoContainer.querySelector('i');
            if (musicIcon) {
                logoContainer.addEventListener('mouseenter', () => {
                    musicIcon.style.transform = 'scale(1.05)';
                    musicIcon.style.filter = 'drop-shadow(0 0 30px rgba(255, 255, 255, 0.2))';
                });

                logoContainer.addEventListener('mouseleave', () => {
                    musicIcon.style.transform = 'scale(1)';
                    musicIcon.style.filter = 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.1))';
                });
            }
        }

        if (continueButton) {
            continueButton.style.opacity = '0';
            continueButton.style.transform = 'translateY(30px)';
            
            // Trigger animation after logo animation
            setTimeout(() => {
                continueButton.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                continueButton.style.opacity = '1';
                continueButton.style.transform = 'translateY(0)';
            }, 300);
        }
    }
}

// Initialize the home view
new HomeView();
