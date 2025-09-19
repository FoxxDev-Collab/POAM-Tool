/* POAM Creation Wizard
   - Step-by-step wizard for creating POAMs from imported CCI/STIG mappings
   - Professional interface with guided workflow
   - Automatic milestone generation with configurable spacing
   - Full POAM customization before creation
*/

class POAMWizard {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.wizardData = {
            importedData: null,
            vulnerabilities: [],
            selectedControls: new Set(),
            selectedVulnerabilities: new Map(), // control -> [vulnerabilities]
            poamConfig: {},
            generatedMilestones: []
        };

        this.elements = {};
        this.exportImportManager = null;
        this.dataManager = null;
    }

    async initialize() {
        console.log('[POAMWizard] Initializing wizard...');

        // Get dependencies
        this.exportImportManager = new ExportImportManager();
        this.dataManager = AppState?.state?.dataManager;

        // Initialize DOM elements
        this.initializeElements();

        // Setup event listeners
        this.setupEventListeners();

        // Check for pre-imported data from sessionStorage
        await this.checkForPreImportedData();

        // Initialize first step
        this.showStep(1);

        console.log('[POAMWizard] Wizard initialized successfully');
    }

    initializeElements() {
        this.elements = {
            // Wizard navigation
            prevButton: document.getElementById('prevButton'),
            nextButton: document.getElementById('nextButton'),
            createButton: document.getElementById('createButton'),
            progressFill: document.querySelector('.progress-fill'),

            // Step 1 - Import
            importArea: document.getElementById('importArea'),
            importFile: document.getElementById('importFile'),
            importResults: document.getElementById('importResults'),
            totalVulns: document.getElementById('totalVulns'),
            eligibleVulns: document.getElementById('eligibleVulns'),
            nistControlsFound: document.getElementById('nistControlsFound'),

            // Step 2 - Controls
            nistControlsGrid: document.getElementById('nistControlsGrid'),
            selectAllControls: document.getElementById('selectAllControls'),
            selectNoneControls: document.getElementById('selectNoneControls'),
            selectedControlsCount: document.getElementById('selectedControlsCount'),

            // Step 3 - Vulnerabilities
            vulnerabilitySelectionContainer: document.getElementById('vulnerabilitySelectionContainer'),
            selectAllVulnerabilities: document.getElementById('selectAllVulnerabilities'),
            selectNoneVulnerabilities: document.getElementById('selectNoneVulnerabilities'),
            selectedVulnerabilitiesCount: document.getElementById('selectedVulnerabilitiesCount'),

            // Step 4 - POAM Config
            poamTitle: document.getElementById('poamTitle'),
            poamAssignee: document.getElementById('poamAssignee'),
            poamDueDate: document.getElementById('poamDueDate'),
            poamPriority: document.getElementById('poamPriority'),
            poamDescription: document.getElementById('poamDescription'),
            milestoneSpacing: document.getElementById('milestoneSpacing'),
            startDate: document.getElementById('startDate'),
            regenerateMilestones: document.getElementById('regenerateMilestones'),
            milestonesContainer: document.getElementById('milestonesContainer'),

            // Step 5 - Review
            poamSummary: document.getElementById('poamSummary'),
            controlsSummary: document.getElementById('controlsSummary'),
            milestonesSummary: document.getElementById('milestonesSummary')
        };
    }

    setupEventListeners() {
        // Navigation
        this.elements.prevButton.addEventListener('click', () => this.previousStep());
        this.elements.nextButton.addEventListener('click', () => this.nextStep());
        this.elements.createButton.addEventListener('click', () => this.createPOAM());

        // Step 1 - Import
        this.elements.importArea.addEventListener('click', () => this.elements.importFile.click());
        this.elements.importFile.addEventListener('change', (e) => this.handleFileImport(e));

        // Drag and drop
        this.elements.importArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.importArea.classList.add('dragover');
        });

        this.elements.importArea.addEventListener('dragleave', () => {
            this.elements.importArea.classList.remove('dragover');
        });

        this.elements.importArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.importArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processImportFile(files[0]);
            }
        });

        // Step 2 - Controls
        this.elements.selectAllControls.addEventListener('click', () => this.selectAllControls());
        this.elements.selectNoneControls.addEventListener('click', () => this.selectNoneControls());

        // Step 3 - Vulnerabilities (optional buttons)
        if (this.elements.selectAllVulnerabilities) {
            this.elements.selectAllVulnerabilities.addEventListener('click', () => this.selectAllVulnerabilities());
        }
        if (this.elements.selectNoneVulnerabilities) {
            this.elements.selectNoneVulnerabilities.addEventListener('click', () => this.selectNoneVulnerabilities());
        }

        // Step 4 - POAM Config
        this.elements.regenerateMilestones.addEventListener('click', () => this.generateMilestones());
        this.elements.milestoneSpacing.addEventListener('change', () => this.generateMilestones());
        this.elements.startDate.addEventListener('change', () => this.generateMilestones());

        // Update navigation when form fields change
        this.elements.poamTitle.addEventListener('input', () => this.updateNavigationButtons());
        this.elements.poamAssignee.addEventListener('input', () => this.updateNavigationButtons());
        this.elements.poamDueDate.addEventListener('change', () => this.updateNavigationButtons());
        this.elements.poamPriority.addEventListener('change', () => this.updateNavigationButtons());

        // Set default dates
        const today = new Date();
        const defaultStart = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week from now
        const defaultDue = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

        this.elements.startDate.value = defaultStart.toISOString().split('T')[0];
        this.elements.poamDueDate.value = defaultDue.toISOString().split('T')[0];
    }

    async checkForPreImportedData() {
        try {
            const storedData = sessionStorage.getItem('wizardImportData');
            if (storedData) {
                console.log('[POAMWizard] Found pre-imported data from session storage');
                const result = JSON.parse(storedData);

                // Process the pre-imported data
                this.wizardData.importedData = result;
                this.wizardData.vulnerabilities = result.vulnerabilities;

                // Show results
                this.displayImportResults(result);

                // Process NIST controls
                this.processNistControls();

                // Enable next button
                this.elements.nextButton.disabled = false;

                // Clear session storage
                sessionStorage.removeItem('wizardImportData');

                console.log('[POAMWizard] Pre-imported data processed successfully');
            }
        } catch (error) {
            console.error('[POAMWizard] Failed to process pre-imported data:', error);
            sessionStorage.removeItem('wizardImportData');
        }
    }

    async handleFileImport(event) {
        const file = event.target.files[0];
        if (file) {
            await this.processImportFile(file);
        }
    }

    async processImportFile(file) {
        try {
            console.log('[POAMWizard] Processing import file:', file.name);

            // Show loading
            this.elements.importArea.innerHTML = '<div>Processing file...</div>';

            // Import the file
            const result = await this.exportImportManager.importForPoamCreation(file, this.dataManager);

            if (result.success) {
                this.wizardData.importedData = result;
                this.wizardData.vulnerabilities = result.vulnerabilities;

                // Show results
                this.displayImportResults(result);

                // Process NIST controls
                this.processNistControls();

                // Enable next button
                this.elements.nextButton.disabled = false;

                console.log('[POAMWizard] Import successful:', result);
            }

        } catch (error) {
            console.error('[POAMWizard] Import failed:', error);
            this.elements.importArea.innerHTML = `
                <div style="color: #dc3545;">
                    <h3>Import Failed</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-secondary" onclick="window.location.reload()">Try Again</button>
                </div>
            `;
        }
    }

    displayImportResults(result) {
        this.elements.totalVulns.textContent = result.totalVulnerabilities;
        this.elements.eligibleVulns.textContent = result.eligibleForPoam;

        // Count unique NIST controls
        const controls = new Set();
        result.vulnerabilities.forEach(vuln => {
            if (vuln.nistControls && Array.isArray(vuln.nistControls)) {
                vuln.nistControls.forEach(control => controls.add(control));
            }
        });
        this.elements.nistControlsFound.textContent = controls.size;

        // Show results
        this.elements.importResults.style.display = 'block';

        // Update import area
        this.elements.importArea.innerHTML = `
            <div style="color: #28a745;">
                <div class="import-icon">✅</div>
                <h3>File Imported Successfully</h3>
                <p><strong>${result.totalVulnerabilities}</strong> vulnerabilities loaded</p>
                <p><strong>${result.eligibleForPoam}</strong> eligible for POAM creation</p>
            </div>
        `;
    }

    processNistControls() {
        const controlsMap = new Map();

        // Debug logging
        const totalVulns = this.wizardData.vulnerabilities.length;
        const eligibleVulns = this.wizardData.vulnerabilities.filter(v => v.availableForPoam).length;
        console.log(`[POAMWizard] Processing ${totalVulns} total vulnerabilities, ${eligibleVulns} eligible for POAM`);

        // Group vulnerabilities by NIST controls and deduplicate
        this.wizardData.vulnerabilities.forEach(vuln => {
            if (vuln.availableForPoam && vuln.nistControls && Array.isArray(vuln.nistControls)) {
                vuln.nistControls.forEach(control => {
                    if (!controlsMap.has(control)) {
                        controlsMap.set(control, {
                            name: control,
                            family: this.extractControlFamily(control),
                            vulnerabilities: []
                        });
                    }

                    // Check for duplicates by vulnId before adding
                    const controlData = controlsMap.get(control);
                    const isDuplicate = controlData.vulnerabilities.some(existing => existing.vulnId === vuln.vulnId);

                    if (!isDuplicate) {
                        controlData.vulnerabilities.push(vuln);
                    }
                });
            }
        });

        this.wizardData.controlsMap = controlsMap;

        // Debug logging for CM-7 specifically
        if (controlsMap.has('CM-7')) {
            const cm7Data = controlsMap.get('CM-7');
            console.log(`[POAMWizard] CM-7 has ${cm7Data.vulnerabilities.length} unique eligible vulnerabilities after deduplication`);

            // Also log all CM-7 vulnerabilities to see what was filtered
            const allCM7 = this.wizardData.vulnerabilities.filter(v =>
                v.nistControls && Array.isArray(v.nistControls) && v.nistControls.includes('CM-7')
            );
            console.log(`[POAMWizard] CM-7 total vulnerabilities in raw data: ${allCM7.length} (including duplicates)`);

            // Show unique vulnIds
            const uniqueVulnIds = [...new Set(allCM7.map(v => v.vulnId))];
            console.log(`[POAMWizard] CM-7 unique vulnerability IDs: ${uniqueVulnIds.length}`, uniqueVulnIds);
        }

        console.log('[POAMWizard] Processed NIST controls:', controlsMap.size);
    }

    extractControlFamily(controlName) {
        // Extract family from control name (e.g., "AC-1" -> "AC")
        const match = controlName.match(/^([A-Z]{2,3})-/);
        return match ? match[1] : 'Unknown';
    }

    showStep(stepNumber) {
        console.log('[POAMWizard] Showing step:', stepNumber);

        // Update current step
        this.currentStep = stepNumber;

        // Update progress bar
        const progress = (stepNumber / this.totalSteps) * 100;
        this.elements.progressFill.style.width = `${progress}%`;

        // Update step indicators
        document.querySelectorAll('.wizard-step').forEach((step, index) => {
            const stepNum = index + 1;
            step.classList.remove('active', 'completed');

            if (stepNum < stepNumber) {
                step.classList.add('completed');
            } else if (stepNum === stepNumber) {
                step.classList.add('active');
            }
        });

        // Show/hide step content
        document.querySelectorAll('.wizard-step-content').forEach((content, index) => {
            content.classList.remove('active');
            if (index + 1 === stepNumber) {
                content.classList.add('active');
            }
        });

        // Update navigation buttons
        this.updateNavigationButtons();

        // Step-specific initialization
        this.initializeStep(stepNumber);
    }

    initializeStep(stepNumber) {
        switch (stepNumber) {
            case 1:
                this.elements.nextButton.disabled = !this.wizardData.importedData;
                break;
            case 2:
                this.renderNistControls();
                break;
            case 3:
                this.renderVulnerabilitySelection();
                break;
            case 4:
                this.generatePOAMTitle();
                this.generateMilestones();
                // Update navigation after generating content
                setTimeout(() => this.updateNavigationButtons(), 0);
                break;
            case 5:
                this.renderReviewSummary();
                break;
        }
    }

    renderNistControls() {
        const grid = this.elements.nistControlsGrid;
        grid.innerHTML = '';

        // Sort controls by family then name
        const sortedControls = Array.from(this.wizardData.controlsMap.entries())
            .sort(([a], [b]) => a.localeCompare(b));

        sortedControls.forEach(([controlName, controlData]) => {
            const card = document.createElement('div');
            card.className = 'control-card';
            card.innerHTML = `
                <div class="control-header">
                    <input type="checkbox" class="control-checkbox" data-control="${controlName}">
                    <div class="control-name">${controlName}</div>
                </div>
                <div class="control-family">Family: ${controlData.family}</div>
                <div class="control-vuln-count">${controlData.vulnerabilities.length} vulnerabilities</div>
            `;

            // Add click handler
            card.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = card.querySelector('.control-checkbox');
                    checkbox.checked = !checkbox.checked;
                    this.toggleControlSelection(controlName, checkbox.checked);
                }
            });

            // Add checkbox handler
            const checkbox = card.querySelector('.control-checkbox');
            checkbox.addEventListener('change', (e) => {
                this.toggleControlSelection(controlName, e.target.checked);
            });

            grid.appendChild(card);
        });

        this.updateSelectedControlsCount();
    }

    toggleControlSelection(controlName, isSelected) {
        const card = document.querySelector(`[data-control="${controlName}"]`).closest('.control-card');

        if (isSelected) {
            this.wizardData.selectedControls.add(controlName);
            card.classList.add('selected');
        } else {
            this.wizardData.selectedControls.delete(controlName);
            card.classList.remove('selected');
            // Remove any selected vulnerabilities for this control
            this.wizardData.selectedVulnerabilities.delete(controlName);
        }

        this.updateSelectedControlsCount();
        this.updateNavigationButtons();
    }

    selectAllControls() {
        document.querySelectorAll('.control-checkbox').forEach(checkbox => {
            checkbox.checked = true;
            this.toggleControlSelection(checkbox.dataset.control, true);
        });
    }

    selectNoneControls() {
        document.querySelectorAll('.control-checkbox').forEach(checkbox => {
            checkbox.checked = false;
            this.toggleControlSelection(checkbox.dataset.control, false);
        });
    }

    updateSelectedControlsCount() {
        const count = this.wizardData.selectedControls.size;
        this.elements.selectedControlsCount.textContent = `${count} control${count !== 1 ? 's' : ''} selected`;
    }

    renderVulnerabilitySelection() {
        const container = this.elements.vulnerabilitySelectionContainer;
        container.innerHTML = '';

        if (this.wizardData.selectedControls.size === 0) {
            container.innerHTML = '<p>No NIST controls selected. Please go back and select controls.</p>';
            return;
        }

        this.wizardData.selectedControls.forEach(controlName => {
            const controlData = this.wizardData.controlsMap.get(controlName);
            const section = document.createElement('div');
            section.className = 'vulnerability-section';
            const eligibleCount = controlData.vulnerabilities.filter(v => v.availableForPoam).length;
            section.innerHTML = `
                <h3>${controlName} - ${controlData.family} Family (${eligibleCount} vulnerabilities)</h3>
                <div class="section-actions" style="margin-bottom: 15px;">
                    <button class="btn btn-sm btn-secondary" onclick="window.poamWizard.selectAllVulnerabilitiesForControl('${controlName}')">Select All</button>
                    <button class="btn btn-sm btn-secondary" onclick="window.poamWizard.selectNoneVulnerabilitiesForControl('${controlName}')">Select None</button>
                    <span class="selected-count" id="selected-${controlName}">0 of ${eligibleCount} selected</span>
                </div>
                <div class="vulnerabilities-list" id="vulns-${controlName}"></div>
            `;

            const vulnsList = section.querySelector('.vulnerabilities-list');

            // Only render vulnerabilities that are available for POAM
            controlData.vulnerabilities
                .filter(vuln => vuln.availableForPoam)
                .forEach(vuln => {
                const vulnRow = document.createElement('div');
                vulnRow.className = 'vulnerability-row';
                vulnRow.innerHTML = `
                    <div class="vulnerability-header">
                        <input type="checkbox" class="vulnerability-checkbox"
                               data-control="${controlName}" data-vuln="${vuln.vulnId}">
                        <div class="vulnerability-id">${vuln.vulnId}</div>
                        <div class="vulnerability-title">${vuln.title}</div>
                        <div class="vulnerability-severity severity-${vuln.severity}">${vuln.severity}</div>
                    </div>
                    <div class="vulnerability-details">
                        <strong>STIG:</strong> ${vuln.stigName}<br>
                        <strong>Status:</strong> ${vuln.status}<br>
                        <strong>CCIs:</strong> ${(vuln.ccis || []).join(', ')}
                    </div>
                `;

                // Add event handlers
                const checkbox = vulnRow.querySelector('.vulnerability-checkbox');
                checkbox.addEventListener('change', (e) => {
                    this.toggleVulnerabilitySelection(controlName, vuln, e.target.checked);
                });

                vulnRow.addEventListener('click', (e) => {
                    if (e.target.type !== 'checkbox') {
                        checkbox.checked = !checkbox.checked;
                        this.toggleVulnerabilitySelection(controlName, vuln, checkbox.checked);
                    }
                });

                vulnsList.appendChild(vulnRow);
            });

            container.appendChild(section);
        });

        // Initialize selections
        this.wizardData.selectedControls.forEach(controlName => {
            if (!this.wizardData.selectedVulnerabilities.has(controlName)) {
                this.wizardData.selectedVulnerabilities.set(controlName, []);
            }
        });

        // Update counts
        this.updateVulnerabilitySelectionCounts();
    }

    toggleVulnerabilitySelection(controlName, vulnerability, isSelected) {
        if (!this.wizardData.selectedVulnerabilities.has(controlName)) {
            this.wizardData.selectedVulnerabilities.set(controlName, []);
        }

        const vulnList = this.wizardData.selectedVulnerabilities.get(controlName);
        const vulnRow = document.querySelector(`[data-vuln="${vulnerability.vulnId}"]`).closest('.vulnerability-row');

        if (isSelected) {
            if (!vulnList.find(v => v.vulnId === vulnerability.vulnId)) {
                vulnList.push(vulnerability);
            }
            vulnRow.classList.add('selected');
        } else {
            const index = vulnList.findIndex(v => v.vulnId === vulnerability.vulnId);
            if (index > -1) {
                vulnList.splice(index, 1);
            }
            vulnRow.classList.remove('selected');
        }

        // Update counts using the centralized function
        this.updateVulnerabilitySelectionCounts();

        this.updateNavigationButtons();
    }

    selectAllVulnerabilitiesForControl(controlName) {
        const controlData = this.wizardData.controlsMap.get(controlName);
        controlData.vulnerabilities
            .filter(vuln => vuln.availableForPoam)
            .forEach(vuln => {
            const checkbox = document.querySelector(`[data-control="${controlName}"][data-vuln="${vuln.vulnId}"]`);
            if (checkbox) {
                checkbox.checked = true;
                this.toggleVulnerabilitySelection(controlName, vuln, true);
            }
        });
        this.updateVulnerabilitySelectionCounts();
    }

    selectNoneVulnerabilitiesForControl(controlName) {
        const controlData = this.wizardData.controlsMap.get(controlName);
        controlData.vulnerabilities
            .filter(vuln => vuln.availableForPoam)
            .forEach(vuln => {
            const checkbox = document.querySelector(`[data-control="${controlName}"][data-vuln="${vuln.vulnId}"]`);
            if (checkbox) {
                checkbox.checked = false;
                this.toggleVulnerabilitySelection(controlName, vuln, false);
            }
        });
        this.updateVulnerabilitySelectionCounts();
    }

    selectAllVulnerabilities() {
        this.wizardData.selectedControls.forEach(controlName => {
            this.selectAllVulnerabilitiesForControl(controlName);
        });
        this.updateVulnerabilitySelectionCounts();
    }

    selectNoneVulnerabilities() {
        this.wizardData.selectedControls.forEach(controlName => {
            this.selectNoneVulnerabilitiesForControl(controlName);
        });
        this.updateVulnerabilitySelectionCounts();
    }

    updateVulnerabilitySelectionCounts() {
        // Update global count
        let totalSelected = 0;
        let totalAvailable = 0;

        this.wizardData.selectedControls.forEach(controlName => {
            const controlData = this.wizardData.controlsMap.get(controlName);
            const eligibleVulns = controlData.vulnerabilities.filter(v => v.availableForPoam);
            const selectedVulns = this.wizardData.selectedVulnerabilities.get(controlName) || [];

            totalAvailable += eligibleVulns.length;
            totalSelected += selectedVulns.length;

            // Update per-control count
            const countElement = document.getElementById(`selected-${controlName}`);
            if (countElement) {
                countElement.textContent = `${selectedVulns.length} of ${eligibleVulns.length} selected`;
            }
        });

        // Update global count if element exists
        if (this.elements.selectedVulnerabilitiesCount) {
            this.elements.selectedVulnerabilitiesCount.textContent = `${totalSelected} of ${totalAvailable} vulnerabilities selected`;
        }
    }

    generatePOAMTitle() {
        const controls = Array.from(this.wizardData.selectedControls);
        if (controls.length > 0) {
            const title = controls.length === 1
                ? `Remediate ${controls[0]} Vulnerabilities`
                : `Remediate Multiple NIST Control Vulnerabilities (${controls.join(', ')})`;
            this.elements.poamTitle.value = title;
        }
    }

    generateMilestones() {
        const spacing = parseInt(this.elements.milestoneSpacing.value) || 2;
        const startDate = new Date(this.elements.startDate.value);

        if (!startDate || isNaN(startDate.getTime())) {
            console.warn('[POAMWizard] Invalid start date for milestone generation');
            return;
        }

        const milestones = [];
        let currentDate = new Date(startDate);

        // Generate milestones for each selected control and vulnerability
        this.wizardData.selectedControls.forEach(controlName => {
            const selectedVulns = this.wizardData.selectedVulnerabilities.get(controlName) || [];

            selectedVulns.forEach((vuln, index) => {
                milestones.push({
                    id: `${controlName}-${vuln.vulnId}`,
                    title: `Remediate ${vuln.vulnId}: ${vuln.title}`,
                    control: controlName,
                    vulnerability: vuln,
                    dueDate: new Date(currentDate),
                    status: 'pending',
                    description: `Address vulnerability ${vuln.vulnId} for NIST control ${controlName}`
                });

                // Add spacing days for next milestone
                currentDate = new Date(currentDate.getTime() + spacing * 24 * 60 * 60 * 1000);
            });
        });

        this.wizardData.generatedMilestones = milestones;
        this.renderMilestones();
    }

    renderMilestones() {
        const container = this.elements.milestonesContainer;
        container.innerHTML = '';

        if (this.wizardData.generatedMilestones.length === 0) {
            container.innerHTML = '<p>No milestones generated. Please select vulnerabilities and set dates.</p>';
            return;
        }

        this.wizardData.generatedMilestones.forEach((milestone, index) => {
            const milestoneDiv = document.createElement('div');
            milestoneDiv.className = 'milestone-item';
            milestoneDiv.innerHTML = `
                <div class="milestone-header">
                    <div class="milestone-title">${milestone.title}</div>
                    <button class="milestone-remove" onclick="window.poamWizard.removeMilestone(${index})">Remove</button>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Due Date</label>
                        <input type="date" value="${milestone.dueDate.toISOString().split('T')[0]}"
                               onchange="window.poamWizard.updateMilestoneDate(${index}, this.value)">
                    </div>
                    <div class="form-group">
                        <label>Progress (%)</label>
                        <input type="number" min="0" max="100" value="${milestone.progress}"
                               onchange="window.poamWizard.updateMilestoneProgress(${index}, this.value)">
                    </div>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea onchange="window.poamWizard.updateMilestoneDescription(${index}, this.value)">${milestone.description}</textarea>
                </div>
            `;
            container.appendChild(milestoneDiv);
        });
    }

    removeMilestone(index) {
        this.wizardData.generatedMilestones.splice(index, 1);
        this.renderMilestones();
    }

    updateMilestoneDate(index, dateValue) {
        this.wizardData.generatedMilestones[index].dueDate = new Date(dateValue);
    }

    updateMilestoneProgress(index, progress) {
        this.wizardData.generatedMilestones[index].progress = parseInt(progress);
    }

    updateMilestoneDescription(index, description) {
        this.wizardData.generatedMilestones[index].description = description;
    }

    renderReviewSummary() {
        // POAM Summary
        const totalVulns = Array.from(this.wizardData.selectedVulnerabilities.values())
            .reduce((sum, vulns) => sum + vulns.length, 0);

        this.elements.poamSummary.innerHTML = `
            <div class="summary-item"><span>Title:</span><span>${this.elements.poamTitle.value}</span></div>
            <div class="summary-item"><span>Assignee:</span><span>${this.elements.poamAssignee.value || 'Not assigned'}</span></div>
            <div class="summary-item"><span>Due Date:</span><span>${this.elements.poamDueDate.value || 'Not set'}</span></div>
            <div class="summary-item"><span>Priority:</span><span>${this.elements.poamPriority.value}</span></div>
            <div class="summary-item"><span>Total Vulnerabilities:</span><span>${totalVulns}</span></div>
            <div class="summary-item"><span>Total Milestones:</span><span>${this.wizardData.generatedMilestones.length}</span></div>
        `;

        // Controls Summary
        this.elements.controlsSummary.innerHTML = Array.from(this.wizardData.selectedControls)
            .map(control => {
                const vulnCount = this.wizardData.selectedVulnerabilities.get(control)?.length || 0;
                return `<div class="summary-item"><span>${control}:</span><span>${vulnCount} vulnerabilities</span></div>`;
            }).join('');

        // Milestones Summary
        this.elements.milestonesSummary.innerHTML = this.wizardData.generatedMilestones
            .map(milestone => `
                <div class="summary-item">
                    <span>${milestone.title}</span>
                    <span>Due: ${milestone.dueDate.toLocaleDateString()}</span>
                </div>
            `).join('');
    }

    updateNavigationButtons() {
        // Previous button
        this.elements.prevButton.style.display = this.currentStep > 1 ? 'block' : 'none';

        // Next/Create buttons
        const canProceed = this.canProceedFromStep(this.currentStep);

        if (this.currentStep < this.totalSteps) {
            this.elements.nextButton.style.display = 'block';
            this.elements.createButton.style.display = 'none';
            this.elements.nextButton.disabled = !canProceed;
        } else {
            this.elements.nextButton.style.display = 'none';
            this.elements.createButton.style.display = 'block';
            this.elements.createButton.disabled = !canProceed;
        }
    }

    canProceedFromStep(stepNumber) {
        switch (stepNumber) {
            case 1:
                return !!this.wizardData.importedData;
            case 2:
                return this.wizardData.selectedControls.size > 0;
            case 3:
                return Array.from(this.wizardData.selectedVulnerabilities.values())
                    .some(vulns => vulns.length > 0);
            case 4:
                const hasTitle = this.elements.poamTitle.value.trim().length > 0;
                const hasSelectedVulns = Array.from(this.wizardData.selectedVulnerabilities.values())
                    .some(vulns => vulns.length > 0);
                return hasTitle && hasSelectedVulns;
            case 5:
                return true;
            default:
                return false;
        }
    }

    nextStep() {
        if (this.currentStep < this.totalSteps && this.canProceedFromStep(this.currentStep)) {
            this.showStep(this.currentStep + 1);
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.showStep(this.currentStep - 1);
        }
    }

    async createPOAM() {
        try {
            console.log('[POAMWizard] Creating POAM...');

            // Disable button and show progress
            this.elements.createButton.disabled = true;
            this.elements.createButton.textContent = 'Creating POAM...';

            // Collect POAM data
            const poamData = {
                title: this.elements.poamTitle.value,
                assignee: this.elements.poamAssignee.value,
                dueDate: this.elements.poamDueDate.value,
                priority: this.elements.poamPriority.value,
                description: this.elements.poamDescription.value,
                status: 'open',
                progress: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),

                // NIST controls and vulnerabilities
                nistControls: Array.from(this.wizardData.selectedControls),
                vulnerabilities: Array.from(this.wizardData.selectedVulnerabilities.values()).flat(),
                milestones: this.wizardData.generatedMilestones,

                // Metadata
                source: 'wizard',
                importedFrom: this.wizardData.importedData.metadata?.exportedAt
            };

            // Ensure DataManager has basic data structure before adding POAM
            if (!this.dataManager.currentData) {
                console.log('[POAMWizard] Initializing empty data structure for DataManager');
                this.dataManager.currentData = {
                    stigData: [],
                    poams: [],
                    cciMappings: [],
                    metadata: {
                        version: '1.0',
                        lastUpdated: new Date().toISOString()
                    }
                };
            }

            // Create POAM using data manager
            if (this.dataManager && typeof this.dataManager.addPoamToData === 'function') {
                const createdPoam = await this.dataManager.addPoamToData(poamData);
                console.log('[POAMWizard] POAM created successfully');

                // Add milestones to the global milestones array
                if (this.wizardData.generatedMilestones && this.wizardData.generatedMilestones.length > 0) {
                    // Ensure milestones array exists
                    this.dataManager.currentData.milestones = this.dataManager.currentData.milestones || [];

                    // Add each milestone with the POAM ID reference
                    this.wizardData.generatedMilestones.forEach(milestone => {
                        const milestoneData = {
                            ...milestone,
                            poamId: createdPoam.id, // Link to the created POAM
                            id: Date.now() + Math.random(), // Unique ID
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };
                        this.dataManager.currentData.milestones.push(milestoneData);
                    });

                    console.log('[POAMWizard] Added', this.wizardData.generatedMilestones.length, 'milestones to data');
                }

                // Persist the data so it's available on page navigation
                // Since this is a file-based system, we'll use localStorage as temporary persistence
                if (this.dataManager.currentData) {
                    localStorage.setItem('cybersec-suite-data', JSON.stringify(this.dataManager.currentData));
                    console.log('[POAMWizard] Data persisted to localStorage:', {
                        poams: this.dataManager.currentData.poams?.length || 0,
                        milestones: this.dataManager.currentData.milestones?.length || 0,
                        dataStructure: Object.keys(this.dataManager.currentData)
                    });

                }

                // Show success and redirect
                alert('POAM created successfully! Redirecting to POAM management page.');
                window.location.href = 'poams.html';
            } else {
                throw new Error('Data manager not available for POAM creation');
            }

        } catch (error) {
            console.error('[POAMWizard] Failed to create POAM:', error);
            alert(`Failed to create POAM: ${error.message}`);

            // Restore button
            this.elements.createButton.disabled = false;
            this.elements.createButton.textContent = 'Create POAM';
        }
    }
}

// Make available globally
window.POAMWizard = POAMWizard;