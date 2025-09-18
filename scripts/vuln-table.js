/* Vulnerability Table Management Module
   - Handles table rendering and display
   - Manages sorting functionality
   - Handles row expansion and interaction
   - Provides filtering and search capabilities
*/

const VulnTable = (() => {
    let currentSort = { key: 'nistControls', dir: 'asc' };
    let allRows = [];
    let els = {}; // Will be set by init function

    function init(elements, rows = []) {
        console.log('[VulnTable] 📊 init called with', rows.length, 'rows');
        console.log('[VulnTable] 📋 Sample row data:', rows[0] ? {
            group_id: rows[0].group_id,
            rule_title: rows[0].rule_title,
            severity: rows[0].severity,
            stig_name: rows[0].stig_name,
            nistControls: rows[0].nistControls,
            ccis: rows[0].ccis
        } : 'No data');

        els = elements;
        allRows = rows;
        console.log('[VulnTable] ✅ Rows stored in VulnTable, total:', allRows.length);
    }

    function setRows(rows) {
        console.log('[VulnTable] 📊 setRows called with', rows.length, 'rows');
        console.log('[VulnTable] 📋 Sample row data:', rows[0] ? {
            group_id: rows[0].group_id,
            rule_title: rows[0].rule_title,
            severity: rows[0].severity,
            stig_name: rows[0].stig_name,
            nistControls: rows[0].nistControls,
            ccis: rows[0].ccis
        } : 'No data');

        allRows = rows;
        console.log('[VulnTable] ✅ Rows stored in VulnTable, total:', allRows.length);
    }

    function sortableNistControl(controlStr) {
        if (!controlStr) return '';
        
        // Extract the first control for sorting (in case of multiple controls)
        const firstControl = controlStr.split(',')[0].trim().toUpperCase();
        
        // Parse NIST control format: AC-2(1) -> family: AC, number: 2, enhancement: 1
        const match = firstControl.match(/^([A-Z]{2,3})-(\d+)(?:\((\d+)\))?/);
        if (!match) return controlStr.toLowerCase();
        
        const [, family, number, enhancement] = match;
        
        // Create sortable string: family + zero-padded number + zero-padded enhancement
        const paddedNumber = number.padStart(3, '0');
        const paddedEnhancement = (enhancement || '0').padStart(3, '0');
        
        return `${family}-${paddedNumber}-${paddedEnhancement}`;
    }

    function sortRows(rows, key, dir) {
        const asc = dir === 'asc' ? 1 : -1;
        return rows.slice().sort((a, b) => {
            let av, bv;
            
            if (key === 'nistControls') {
                av = sortableNistControl(a.nistControls.join(', '));
                bv = sortableNistControl(b.nistControls.join(', '));
            } else if (key === 'ccis') {
                av = a.ccis.join(', ').toLowerCase();
                bv = b.ccis.join(', ').toLowerCase();
            } else if (key === 'severity') {
                // Custom severity sorting: critical > high > medium > low > unknown
                const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 };
                av = severityOrder[a.severity] || 0;
                bv = severityOrder[b.severity] || 0;
                return (bv - av) * asc; // Reverse for severity (critical first)
            } else {
                av = (a[key] || '').toString().toLowerCase();
                bv = (b[key] || '').toString().toLowerCase();
            }
            
            return av.localeCompare(bv, undefined, { numeric: true }) * asc;
        });
    }

    function renderTable(rows) {
        console.log('[VulnTable] 🎨 renderTable called with', rows.length, 'rows to render');
        const tbody = els.tbody;
        tbody.innerHTML = '';

        if (rows.length === 0) {
            console.log('[VulnTable] 📭 No rows to render, showing no results state');
            els.noResults.hidden = false;
            return;
        }

        console.log('[VulnTable] ✅ Rendering', rows.length, 'rows to table');
        els.noResults.hidden = true;
        
        rows.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <button class="expand-btn" data-row-index="${index}" title="Show details">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </td>
                <td>${row.nistControls.join(', ') || '-'}</td>
                <td>${row.ccis.join(', ') || '-'}</td>
                <td>${row.group_id}</td>
                <td>${row.rule_id}</td>
                <td>${row.rule_version}</td>
                <td>${row.rule_title}</td>
                <td><span class="badge ${row.severity}">${row.severity}</span></td>
                <td><span class="badge ${row.status}">${row.status}</span></td>
                <td>${row.stig_name}</td>
            `;
            tbody.appendChild(tr);
            
            // Add details row (initially hidden)
            const detailsRow = document.createElement('tr');
            detailsRow.className = 'details-row';
            detailsRow.style.display = 'none';
            detailsRow.innerHTML = `
                <td colspan="10">
                    <div class="details-content">
                        <div class="detail-section">
                            <h4>Discussion</h4>
                            <p>${row.discussion || 'No discussion available'}</p>
                        </div>
                        <div class="detail-section">
                            <h4>Check Text</h4>
                            <pre>${row.checkContent || 'No check content available'}</pre>
                        </div>
                        <div class="detail-section">
                            <h4>Fix Text</h4>
                            <pre>${row.fixText || 'No fix text available'}</pre>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(detailsRow);
        });
        
        // Add event listeners for expand buttons
        tbody.addEventListener('click', handleExpandClick);
    }

    function handleExpandClick(e) {
        if (!e.target.closest('.expand-btn')) return;
        
        const button = e.target.closest('.expand-btn');
        const row = button.closest('tr');
        const detailsRow = row.nextElementSibling;
        const isExpanded = detailsRow.style.display !== 'none';
        
        if (isExpanded) {
            detailsRow.style.display = 'none';
            button.classList.remove('expanded');
        } else {
            detailsRow.style.display = 'table-row';
            button.classList.add('expanded');
        }
    }

    function updateSortIndicators() {
        document.querySelectorAll('thead th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            const key = th.dataset.key;
            if (key === currentSort.key) {
                th.classList.add(currentSort.dir === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        });
    }

    function applyFilters() {
        console.log('[VulnTable] 🎯 applyFilters called');
        const fam = els.family.value.trim();
        const ctrl = els.control.value.trim();
        const sev = els.severity.value.trim().toLowerCase();
        const stat = els.status.value.trim().toLowerCase();
        const stig = els.stig.value.trim();
        const cci = els.cci.value.trim().toUpperCase();
        const q = els.search.value.trim().toLowerCase();

        console.log('[VulnTable] 🔍 Filter values:', {
            family: fam,
            control: ctrl,
            severity: sev,
            status: stat,
            stig: stig,
            cci: cci,
            search: q
        });

        let filtered = allRows.filter(r => {
            if (fam && !r.families.includes(fam)) return false;
            if (ctrl && !r.nistControls.includes(ctrl)) return false;
            if (sev && r.severity !== sev) return false;
            if (stat && r.status !== stat) return false;
            if (stig && r.stig_name !== stig) return false;
            if (cci && !r.ccis.some(x => x.toUpperCase().includes(cci))) return false;
            if (q && !r.searchableText.includes(q)) return false;
            return true;
        });

        console.log('[VulnTable] 📊 Filtering results:', {
            totalRows: allRows.length,
            filteredRows: filtered.length,
            filtersApplied: !!(fam || ctrl || sev || stat || stig || cci || q)
        });

        filtered = sortRows(filtered, currentSort.key, currentSort.dir);
        console.log('[VulnTable] 🔄 Sorting applied:', {
            sortKey: currentSort.key,
            sortDirection: currentSort.dir
        });

        renderTable(filtered);
        updateSortIndicators();

        els.emptyState.hidden = !!allRows.length;
        els.noResults.hidden = filtered.length !== 0;

        console.log('[VulnTable] ✅ applyFilters complete:', {
            rowsRendered: filtered.length,
            emptyState: !allRows.length,
            noResults: filtered.length === 0
        });
    }

    function applyFiltersAndGetRows() {
        const familyFilter = els.family.value.toLowerCase();
        const controlFilter = els.control.value.toLowerCase();
        const severityFilter = els.severity.value.toLowerCase();
        const statusFilter = els.status.value.toLowerCase();
        const stigFilter = els.stig.value.toLowerCase();
        const cciFilter = els.cci.value.toLowerCase();
        const searchFilter = els.search.value.toLowerCase();

        return allRows.filter(row => {
            // Family filter
            if (familyFilter && !row.families.some(f => f.toLowerCase().includes(familyFilter))) {
                return false;
            }

            // Control filter
            if (controlFilter && !row.nistControls.some(c => c.toLowerCase().includes(controlFilter))) {
                return false;
            }

            // Severity filter
            if (severityFilter && row.severity.toLowerCase() !== severityFilter) {
                return false;
            }

            // Status filter
            if (statusFilter && row.status.toLowerCase() !== statusFilter) {
                return false;
            }

            // STIG filter
            if (stigFilter && !row.stig_name.toLowerCase().includes(stigFilter)) {
                return false;
            }

            // CCI filter
            if (cciFilter && !row.ccis.some(c => c.toLowerCase().includes(cciFilter))) {
                return false;
            }

            // Search filter
            if (searchFilter && !row.searchableText.includes(searchFilter)) {
                return false;
            }

            return true;
        });
    }

    function handleSortClick(key) {
        const dir = currentSort.key === key && currentSort.dir === 'asc' ? 'desc' : 'asc';
        currentSort = { key, dir };
        applyFilters();
    }

    // Helper functions
    function td(text) {
        const cell = document.createElement('td');
        cell.textContent = text || '';
        return cell;
    }

    function joinIfAny(arr) {
        return Array.isArray(arr) && arr.length ? arr.join(', ') : '';
    }

    // Public API
    return {
        init,
        setRows,
        renderTable,
        applyFilters,
        applyFiltersAndGetRows,
        handleSortClick,
        updateSortIndicators,
        sortRows,
        handleExpandClick,
        td,
        joinIfAny,
        getCurrentSort: () => currentSort,
        setCurrentSort: (sort) => { currentSort = sort; }
    };
})();

// Make available globally
window.VulnTable = VulnTable;