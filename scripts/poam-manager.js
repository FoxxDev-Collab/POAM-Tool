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

        // Filtering and sorting state
        this.filteredPOAMs = [];
        this.activeFilters = new Map();
        this.currentSort = { field: 'createdAt', direction: 'desc' };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeFilteringSystem();
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
                console.log('[POAMManager] Loaded POAMs:', this.currentPOAMs.length, this.currentPOAMs);
                this.populateFilterOptions();
                this.applyFiltersAndSort();
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
                <td>
                    <div class="poam-title">${poam.title}</div>
                    <small class="text-muted">${poam.description || ''}</small>
                </td>
                <td>
                    <span class="status-badge status-${(poam.status || 'open').toLowerCase()}">
                        ${this.formatStatus(poam.status)}
                    </span>
                </td>
                <td>
                    <span class="priority-badge priority-${(poam.priority || 'medium').toLowerCase()}">
                        ${this.formatPriority(poam.priority)}
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
                <td>${poam.nistControls || 'N/A'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-outline" onclick="poamManager.editPOAM('${poam.id}')" title="Edit POAM">
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="poamManager.deletePOAM('${poam.id}')" title="Delete POAM">
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add icons to buttons after rendering
        this.addIconsToButtons('poams');
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
            const isCompleted = milestone.status === 'completed';
            return `
                <tr data-milestone-id="${milestone.id}" class="${isCompleted ? 'milestone-completed' : ''}">
                    <td>
                        <div class="milestone-title-container">
                            <input type="checkbox"
                                   class="milestone-checkbox"
                                   ${isCompleted ? 'checked' : ''}
                                   onchange="poamManager.toggleMilestoneCompletion('${milestone.id}')"
                                   title="Mark as ${isCompleted ? 'pending' : 'completed'}">
                            <div class="milestone-title ${isCompleted ? 'completed' : ''}">${milestone.title}</div>
                        </div>
                        <small class="text-muted">${milestone.description || ''}</small>
                    </td>
                    <td>
                        ${relatedPOAM ? relatedPOAM.title : 'Unknown POAM'}
                    </td>
                    <td>${milestone.dueDate ? this.formatDate(milestone.dueDate) : 'No due date'}</td>
                    <td>
                        <span class="status-badge status-${(milestone.status || 'pending').toLowerCase()}">
                            ${this.formatStatus(milestone.status)}
                        </span>
                    </td>
                    <td>
                        <div class="milestone-notes">
                            ${milestone.notes || 'No notes'}
                        </div>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-outline" onclick="poamManager.editMilestone('${milestone.id}')" title="Edit Milestone">
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="if(confirm('Are you sure you want to delete this milestone?')){poamManager.deleteMilestone('${milestone.id}');}" title="Delete Milestone">
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Add icons to buttons after rendering
        this.addIconsToButtons('milestones');
    }

    // Add proper icons to action buttons
    addIconsToButtons(tableType) {
        setTimeout(() => {
            if (window.Icons) {
                const tableId = tableType === 'poams' ? 'poamsTable' : 'milestonesTable';
                const table = document.getElementById(tableId);
                if (!table) return;

                // Add edit icons
                const editButtons = table.querySelectorAll('.btn-outline');
                editButtons.forEach(button => {
                    if (button.children.length === 0) { // Only if button is empty
                        const editIcon = window.Icons.create('edit', { size: 16, strokeWidth: 2 });
                        button.appendChild(editIcon);
                    }
                });

                // Add delete icons
                const deleteButtons = table.querySelectorAll('.btn-danger');
                deleteButtons.forEach(button => {
                    if (button.children.length === 0) { // Only if button is empty
                        const deleteIcon = window.Icons.create('trash', { size: 16, strokeWidth: 2 });
                        button.appendChild(deleteIcon);
                    }
                });
            }
        }, 10); // Small delay to ensure DOM is updated
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
        // Find POAM with flexible ID matching
        let poam = this.currentPOAMs.find(p => p.id === poamId);
        if (!poam) {
            const numericId = parseFloat(poamId);
            poam = this.currentPOAMs.find(p => p.id === numericId);
        }
        if (!poam) {
            const stringId = String(poamId);
            poam = this.currentPOAMs.find(p => String(p.id) === stringId);
        }

        if (!poam) {
            if (this.statusMessages) {
                this.statusMessages.showError(`POAM not found`);
            }
            return;
        }

        // Store current POAM for editing
        this.currentEditingPOAM = poam;

        // Populate modal form
        document.getElementById('edit-poam-title').value = poam.title || '';
        document.getElementById('edit-poam-description').value = poam.description || '';
        document.getElementById('edit-poam-status').value = poam.status || 'open';
        document.getElementById('edit-poam-priority').value = poam.priority || 'medium';
        document.getElementById('edit-poam-assignee').value = poam.assignee || '';
        document.getElementById('edit-poam-due').value = poam.dueDate ? new Date(poam.dueDate).toISOString().split('T')[0] : '';
        document.getElementById('edit-poam-progress').value = poam.progress || 0;
        document.getElementById('edit-poam-nist').value = poam.nistControls || '';

        // Show modal
        document.getElementById('editPOAMModal').style.display = 'block';
    }

    closeEditPOAMModal() {
        document.getElementById('editPOAMModal').style.display = 'none';
        this.currentEditingPOAM = null;
    }

    async saveEditedPOAM() {
        try {
            if (!this.currentEditingPOAM) {
                throw new Error('No POAM selected for editing');
            }

            const title = document.getElementById('edit-poam-title')?.value;
            const description = document.getElementById('edit-poam-description')?.value;
            const status = document.getElementById('edit-poam-status')?.value;
            const priority = document.getElementById('edit-poam-priority')?.value;
            const assignee = document.getElementById('edit-poam-assignee')?.value;
            const dueDate = document.getElementById('edit-poam-due')?.value;
            const nistControls = document.getElementById('edit-poam-nist')?.value;

            if (!title) {
                if (this.statusMessages) {
                    this.statusMessages.showError('POAM title is required');
                }
                return;
            }

            // Find and update the POAM
            const poamIndex = this.currentPOAMs.findIndex(p => p.id === this.currentEditingPOAM.id);
            if (poamIndex === -1) {
                throw new Error('POAM not found');
            }

            this.currentPOAMs[poamIndex] = {
                ...this.currentPOAMs[poamIndex],
                title,
                description,
                status,
                priority,
                assignee,
                dueDate: dueDate || null,
                nistControls,
                updatedAt: new Date().toISOString()
            };

            // Save to data manager
            if (this.dataManager) {
                const saved = this.dataManager.saveToStorage();
                if (!saved) {
                    throw new Error('Failed to save POAM changes');
                }
            }

            // Close modal
            this.closeEditPOAMModal();

            if (this.statusMessages) {
                this.statusMessages.showSuccess('POAM updated successfully');
            }

            // Reload data to refresh the display
            await this.loadData();

        } catch (error) {
            console.error('Failed to save POAM:', error);
            if (this.statusMessages) {
                this.statusMessages.showError('Failed to save POAM: ' + error.message);
            }
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

    async editMilestone(milestoneId) {
        // Find milestone with flexible ID matching
        let milestone = this.currentMilestones.find(m => m.id === milestoneId);
        if (!milestone) {
            const numericId = parseFloat(milestoneId);
            milestone = this.currentMilestones.find(m => m.id === numericId);
        }
        if (!milestone) {
            const stringId = String(milestoneId);
            milestone = this.currentMilestones.find(m => String(m.id) === stringId);
        }

        if (!milestone) {
            if (this.statusMessages) {
                this.statusMessages.showError(`Milestone not found`);
            }
            return;
        }

        // Store current milestone for editing
        this.currentEditingMilestone = milestone;

        // Populate modal form
        document.getElementById('edit-milestone-title').value = milestone.title || '';
        document.getElementById('edit-milestone-description').value = milestone.description || '';
        document.getElementById('edit-milestone-status').value = milestone.status || 'pending';
        document.getElementById('edit-milestone-due').value = milestone.dueDate ? new Date(milestone.dueDate).toISOString().split('T')[0] : '';
        document.getElementById('edit-milestone-completed').checked = milestone.status === 'completed';
        document.getElementById('edit-milestone-notes').value = milestone.notes || '';

        // Show modal
        document.getElementById('editMilestoneModal').style.display = 'block';
    }

    closeEditMilestoneModal() {
        document.getElementById('editMilestoneModal').style.display = 'none';
        this.currentEditingMilestone = null;
    }

    async saveEditedMilestone() {
        try {
            if (!this.currentEditingMilestone) {
                throw new Error('No milestone selected for editing');
            }

            const title = document.getElementById('edit-milestone-title')?.value;
            const description = document.getElementById('edit-milestone-description')?.value;
            const dueDate = document.getElementById('edit-milestone-due')?.value;
            const isCompleted = document.getElementById('edit-milestone-completed')?.checked;
            const status = isCompleted ? 'completed' : 'pending';
            const notes = document.getElementById('edit-milestone-notes')?.value;

            if (!title) {
                if (this.statusMessages) {
                    this.statusMessages.showError('Milestone title is required');
                }
                return;
            }

            // Find and update the milestone
            const milestoneIndex = this.currentMilestones.findIndex(m => m.id === this.currentEditingMilestone.id);
            if (milestoneIndex === -1) {
                throw new Error('Milestone not found');
            }

            this.currentMilestones[milestoneIndex] = {
                ...this.currentMilestones[milestoneIndex],
                title,
                description,
                dueDate: dueDate || null,
                status,
                notes,
                updatedAt: new Date().toISOString()
            };

            // Save to data manager
            if (this.dataManager) {
                const saved = this.dataManager.saveToStorage();
                if (!saved) {
                    throw new Error('Failed to save milestone changes');
                }
            }

            // Update POAM progress based on milestones
            await this.updatePoamProgress(this.currentMilestones[milestoneIndex].poamId);

            // Close modal
            this.closeEditMilestoneModal();

            if (this.statusMessages) {
                this.statusMessages.showSuccess('Milestone updated successfully');
            }

            // Reload data to refresh the display
            await this.loadData();

        } catch (error) {
            console.error('Failed to save milestone:', error);
            if (this.statusMessages) {
                this.statusMessages.showError('Failed to save milestone: ' + error.message);
            }
        }
    }

    async toggleMilestoneCompletion(milestoneId) {
        try {
            console.log('[POAMManager] toggleMilestoneCompletion called with ID:', milestoneId, 'type:', typeof milestoneId);

            // Try to find milestone by both string and number comparison
            let milestone = this.currentMilestones.find(m => m.id === milestoneId);
            if (!milestone) {
                const numericId = parseFloat(milestoneId);
                milestone = this.currentMilestones.find(m => m.id === numericId);
            }
            if (!milestone) {
                const stringId = String(milestoneId);
                milestone = this.currentMilestones.find(m => String(m.id) === stringId);
            }

            if (!milestone) {
                console.error('[POAMManager] Milestone not found for toggle with ID:', milestoneId);
                return;
            }

            // Toggle completion status
            milestone.status = milestone.status === 'completed' ? 'pending' : 'completed';
            milestone.updatedAt = new Date().toISOString();

            // Save changes
            if (this.dataManager) {
                const saved = this.dataManager.saveToStorage();
                if (!saved) {
                    throw new Error('Failed to save milestone changes');
                }
            }

            // Update POAM progress
            await this.updatePoamProgress(milestone.poamId);

            // Reload data
            await this.loadData();

            if (this.statusMessages) {
                this.statusMessages.showSuccess(`Milestone marked as ${milestone.status === 'completed' ? 'completed' : 'pending'}`);
            }

        } catch (error) {
            console.error('Failed to toggle milestone completion:', error);
            if (this.statusMessages) {
                this.statusMessages.showError('Failed to update milestone: ' + error.message);
            }
        }
    }

    async updatePoamProgress(poamId) {
        try {
            const poam = this.currentPOAMs.find(p => p.id === poamId);
            if (!poam) return;

            const poamMilestones = this.currentMilestones.filter(m => m.poamId === poamId);
            if (poamMilestones.length === 0) {
                poam.progress = 0;
                return;
            }

            // Calculate progress based on completed milestones
            const completedMilestones = poamMilestones.filter(m => m.status === 'completed');
            const progressPercentage = Math.round((completedMilestones.length / poamMilestones.length) * 100);

            poam.progress = progressPercentage;
            poam.updatedAt = new Date().toISOString();

            // Update status based on progress
            if (progressPercentage === 100) {
                poam.status = 'completed';
            } else if (progressPercentage > 0) {
                poam.status = 'in-progress';
            } else {
                poam.status = 'open';
            }

            console.log(`[POAMManager] Updated POAM ${poam.id} progress to ${progressPercentage}% (${completedMilestones.length}/${poamMilestones.length} milestones completed)`);

        } catch (error) {
            console.error('Failed to update POAM progress:', error);
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

            // Find milestone with flexible ID matching
            let milestone = this.currentMilestones.find(m => m.id === milestoneId);
            if (!milestone) {
                const numericId = parseFloat(milestoneId);
                milestone = this.currentMilestones.find(m => m.id === numericId);
            }
            if (!milestone) {
                const stringId = String(milestoneId);
                milestone = this.currentMilestones.find(m => String(m.id) === stringId);
            }

            const poamId = milestone?.poamId;

            // Remove from current milestones with flexible ID matching
            this.currentMilestones = this.currentMilestones.filter(m => {
                return m.id !== milestoneId &&
                       m.id !== parseFloat(milestoneId) &&
                       String(m.id) !== String(milestoneId);
            });

            // Save changes
            const saved = this.dataManager.saveToStorage();
            if (!saved) {
                throw new Error('Failed to save changes');
            }

            // Update POAM progress if milestone was associated with a POAM
            if (poamId) {
                await this.updatePoamProgress(poamId);
            }

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

    formatStatus(status) {
        if (!status) return 'Open';

        const statusMap = {
            'open': 'Open',
            'in-progress': 'In Progress',
            'pending': 'Pending',
            'completed': 'Completed',
            'cancelled': 'Cancelled',
            'on-hold': 'On Hold'
        };

        return statusMap[status.toLowerCase()] || status;
    }

    formatPriority(priority) {
        if (!priority) return 'Medium';

        const priorityMap = {
            'high': 'High',
            'medium': 'Medium',
            'low': 'Low',
            'critical': 'Critical'
        };

        return priorityMap[priority.toLowerCase()] || priority;
    }

    getMilestoneCount(poamId) {
        return this.currentMilestones.filter(m => m.poamId === poamId).length;
    }

    // === ADVANCED FILTERING AND SORTING SYSTEM ===

    initializeFilteringSystem() {
        this.setupFilterEventListeners();
        this.populateFilterOptions();
        this.applyFiltersAndSort();
    }

    setupFilterEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('poam-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
            searchInput.addEventListener('keyup', (e) => {
                const clearBtn = document.getElementById('clear-search');
                if (clearBtn) {
                    clearBtn.style.display = e.target.value ? 'block' : 'none';
                }
            });
        }

        // Clear search
        const clearSearchBtn = document.getElementById('clear-search');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => this.clearSearch());
        }

        // Filter toggle
        const filterToggle = document.getElementById('filter-toggle');
        if (filterToggle) {
            filterToggle.addEventListener('click', () => this.toggleFilterPanel());
        }

        // Sort menu
        const sortMenuBtn = document.getElementById('sort-menu-btn');
        if (sortMenuBtn) {
            sortMenuBtn.addEventListener('click', (e) => this.toggleSortMenu(e));
        }

        // Filter controls
        const filterSelects = document.querySelectorAll('.filter-select');
        filterSelects.forEach(select => {
            select.addEventListener('change', () => this.handleFilterChange());
        });

        const nistFilter = document.getElementById('nist-filter');
        if (nistFilter) {
            nistFilter.addEventListener('input', () => this.handleFilterChange());
        }

        // Filter action buttons
        const applyFiltersBtn = document.getElementById('apply-filters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFiltersAndSort());
        }

        const clearFiltersBtn = document.getElementById('clear-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearAllFilters());
        }

        // Sort options
        const sortOptions = document.querySelectorAll('.sort-option');
        sortOptions.forEach(option => {
            option.addEventListener('click', (e) => this.handleSortChange(e));
        });

        // Click outside to close menus
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
    }

    populateFilterOptions() {
        // Populate assignee filter
        const assigneeFilter = document.getElementById('assignee-filter');
        if (assigneeFilter && this.currentPOAMs.length > 0) {
            const assignees = [...new Set(this.currentPOAMs
                .map(p => p.assignee)
                .filter(a => a && a.trim() !== '')
            )].sort();

            // Clear existing options except "All Assignees"
            while (assigneeFilter.children.length > 1) {
                assigneeFilter.removeChild(assigneeFilter.lastChild);
            }

            assignees.forEach(assignee => {
                const option = document.createElement('option');
                option.value = assignee;
                option.textContent = assignee;
                assigneeFilter.appendChild(option);
            });
        }
    }

    handleSearch(searchTerm) {
        if (searchTerm.trim() === '') {
            this.activeFilters.delete('search');
        } else {
            this.activeFilters.set('search', searchTerm.toLowerCase());
        }
        this.applyFiltersAndSort();
    }

    clearSearch() {
        const searchInput = document.getElementById('poam-search');
        const clearBtn = document.getElementById('clear-search');
        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.style.display = 'none';
        this.activeFilters.delete('search');
        this.applyFiltersAndSort();
    }

    toggleFilterPanel() {
        const panel = document.getElementById('advanced-filter-panel');
        const filterBtn = document.getElementById('filter-toggle');

        if (panel && filterBtn) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';
            filterBtn.classList.toggle('active', !isVisible);
        }
    }

    toggleSortMenu(event) {
        event.stopPropagation();
        const menu = document.getElementById('sort-menu');
        const btn = document.getElementById('sort-menu-btn');

        if (menu && btn) {
            const isVisible = menu.style.display !== 'none';
            menu.style.display = isVisible ? 'none' : 'block';
            btn.classList.toggle('active', !isVisible);

            if (!isVisible) {
                // Position the menu
                const rect = btn.getBoundingClientRect();
                menu.style.top = rect.bottom + 5 + 'px';
                menu.style.right = window.innerWidth - rect.right + 'px';
            }
        }
    }

    handleFilterChange() {
        const filters = new Map();

        // Status filter
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter && statusFilter.value) {
            filters.set('status', statusFilter.value);
        }

        // Priority filter
        const priorityFilter = document.getElementById('priority-filter');
        if (priorityFilter && priorityFilter.value) {
            filters.set('priority', priorityFilter.value);
        }

        // Assignee filter
        const assigneeFilter = document.getElementById('assignee-filter');
        if (assigneeFilter && assigneeFilter.value) {
            filters.set('assignee', assigneeFilter.value);
        }

        // Progress filter
        const progressFilter = document.getElementById('progress-filter');
        if (progressFilter && progressFilter.value) {
            filters.set('progress', progressFilter.value);
        }

        // Due date filter
        const dueDateFilter = document.getElementById('due-date-filter');
        if (dueDateFilter && dueDateFilter.value) {
            filters.set('dueDate', dueDateFilter.value);
        }

        // NIST filter
        const nistFilter = document.getElementById('nist-filter');
        if (nistFilter && nistFilter.value.trim()) {
            filters.set('nist', nistFilter.value.trim().toLowerCase());
        }

        // Milestone filter
        const milestoneFilter = document.getElementById('milestone-filter');
        if (milestoneFilter && milestoneFilter.value) {
            filters.set('milestone', milestoneFilter.value);
        }

        // Update active filters (excluding search)
        const searchFilter = this.activeFilters.get('search');
        this.activeFilters.clear();
        if (searchFilter) {
            this.activeFilters.set('search', searchFilter);
        }

        filters.forEach((value, key) => {
            this.activeFilters.set(key, value);
        });

        this.updateFilterCount();
        this.updateActiveFiltersDisplay();
    }

    handleSortChange(event) {
        const option = event.currentTarget;
        const field = option.dataset.field;
        const direction = option.dataset.direction;

        this.currentSort = { field, direction };

        // Update UI
        document.querySelectorAll('.sort-option').forEach(opt => {
            opt.classList.remove('active');
        });
        option.classList.add('active');

        // Hide menu
        document.getElementById('sort-menu').style.display = 'none';
        document.getElementById('sort-menu-btn').classList.remove('active');

        this.applyFiltersAndSort();
    }

    handleOutsideClick(event) {
        const sortMenu = document.getElementById('sort-menu');
        const sortBtn = document.getElementById('sort-menu-btn');

        if (sortMenu && sortBtn &&
            !sortMenu.contains(event.target) &&
            !sortBtn.contains(event.target)) {
            sortMenu.style.display = 'none';
            sortBtn.classList.remove('active');
        }
    }

    applyFiltersAndSort() {
        let filtered = [...this.currentPOAMs];

        // Apply filters
        this.activeFilters.forEach((value, filterType) => {
            filtered = this.applyFilter(filtered, filterType, value);
        });

        // Apply sorting
        filtered = this.applySorting(filtered);

        this.filteredPOAMs = filtered;
        this.renderFilteredPOAMs();
        this.updateResultsCount();
    }

    applyFilter(poams, filterType, value) {
        switch (filterType) {
            case 'search':
                return poams.filter(poam =>
                    (poam.title?.toLowerCase().includes(value)) ||
                    (poam.description?.toLowerCase().includes(value)) ||
                    (poam.assignee?.toLowerCase().includes(value)) ||
                    (poam.nistControls?.toLowerCase().includes(value))
                );

            case 'status':
                return poams.filter(poam => poam.status === value);

            case 'priority':
                return poams.filter(poam => poam.priority === value);

            case 'assignee':
                return poams.filter(poam => poam.assignee === value);

            case 'progress':
                return poams.filter(poam => {
                    const progress = poam.progress || 0;
                    switch (value) {
                        case '0': return progress === 0;
                        case '1-25': return progress >= 1 && progress <= 25;
                        case '26-50': return progress >= 26 && progress <= 50;
                        case '51-75': return progress >= 51 && progress <= 75;
                        case '76-99': return progress >= 76 && progress <= 99;
                        case '100': return progress === 100;
                        default: return true;
                    }
                });

            case 'dueDate':
                return poams.filter(poam => {
                    const dueDate = poam.dueDate ? new Date(poam.dueDate) : null;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    switch (value) {
                        case 'overdue':
                            return dueDate && dueDate < today;
                        case 'due-today':
                            return dueDate && dueDate.getTime() === today.getTime();
                        case 'due-week':
                            const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                            return dueDate && dueDate >= today && dueDate <= nextWeek;
                        case 'due-month':
                            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
                            return dueDate && dueDate >= today && dueDate <= nextMonth;
                        case 'no-date':
                            return !dueDate;
                        default:
                            return true;
                    }
                });

            case 'nist':
                return poams.filter(poam =>
                    poam.nistControls?.toLowerCase().includes(value)
                );

            case 'milestone':
                return poams.filter(poam => {
                    const milestoneCount = this.getMilestoneCount(poam.id);
                    const poamMilestones = this.currentMilestones.filter(m => m.poamId === poam.id);
                    const completedMilestones = poamMilestones.filter(m => m.status === 'completed');

                    switch (value) {
                        case 'no-milestones':
                            return milestoneCount === 0;
                        case 'has-milestones':
                            return milestoneCount > 0;
                        case 'completed-milestones':
                            return milestoneCount > 0 && completedMilestones.length === milestoneCount;
                        default:
                            return true;
                    }
                });

            default:
                return poams;
        }
    }

    applySorting(poams) {
        const { field, direction } = this.currentSort;

        return poams.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];

            // Handle special cases
            if (field === 'priority') {
                const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
                aVal = priorityOrder[aVal?.toLowerCase()] || 0;
                bVal = priorityOrder[bVal?.toLowerCase()] || 0;
            } else if (field === 'dueDate' || field === 'createdAt' || field === 'updatedAt') {
                aVal = aVal ? new Date(aVal) : new Date(0);
                bVal = bVal ? new Date(bVal) : new Date(0);
            } else if (typeof aVal === 'string') {
                aVal = aVal?.toLowerCase() || '';
                bVal = bVal?.toLowerCase() || '';
            }

            // Handle null/undefined values
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return direction === 'asc' ? -1 : 1;
            if (bVal == null) return direction === 'asc' ? 1 : -1;

            // Compare values
            let result = 0;
            if (aVal < bVal) result = -1;
            else if (aVal > bVal) result = 1;

            return direction === 'desc' ? -result : result;
        });
    }

    renderFilteredPOAMs() {
        const tbody = document.getElementById('poams-tbody');
        if (!tbody) return;

        // Use filtered POAMs instead of all POAMs
        const poamsToRender = this.filteredPOAMs;

        if (poamsToRender.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 2rem; color: #6c757d;">
                        ${this.activeFilters.size > 0 ? 'No POAMs match your current filters' : 'No POAMs created yet'}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = poamsToRender.map(poam => `
            <tr data-poam-id="${poam.id}">
                <td>
                    <div class="poam-title">${poam.title}</div>
                    <small class="text-muted">${poam.description || ''}</small>
                </td>
                <td>
                    <span class="status-badge status-${(poam.status || 'open').toLowerCase()}">
                        ${this.formatStatus(poam.status)}
                    </span>
                </td>
                <td>
                    <span class="priority-badge priority-${(poam.priority || 'medium').toLowerCase()}">
                        ${this.formatPriority(poam.priority)}
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
                <td>${poam.nistControls || 'N/A'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-outline" onclick="poamManager.editPOAM('${poam.id}')" title="Edit POAM">
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="poamManager.deletePOAM('${poam.id}')" title="Delete POAM">
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add icons after rendering
        this.addIconsToButtons('poams');
    }

    updateFilterCount() {
        const filterCount = document.querySelector('.filter-count');
        const count = this.activeFilters.size - (this.activeFilters.has('search') ? 1 : 0);

        if (filterCount) {
            if (count > 0) {
                filterCount.textContent = count;
                filterCount.style.display = 'block';
            } else {
                filterCount.style.display = 'none';
            }
        }
    }

    updateActiveFiltersDisplay() {
        const activeFiltersSection = document.getElementById('active-filters');
        const filterTags = document.getElementById('active-filter-tags');

        if (!activeFiltersSection || !filterTags) return;

        const nonSearchFilters = new Map([...this.activeFilters].filter(([key]) => key !== 'search'));

        if (nonSearchFilters.size === 0) {
            activeFiltersSection.style.display = 'none';
            return;
        }

        activeFiltersSection.style.display = 'flex';
        filterTags.innerHTML = '';

        nonSearchFilters.forEach((value, key) => {
            const tag = document.createElement('div');
            tag.className = 'filter-tag';
            tag.innerHTML = `
                <span>${this.formatFilterLabel(key, value)}</span>
                <button class="remove-filter" onclick="poamManager.removeFilter('${key}')" title="Remove filter">×</button>
            `;
            filterTags.appendChild(tag);
        });
    }

    formatFilterLabel(filterType, value) {
        const labels = {
            status: `Status: ${this.formatStatus(value)}`,
            priority: `Priority: ${this.formatPriority(value)}`,
            assignee: `Assignee: ${value}`,
            progress: `Progress: ${this.formatProgressRange(value)}`,
            dueDate: `Due: ${this.formatDueDateLabel(value)}`,
            nist: `NIST: ${value}`,
            milestone: `Milestones: ${this.formatMilestoneLabel(value)}`
        };
        return labels[filterType] || `${filterType}: ${value}`;
    }

    formatProgressRange(value) {
        const ranges = {
            '0': 'Not Started (0%)',
            '1-25': 'Low (1-25%)',
            '26-50': 'Medium (26-50%)',
            '51-75': 'High (51-75%)',
            '76-99': 'Almost Done (76-99%)',
            '100': 'Completed (100%)'
        };
        return ranges[value] || value;
    }

    formatDueDateLabel(value) {
        const labels = {
            'overdue': 'Overdue',
            'due-today': 'Due Today',
            'due-week': 'Due This Week',
            'due-month': 'Due This Month',
            'no-date': 'No Due Date'
        };
        return labels[value] || value;
    }

    formatMilestoneLabel(value) {
        const labels = {
            'no-milestones': 'No Milestones',
            'has-milestones': 'Has Milestones',
            'completed-milestones': 'All Complete'
        };
        return labels[value] || value;
    }

    removeFilter(filterType) {
        this.activeFilters.delete(filterType);

        // Update UI
        const element = document.getElementById(`${filterType}-filter`);
        if (element) {
            if (element.type === 'text') {
                element.value = '';
            } else {
                element.value = '';
            }
        }

        this.updateFilterCount();
        this.updateActiveFiltersDisplay();
        this.applyFiltersAndSort();
    }

    clearAllFilters() {
        this.activeFilters.clear();

        // Reset all filter controls
        document.querySelectorAll('.filter-select').forEach(select => {
            select.value = '';
        });

        const nistFilter = document.getElementById('nist-filter');
        if (nistFilter) nistFilter.value = '';

        this.updateFilterCount();
        this.updateActiveFiltersDisplay();
        this.applyFiltersAndSort();
    }

    updateResultsCount() {
        // Add results summary if it doesn't exist
        let summary = document.querySelector('.results-summary');
        if (!summary) {
            summary = document.createElement('div');
            summary.className = 'results-summary';

            const poamsTab = document.getElementById('poams-tab');
            const tableWrap = poamsTab?.querySelector('.table-wrap');
            if (tableWrap) {
                tableWrap.parentNode.insertBefore(summary, tableWrap);
            }
        }

        const total = this.currentPOAMs.length;
        const filtered = this.filteredPOAMs.length;
        const hasFilters = this.activeFilters.size > 0;

        summary.innerHTML = `
            <div class="results-count">
                ${hasFilters
                    ? `Showing <strong>${filtered}</strong> of <strong>${total}</strong> POAMs`
                    : `<strong>${total}</strong> POAMs total`
                }
            </div>
        `;
    }

    // Override the original renderPOAMs to use filtered version
    renderPOAMs() {
        this.renderFilteredPOAMs();
    }
}

// Global instance will be created when the page loads
window.POAMManager = POAMManager;
