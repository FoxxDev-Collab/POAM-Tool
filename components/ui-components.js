
// Button Component
class ButtonComponent extends UIComponent {
    constructor(props = {}, children = []) {
        super(props, children);
    }

    getDefaultProps() {
        return {
            ...super.getDefaultProps(),
            variant: 'primary', // primary, secondary, success, danger, warning, info, light, dark, outline
            size: 'md', // sm, md, lg
            type: 'button',
            loading: false,
            icon: null,
            iconPosition: 'left', // left, right
            fullWidth: false
        };
    }

    render() {
        const button = this.createElement('button');
        button.type = this.props.type;
        
        // Add button classes
        const classes = [
            'ui-button',
            `ui-button--${this.props.variant}`,
            `ui-button--${this.props.size}`
        ];
        
        if (this.props.fullWidth) classes.push('ui-button--full-width');
        if (this.props.loading) classes.push('ui-button--loading');
        if (this.props.icon && !this.children.length) classes.push('ui-button--icon-only');
        
        button.className = classes.join(' ') + (this.props.className ? ` ${this.props.className}` : '');

        // Create button content
        const content = document.createElement('span');
        content.className = 'ui-button__content';

        // Add icon if specified
        if (this.props.icon && !this.props.loading) {
            const iconSize = this.props.size === 'sm' ? 16 : this.props.size === 'lg' ? 20 : 18;
            const icon = Icons.create(this.props.icon, { size: iconSize });
            icon.className = `ui-button__icon ui-button__icon--${this.props.iconPosition}`;
            
            if (this.props.iconPosition === 'left') {
                content.appendChild(icon);
            }
        }

        // Add loading spinner
        if (this.props.loading) {
            const spinner = Icons.create('loader', { 
                size: this.props.size === 'sm' ? 16 : this.props.size === 'lg' ? 20 : 18,
                className: 'ui-button__spinner'
            });
            content.appendChild(spinner);
        }

        // Add text content
        if (this.children.length > 0 || typeof this.children === 'string') {
            const text = document.createElement('span');
            text.className = 'ui-button__text';
            if (typeof this.children === 'string') {
                text.textContent = this.children;
            } else {
                this.children.forEach(child => {
                    if (typeof child === 'string') {
                        text.appendChild(document.createTextNode(child));
                    } else {
                        text.appendChild(child);
                    }
                });
            }
            content.appendChild(text);
        }

        // Add right icon
        if (this.props.icon && !this.props.loading && this.props.iconPosition === 'right') {
            const iconSize = this.props.size === 'sm' ? 16 : this.props.size === 'lg' ? 20 : 18;
            const icon = Icons.create(this.props.icon, { size: iconSize });
            icon.className = `ui-button__icon ui-button__icon--${this.props.iconPosition}`;
            content.appendChild(icon);
        }

        button.appendChild(content);

        // Add accessibility attributes
        UIFramework.addAccessibilityAttributes(button, {
            ariaDisabled: this.props.disabled,
            ariaLabel: this.props.ariaLabel
        });

        return button;
    }

    setLoading(loading) {
        this.props.loading = loading;
        if (this.mounted) {
            this.update();
        }
        return this;
    }

    click() {
        if (this.element && !this.props.disabled && !this.props.loading) {
            this.element.click();
        }
        return this;
    }
}

// Card Component
class CardComponent extends UIComponent {
    constructor(props = {}, children = []) {
        super(props, children);
    }

    getDefaultProps() {
        return {
            ...super.getDefaultProps(),
            variant: 'default', // default, outlined, elevated
            padding: 'md', // sm, md, lg, none
            header: null,
            footer: null
        };
    }

    render() {
        const card = this.createElement('div');
        
        const classes = [
            'ui-card',
            `ui-card--${this.props.variant}`,
            `ui-card--padding-${this.props.padding}`
        ];
        
        card.className = classes.join(' ') + (this.props.className ? ` ${this.props.className}` : '');

        // Add header if provided
        if (this.props.header) {
            const header = document.createElement('div');
            header.className = 'ui-card__header';
            if (typeof this.props.header === 'string') {
                header.textContent = this.props.header;
            } else {
                header.appendChild(this.props.header);
            }
            card.appendChild(header);
        }

        // Add main content
        const content = document.createElement('div');
        content.className = 'ui-card__content';
        
        this.children.forEach(child => {
            if (typeof child === 'string') {
                content.appendChild(document.createTextNode(child));
            } else {
                content.appendChild(child);
            }
        });
        
        card.appendChild(content);

        // Add footer if provided
        if (this.props.footer) {
            const footer = document.createElement('div');
            footer.className = 'ui-card__footer';
            if (typeof this.props.footer === 'string') {
                footer.textContent = this.props.footer;
            } else {
                footer.appendChild(this.props.footer);
            }
            card.appendChild(footer);
        }

        return card;
    }
}

// Alert Component
class AlertComponent extends UIComponent {
    constructor(props = {}, children = []) {
        super(props, children);
    }

    getDefaultProps() {
        return {
            ...super.getDefaultProps(),
            variant: 'info', // success, info, warning, danger
            dismissible: false,
            icon: true,
            title: null
        };
    }

    render() {
        const alert = this.createElement('div');
        
        const classes = [
            'ui-alert',
            `ui-alert--${this.props.variant}`
        ];
        
        if (this.props.dismissible) classes.push('ui-alert--dismissible');
        
        alert.className = classes.join(' ') + (this.props.className ? ` ${this.props.className}` : '');

        // Add icon
        if (this.props.icon) {
            const iconName = this.getIconForVariant(this.props.variant);
            const icon = Icons.create(iconName, { size: 20 });
            icon.className = 'ui-alert__icon';
            alert.appendChild(icon);
        }

        // Add content container
        const content = document.createElement('div');
        content.className = 'ui-alert__content';

        // Add title if provided
        if (this.props.title) {
            const title = document.createElement('div');
            title.className = 'ui-alert__title';
            title.textContent = this.props.title;
            content.appendChild(title);
        }

        // Add message content
        const message = document.createElement('div');
        message.className = 'ui-alert__message';
        
        this.children.forEach(child => {
            if (typeof child === 'string') {
                message.appendChild(document.createTextNode(child));
            } else {
                message.appendChild(child);
            }
        });
        
        content.appendChild(message);
        alert.appendChild(content);

        // Add dismiss button
        if (this.props.dismissible) {
            const dismissBtn = document.createElement('button');
            dismissBtn.className = 'ui-alert__dismiss';
            dismissBtn.type = 'button';
            dismissBtn.setAttribute('aria-label', 'Dismiss alert');
            
            const closeIcon = Icons.create('x', { size: 16 });
            dismissBtn.appendChild(closeIcon);
            
            dismissBtn.addEventListener('click', () => {
                this.dismiss();
            });
            
            alert.appendChild(dismissBtn);
        }

        // Add accessibility attributes
        UIFramework.addAccessibilityAttributes(alert, {
            role: 'alert',
            ariaLive: 'polite'
        });

        return alert;
    }

    getIconForVariant(variant) {
        const iconMap = {
            success: 'check-circle',
            info: 'info',
            warning: 'alert-triangle',
            danger: 'alert-circle'
        };
        return iconMap[variant] || 'info';
    }

    dismiss() {
        if (this.element) {
            const animation = UIFramework.animate(this.element, [
                { opacity: 1, transform: 'translateX(0)' },
                { opacity: 0, transform: 'translateX(100%)' }
            ], { duration: 200 });

            animation.addEventListener('finish', () => {
                this.unmount();
            });
        }
        return this;
    }
}

// Dialog Component
class DialogComponent extends UIComponent {
    constructor(props = {}, children = []) {
        super(props, children);
        this.backdrop = null;
    }

    getDefaultProps() {
        return {
            ...super.getDefaultProps(),
            size: 'md', // sm, md, lg, xl, full
            closable: true,
            closeOnBackdrop: true,
            closeOnEscape: true,
            title: null,
            footer: null,
            open: false
        };
    }

    render() {
        // Create backdrop
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'ui-dialog-backdrop';
        
        if (this.props.closeOnBackdrop) {
            this.backdrop.addEventListener('click', (e) => {
                if (e.target === this.backdrop) {
                    this.close();
                }
            });
        }

        // Create dialog
        const dialog = this.createElement('div');
        dialog.className = `ui-dialog ui-dialog--${this.props.size}` + 
                          (this.props.className ? ` ${this.props.className}` : '');

        // Add header if title or closable
        if (this.props.title || this.props.closable) {
            const header = document.createElement('div');
            header.className = 'ui-dialog__header';

            if (this.props.title) {
                const title = document.createElement('h3');
                title.className = 'ui-dialog__title';
                title.textContent = this.props.title;
                header.appendChild(title);
            }

            if (this.props.closable) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'ui-dialog__close';
                closeBtn.type = 'button';
                closeBtn.setAttribute('aria-label', 'Close dialog');
                
                const closeIcon = Icons.create('x', { size: 20 });
                closeBtn.appendChild(closeIcon);
                
                closeBtn.addEventListener('click', () => {
                    this.close();
                });
                
                header.appendChild(closeBtn);
            }

            dialog.appendChild(header);
        }

        // Add content
        const content = document.createElement('div');
        content.className = 'ui-dialog__content';
        
        this.children.forEach(child => {
            if (typeof child === 'string') {
                content.appendChild(document.createTextNode(child));
            } else {
                content.appendChild(child);
            }
        });
        
        dialog.appendChild(content);

        // Add footer if provided
        if (this.props.footer) {
            const footer = document.createElement('div');
            footer.className = 'ui-dialog__footer';
            if (typeof this.props.footer === 'string') {
                footer.textContent = this.props.footer;
            } else {
                footer.appendChild(this.props.footer);
            }
            dialog.appendChild(footer);
        }

        this.backdrop.appendChild(dialog);

        // Add accessibility attributes
        UIFramework.addAccessibilityAttributes(dialog, {
            role: 'dialog',
            ariaModal: 'true',
            ariaLabel: this.props.title || 'Dialog'
        });

        return this.backdrop;
    }

    onMount() {
        // Handle escape key
        if (this.props.closeOnEscape) {
            this.handleEscape = (e) => {
                if (e.key === 'Escape') {
                    this.close();
                }
            };
            document.addEventListener('keydown', this.handleEscape);
        }

        // Focus management
        this.previousActiveElement = document.activeElement;
        const firstFocusable = this.element.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }

        // Show animation
        if (this.element) {
            this.element.style.opacity = '0';
            requestAnimationFrame(() => {
                UIFramework.animate(this.element, [
                    { opacity: 0 },
                    { opacity: 1 }
                ], { duration: 200 });
            });
        }
    }

    onUnmount() {
        // Remove escape key handler
        if (this.handleEscape) {
            document.removeEventListener('keydown', this.handleEscape);
        }

        // Restore focus
        if (this.previousActiveElement) {
            this.previousActiveElement.focus();
        }
    }

    open() {
        this.props.open = true;
        if (!this.mounted) {
            this.mount(document.body);
        }
        return this;
    }

    close() {
        this.props.open = false;
        
        if (this.element) {
            const animation = UIFramework.animate(this.element, [
                { opacity: 1 },
                { opacity: 0 }
            ], { duration: 200 });

            animation.addEventListener('finish', () => {
                this.unmount();
            });
        }
        
        return this;
    }

    toggle() {
        return this.props.open ? this.close() : this.open();
    }
}

// Input Component
class InputComponent extends UIComponent {
    constructor(props = {}, children = []) {
        super(props, children);
    }

    getDefaultProps() {
        return {
            ...super.getDefaultProps(),
            type: 'text',
            size: 'md', // sm, md, lg
            variant: 'default', // default, filled, outlined
            placeholder: '',
            value: '',
            label: null,
            helperText: null,
            error: null,
            required: false,
            readonly: false,
            icon: null,
            iconPosition: 'left'
        };
    }

    render() {
        const container = this.createElement('div');
        container.className = 'ui-input-container';

        // Add label if provided
        if (this.props.label) {
            const label = document.createElement('label');
            label.className = 'ui-input__label';
            label.textContent = this.props.label;
            if (this.props.required) {
                label.innerHTML += ' <span class="ui-input__required">*</span>';
            }
            container.appendChild(label);
        }

        // Create input wrapper
        const wrapper = document.createElement('div');
        const classes = [
            'ui-input-wrapper',
            `ui-input-wrapper--${this.props.variant}`,
            `ui-input-wrapper--${this.props.size}`
        ];
        
        if (this.props.error) classes.push('ui-input-wrapper--error');
        if (this.props.disabled) classes.push('ui-input-wrapper--disabled');
        if (this.props.readonly) classes.push('ui-input-wrapper--readonly');
        if (this.props.icon) classes.push(`ui-input-wrapper--icon-${this.props.iconPosition}`);
        
        wrapper.className = classes.join(' ');

        // Add icon if specified
        if (this.props.icon) {
            const iconSize = this.props.size === 'sm' ? 16 : this.props.size === 'lg' ? 20 : 18;
            const icon = Icons.create(this.props.icon, { size: iconSize });
            icon.className = `ui-input__icon ui-input__icon--${this.props.iconPosition}`;
            wrapper.appendChild(icon);
        }

        // Create input element
        const input = document.createElement('input');
        input.type = this.props.type;
        input.className = 'ui-input';
        input.placeholder = this.props.placeholder;
        input.value = this.props.value;
        input.disabled = this.props.disabled;
        input.readonly = this.props.readonly;
        input.required = this.props.required;
        
        if (this.id) {
            input.id = this.id;
            if (container.querySelector('label')) {
                container.querySelector('label').setAttribute('for', this.id);
            }
        }

        wrapper.appendChild(input);
        container.appendChild(wrapper);

        // Add helper text or error message
        if (this.props.helperText || this.props.error) {
            const helper = document.createElement('div');
            helper.className = this.props.error ? 'ui-input__error' : 'ui-input__helper';
            helper.textContent = this.props.error || this.props.helperText;
            container.appendChild(helper);
        }

        return container;
    }

    getValue() {
        const input = this.find('input');
        return input ? input.value : this.props.value;
    }

    setValue(value) {
        this.props.value = value;
        const input = this.find('input');
        if (input) {
            input.value = value;
        }
        return this;
    }

    focus() {
        const input = this.find('input');
        if (input) {
            input.focus();
        }
        return this;
    }

    setError(error) {
        this.props.error = error;
        if (this.mounted) {
            this.update();
        }
        return this;
    }

    clearError() {
        this.props.error = null;
        if (this.mounted) {
            this.update();
        }
        return this;
    }
}

// Register components with UI framework
if (window.UI) {
    window.UI.registerComponent('Button', ButtonComponent);
    window.UI.registerComponent('Card', CardComponent);
    window.UI.registerComponent('Alert', AlertComponent);
    window.UI.registerComponent('Dialog', DialogComponent);
    window.UI.registerComponent('Input', InputComponent);
}

// Export components
window.ButtonComponent = ButtonComponent;
window.CardComponent = CardComponent;
window.AlertComponent = AlertComponent;
window.DialogComponent = DialogComponent;
window.InputComponent = InputComponent;
