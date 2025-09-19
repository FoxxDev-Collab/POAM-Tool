/* Navigation Component
   - Reusable top navigation bar for all pages
   - Handles active state management
   - Provides consistent navigation experience
*/

class Navigation {
    constructor(currentPage = 'dashboard') {
        this.currentPage = currentPage;
        this.navElement = null;
    }

    render() {
        // Create navigation HTML
        const nav = document.createElement('nav');
        nav.className = 'app-nav';
        nav.innerHTML = this.getNavigationHTML();
        
        this.navElement = nav;
        this.setupEventListeners();
        
        return nav;
    }

    getNavigationHTML() {
        const isRootPage = this.currentPage === 'dashboard';
        const pathPrefix = isRootPage ? '' : '../';
        
        // POAM-related pages should show POAM Management as active
        const isPoamRelated = this.currentPage === 'poams' || this.currentPage === 'create-poam' || this.currentPage === 'poam-wizard';
        
        return `
            <div class="nav-brand">
                <a href="${pathPrefix}index.html" class="nav-brand-link">
                    <h1>🛡️ Cybersecurity Management Suite</h1>
                </a>
            </div>
            <div class="nav-links">
                <a href="${pathPrefix}index.html" class="nav-link ${this.currentPage === 'dashboard' ? 'active' : ''}">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="nav-icon">
                        <path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4.5a.5.5 0 0 0 .5-.5v-4h2v4a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146zM2.5 14V7.707l5.5-5.5 5.5 5.5V14H10v-4a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v4H2.5z"/>
                    </svg>
                    Dashboard
                </a>
                <a href="${pathPrefix}pages/stigs.html" class="nav-link ${this.currentPage === 'stigs' ? 'active' : ''}">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="nav-icon">
                        <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                    </svg>
                    STIG Analysis
                </a>
                <a href="${pathPrefix}pages/poams.html" class="nav-link ${isPoamRelated ? 'active' : ''}">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="nav-icon">
                        <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z"/>
                        <path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 1 1.5-1.5V6.954Z"/>
                    </svg>
                    POAM Management
                </a>
                <a href="${pathPrefix}pages/poam-wizard.html" class="nav-link ${this.currentPage === 'poam-wizard' ? 'active' : ''}">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="nav-icon">
                        <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
                        <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
                    </svg>
                    POAM Wizard
                </a>
            </div>
            <div class="nav-actions">
                ${this.currentPage === 'dashboard' ? this.getExportButton() : ''}
                <div class="nav-menu-toggle" id="navMenuToggle">
                    <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                        <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
                    </svg>
                </div>
            </div>
        `;
    }

    getExportButton() {
        return `
            <button id="exportAllBtn" class="btn btn-secondary nav-export-btn" title="Export all data">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8.5 6.5a.5.5 0 0 0-1 0v3.793L6.354 9.146a.5.5 0 1 0-.708.708l2 2a.5.5 0 0 0 .708 0l2-2a.5.5 0 0 0-.708-.708L8.5 10.293V6.5z"/>
                    <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
                </svg>
                <span class="nav-export-text">Export</span>
            </button>
        `;
    }

    setupEventListeners() {
        if (!this.navElement) return;

        // Mobile menu toggle
        const menuToggle = this.navElement.querySelector('#navMenuToggle');
        const navLinks = this.navElement.querySelector('.nav-links');
        
        if (menuToggle && navLinks) {
            menuToggle.addEventListener('click', () => {
                navLinks.classList.toggle('nav-links--mobile-open');
                this.navElement.classList.toggle('app-nav--mobile-open');
            });
        }

        // Close mobile menu when clicking on a link
        const links = this.navElement.querySelectorAll('.nav-link');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks?.classList.remove('nav-links--mobile-open');
                this.navElement.classList.remove('app-nav--mobile-open');
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.navElement.contains(e.target)) {
                navLinks?.classList.remove('nav-links--mobile-open');
                this.navElement.classList.remove('app-nav--mobile-open');
            }
        });
    }

    async updateStats() {
        // Stats display removed - keeping method for future use if needed
        return;
    }

    mount(container) {
        if (container) {
            container.appendChild(this.render());
        }
        return this;
    }

    static create(currentPage) {
        return new Navigation(currentPage);
    }
}

// Initialize navigation based on current page
function initNavigation() {
    // Determine current page from URL
    const path = window.location.pathname;
    let currentPage = 'dashboard';
    
    if (path.includes('stigs.html')) {
        currentPage = 'stigs';
    } else if (path.includes('poams.html')) {
        currentPage = 'poams';
    } else if (path.includes('create-poam.html')) {
        currentPage = 'create-poam';
    } else if (path.includes('poam-wizard.html')) {
        currentPage = 'poam-wizard';
    }

    // Create and mount navigation
    const nav = Navigation.create(currentPage);
    
    // Insert navigation at the beginning of body
    if (document.body.firstChild) {
        document.body.insertBefore(nav.render(), document.body.firstChild);
    } else {
        document.body.appendChild(nav.render());
    }

    return nav;
}

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
} else {
    initNavigation();
}

// Make available globally
window.Navigation = Navigation;
window.initNavigation = initNavigation;
