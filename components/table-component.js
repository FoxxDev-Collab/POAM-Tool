class TableComponent extends UIComponent {
    constructor(props = {}, children = []) {
        super(props, children);
        this.sortState = { column: null, direction: 'asc' };
        this.filteredData = [];
        this.currentPage = 1;
    }

    getDefaultProps() {
        return {
            ...super.getDefaultProps(),
            data: [],
            columns: [],
            sortable: true,
            filterable: false,
            paginated: false,
            pageSize: 10,
            selectable: false,
            expandable: false,
            striped: true,
            bordered: false,
            hover: true,
            compact: false,
            loading: false,
            emptyMessage: 'No data available',
            loadingMessage: 'Loading...'
        };
    }

    render() {
        const container = this.createElement('div');
        container.className = 'ui-table-container' + (this.props.className ? ` ${this.props.className}` : '');

        // Add loading overlay
        if (this.props.loading) {
            const loadingOverlay = this.createLoadingOverlay();
            container.appendChild(loadingOverlay);
        }

        // Create table wrapper for horizontal scrolling
        const wrapper = document.createElement('div');
        wrapper.className = 'ui-table-wrapper';

        // Create table
        const table = document.createElement('table');
        const classes = ['ui-table'];
        
        if (this.props.striped) classes.push('ui-table--striped');
        if (this.props.bordered) classes.push('ui-table--bordered');
        if (this.props.hover) classes.push('ui-table--hover');
        if (this.props.compact) classes.push('ui-table--compact');
        if (this.props.selectable) classes.push('ui-table--selectable');
        
        table.className = classes.join(' ');

        // Create header
        const thead = this.createHeader();
        table.appendChild(thead);

        // Create body
        const tbody = this.createBody();
        table.appendChild(tbody);

        wrapper.appendChild(table);
        container.appendChild(wrapper);

        // Add pagination if enabled
        if (this.props.paginated && this.filteredData.length > this.props.pageSize) {
            const pagination = this.createPagination();
            container.appendChild(pagination);
        }

        return container;
    }

    createHeader() {
        const thead = document.createElement('thead');
        const tr = document.createElement('tr');

        // Add selection column if selectable
        if (this.props.selectable) {
            const th = document.createElement('th');
            th.className = 'ui-table__select-header';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'ui-table__select-all';
            checkbox.addEventListener('change', (e) => {
                this.selectAll(e.target.checked);
            });
            
            th.appendChild(checkbox);
            tr.appendChild(th);
        }

        // Add expand column if expandable
        if (this.props.expandable) {
            const th = document.createElement('th');
            th.className = 'ui-table__expand-header';
            tr.appendChild(th);
        }

        // Add data columns
        this.props.columns.forEach(column => {
            const th = document.createElement('th');
            th.className = 'ui-table__header';
            
            if (column.width) {
                th.style.width = column.width;
            }
            
            if (column.align) {
                th.style.textAlign = column.align;
            }

            // Create header content
            const headerContent = document.createElement('div');
            headerContent.className = 'ui-table__header-content';

            const title = document.createElement('span');
            title.textContent = column.title || column.key;
            headerContent.appendChild(title);

            // Add sort indicator if sortable
            if (this.props.sortable && column.sortable !== false) {
                th.classList.add('ui-table__header--sortable');
                
                const sortIcon = document.createElement('span');
                sortIcon.className = 'ui-table__sort-icon';
                
                if (this.sortState.column === column.key) {
                    const iconName = this.sortState.direction === 'asc' ? 'chevron-up' : 'chevron-down';
                    const icon = Icons.create(iconName, { size: 16 });
                    sortIcon.appendChild(icon);
                } else {
                    const icon = Icons.create('chevron-up', { size: 16 });
                    icon.style.opacity = '0.3';
                    sortIcon.appendChild(icon);
                }
                
                headerContent.appendChild(sortIcon);

                // Add click handler for sorting
                th.addEventListener('click', () => {
                    this.handleSort(column.key);
                });

                // Add keyboard support
                th.setAttribute('tabindex', '0');
                th.setAttribute('role', 'button');
                th.setAttribute('aria-label', `Sort by ${column.title || column.key}`);
                
                th.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.handleSort(column.key);
                    }
                });
            }

            th.appendChild(headerContent);
            tr.appendChild(th);
        });

        thead.appendChild(tr);
        return thead;
    }

    createBody() {
        const tbody = document.createElement('tbody');
        tbody.className = 'ui-table__body';

        // Filter and sort data
        this.filteredData = this.filterData(this.props.data);
        this.filteredData = this.sortData(this.filteredData);

        // Handle empty state
        if (this.filteredData.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = this.getColumnCount();
            td.className = 'ui-table__empty';
            td.textContent = this.props.emptyMessage;
            tr.appendChild(td);
            tbody.appendChild(tr);
            return tbody;
        }

        // Get paginated data
        const paginatedData = this.props.paginated ? this.getPaginatedData() : this.filteredData;

        // Create rows
        paginatedData.forEach((row, index) => {
            const tr = this.createRow(row, index);
            tbody.appendChild(tr);

            // Add expandable row if needed
            if (this.props.expandable && row._expanded) {
                const expandedRow = this.createExpandedRow(row, index);
                tbody.appendChild(expandedRow);
            }
        });

        return tbody;
    }

    createRow(row, index) {
        const tr = document.createElement('tr');
        tr.className = 'ui-table__row';
        tr.setAttribute('data-row-index', index);

        // Add selection column
        if (this.props.selectable) {
            const td = document.createElement('td');
            td.className = 'ui-table__select-cell';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'ui-table__select-row';
            checkbox.checked = row._selected || false;
            checkbox.addEventListener('change', (e) => {
                this.selectRow(index, e.target.checked);
            });
            
            td.appendChild(checkbox);
            tr.appendChild(td);
        }

        // Add expand column
        if (this.props.expandable) {
            const td = document.createElement('td');
            td.className = 'ui-table__expand-cell';
            
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'ui-table__expand-button';
            button.setAttribute('aria-label', 'Expand row');
            
            const icon = Icons.create(row._expanded ? 'chevron-down' : 'chevron-right', { size: 16 });
            button.appendChild(icon);
            
            button.addEventListener('click', () => {
                this.toggleRowExpansion(index);
            });
            
            td.appendChild(button);
            tr.appendChild(td);
        }

        // Add data columns
        this.props.columns.forEach(column => {
            const td = document.createElement('td');
            td.className = 'ui-table__cell';
            
            if (column.align) {
                td.style.textAlign = column.align;
            }

            // Get cell value
            let value = this.getCellValue(row, column.key);
            
            // Apply custom renderer if provided
            if (column.render && typeof column.render === 'function') {
                const rendered = column.render(value, row, index);
                if (typeof rendered === 'string') {
                    td.innerHTML = rendered;
                } else {
                    td.appendChild(rendered);
                }
            } else {
                td.textContent = value || '';
            }

            tr.appendChild(td);
        });

        return tr;
    }

    createExpandedRow(row, index) {
        const tr = document.createElement('tr');
        tr.className = 'ui-table__expanded-row';
        
        const td = document.createElement('td');
        td.colSpan = this.getColumnCount();
        td.className = 'ui-table__expanded-content';
        
        // Render expanded content
        if (this.props.renderExpanded && typeof this.props.renderExpanded === 'function') {
            const content = this.props.renderExpanded(row, index);
            if (typeof content === 'string') {
                td.innerHTML = content;
            } else {
                td.appendChild(content);
            }
        } else {
            td.textContent = 'Expanded content for row ' + (index + 1);
        }
        
        tr.appendChild(td);
        return tr;
    }

    createLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'ui-table__loading-overlay';
        
        const spinner = Icons.create('loader', { size: 24 });
        spinner.className = 'ui-table__loading-spinner';
        
        const message = document.createElement('div');
        message.className = 'ui-table__loading-message';
        message.textContent = this.props.loadingMessage;
        
        overlay.appendChild(spinner);
        overlay.appendChild(message);
        
        return overlay;
    }

    createPagination() {
        const totalPages = Math.ceil(this.filteredData.length / this.props.pageSize);
        
        const pagination = document.createElement('div');
        pagination.className = 'ui-table__pagination';
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'ui-table__pagination-btn';
        prevBtn.disabled = this.currentPage === 1;
        prevBtn.innerHTML = Icons.create('chevron-left', { size: 16 }).outerHTML + ' Previous';
        prevBtn.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.goToPage(this.currentPage - 1);
            }
        });
        pagination.appendChild(prevBtn);
        
        // Page info
        const pageInfo = document.createElement('span');
        pageInfo.className = 'ui-table__pagination-info';
        pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        pagination.appendChild(pageInfo);
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'ui-table__pagination-btn';
        nextBtn.disabled = this.currentPage === totalPages;
        nextBtn.innerHTML = 'Next ' + Icons.create('chevron-right', { size: 16 }).outerHTML;
        nextBtn.addEventListener('click', () => {
            if (this.currentPage < totalPages) {
                this.goToPage(this.currentPage + 1);
            }
        });
        pagination.appendChild(nextBtn);
        
        return pagination;
    }

    // Data manipulation methods
    filterData(data) {
        // Override in subclass or provide filter function
        return data;
    }

    sortData(data) {
        if (!this.sortState.column) return data;
        
        const column = this.props.columns.find(col => col.key === this.sortState.column);
        if (!column) return data;
        
        return [...data].sort((a, b) => {
            let aVal = this.getCellValue(a, this.sortState.column);
            let bVal = this.getCellValue(b, this.sortState.column);
            
            // Handle different data types
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            
            let result = 0;
            if (aVal < bVal) result = -1;
            if (aVal > bVal) result = 1;
            
            return this.sortState.direction === 'asc' ? result : -result;
        });
    }

    getPaginatedData() {
        const start = (this.currentPage - 1) * this.props.pageSize;
        const end = start + this.props.pageSize;
        return this.filteredData.slice(start, end);
    }

    getCellValue(row, key) {
        return key.split('.').reduce((obj, k) => obj && obj[k], row);
    }

    getColumnCount() {
        let count = this.props.columns.length;
        if (this.props.selectable) count++;
        if (this.props.expandable) count++;
        return count;
    }

    // Event handlers
    handleSort(columnKey) {
        if (this.sortState.column === columnKey) {
            this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortState.column = columnKey;
            this.sortState.direction = 'asc';
        }
        
        if (this.mounted) {
            this.update();
        }
    }

    selectRow(index, selected) {
        if (this.props.data[index]) {
            this.props.data[index]._selected = selected;
        }
        
        // Update select all checkbox
        const selectAllCheckbox = this.find('.ui-table__select-all');
        if (selectAllCheckbox) {
            const selectedCount = this.props.data.filter(row => row._selected).length;
            selectAllCheckbox.checked = selectedCount === this.props.data.length;
            selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < this.props.data.length;
        }
    }

    selectAll(selected) {
        this.props.data.forEach(row => {
            row._selected = selected;
        });
        
        if (this.mounted) {
            this.update();
        }
    }

    toggleRowExpansion(index) {
        if (this.props.data[index]) {
            this.props.data[index]._expanded = !this.props.data[index]._expanded;
        }
        
        if (this.mounted) {
            this.update();
        }
    }

    goToPage(page) {
        this.currentPage = page;
        if (this.mounted) {
            this.update();
        }
    }

    // Public API methods
    setData(data) {
        this.props.data = data;
        this.currentPage = 1;
        if (this.mounted) {
            this.update();
        }
        return this;
    }

    getSelectedRows() {
        return this.props.data.filter(row => row._selected);
    }

    clearSelection() {
        this.props.data.forEach(row => {
            row._selected = false;
        });
        if (this.mounted) {
            this.update();
        }
        return this;
    }

    setLoading(loading) {
        this.props.loading = loading;
        if (this.mounted) {
            this.update();
        }
        return this;
    }

    refresh() {
        if (this.mounted) {
            this.update();
        }
        return this;
    }
}

// Register with UI framework
if (window.UI) {
    window.UI.registerComponent('Table', TableComponent);
}

window.TableComponent = TableComponent;
