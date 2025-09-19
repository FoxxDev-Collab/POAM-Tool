/* Data Manager - Simplified File-Based Data Management
   - Creates consolidated STIG + CCI + NIST control JSON files
   - Generates downloadable files for local file system persistence
   - Handles POAM creation and updates within the same JSON structure
   - Allows custom file naming for organization
   - No browser storage - pure file-based approach
*/

class DataManager {
    constructor() {
        // Check if there's already a DataManager instance with data
        if (window._dataManagerInstance && window._dataManagerInstance.currentData) {
            console.log('[DataManager] Reusing existing DataManager instance with data');
            return window._dataManagerInstance;
        }

        this.currentData = null; // Currently loaded data file
        this.eventBus = new EventTarget();
        this.isReady = false;

        // Store this instance globally
        window._dataManagerInstance = this;

        this.init();
    }

    async init() {
        try {
            console.log('[DataManager] Initializing data management...');

            // Force restore from localStorage if data exists
            this.restoreFromStorage();

            this.isReady = true;
            this.emit('ready');
            console.log('[DataManager] Initialized with data:', {
                hasData: !!this.currentData,
                poams: this.currentData?.poams?.length || 0,
                vulnerabilities: this.currentData?.vulnerabilities?.length || 0,
                milestones: this.currentData?.milestones?.length || 0
            });
        } catch (error) {
            console.error('[DataManager] Initialization failed:', error);
            throw error;
        }
    }

    // Force restore data from localStorage
    restoreFromStorage() {
        try {
            const savedData = localStorage.getItem('cybersec-suite-data');
            if (savedData && savedData !== 'null' && savedData !== 'undefined') {
                this.currentData = JSON.parse(savedData);
                console.log('[DataManager] Data restored from localStorage successfully');
                return true;
            }
        } catch (error) {
            console.error('[DataManager] Failed to restore from localStorage:', error);
        }
        return false;
    }

    // Force save data to localStorage with verification
    saveToStorage() {
        try {
            if (!this.currentData) {
                console.warn('[DataManager] No data to save');
                return false;
            }

            const dataString = JSON.stringify(this.currentData);
            localStorage.setItem('cybersec-suite-data', dataString);

            // Verify the save worked
            const verification = localStorage.getItem('cybersec-suite-data');
            if (verification === dataString) {
                console.log('[DataManager] Data saved to localStorage successfully:', {
                    poams: this.currentData.poams?.length || 0,
                    vulnerabilities: this.currentData.vulnerabilities?.length || 0,
                    milestones: this.currentData.milestones?.length || 0
                });
                return true;
            } else {
                console.error('[DataManager] localStorage save verification failed');
                return false;
            }
        } catch (error) {
            console.error('[DataManager] Failed to save to localStorage:', error);
            return false;
        }
    }

    // Load data from uploaded file
    async loadFromFile(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            this.currentData = data;

            // Force save to localStorage with verification
            const saved = this.saveToStorage();
            if (!saved) {
                console.warn('[DataManager] Failed to save loaded file data to localStorage');
            }

            console.log('[DataManager] Loaded data from file:', {
                filename: file.name,
                vulnerabilities: data.vulnerabilities?.length || 0,
                poams: data.poams?.length || 0,
                lastUpdated: data.metadata?.lastUpdated
            });
            this.emit('dataLoaded', { filename: file.name, data });
            return data;
        } catch (error) {
            console.error('[DataManager] Error loading file:', error);
            throw new Error(`Failed to load file: ${error.message}`);
        }
    }

    // Download data as JSON file
    downloadAsFile(filename, data) {
        try {
            // Update metadata
            data.metadata = {
                ...data.metadata,
                lastUpdated: new Date().toISOString(),
                savedAt: new Date().toISOString()
            };

            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log(`[DataManager] Downloaded ${filename}`);
            
            // Update current data
            this.currentData = data;
            
            this.emit('dataSaved', { filename, data });
            return true;
        } catch (error) {
            console.error(`[DataManager] Error downloading ${filename}:`, error);
            throw error;
        }
    }

    // Create consolidated data structure from STIG data and CCI mappings
    createConsolidatedData(stigRows, cciMappings, loadedFiles, customName = null) {
        const timestamp = new Date().toISOString();
        const filename = customName || `stig-analysis-${timestamp.split('T')[0]}`;
        
        // Enhance STIG rows with CCI mappings and NIST controls
        const enhancedVulnerabilities = stigRows.map((row, index) => ({
            id: index + 1,
            ...row,
            enhancedCciMappings: this.enhanceCciMappings(row.ccis, cciMappings),
            compiledAt: timestamp
        }));

        const consolidatedData = {
            metadata: {
                version: "1.0",
                type: "consolidated-stig-data",
                filename: filename,
                createdAt: timestamp,
                lastUpdated: timestamp,
                totalVulnerabilities: enhancedVulnerabilities.length,
                totalFiles: loadedFiles.length,
                cciMappingsSource: cciMappings ? 'Custom Upload' : 'Default',
                totalCciMappings: cciMappings ? Object.keys(cciMappings).length : 0
            },
            vulnerabilities: enhancedVulnerabilities,
            cciMappings: cciMappings || {},
            files: loadedFiles.map(file => ({
                name: file.name,
                type: file.type,
                count: file.count,
                importedAt: timestamp
            })),
            poams: [], // Will be populated when POAMs are created
            milestones: [] // Will be populated when milestones are created
        };

        return consolidatedData;
    }

    // Legacy method for compatibility with existing STIG app
    async compileStigData(stigRows, loadedFiles, cciMappings = null) {
        try {
            console.log('[DataManager] Compiling STIG data for compatibility...');

            // Use existing method to create consolidated data
            const consolidatedData = this.createConsolidatedData(
                stigRows,
                cciMappings || this.currentData?.cciMappings || {},
                loadedFiles
            );

            // Store as current data
            this.currentData = consolidatedData;

            // Force save to localStorage with verification
            const saved = this.saveToStorage();
            if (!saved) {
                console.warn('[DataManager] Failed to save STIG data to localStorage');
            }

            console.log('[DataManager] STIG data compiled successfully');
            return consolidatedData;

        } catch (error) {
            console.error('[DataManager] Failed to compile STIG data:', error);
            throw error;
        }
    }

    // Legacy method for CCI mappings compilation
    async compileCciMappings(cciMappings, sourceFileName = 'custom-cci.xml') {
        try {
            console.log('[DataManager] Compiling CCI mappings for compatibility...');

            // Store CCI mappings in current data
            if (!this.currentData) {
                this.currentData = {
                    metadata: {
                        version: "1.0",
                        type: "consolidated-stig-data",
                        createdAt: new Date().toISOString(),
                        lastUpdated: new Date().toISOString()
                    },
                    vulnerabilities: [],
                    cciMappings: {},
                    files: [],
                    poams: [],
                    milestones: []
                };
            }

            this.currentData.cciMappings = cciMappings || {};
            this.currentData.metadata.lastUpdated = new Date().toISOString();
            this.currentData.metadata.cciMappingsSource = sourceFileName;
            this.currentData.metadata.totalCciMappings = Object.keys(cciMappings || {}).length;

            console.log('[DataManager] CCI mappings compiled successfully');
            return this.currentData.cciMappings;

        } catch (error) {
            console.error('[DataManager] Failed to compile CCI mappings:', error);
            throw error;
        }
    }

    // Legacy method to get STIG data in expected format
    async getStigData() {
        if (!this.currentData) {
            return {
                metadata: {
                    version: "1.0",
                    lastUpdated: null,
                    totalFiles: 0,
                    totalRows: 0
                },
                files: [],
                rows: []
            };
        }

        return {
            metadata: this.currentData.metadata,
            files: this.currentData.files || [],
            rows: this.currentData.vulnerabilities || []
        };
    }

    // Enhance CCI mappings with NIST control information
    enhanceCciMappings(ccis, cciMappings) {
        if (!ccis || !cciMappings) return [];
        
        const cciArray = Array.isArray(ccis) ? ccis : ccis.split(',').map(c => c.trim());
        
        return cciArray.map(cci => {
            const nistControls = cciMappings[cci] || [];
            return {
                cci: cci,
                nistControls: Array.isArray(nistControls) ? nistControls : [nistControls].filter(Boolean)
            };
        });
    }

    // Add POAM to current data and return updated data structure
    addPoamToData(poamData) {
        if (!this.currentData) {
            // Initialize empty data structure if none exists
            this.currentData = {
                metadata: {
                    version: "1.0",
                    type: "consolidated-stig-data",
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                },
                vulnerabilities: [],
                cciMappings: {},
                files: [],
                poams: [],
                milestones: []
            };
        }

        // Add POAM with unique ID
        const newPoam = {
            id: Date.now() + Math.random(),
            ...poamData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.currentData.poams = this.currentData.poams || [];
        this.currentData.poams.push(newPoam);

        // Update metadata
        this.currentData.metadata.totalPoams = this.currentData.poams.length;
        this.currentData.metadata.lastUpdated = new Date().toISOString();

        // Force save to localStorage with verification
        const saved = this.saveToStorage();
        if (!saved) {
            throw new Error('Failed to save POAM data to localStorage');
        }

        console.log('[DataManager] Added POAM to current data:', newPoam.id);
        return newPoam;
    }

    // Add milestone to current data
    addMilestoneToData(milestoneData) {
        if (!this.currentData) {
            // Initialize empty data structure if none exists
            this.currentData = {
                metadata: {
                    version: "1.0",
                    type: "consolidated-stig-data",
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                },
                vulnerabilities: [],
                cciMappings: {},
                files: [],
                poams: [],
                milestones: []
            };
        }

        const newMilestone = {
            id: Date.now() + Math.random(),
            ...milestoneData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.currentData.milestones = this.currentData.milestones || [];
        this.currentData.milestones.push(newMilestone);

        // Update metadata
        this.currentData.metadata.totalMilestones = this.currentData.milestones.length;
        this.currentData.metadata.lastUpdated = new Date().toISOString();

        // Force save to localStorage with verification
        const saved = this.saveToStorage();
        if (!saved) {
            throw new Error('Failed to save milestone data to localStorage');
        }

        console.log('[DataManager] Added milestone to current data:', newMilestone.id);
        return newMilestone;
    }

    // Get current data (for compatibility with existing code)
    async getAllStigRows() {
        if (!this.currentData || !this.currentData.vulnerabilities) {
            console.log('[DataManager] No vulnerabilities in current data');
            return [];
        }
        return this.currentData.vulnerabilities;
    }

    async getCciMappings() {
        if (!this.currentData || !this.currentData.cciMappings) {
            console.log('[DataManager] No CCI mappings in current data');
            return {};
        }
        return this.currentData.cciMappings;
    }

    async getPOAMs() {
        // Always try to restore from localStorage first
        if (!this.currentData) {
            this.restoreFromStorage();
        }

        console.log('[DataManager] getPOAMs called - currentData state:', {
            hasCurrentData: !!this.currentData,
            poams: this.currentData?.poams?.length || 0,
            localStorageExists: localStorage.getItem('cybersec-suite-data') !== null
        });

        return this.currentData?.poams || [];
    }

    async getMilestones(poamId = null) {
        if (!this.currentData || !this.currentData.milestones) {
            console.log('[DataManager] No milestones in current data');
            return [];
        }
        
        if (poamId) {
            return this.currentData.milestones.filter(m => m.poamId === poamId);
        }
        return this.currentData.milestones;
    }

    // Get data statistics for dashboard
    async getDataStats() {
        if (!this.currentData) {
            return {
                stigData: 0,
                totalStigRows: 0,
                cciMappings: 0,
                poams: 0,
                milestones: 0,
                openPOAMs: 0,
                completedPOAMs: 0
            };
        }

        const poams = this.currentData.poams || [];
        return {
            stigData: this.currentData.files?.length || 0,
            totalStigRows: this.currentData.vulnerabilities?.length || 0,
            cciMappings: Object.keys(this.currentData.cciMappings || {}).length,
            poams: poams.length,
            milestones: this.currentData.milestones?.length || 0,
            openPOAMs: poams.filter(p => p.status === 'open').length,
            completedPOAMs: poams.filter(p => p.status === 'completed').length
        };
    }

    // Export all current data
    async exportAllData() {
        if (!this.currentData) {
            throw new Error('No data loaded to export');
        }

        return {
            exportDate: new Date().toISOString(),
            version: '1.0',
            data: this.currentData
        };
    }

    // Event system
    emit(eventName, data) {
        this.eventBus.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }

    on(eventName, callback) {
        this.eventBus.addEventListener(eventName, callback);
    }

    off(eventName, callback) {
        this.eventBus.removeEventListener(eventName, callback);
    }

    // Wait for initialization
    async ready() {
        if (this.isReady) return Promise.resolve();
        
        return new Promise(resolve => {
            this.on('ready', resolve);
        });
    }
}

// Create and export a single, initialized instance of the DataManager
// Use existing instance if available, otherwise create new one
const dataManagerInstance = window._dataManagerInstance || new DataManager();

// Export the singleton instance
if (typeof module !== 'undefined' && module.exports) {
    module.exports = dataManagerInstance;
} else {
    window.DataManager = dataManagerInstance;
}
