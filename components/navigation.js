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
        const isPoamRelated = this.currentPage === 'poams' || this.currentPage === 'create-poam';
        
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
            </div>
            <div class="nav-actions">
                <div class="nav-stats" id="navStats">
                    <span class="nav-stat" title="Total STIG Findings">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/>
                        </svg>
                        <span id="navStigCount">0</span>
                    </span>
                    <span class="nav-stat" title="Total POAMs">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
                            <path d="M8.646 6.646a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L10.293 9 8.646 7.354a.5.5 0 0 1 0-.708zm-1.292 0a.5.5 0 0 0-.708 0l-2 2a.5.5 0 0 0 0 .708l2 2a.5.5 0 0 0 .708-.708L5.707 9l1.647-1.646a.5.5 0 0 0 0-.708z"/>
                        </svg>
                        <span id="navPoamCount">0</span>
                    </span>
                </div>
                <div class="theme-toggle">
                    <label class="toggle-switch">
                        <input type="checkbox" id="themeToggle" />
                        <span class="toggle-slider"></span>
                    </label>
                    <span id="themeLabel" class="theme-label">Dark Mode</span>
                </div>
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
        if (!window.DataStore) return;

        try {
            // Check if DataStore is ready and has the required methods
            if (typeof DataStore.ready === 'function') {
                await DataStore.ready();
            }
            
            if (typeof DataStore.getDataStats !== 'function') {
                console.log('DataStore.getDataStats not available yet');
                return;
            }
            
            const stats = await DataStore.getDataStats();
            
            const stigCount = this.navElement.querySelector('#navStigCount');
            const poamCount = this.navElement.querySelector('#navPoamCount');
            
            if (stigCount) stigCount.textContent = stats.totalStigRows || 0;
            if (poamCount) poamCount.textContent = stats.poams || 0;
        } catch (error) {
            console.error('Failed to update navigation stats:', error);
        }
    }

    mount(container) {
        if (container) {
            container.appendChild(this.render());
            // Update stats after mounting with longer delay to allow DataStore initialization
            setTimeout(() => this.updateStats(), 1000);
            
            // Listen for AppState stats updates if available
            if (window.AppState) {
                AppState.on('stats-updated', (event) => {
                    const stats = event.detail;
                    if (stats) {
                        const stigCount = this.navElement.querySelector('#navStigCount');
                        const poamCount = this.navElement.querySelector('#navPoamCount');
                        
                        if (stigCount) stigCount.textContent = stats.totalStigRows || 0;
                        if (poamCount) poamCount.textContent = stats.poams || 0;
                    }
                });
            }
            
            // Initialize theme manager if not already done and elements are available
            setTimeout(() => {
                const themeToggle = document.getElementById('themeToggle');
                const themeLabel = document.getElementById('themeLabel');
                
                if (themeToggle && themeLabel && window.ThemeManager) {
                    // Check if theme manager is already registered
                    const existingThemeManager = window.AppState?.getComponent('themeManager');
                    
                    if (!existingThemeManager) {
                        console.log('Initializing theme manager from navigation');
                        const themeManager = new ThemeManager();
                        themeManager.init(themeToggle, themeLabel);
                        
                        if (window.AppState) {
                            AppState.registerComponent('themeManager', themeManager);
                        }
                    } else {
                        console.log('Theme manager already exists, skipping initialization');
                    }
                }
            }, 100);
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
    }

    // Create and mount navigation
    const nav = Navigation.create(currentPage);
    
    // Insert navigation at the beginning of body
    if (document.body.firstChild) {
        document.body.insertBefore(nav.render(), document.body.firstChild);
    } else {
        document.body.appendChild(nav.render());
    }

    // Update stats periodically (less frequent since we have event-based updates)
    setInterval(() => nav.updateStats(), 60000); // Update every 60 seconds

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
