class UIExamples {
    constructor() {
        this.examples = new Map();
        this.initExamples();
    }

    initExamples() {
        // Button Examples
        this.examples.set('buttons', () => {
            const container = document.createElement('div');
            container.innerHTML = '<h3>Button Examples</h3>';

            // Create various button examples
            const primaryBtn = UI.createComponent('Button', { 
                variant: 'primary', 
                icon: 'check' 
            }, ['Primary Button']);
            
            const secondaryBtn = UI.createComponent('Button', { 
                variant: 'secondary', 
                size: 'lg' 
            }, ['Large Secondary']);
            
            const dangerBtn = UI.createComponent('Button', { 
                variant: 'danger', 
                size: 'sm',
                loading: true
            }, ['Loading...']);

            const iconBtn = UI.createComponent('Button', { 
                variant: 'primary', 
                icon: 'settings'
            });

            container.appendChild(primaryBtn.mount().element);
            container.appendChild(secondaryBtn.mount().element);
            container.appendChild(dangerBtn.mount().element);
            container.appendChild(iconBtn.mount().element);

            return container;
        });

        // Card Examples
        this.examples.set('cards', () => {
            const container = document.createElement('div');
            container.innerHTML = '<h3>Card Examples</h3>';

            const basicCard = UI.createComponent('Card', {
                variant: 'default',
                header: 'Basic Card',
                footer: 'Card footer content'
            }, [document.createTextNode('This is the card content.')]);

            const elevatedCard = UI.createComponent('Card', {
                variant: 'elevated',
                padding: 'lg'
            }, [document.createTextNode('Elevated card with large padding.')]);

            container.appendChild(basicCard.mount().element);
            container.appendChild(elevatedCard.mount().element);

            return container;
        });

        // Alert Examples
        this.examples.set('alerts', () => {
            const container = document.createElement('div');
            container.innerHTML = '<h3>Alert Examples</h3>';

            const successAlert = UI.createComponent('Alert', {
                variant: 'success',
                title: 'Success!',
                dismissible: true
            }, ['Operation completed successfully.']);

            const warningAlert = UI.createComponent('Alert', {
                variant: 'warning',
                icon: true
            }, ['This is a warning message.']);

            const errorAlert = UI.createComponent('Alert', {
                variant: 'danger',
                title: 'Error',
                dismissible: true
            }, ['Something went wrong. Please try again.']);

            container.appendChild(successAlert.mount().element);
            container.appendChild(warningAlert.mount().element);
            container.appendChild(errorAlert.mount().element);

            return container;
        });

        // Input Examples
        this.examples.set('inputs', () => {
            const container = document.createElement('div');
            container.innerHTML = '<h3>Input Examples</h3>';

            const basicInput = UI.createComponent('Input', {
                label: 'Basic Input',
                placeholder: 'Enter text here...',
                helperText: 'This is helper text'
            });

            const iconInput = UI.createComponent('Input', {
                label: 'Search Input',
                icon: 'search',
                placeholder: 'Search...'
            });

            const errorInput = UI.createComponent('Input', {
                label: 'Input with Error',
                error: 'This field is required',
                required: true
            });

            container.appendChild(basicInput.mount().element);
            container.appendChild(iconInput.mount().element);
            container.appendChild(errorInput.mount().element);

            return container;
        });

        // Layout Examples
        this.examples.set('layouts', () => {
            const container = document.createElement('div');
            container.innerHTML = '<h3>Layout Examples</h3>';

            // Flex layout example
            const flexContainer = UI.createComponent('Flex', {
                justify: 'space-between',
                align: 'center',
                gap: 'md'
            }, [
                document.createTextNode('Left content'),
                document.createTextNode('Center content'),
                document.createTextNode('Right content')
            ]);

            // Grid layout example
            const gridContainer = UI.createComponent('Grid', {
                columns: 3,
                gap: 'md'
            });

            for (let i = 1; i <= 6; i++) {
                const gridItem = UI.createComponent('GridItem', {
                    span: 1
                }, [document.createTextNode(`Grid Item ${i}`)]);
                gridItem.element.style.padding = '1rem';
                gridItem.element.style.background = '#f0f0f0';
                gridItem.element.style.textAlign = 'center';
                gridContainer.children.push(gridItem.mount().element);
            }

            container.appendChild(flexContainer.mount().element);
            container.appendChild(document.createElement('br'));
            container.appendChild(gridContainer.mount().element);

            return container;
        });

        // Table Example
        this.examples.set('table', () => {
            const container = document.createElement('div');
            container.innerHTML = '<h3>Table Example</h3>';

            const sampleData = [
                { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
                { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
                { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User' }
            ];

            const columns = [
                { key: 'id', title: 'ID', width: '80px' },
                { key: 'name', title: 'Name' },
                { key: 'email', title: 'Email' },
                { 
                    key: 'role', 
                    title: 'Role',
                    render: (value) => {
                        const badge = document.createElement('span');
                        badge.className = `badge ${value.toLowerCase()}`;
                        badge.textContent = value;
                        return badge;
                    }
                }
            ];

            const table = UI.createComponent('Table', {
                data: sampleData,
                columns: columns,
                sortable: true,
                striped: true,
                hover: true
            });

            container.appendChild(table.mount().element);

            return container;
        });

        // Icon Examples
        this.examples.set('icons', () => {
            const container = document.createElement('div');
            container.innerHTML = '<h3>Icon Examples</h3>';

            const iconGrid = document.createElement('div');
            iconGrid.style.display = 'grid';
            iconGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(120px, 1fr))';
            iconGrid.style.gap = '1rem';
            iconGrid.style.marginTop = '1rem';

            const popularIcons = [
                'check', 'x', 'plus', 'minus', 'search', 'filter', 'settings',
                'home', 'user', 'mail', 'bell', 'file', 'folder', 'upload',
                'download', 'chevron-up', 'chevron-down', 'chevron-left', 'chevron-right'
            ];

            popularIcons.forEach(iconName => {
                const iconContainer = document.createElement('div');
                iconContainer.style.textAlign = 'center';
                iconContainer.style.padding = '0.5rem';
                iconContainer.style.border = '1px solid #ddd';
                iconContainer.style.borderRadius = '4px';

                const icon = Icons.create(iconName, { size: 24 });
                const label = document.createElement('div');
                label.textContent = iconName;
                label.style.fontSize = '0.75rem';
                label.style.marginTop = '0.25rem';

                iconContainer.appendChild(icon);
                iconContainer.appendChild(label);
                iconGrid.appendChild(iconContainer);
            });

            container.appendChild(iconGrid);

            return container;
        });

        // Dialog Example
        this.examples.set('dialog', () => {
            const container = document.createElement('div');
            container.innerHTML = '<h3>Dialog Example</h3>';

            const openDialogBtn = UI.createComponent('Button', {
                variant: 'primary'
            }, ['Open Dialog']);

            const dialog = UI.createComponent('Dialog', {
                title: 'Example Dialog',
                size: 'md',
                closable: true
            }, [
                document.createTextNode('This is the dialog content. You can put any content here.'),
                document.createElement('br'),
                document.createElement('br'),
                document.createTextNode('Click outside or press Escape to close.')
            ]);

            // Create footer with buttons
            const footer = document.createElement('div');
            const cancelBtn = UI.createComponent('Button', {
                variant: 'secondary'
            }, ['Cancel']);
            const confirmBtn = UI.createComponent('Button', {
                variant: 'primary'
            }, ['Confirm']);

            footer.appendChild(cancelBtn.mount().element);
            footer.appendChild(confirmBtn.mount().element);
            dialog.props.footer = footer;

            openDialogBtn.addEventListener('this', 'click', () => {
                dialog.open();
            });

            cancelBtn.addEventListener('this', 'click', () => {
                dialog.close();
            });

            confirmBtn.addEventListener('this', 'click', () => {
                alert('Confirmed!');
                dialog.close();
            });

            container.appendChild(openDialogBtn.mount().element);

            return container;
        });
    }

    renderExample(name) {
        const example = this.examples.get(name);
        return example ? example() : null;
    }

    renderAllExamples() {
        const container = document.createElement('div');
        container.className = 'ui-examples';

        const title = document.createElement('h1');
        title.textContent = 'UI Framework Examples';
        container.appendChild(title);

        this.examples.forEach((example, name) => {
            const section = document.createElement('section');
            section.className = 'example-section';
            section.style.marginBottom = '2rem';
            section.style.padding = '1rem';
            section.style.border = '1px solid #ddd';
            section.style.borderRadius = '8px';

            section.appendChild(example());
            container.appendChild(section);
        });

        return container;
    }

    // Utility method to create a demo page
    createDemoPage() {
        const page = document.createElement('div');
        page.className = 'demo-page';
        page.style.padding = '2rem';
        page.style.maxWidth = '1200px';
        page.style.margin = '0 auto';

        page.appendChild(this.renderAllExamples());

        return page;
    }
}

// Usage examples and patterns
const UIUsagePatterns = {
    // Creating components programmatically
    createButton: () => {
        const button = UI.createComponent('Button', {
            variant: 'primary',
            size: 'md',
            icon: 'check'
        }, ['Save Changes']);
        
        button.addEventListener('this', 'click', () => {
            console.log('Button clicked!');
        });
        
        return button.mount(document.body);
    },

    // Creating a form with validation
    createForm: () => {
        const form = document.createElement('form');
        form.className = 'ui-form';

        const nameInput = UI.createComponent('Input', {
            label: 'Full Name',
            required: true,
            placeholder: 'Enter your full name'
        });

        const emailInput = UI.createComponent('Input', {
            type: 'email',
            label: 'Email Address',
            required: true,
            placeholder: 'Enter your email',
            icon: 'mail'
        });

        const submitBtn = UI.createComponent('Button', {
            type: 'submit',
            variant: 'primary',
            fullWidth: true
        }, ['Submit Form']);

        form.appendChild(nameInput.mount().element);
        form.appendChild(emailInput.mount().element);
        form.appendChild(submitBtn.mount().element);

        // Add form validation
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            let isValid = true;
            
            if (!nameInput.getValue()) {
                nameInput.setError('Name is required');
                isValid = false;
            } else {
                nameInput.clearError();
            }
            
            if (!emailInput.getValue()) {
                emailInput.setError('Email is required');
                isValid = false;
            } else {
                emailInput.clearError();
            }
            
            if (isValid) {
                alert('Form submitted successfully!');
            }
        });

        return form;
    },

    // Creating a data dashboard
    createDashboard: () => {
        const dashboard = UI.createComponent('Container', { size: 'xl' });
        
        const header = UI.createComponent('Flex', {
            justify: 'space-between',
            align: 'center',
            gap: 'md'
        }, [
            document.createElement('h1'),
            UI.createComponent('Button', { 
                variant: 'primary', 
                icon: 'plus' 
            }, ['Add New']).mount().element
        ]);
        
        header.children[0].textContent = 'Dashboard';

        const statsGrid = UI.createComponent('Grid', {
            columns: 4,
            gap: 'md'
        });

        // Create stat cards
        for (let i = 1; i <= 4; i++) {
            const statCard = UI.createComponent('Card', {
                variant: 'elevated',
                padding: 'md'
            }, [
                document.createElement('div')
            ]);
            
            statCard.children[0].innerHTML = `
                <h3>Stat ${i}</h3>
                <p class="stat-value">1,234</p>
                <p class="stat-change">+12% from last month</p>
            `;
            
            statsGrid.children.push(statCard.mount().element);
        }

        dashboard.children = [
            header.mount().element,
            statsGrid.mount().element
        ];

        return dashboard.mount().element;
    }
};

// Make available globally
window.UIExamples = UIExamples;
window.UIUsagePatterns = UIUsagePatterns;

// Auto-create examples if in demo mode
if (window.location.search.includes('demo=true')) {
    document.addEventListener('DOMContentLoaded', () => {
        const examples = new UIExamples();
        document.body.appendChild(examples.createDemoPage());
    });
}
