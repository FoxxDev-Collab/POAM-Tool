class FilterPanel {
    constructor(app) {
        this.app = app;
        this.elements = {};
        this.filterState = {
            family: '',
            control: '',
            severity: '',
            status: '',
            stig: '',
            cci: '',    
            search: ''
        };
    }

    init(elements) {
        this.elements = {
            family: elements.family,
            control: elements.control,
            severity: elements.severity,
            status: elements.status,
            stig: elements.stig,
            cci: elements.cci,
            search: elements.search
        };

        // Validate elements
        const missingElements = Object.entries(this.elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        if (missingElements.length > 0) {
            console.warn(`FilterPanel: Missing elements: ${missingElements.join(', ')}`);
        }

        console.log('FilterPanel initialized');
    }

    populateFacets(rows) {
        try {
            if (!rows || rows.length === 0) {
                this.clearAllOptions();
                return;
            }

            const facets = this.extractFacets(rows);
            
            // Convert Sets to Arrays and sort them
            const sortedFamilies = Array.from(facets.families).sort();
            const sortedControls = Array.from(facets.controls).sort();
            const sortedStigs = Array.from(facets.stigNames).sort();
            
            this.setOptions(this.elements.family, ['', ...sortedFamilies]);
            this.setOptions(this.elements.control, ['', ...sortedControls]);
            this.setOptions(this.elements.stig, ['', ...sortedStigs]);

            console.log(`FilterPanel: Populated facets - ${facets.families.size} families, ${facets.controls.size} controls, ${facets.stigNames.size} STIGs`);
        } catch (error) {
            console.error('FilterPanel: Error populating facets:', error);
            this.clearAllOptions();
        }
    }

    extractFacets(rows) {
        const families = new Set();
        const controls = new Set();
        const stigNames = new Set();

        for (const row of rows) {
            try {
                // Add families
                if (row.families && Array.isArray(row.families)) {
                    row.families.forEach(f => {
                        if (f && typeof f === 'string') families.add(f);
                    });
                }

                // Add NIST controls
                if (row.nistControls && Array.isArray(row.nistControls)) {
                    row.nistControls.forEach(c => {
                        if (c && typeof c === 'string') controls.add(c);
                    });
                }

                // Add STIG names
                if (row.stig_name && typeof row.stig_name === 'string') {
                    stigNames.add(row.stig_name);
                }
            } catch (error) {
                console.warn('FilterPanel: Error processing row:', error, row);
            }
        }

        return { families, controls, stigNames };
    }

    setOptions(selectElement, values) {
        if (!selectElement) return;

        const previousValue = selectElement.value;
        selectElement.innerHTML = '';

        values.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value || 'All';
            selectElement.appendChild(option);
        });

        // Restore previous value if it still exists
        if (values.includes(previousValue)) {
            selectElement.value = previousValue;
        }
    }

    clearAllOptions() {
        const defaultOptions = {
            family: [''],
            control: [''],
            stig: [''],
            severity: ['', 'low', 'medium', 'high', 'critical'],
            status: ['', 'open', 'not_a_finding', 'not_applicable', 'failed', 'passed', 'not_reviewed']
        };

        Object.entries(defaultOptions).forEach(([key, options]) => {
            if (this.elements[key]) {
                this.setOptions(this.elements[key], options);
            }
        });
    }

    getFilterValues() {
        const values = {};
        
        Object.entries(this.elements).forEach(([key, element]) => {
            if (element) {
                values[key] = element.value.trim();
            }
        });

        return values;
    }

    setFilterValues(values) {
        Object.entries(values).forEach(([key, value]) => {
            if (this.elements[key]) {
                this.elements[key].value = value || '';
            }
        });

        this.filterState = { ...values };
    }

    resetAllFilters() {
        Object.values(this.elements).forEach(element => {
            if (element) {
                element.value = '';
            }
        });

        this.filterState = {
            family: '',
            control: '',
            severity: '',
            status: '',
            stig: '',
            cci: '',
            search: ''
        };

        console.log('FilterPanel: All filters reset');
    }

    getActiveFiltersCount() {
        const values = this.getFilterValues();
        return Object.values(values).filter(value => value && value.length > 0).length;
    }

    getActiveFilters() {
        const values = this.getFilterValues();
        const activeFilters = {};

        Object.entries(values).forEach(([key, value]) => {
            if (value && value.length > 0) {
                activeFilters[key] = value;
            }
        });

        return activeFilters;
    }

    hasActiveFilters() {
        return this.getActiveFiltersCount() > 0;
    }

    // Export current filter state
    exportFilterState() {
        return {
            ...this.getFilterValues(),
            timestamp: new Date().toISOString()
        };
    }

    // Import filter state
    importFilterState(state) {
        if (!state || typeof state !== 'object') {
            console.warn('FilterPanel: Invalid filter state provided');
            return false;
        }

        try {
            this.setFilterValues(state);
            console.log('FilterPanel: Filter state imported successfully');
            return true;
        } catch (error) {
            console.error('FilterPanel: Failed to import filter state:', error);
            return false;
        }
    }

    // Get filter summary for display
    getFilterSummary() {
        const activeFilters = this.getActiveFilters();
        const count = Object.keys(activeFilters).length;

        if (count === 0) {
            return 'No filters active';
        }

        const filterNames = {
            family: 'Family',
            control: 'Control',
            severity: 'Severity',
            status: 'Status',
            stig: 'STIG',
            cci: 'CCI',
            search: 'Search'
        };

        const summary = Object.entries(activeFilters)
            .map(([key, value]) => `${filterNames[key] || key}: ${value}`)
            .join(', ');

        return `${count} filter${count > 1 ? 's' : ''} active: ${summary}`;
    }

    // Validate filter values
    validateFilters() {
        const values = this.getFilterValues();
        const errors = [];

        // Add any validation logic here
        // For example, check for invalid characters, length limits, etc.

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// Make available globally
window.FilterPanel = FilterPanel;
