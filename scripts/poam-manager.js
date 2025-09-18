/* POAM Manager - Plans of Action & Milestones Management
   - Handles POAM creation, editing, and tracking
   - Manages milestones within POAMs
   - Integrates with DataManager for JSON file persistence
   - Provides UI interactions for POAM management
*/

class POAMManager {
    constructor(dataManager, statusMessages) {
        this.dataManager = dataManager;
        this.statusMessages = statusMessages;
        this.currentPOAMs = [];
        this.currentMilestones = [];
        this.editingPOAM = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadData();
    }

    setupEventListeners() {
        // Tab switching
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => this.switchTab(e));
        });

        // Search functionality
        const poamSearch = document.getElementById('poam-search');
        if (poamSearch) {
            poamSearch.addEventListener('input', (e) => {
                this.filterPOAMs(e.target.value);
            });
        }

        // Export functionality
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
    }

    switchTab(event) {
        const targetTab = event.target.closest('.tab-btn').getAttribute('data-tab');
        
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        event.target.closest('.tab-btn').classList.add('active');
        const targetContent = document.getElementById(targetTab);
        if (targetContent) {
            targetContent.classList.add('active');
        }
    }

    async loadData() {
        try {
            if (!this.dataManager) {
                console.log('DataManager not available for POAM data loading');
                return;
            }

            // Load POAMs
            if (typeof this.dataManager.getPOAMs === 'function') {
                this.currentPOAMs = await this.dataManager.getPOAMs();
                this.renderPOAMs();
            }

            // Load Milestones
            if (typeof this.dataManager.getMilestones === 'function') {
                this.currentMilestones = await this.dataManager.getMilestones();
                this.renderMilestones();
            }
            
        } catch (error) {
            console.error('Failed to load POAM data:', error);
            if (this.statusMessages) {
                this.statusMessages.showError('Failed to load POAM data');
            }
        }
    }

    renderPOAMs() {
        const tbody = document.getElementById('poams-tbody');
        const emptyState = document.getElementById('poamEmptyState');
        
        if (!tbody) return;
        
        if (this.currentPOAMs.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.hidden = false;
            return;
        }

        if (emptyState) emptyState.hidden = true;

        tbody.innerHTML = this.currentPOAMs.map(poam => `
            <tr data-poam-id="${poam.id}">
                <td>${poam.vulnId || 'N/A'}</td>
                <td>
                    <div class="poam-title">${poam.title}</div>
                    <small class="text-muted">${poam.description || ''}</small>
                </td>
                <td>
                    <span class="severity-badge severity-${(poam.severity || 'medium').toLowerCase()}">
                        ${poam.severity || 'Medium'}
                    </span>
                </td>
                <td>${poam.nistControls || 'N/A'}</td>
                <td>${poam.ccis || 'N/A'}</td>
                <td>
                    <span class="status-badge status-${(poam.status || 'open').toLowerCase()}">
                        ${this.formatStatus(poam.status)}
                    </span>
                </td>
                <td>${poam.assignee || 'Unassigned'}</td>
                <td>${poam.dueDate ? this.formatDate(poam.dueDate) : 'No due date'}</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${poam.progress || 0}%"></div>
                    </div>
                    <small>${poam.progress || 0}%</small>
                </td>
                <td>
                    <span class="milestone-count">
                        ${this.getMilestoneCount(poam.id)} milestones
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-outline" onclick="poamManager.editPOAM('${poam.id}')" title="Edit POAM">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708L10.5 8.207l-3-3L12.146.146zM11.207 9.5L7 13.707V10.5a.5.5 0 0 0-.5-.5H3.207L11.207 9.5z"/>
                            </svg>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="poamManager.deletePOAM('${poam.id}')" title="Delete POAM">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderMilestones() {
        const tbody = document.getElementById('milestones-tbody');
        const emptyState = document.getElementById('milestoneEmptyState');
        
        if (!tbody) return;
        
        if (this.currentMilestones.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.hidden = false;
            return;
        }

        if (emptyState) emptyState.hidden = true;

        tbody.innerHTML = this.currentMilestones.map(milestone => {
            const relatedPOAM = this.currentPOAMs.find(p => p.id === milestone.poamId);
            return `
                <tr data-milestone-id="${milestone.id}">
                    <td>
                        <div class="milestone-title">${milestone.title}</div>
                        <small class="text-muted">${milestone.description || ''}</small>
                    </td>
                    <td>
                        ${relatedPOAM ? `${relatedPOAM.vulnId}: ${relatedPOAM.title}` : 'Unknown POAM'}
                    </td>
                    <td>${milestone.dueDate ? this.formatDate(milestone.dueDate) : 'No due date'}</td>
                    <td>
                        <span class="status-badge status-${(milestone.status || 'pending').toLowerCase()}">
                            ${this.formatStatus(milestone.status)}
                        </span>
                    </td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${milestone.progress || 0}%"></div>
                        </div>
                        <small>${milestone.progress || 0}%</small>
                    </td>
                    <td>
                        <div class="milestone-notes">
                            ${milestone.notes || 'No notes'}
                        </div>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-outline" onclick="poamManager.editMilestone('${milestone.id}')" title="Edit Milestone">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708L10.5 8.207l-3-3L12.146.146zM11.207 9.5L7 13.707V10.5a.5.5 0 0 0-.5-.5H3.207L11.207 9.5z"/>
                                </svg>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="if(confirm('Are you sure you want to delete this milestone?')){poamManager.deleteMilestone('${milestone.id}');}" title="Delete Milestone">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                    <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Method to initialize the create POAM form
    initializeCreateForm() {
        // Set up event listeners for the create form
        const savePOAMBtn = document.getElementById('save-poam');
        const addMilestoneBtn = document.getElementById('poam-ms-add-btn');
        const saveMilestoneBtn = document.getElementById('poam-ms-inline-save');
        const cancelMilestoneBtn = document.getElementById('poam-ms-inline-cancel');

        if (savePOAMBtn) {
            savePOAMBtn.addEventListener('click', () => this.savePOAM());
        }

        if (addMilestoneBtn) {
            addMilestoneBtn.addEventListener('click', () => this.showMilestoneForm());
        }

        if (saveMilestoneBtn) {
            saveMilestoneBtn.addEventListener('click', () => this.saveMilestone());
        }

        if (cancelMilestoneBtn) {
            cancelMilestoneBtn.addEventListener('click', () => this.hideMilestoneForm());
        }

        // Initialize milestone form as hidden
        this.hideMilestoneForm();
    }

    showMilestoneForm() {
        const form = document.getElementById('poam-ms-inline-form');
        if (form) {
            form.style.display = 'block';
            // Scroll to the form
            form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    hideMilestoneForm() {
        const form = document.getElementById('poam-ms-inline-form');
        if (form) {
            form.style.display = 'none';
            // Clear the form
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                if (input.type === 'number') {
                    input.value = '0';
                } else {
                    input.value = '';
                }
            });
        }
    }

    saveMilestone() {
        // TODO: Implement milestone saving for the create form
        console.log('Save milestone clicked');
        this.hideMilestoneForm();
    }

    async savePOAM() {
        try {
            if (!this.dataManager) {
                throw new Error('Data storage not available');
            }

            const formData = this.getPOAMFormData();
            
            if (!formData.title) {
                if (this.statusMessages) {
                    this.statusMessages.showError('POAM title is required');
                }
                return;
            }

            const poamData = {
                ...formData,
                id: this.editingPOAM ? this.editingPOAM.id : undefined,
                createdAt: this.editingPOAM ? this.editingPOAM.createdAt : new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Compile POAM data to JSON file
            await this.dataManager.compilePoamData(this.currentPOAMs.concat([poamData]), this.currentMilestones);
            
            if (this.statusMessages) {
                this.statusMessages.showSuccess(
                    this.editingPOAM ? 'POAM updated successfully' : 'POAM created successfully'
                );
            }

            // Check if we're on the create POAM page
            const isCreatePage = window.location.pathname.includes('create-poam.html');
            
            if (isCreatePage) {
                // Redirect back to POAM management page after a short delay
                setTimeout(() => {
                    window.location.href = 'poams.html';
                }, 1500);
            } else {
                // Reload data for POAM management page
                await this.loadData();
            }
            
        } catch (error) {
            console.error('Failed to save POAM:', error);
            if (this.statusMessages) {
                this.statusMessages.showError('Failed to save POAM: ' + error.message);
            }
        }
    }

    getPOAMFormData() {
        return {
            vulnId: document.getElementById('poam-vuln-id')?.value || '',
            title: document.getElementById('poam-title')?.value || '',
            description: document.getElementById('poam-description')?.value || '',
            severity: document.getElementById('poam-severity')?.value || 'Medium',
            nistControls: document.getElementById('poam-nist-controls')?.value || '',
            ccis: document.getElementById('poam-ccis')?.value || '',
            status: document.getElementById('poam-status')?.value || 'open',
            assignee: document.getElementById('poam-assignee')?.value || '',
            dueDate: document.getElementById('poam-due-date')?.value || null,
            progress: parseInt(document.getElementById('poam-progress')?.value || '0'),
            notes: document.getElementById('poam-notes')?.value || ''
        };
    }

    async editPOAM(poamId) {
        // Redirect to create POAM page for editing
        const poam = this.currentPOAMs.find(p => p.id === poamId);
        if (poam) {
            // Store the POAM data for editing and redirect
            sessionStorage.setItem('editPOAM', JSON.stringify(poam));
            window.location.href = 'create-poam.html';
        }
    }

    async deletePOAM(poamId) {
        if (!confirm('Are you sure you want to delete this POAM? This action cannot be undone.')) {
            return;
        }

        try {
            if (!this.dataManager) {
                throw new Error('Data storage not available');
            }

            // Remove from current POAMs and recompile
            this.currentPOAMs = this.currentPOAMs.filter(p => p.id !== poamId);
            await this.dataManager.compilePoamData(this.currentPOAMs, this.currentMilestones);
            
            if (this.statusMessages) {
                this.statusMessages.showSuccess('POAM deleted successfully');
            }

            await this.loadData();
            
        } catch (error) {
            console.error('Failed to delete POAM:', error);
            if (this.statusMessages) {
                this.statusMessages.showError('Failed to delete POAM: ' + error.message);
            }
        }
    }

    async deleteMilestone(milestoneId) {
        if (!confirm('Are you sure you want to delete this milestone?')) {
            return;
        }

        try {
            if (!this.dataManager) {
                throw new Error('Data storage not available');
            }

            // Remove from current milestones and recompile
            this.currentMilestones = this.currentMilestones.filter(m => m.id !== milestoneId);
            await this.dataManager.compilePoamData(this.currentPOAMs, this.currentMilestones);
            
            if (this.statusMessages) {
                this.statusMessages.showSuccess('Milestone deleted successfully');
            }

            await this.loadData();
            
        } catch (error) {
            console.error('Failed to delete milestone:', error);
            if (this.statusMessages) {
                this.statusMessages.showError('Failed to delete milestone: ' + error.message);
            }
        }
    }

    filterPOAMs(searchTerm) {
        const rows = document.querySelectorAll('#poams-tbody tr');
        const lowerSearchTerm = searchTerm.toLowerCase();
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(lowerSearchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    async exportData() {
        try {
            if (!this.dataManager || typeof this.dataManager.exportAllData !== 'function') {
                throw new Error('Data export not available');
            }

            const data = await this.dataManager.exportAllData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `poam-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            if (this.statusMessages) {
                this.statusMessages.showSuccess('Data exported successfully');
            }
            
        } catch (error) {
            console.error('Export failed:', error);
            if (this.statusMessages) {
                this.statusMessages.showError('Failed to export data: ' + error.message);
            }
        }
    }

    // Method to initialize the create POAM form
    initializeCreateForm() {
        // Set up event listeners for the create form
        const savePOAMBtn = document.getElementById('save-poam');
        const addMilestoneBtn = document.getElementById('poam-ms-add-btn');
        const saveMilestoneBtn = document.getElementById('poam-ms-inline-save');
        const cancelMilestoneBtn = document.getElementById('poam-ms-inline-cancel');

        if (savePOAMBtn) {
            savePOAMBtn.addEventListener('click', () => this.savePOAM());
        }

        if (addMilestoneBtn) {
            addMilestoneBtn.addEventListener('click', () => this.showMilestoneForm());
        }

        if (saveMilestoneBtn) {
            saveMilestoneBtn.addEventListener('click', () => this.saveMilestone());
        }

        if (cancelMilestoneBtn) {
            cancelMilestoneBtn.addEventListener('click', () => this.hideMilestoneForm());
        }

        // Initialize milestone form as hidden
        this.hideMilestoneForm();
    }

    showMilestoneForm() {
        const form = document.getElementById('poam-ms-inline-form');
        if (form) {
            form.style.display = 'block';
            // Scroll to the form
            form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    hideMilestoneForm() {
        const form = document.getElementById('poam-ms-inline-form');
        if (form) {
            form.style.display = 'none';
            // Clear the form
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                if (input.type === 'number') {
                    input.value = '0';
                } else {
                    input.value = '';
                }
            });
        }
    }

    saveMilestone() {
        // TODO: Implement milestone saving for the create form
        console.log('Save milestone clicked');
        this.hideMilestoneForm();
    }

    populateEditForm(poam) {
        // Store the editing POAM reference
        this.editingPOAM = poam;
        
        // Populate form fields
        const fields = [
            'poam-vuln-id', 'poam-title', 'poam-description', 'poam-severity',
            'poam-nist-controls', 'poam-ccis', 'poam-status', 'poam-assignee',
            'poam-due-date', 'poam-progress', 'poam-notes'
        ];

        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                const fieldName = fieldId.replace('poam-', '').replace('-', '');
                let value = poam[fieldName] || poam[fieldId.replace('poam-', '')] || '';
                
                if (fieldId === 'poam-due-date' && value) {
                    value = new Date(value).toISOString().split('T')[0];
                }
                
                element.value = value;
            }
        });
    }

    formatDate(dateString) {
        if (!dateString) return 'No date';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    getMilestoneCount(poamId) {
        return this.currentMilestones.filter(m => m.poamId === poamId).length;
    }
}

// Global instance will be created when the page loads
window.POAMManager = POAMManager;
