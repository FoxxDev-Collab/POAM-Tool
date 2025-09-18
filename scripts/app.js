class STIGMapperApp {
    constructor() {
        this.state = {
            allRows: [],
            customCciMap: null,
            loadedFiles: [],
            isInitialized: false
        };
        
        this.elements = {};
        this.modules = {};
    }

    async init() {
        try {
            // Initialize DOM elements
            this.initElements();
            
            // Initialize modules
            await this.initModules();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize UI state and rehydrate from DataStore
            this.initializeUI();
            await this.rehydrate();
            
            this.state.isInitialized = true;
            console.log('STIG Mapper Application initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize STIG Mapper Application:', error);
            this.showError('Application failed to initialize. Please refresh the page.');
        }
    }

    initElements() {
        this.elements = {
            // File inputs
            file: document.getElementById('cklbFile'),
            fileName: document.getElementById('fileName'),
            cciFile: document.getElementById('cciFile'),
            cciFileName: document.getElementById('cciFileName'),
            
            // Theme controls
            themeToggle: document.getElementById('themeToggle'),
            themeLabel: document.getElementById('themeLabel'),
            
            // Filter controls
            family: document.getElementById('familySelect'),
            control: document.getElementById('controlSelect'),
            severity: document.getElementById('severitySelect'),
            status: document.getElementById('statusSelect'),
            stig: document.getElementById('stigSelect'),
            cci: document.getElementById('cciInput'),
            search: document.getElementById('searchInput'),
            
            // Table and results
            tbody: document.querySelector('#resultsTable tbody'),
            emptyState: document.getElementById('emptyState'),
            noResults: document.getElementById('noResultsState'),
            exportBtn: document.getElementById('exportBtn')
        };

        // Validate all required elements exist
        const missingElements = Object.entries(this.elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        if (missingElements.length > 0) {
            throw new Error(`Missing required DOM elements: ${missingElements.join(', ')}`);
        }
    }

    async initModules() {
        // Initialize modules in dependency order
        this.modules.themeManager = new ThemeManager();
        this.modules.statusMessages = new StatusMessages();
        this.modules.statusMessages.init();
        this.modules.fileLoader = new FileLoader(this);
        this.modules.filterPanel = new FilterPanel(this);
        this.modules.filterPanel.init(this.elements);
        
        // Initialize table with elements and state
        VulnTable.init(this.elements, this.state.allRows);
        
        // Initialize theme
        this.modules.themeManager.init(this.elements.themeToggle, this.elements.themeLabel);
    }

    setupEventListeners() {
        // File upload events
        this.elements.file.addEventListener('change', (e) => this.handleFileUpload(e));
        this.elements.cciFile.addEventListener('change', (e) => this.handleCciFileUpload(e));
        
        // Theme toggle
        this.elements.themeToggle.addEventListener('change', () => {
            this.modules.themeManager.toggle();
        });
        
        // Export button
        this.elements.exportBtn.addEventListener('click', () => this.handleExport());
        
        // Filter events
        const filterElements = [
            this.elements.family, this.elements.control, this.elements.severity,
            this.elements.status, this.elements.stig
        ];
        
        filterElements.forEach(element => {
            ['change', 'input'].forEach(event => {
                element.addEventListener(event, () => this.applyFilters());
            });
        });
        
        // Debounced filter events
        this.elements.cci.addEventListener('input', this.debounce(() => this.applyFilters(), 150));
        this.elements.search.addEventListener('input', this.debounce(() => this.applyFilters(), 200));
        
        // Sort events
        document.querySelectorAll('th[data-key]').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.getAttribute('data-key');
                VulnTable.handleSortClick(key);
            });
        });
    }

    initializeUI() {
        this.elements.emptyState.hidden = false;
        this.elements.exportBtn.disabled = true;
    }

    async rehydrate() {
        if (!window.DataManager) {
            console.warn('Rehydration skipped: DataManager not available.');
            return;
        }

        const statusId = this.modules.statusMessages.showLoading('Loading data files...');

        try {
            console.log('[App] Starting data loading from JSON files...');
            const [stigData, cciMappings] = await Promise.all([
                window.DataManager.getAllStigRows(),
                window.DataManager.getCciMappings()
            ]);

            console.log('[App] Data loading results:', {
                stigRowsCount: stigData.length,
                cciMappingsCount: Object.keys(cciMappings || {}).length,
                cciMappingsSample: Object.entries(cciMappings || {}).slice(0, 3)
            });

            if (stigData.length > 0) {
                console.log('[App] 📊 Loading STIG data into application state...');
                this.state.allRows = stigData;
                const stigDataFile = await window.DataManager.getStigData();
                this.state.loadedFiles = stigDataFile.files || [];
                this.processLoadedData(this.state.loadedFiles, true);
                this.modules.statusMessages.showSuccess('Loaded STIG data from files.', 3000);
                console.log('[App] ✅ Successfully loaded', stigData.length, 'STIG rows from JSON files');
            } else {
                console.log('[App] ℹ️ No existing STIG data found in JSON files');
                this.modules.statusMessages.hideMessage(statusId);
            }

            if (cciMappings && Object.keys(cciMappings).length > 0) {
                console.log('[App] 🔗 Loading CCI mappings into application state...');
                this.state.customCciMap = cciMappings;
                this.elements.cciFileName.textContent = `Custom CCI map loaded (${Object.keys(cciMappings).length} CCIs)`;
                console.log('[App] ✅ CCI mappings loaded from JSON files');
            } else {
                console.log('[App] ℹ️ No CCI mappings found in JSON files');
            }

        } catch (error) {
            console.error('Failed to load data from JSON files:', error);
            this.modules.statusMessages.showError('Could not load data files.');
        } finally {
            this.modules.statusMessages.hideMessage(statusId);
        }
    }

    async handleFileUpload(event) {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        console.log('[STIG] 🚀 Starting file upload process for', files.length, 'files');
        console.log('[STIG] 📁 Files to process:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));

        try {
            // Clear previous data
            console.log('[STIG] 🧹 Clearing previous data...');
            this.state.allRows = [];
            this.state.loadedFiles = [];
            this.elements.emptyState.hidden = true;
            this.elements.noResults.hidden = true;

            // Show loading state
            this.updateFileDisplay(files, 'loading');
            const mainLoadingId = this.modules.statusMessages.showLoading('Processing files...');

            console.log('[STIG] 🔄 Processing each file...');

            // Process each file
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                console.log(`[STIG] 📄 Processing file ${i + 1}/${files.length}: ${file.name}`);

                const fileLoadingId = this.modules.statusMessages.showLoading(
                    `Processing ${file.name} (${i + 1}/${files.length})...`, 'file-processing'
                );

                const fileData = await FileImporter.processFile(file, this.state.customCciMap);
                console.log(`[STIG] ✅ File ${file.name} processed:`, {
                    rows: fileData.rows.length,
                    type: fileData.type,
                    firstRow: fileData.rows[0] ? {
                        group_id: fileData.rows[0].group_id,
                        rule_title: fileData.rows[0].rule_title,
                        severity: fileData.rows[0].severity
                    } : null
                });

                if (fileData.rows.length > 0) {
                    console.log(`[STIG] 📊 Adding ${fileData.rows.length} rows to state with source file: ${file.name}`);
                    // Add _sourceFile property to each row
                    const rowsWithSource = fileData.rows.map(row => ({
                        ...row,
                        _sourceFile: file.name
                    }));
                    this.state.allRows = this.state.allRows.concat(rowsWithSource);
                    this.state.loadedFiles.push({
                        name: file.name,
                        type: fileData.type,
                        count: fileData.rows.length
                    });
                } else {
                    console.warn(`[STIG] ⚠️ No rows found in file: ${file.name}`);
                }

                // Hide the individual file processing message
                this.modules.statusMessages.hideMessage(fileLoadingId);
            }

            console.log('[STIG] 📈 Total processed data:', {
                totalRows: this.state.allRows.length,
                totalFiles: this.state.loadedFiles.length,
                files: this.state.loadedFiles.map(f => `${f.name} (${f.count} rows)`)
            });

            // Hide main loading message
            this.modules.statusMessages.hideMessage(mainLoadingId);

            // Update UI with results
            console.log('[STIG] 🎨 Updating UI with processed data...');
            this.processLoadedData(files);

        } catch (error) {
            console.error('[STIG] ❌ File upload failed:', error);
            this.handleFileError(error);
        }
    }

    async handleCciFileUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        console.log('[CCI] 🚀 Starting CCI file upload:', file.name);

        try {
            this.elements.cciFileName.textContent = `Loading ${file.name}...`;
            const parsingId = this.modules.statusMessages.showLoading('Parsing CCI XML...');

            console.log('[CCI] 📖 Reading file content...');
            const text = await file.text();

            console.log('[CCI] 🔄 Parsing CCI XML data...');
            this.state.customCciMap = FileImporter.parseCciXml(text);

            console.log('[CCI] ✅ CCI mappings parsed:', {
                totalMappings: Object.keys(this.state.customCciMap).length,
                sampleMappings: Object.entries(this.state.customCciMap).slice(0, 3)
            });

            // Hide parsing message
            this.modules.statusMessages.hideMessage(parsingId);
            
            this.elements.cciFileName.textContent = 
                `${file.name} (${Object.keys(this.state.customCciMap).length} CCIs)`;
            
            this.modules.statusMessages.showSuccess(
                `Loaded ${Object.keys(this.state.customCciMap).length} CCI mappings from ${file.name}`, 5000
            );

            // Compile CCI mappings to JSON file
            if (window.DataManager && typeof window.DataManager.compileCciMappings === 'function') {
                console.log('[CCI] 💾 Compiling CCI mappings to JSON file...');
                await window.DataManager.compileCciMappings(this.state.customCciMap, file.name);
                console.log('[CCI] ✅ CCI mappings compiled to JSON file');
            }

            // Reprocess existing data if available
            if (this.state.allRows.length > 0) {
                console.log('[CCI] 🔄 Reprocessing existing STIG data with new CCI mappings...');
                await this.reprocessWithCciMappings();
            }

        } catch (error) {
            console.error('[CCI] ❌ CCI file upload failed:', error);
            this.elements.cciFileName.textContent = `Error loading ${file.name}`;
            this.modules.statusMessages.showError(`Failed to parse CCI XML: ${error.message}`);
        }
    }

    async reprocessWithCciMappings() {
        if (!this.elements.file.files || this.elements.file.files.length === 0) return;

        this.modules.statusMessages.showLoading('Reprocessing with new CCI mappings...');

        try {
            const originalRows = [...this.state.allRows];
            this.state.allRows = [];
            const tempLoadedFiles = [...this.state.loadedFiles];
            this.state.loadedFiles = [];
            let newAllRows = [];
            let reprocessingFailed = false;
            // Reprocess files with new CCI mappings
            const reprocessingId = this.modules.statusMessages.showLoading('Reprocessing with new CCI mappings...');
            
            for (let i = 0; i < this.elements.file.files.length; i++) {
                const file = this.elements.file.files[i];
                const fileReprocessingId = this.modules.statusMessages.showLoading(
                    `Reprocessing ${file.name} with CCI mappings (${i + 1}/${this.elements.file.files.length})...`, 'cci-reprocessing'
                );

                try {
                    const fileData = await FileImporter.processFile(file, this.state.customCciMap);
                    if (fileData.rows.length > 0) {
                        console.log(`[CCI] 🔄 Reprocessed ${fileData.rows.length} rows for file: ${file.name}`);
                        // Add _sourceFile property to each row
                        const rowsWithSource = fileData.rows.map(row => ({
                            ...row,
                            _sourceFile: file.name
                        }));
                        newAllRows = newAllRows.concat(rowsWithSource);
                        tempLoadedFiles.push({
                            name: file.name,
                            type: fileData.type,
                            count: fileData.rows.length
                        });
                    }
                } catch (fileError) {
                    console.error(`Error reprocessing ${file.name}:`, fileError);
                    reprocessingFailed = true;
                }
                
                // Hide individual file reprocessing message
                this.modules.statusMessages.hideMessage(fileReprocessingId);
            }
            
            // Hide main reprocessing message
            this.modules.statusMessages.hideMessage(reprocessingId);
            
            if (reprocessingFailed || newAllRows.length === 0) {
                this.state.allRows = originalRows;
                this.state.loadedFiles = tempLoadedFiles;
                this.modules.statusMessages.showError('CCI reprocessing failed - keeping original data');
            } else {
                this.state.allRows = newAllRows;
                this.state.loadedFiles = tempLoadedFiles;
                this.processLoadedData(Array.from(this.elements.file.files));
                this.modules.statusMessages.showSuccess(
                    `Reprocessed ${newAllRows.length} rules with comprehensive CCI mappings`
                );
            }

        } catch (error) {
            console.error('CCI reprocessing failed:', error);
            this.modules.statusMessages.showError(`CCI reprocessing failed: ${error.message}`);
        }
    }

    processLoadedData(files, isRehydrating = false) {
        console.log('[UI] 🎨 processLoadedData called:', {
            files: files.map(f => f.name),
            isRehydrating,
            totalRows: this.state.allRows.length
        });

        // Reset filters for multiple files
        if (files.length > 1) {
            console.log('[UI] 🔄 Resetting filters for multiple files...');
            this.resetAllFilters();
        }

        const updateLoadingId = this.modules.statusMessages.showLoading('Updating filters and display...');

        // Use setTimeout to prevent UI blocking
        setTimeout(async () => {
            try {
                console.log('[UI] 📊 Setting rows in VulnTable...');
                VulnTable.setRows(this.state.allRows);

                console.log('[UI] 🔍 Populating facets...');
                this.modules.filterPanel.populateFacets(this.state.allRows);

                console.log('[UI] 🎯 Applying filters...');
                this.applyFilters();

                console.log('[UI] ✅ Enabling export button...');
                this.elements.exportBtn.disabled = false;

                console.log('[UI] 📱 Updating file display...');
                this.updateFileDisplay(files, 'success');

                // Compile STIG data to JSON file
                if (window.DataManager) {
                    console.log('[DATAMANAGER] 💾 Compiling STIG data to JSON file...');
                    await window.DataManager.compileStigData(this.state.allRows, this.state.loadedFiles);
                    console.log('[DATAMANAGER] ✅ STIG data compiled to JSON file');
                } else {
                    console.warn('[DATAMANAGER] ⚠️ DataManager not available for compiling');
                }

                // Hide the updating message
                this.modules.statusMessages.hideMessage(updateLoadingId);

                if (!isRehydrating) {
                    const totalRules = this.state.allRows.length;
                    console.log('[UI] 📈 UI update complete:', {
                        totalRules,
                        filesProcessed: files.length,
                        exportEnabled: !this.elements.exportBtn.disabled
                    });

                    if (files.length === 1) {
                        this.modules.statusMessages.showSuccess(`Loaded ${totalRules} rules from ${files[0].name}`, 5000);
                    } else {
                        this.modules.statusMessages.showSuccess(`Loaded ${totalRules} total rules from ${files.length} files`, 5000);
                    }
                }
            } catch (uiError) {
                console.error('[UI] ❌ UI update failed:', uiError);
                this.modules.statusMessages.hideMessage(updateLoadingId);
                this.modules.statusMessages.showError('Display update failed - data processed but may not be visible');
            }
        }, 100);
    }

    handleFileError(error) {
        this.state.allRows = [];
        this.state.loadedFiles = [];
        VulnTable.setRows(this.state.allRows);
        this.modules.filterPanel.populateFacets(this.state.allRows);
        VulnTable.renderTable([]);
        this.elements.emptyState.hidden = false;
        this.elements.noResults.hidden = true;
        this.elements.fileName.textContent = 'Error loading files';
        this.modules.statusMessages.showError(`Failed to process files: ${error.message}`);
    }

    updateFileDisplay(files, status = 'success') {
        if (status === 'loading') {
            if (files.length === 1) {
                this.elements.fileName.textContent = `Loading ${files[0].name}...`;
            } else {
                this.elements.fileName.textContent = `Loading ${files.length} files...`;
            }
            return;
        }

        if (this.state.loadedFiles.length === 0) {
            this.elements.fileName.textContent = 'No files selected';
            const fileList = document.getElementById('fileList');
            if (fileList) fileList.style.display = 'none';
            return;
        }

        if (this.state.loadedFiles.length === 1) {
            const file = this.state.loadedFiles[0];
            this.elements.fileName.textContent = `${file.name} (${file.count} rules loaded)`;
            const fileList = document.getElementById('fileList');
            if (fileList) fileList.style.display = 'none';
        } else {
            const totalRules = this.state.loadedFiles.reduce((sum, file) => sum + file.count, 0);
            this.elements.fileName.textContent = `${this.state.loadedFiles.length} files loaded - Total: ${totalRules} rules`;

            const fileList = document.getElementById('fileList');
            if (fileList) {
                fileList.innerHTML = this.state.loadedFiles.map(file =>
                    `<div class="file-item">${file.name} (${file.count} rules)</div>`
                ).join('');
                fileList.style.display = 'block';
            }
        }
    }

    applyFilters() {
        VulnTable.applyFilters();
    }

    resetAllFilters() {
        this.elements.family.value = '';
        this.elements.control.value = '';
        this.elements.severity.value = '';
        this.elements.status.value = '';
        this.elements.stig.value = '';
        this.elements.cci.value = '';
        this.elements.search.value = '';
    }

    handleExport() {
        // Export functionality handled by excel-export.js
        const filteredRows = VulnTable.applyFiltersAndGetRows();
        if (window.exportToExcel && typeof window.exportToExcel === 'function') {
            window.exportToExcel();
        } else {
            this.modules.statusMessages.showError('Export functionality not available');
        }
    }

    showError(message) {
        if (this.modules.statusMessages) {
            this.modules.statusMessages.showError(message);
        } else {
            console.error(message);
            alert(message);
        }
    }

    // Utility functions
    debounce(fn, ms = 200) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), ms);
        };
    }

    // Public API for external access
    getFilteredRows() {
        return VulnTable.applyFiltersAndGetRows();
    };

    // Method to update file display from storage data
    updateFileDisplayFromStorage(stigFiles) {
        if (stigFiles.length === 0) {
            this.elements.fileName.textContent = 'No files selected';
            return;
        }

        if (stigFiles.length === 1) {
            const file = stigFiles[0];
            this.elements.fileName.textContent = `${file.fileName} (${file.rowCount} rules loaded)`;
        } else {
            const totalRules = stigFiles.reduce((sum, file) => sum + file.rowCount, 0);
            this.elements.fileName.textContent = `${stigFiles.length} files loaded - Total: ${totalRules} rules`;
            
            const fileList = document.getElementById('fileList');
            if (fileList) {
                fileList.innerHTML = stigFiles.map(file =>
                    `<div class="file-item">${file.fileName} (${file.rowCount} rules)</div>`
                ).join('');
                fileList.style.display = 'block';
            }
        }
    }

    getState() {
        return { ...this.state };
    }
}

// Global application instance
window.STIGMapperApp = STIGMapperApp;

// Export function for external access (backward compatibility)
window.getFilteredRows = () => {
    if (window.app && window.app.state.isInitialized) {
        return window.app.getFilteredRows();
    }
    return [];
};
