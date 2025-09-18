/* Data Manager - Simplified File-Based Data Management
   - Creates consolidated STIG + CCI + NIST control JSON files
   - Generates downloadable files for local file system persistence
   - Handles POAM creation and updates within the same JSON structure
   - Allows custom file naming for organization
   - No browser storage - pure file-based approach
*/

class DataManager {
    constructor() {
        this.currentData = null; // Currently loaded data file
        this.eventBus = new EventTarget();
        this.isReady = false;
        
        this.init();
    }

    async init() {
        try {
            console.log('[DataManager] Initializing simplified file-based data management...');
            this.isReady = true;
            this.emit('ready');
            console.log('[DataManager] Initialized successfully');
        } catch (error) {
            console.error('[DataManager] Initialization failed:', error);
            throw error;
        }
    }

    // Load data from uploaded file
    async loadFromFile(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            this.currentData = data;
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
            throw new Error('No data file loaded. Please load a consolidated data file first.');
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

        console.log('[DataManager] Added POAM to current data:', newPoam.id);
        return this.currentData;
    }

    // Add milestone to current data
    addMilestoneToData(milestoneData) {
        if (!this.currentData) {
            throw new Error('No data file loaded. Please load a consolidated data file first.');
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

        console.log('[DataManager] Added milestone to current data:', newMilestone.id);
        return this.currentData;
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
        if (!this.currentData || !this.currentData.poams) {
            console.log('[DataManager] No POAMs in current data');
            return [];
        }
        return this.currentData.poams;
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
const dataManagerInstance = new DataManager();

// Export the singleton instance
if (typeof module !== 'undefined' && module.exports) {
    module.exports = dataManagerInstance;
} else {
    window.DataManager = dataManagerInstance;
}
