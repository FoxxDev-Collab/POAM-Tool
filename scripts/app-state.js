/* Application State Manager
   - Centralized state management for the entire application
   - Handles theme, data loading, and component initialization
   - Prevents jittery loading and ensures smooth transitions
*/

class AppStateManager {
    constructor() {
        this.state = {
            theme: 'dark', // Default theme
            dataManager: null,
            isInitialized: false,
            isDataLoaded: false,
            currentPage: this.getCurrentPage(),
            components: new Map(),
            loadingStates: new Map()
        };
        
        this.eventBus = new EventTarget();
        this.initPromise = null;
        
        // Pre-load theme to prevent flickering
        this.preloadTheme();
    }

    // Pre-load theme immediately to prevent flash
    preloadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.state.theme = savedTheme;
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Add loading class to prevent content flash
        document.documentElement.classList.add('app-loading');
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('stigs.html')) return 'stigs';
        if (path.includes('poams.html')) return 'poams';
        return 'dashboard';
    }

    // Main initialization method
    async initialize() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._performInitialization();
        return this.initPromise;
    }

    async _performInitialization() {
        try {
            console.log('🚀 Starting application initialization...');
            
            // Step 1: Initialize core systems
            await window.DataManager.ready(); // Ensure the singleton is ready
            this.state.dataManager = window.DataManager;
            console.log('[AppState] DataManager initialized:', this.state.dataManager ? 'Available' : 'Not Available');
            console.log('[AppState] DataManager ready state:', this.state.dataManager.isReady);
            await this.initializeTheme();
            
            // Step 2: Initialize page-specific components
            await this.initializePageComponents();
            
            // Step 3: Load data
            await this.loadInitialData();
            
            // Step 4: Finalize initialization
            this.state.isInitialized = true;
            this.emit('initialized');
            
            // Remove loading state
            document.documentElement.classList.remove('app-loading');
            document.documentElement.classList.add('app-ready');
            
            console.log('✅ Application initialization complete');
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.handleInitializationError(error);
            throw error;
        }
    }


    async initializeTheme() {
        this.setLoadingState('theme', true);
        
        try {
            // Theme is already pre-loaded, just initialize the manager
            if (window.ThemeManager) {
                const themeManager = new ThemeManager();
                
                // Wait for theme elements to be available (navigation might still be rendering)
                const themeToggle = await this.waitForElement('#themeToggle', 2000);
                const themeLabel = await this.waitForElement('#themeLabel', 2000);
                
                if (themeToggle && themeLabel) {
                    themeManager.init(themeToggle, themeLabel);
                    this.registerComponent('themeManager', themeManager);
                    console.log('Theme manager initialized successfully');
                } else {
                    console.warn('Theme elements not found, theme toggle may not work');
                }
            }
            
            this.emit('theme-ready');
            
        } catch (error) {
            console.error('Theme initialization failed:', error);
        } finally {
            this.setLoadingState('theme', false);
        }
    }

    async initializePageComponents() {
        this.setLoadingState('components', true);
        
        try {
            // Initialize status messages
            if (window.StatusMessages) {
                const statusMessages = new StatusMessages();
                statusMessages.init();
                this.registerComponent('statusMessages', statusMessages);
            }

            // Initialize page-specific components
            switch (this.state.currentPage) {
                case 'stigs':
                    await this.initializeStigsPage();
                    break;
                case 'poams':
                    await this.initializePoamsPage();
                    break;
                case 'dashboard':
                    await this.initializeDashboard();
                    break;
            }
            
            this.emit('components-ready');
            
        } catch (error) {
            console.error('Component initialization failed:', error);
            throw error;
        } finally {
            this.setLoadingState('components', false);
        }
    }

    async initializeStigsPage() {
        // Initialize STIG-specific components
        if (window.STIGMapperApp) {
            const app = new STIGMapperApp();
            await app.init();
            this.registerComponent('stigApp', app);
        }
    }

    async initializePoamsPage() {
        // Initialize POAM-specific functionality
        if (window.initPOAMManagement) {
            await window.initPOAMManagement();
        }
    }

    async initializeDashboard() {
        // Dashboard-specific initialization
        // Components are handled in loadInitialData
    }

    async loadInitialData() {
        this.setLoadingState('data', true);
        
        try {
            if (!this.state.dataManager) {
                console.log('No DataManager available, skipping data loading');
                return;
            }

            switch (this.state.currentPage) {
                case 'dashboard':
                    await this.loadDashboardData();
                    break;
                case 'stigs':
                    // Data already loaded in initializeStigsPage
                    break;
                case 'poams':
                    await this.loadPoamData();
                    break;
            }
            
            this.state.isDataLoaded = true;
            this.emit('data-loaded');
            
        } catch (error) {
            console.error('Data loading failed:', error);
        } finally {
            this.setLoadingState('data', false);
        }
    }

    async loadDashboardData() {
        try {
            if (!this.state.dataManager || typeof this.state.dataManager.getDataStats !== 'function') {
                console.log('DataManager.getDataStats not available, using default values');
                return;
            }

            const stats = await this.state.dataManager.getDataStats();
            
            // Update statistics with smooth transitions
            this.updateElementWithTransition('totalStigRows', stats.totalStigRows || 0);
            this.updateElementWithTransition('stigFilesCount', `${stats.stigData || 0} files imported`);
            this.updateElementWithTransition('totalPOAMs', stats.poams || 0);
            this.updateElementWithTransition('openPOAMs', stats.openPOAMs || 0);
            this.updateElementWithTransition('completedPOAMs', stats.completedPOAMs || 0);
            this.updateElementWithTransition('totalMilestones', stats.milestones || 0);
            this.updateElementWithTransition('totalCCIs', stats.cciMappings || 0);
            
            // Calculate overdue milestones
            if (typeof this.state.dataManager.getMilestones === 'function') {
                const milestones = await this.state.dataManager.getMilestones();
                const now = new Date();
                const overdue = milestones.filter(m => 
                    m.dueDate && new Date(m.dueDate) < now && m.status !== 'completed'
                ).length;
                this.updateElementWithTransition('overdueMilestones', `${overdue} overdue`);
            }
            
            // Load recent activity
            await this.loadRecentActivity();
            
            // Emit event that stats have been updated
            this.emit('stats-updated', stats);
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    async loadExistingStigData(app) {
        try {
            console.log('[AppState] Loading existing STIG data...');
            if (!this.state.dataManager || typeof this.state.dataManager.getAllStigRows !== 'function') {
                console.log('[AppState] DataManager.getAllStigRows not available, skipping STIG data load');
                return;
            }

            const existingData = await this.state.dataManager.getAllStigRows();
            console.log('[AppState] Retrieved', existingData.length, 'existing STIG rows from storage');

            if (existingData.length > 0) {
                console.log('[AppState] Loading existing data into application state...');
                
                // Update the application state
                console.log('[AppState] 🔄 Loading data into application state...');
                app.state.allRows = existingData;

                console.log('[AppState] 📊 Setting data in VulnTable...');
                if (window.VulnTable) {
                    VulnTable.setRows(existingData);
                } else {
                    console.warn('[AppState] ⚠️ VulnTable not available');
                }

                // Update UI
                console.log('[AppState] 🎨 Updating UI components...');
                if (app.modules && app.modules.filterPanel) {
                    app.modules.filterPanel.populateFacets(existingData);
                    app.applyFilters();
                } else {
                    console.warn('[AppState] ⚠️ filterPanel not available');
                }
                
                // Update file display
                if (typeof this.state.dataManager.getStigData === 'function') {
                    const stigData = await this.state.dataManager.getStigData();
                    const stigFiles = stigData.files || [];
                    console.log('[AppState] Retrieved', stigFiles.length, 'file metadata records');
                    if (app.updateFileDisplayFromStorage) {
                        app.updateFileDisplayFromStorage(stigFiles);
                    }
                }
                
                // Enable buttons
                const exportBtn = document.getElementById('exportBtn');
                const createPOAMBtn = document.getElementById('createPOAMBtn');
                if (exportBtn) exportBtn.disabled = false;
                if (createPOAMBtn) createPOAMBtn.disabled = false;

                console.log('[AppState] Successfully loaded existing STIG data');
            } else {
                console.log('[AppState] No existing STIG data found');
            }
        } catch (error) {
            console.error('[AppState] Failed to load existing STIG data:', error);
        }
    }

    async loadPoamData() {
        // POAM-specific data loading
        try {
            if (!this.state.dataManager) {
                console.log('DataManager not available for POAM data loading');
                return;
            }

            if (typeof this.state.dataManager.getPOAMs === 'function') {
                const poams = await this.state.dataManager.getPOAMs();
                // Update POAM UI if functions are available
                if (window.updatePOAMTable) {
                    window.updatePOAMTable(poams);
                }
            }

            if (typeof this.state.dataManager.getMilestones === 'function') {
                const milestones = await this.state.dataManager.getMilestones();
                // Update milestone UI if functions are available
                if (window.updateMilestoneTable) {
                    window.updateMilestoneTable(milestones);
                }
            }
                
        } catch (error) {
            console.error('Failed to load POAM data:', error);
        }
    }

    async loadRecentActivity() {
        try {
            const activityList = document.getElementById('activityList');
            if (!activityList) return;

            if (!this.state.dataManager) {
                console.log('DataManager not available for recent activity');
                return;
            }

            const activities = [];
            
            // Get recent STIG imports
            if (typeof this.state.dataManager.getStigData === 'function') {
                const stigDataFile = await this.state.dataManager.getStigData();
                const stigFiles = stigDataFile.files || [];
                stigFiles.slice(-5).forEach(stig => {
                    activities.push({
                        type: 'import',
                        icon: '📥',
                        title: `Imported ${stig.name}`,
                        description: `${stig.count} vulnerabilities processed`,
                        timestamp: new Date(stig.importedAt)
                    });
                });
            }
            
            // Get recent POAMs
            if (typeof this.state.dataManager.getPOAMs === 'function') {
                const poams = await this.state.dataManager.getPOAMs();
                poams.slice(-5).forEach(poam => {
                    activities.push({
                        type: 'poam',
                        icon: '📋',
                        title: `POAM ${poam.status === 'completed' ? 'completed' : 'created'}`,
                        description: `${poam.vulnId}: ${poam.title}`,
                        timestamp: new Date(poam.updatedAt || poam.createdAt)
                    });
                });
            }
            
            // Sort by timestamp (most recent first)
            activities.sort((a, b) => b.timestamp - a.timestamp);
            
            if (activities.length === 0) {
                return; // Keep the empty state
            }
            
            // Render activities with smooth transition
            const activityHTML = activities.slice(0, 10).map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">${activity.icon}</div>
                    <div class="activity-content">
                        <p><strong>${activity.title}</strong></p>
                        <p>${activity.description}</p>
                        <small>${this.formatRelativeTime(activity.timestamp)}</small>
                    </div>
                </div>
            `).join('');
            
            activityList.style.opacity = '0';
            setTimeout(() => {
                activityList.innerHTML = activityHTML;
                activityList.style.opacity = '1';
            }, 150);
            
        } catch (error) {
            console.error('Failed to load recent activity:', error);
        }
    }

    updateElementWithTransition(elementId, value) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.style.transition = 'opacity 0.3s ease';
        element.style.opacity = '0.5';
        
        setTimeout(() => {
            element.textContent = value;
            element.style.opacity = '1';
        }, 150);
    }

    formatRelativeTime(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    // State management methods
    setLoadingState(key, isLoading) {
        this.state.loadingStates.set(key, isLoading);
        this.emit('loading-state-changed', { key, isLoading });
    }

    isLoading(key = null) {
        if (key) {
            return this.state.loadingStates.get(key) || false;
        }
        return Array.from(this.state.loadingStates.values()).some(loading => loading);
    }

    registerComponent(name, component) {
        this.state.components.set(name, component);
        this.emit('component-registered', { name, component });
    }

    getComponent(name) {
        return this.state.components.get(name);
    }

    // Theme management
    setTheme(theme) {
        this.state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.emit('theme-changed', theme);
    }

    getTheme() {
        return this.state.theme;
    }

    // Event system
    emit(eventName, data = null) {
        this.eventBus.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }

    on(eventName, callback) {
        this.eventBus.addEventListener(eventName, callback);
    }

    off(eventName, callback) {
        this.eventBus.removeEventListener(eventName, callback);
    }

    // Error handling
    handleInitializationError(error) {
        document.documentElement.classList.remove('app-loading');
        document.documentElement.classList.add('app-error');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'app-error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <h3>⚠️ Application Error</h3>
                <p>Failed to initialize the application. Please refresh the page.</p>
                <button onclick="window.location.reload()" class="btn btn-primary">Refresh Page</button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
    }

    // Utility methods
    async waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }

    // Public API
    getState() {
        return { ...this.state };
    }

    isReady() {
        return this.state.isInitialized;
    }
}

// Create global instance
window.AppState = new AppStateManager();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppStateManager;
}
