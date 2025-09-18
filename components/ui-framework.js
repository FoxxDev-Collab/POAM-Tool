class UIFramework {
    constructor() {
        this.components = new Map();
        this.themes = new Map();
        this.currentTheme = 'default';
        this.componentCounter = 0;
        this.eventBus = new EventTarget();
        
        this.init();
    }

    init() {
        // Initialize default theme
        this.registerTheme('default', {
            colors: {
                primary: '#007bff',
                secondary: '#6c757d',
                success: '#28a745',
                danger: '#dc3545',
                warning: '#ffc107',
                info: '#17a2b8',
                light: '#f8f9fa',
                dark: '#343a40',
                white: '#ffffff',
                black: '#000000'
            },
            spacing: {
                xs: '0.25rem',
                sm: '0.5rem',
                md: '1rem',
                lg: '1.5rem',
                xl: '2rem',
                xxl: '3rem'
            },
            borderRadius: {
                none: '0',
                sm: '0.125rem',
                md: '0.25rem',
                lg: '0.5rem',
                xl: '1rem',
                full: '9999px'
            },
            shadows: {
                none: 'none',
                sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            },
            typography: {
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                fontSize: {
                    xs: '0.75rem',
                    sm: '0.875rem',
                    md: '1rem',
                    lg: '1.125rem',
                    xl: '1.25rem',
                    xxl: '1.5rem'
                },
                fontWeight: {
                    light: '300',
                    normal: '400',
                    medium: '500',
                    semibold: '600',
                    bold: '700'
                }
            }
        });

        // Initialize dark theme
        this.registerTheme('dark', {
            ...this.themes.get('default'),
            colors: {
                primary: '#0d6efd',
                secondary: '#6c757d',
                success: '#198754',
                danger: '#dc3545',
                warning: '#fd7e14',
                info: '#0dcaf0',
                light: '#212529',
                dark: '#f8f9fa',
                white: '#000000',
                black: '#ffffff',
                background: '#121212',
                surface: '#1e1e1e',
                onBackground: '#ffffff',
                onSurface: '#ffffff'
            }
        });

        console.log('UIFramework initialized');
    }

    // Component registration and management
    registerComponent(name, componentClass) {
        if (this.components.has(name)) {
            console.warn(`Component "${name}" is already registered. Overriding.`);
        }
        
        this.components.set(name, componentClass);
        console.log(`Component "${name}" registered`);
    }

    createComponent(name, props = {}, children = []) {
        const ComponentClass = this.components.get(name);
        if (!ComponentClass) {
            throw new Error(`Component "${name}" is not registered`);
        }

        const instance = new ComponentClass(props, children);
        instance.framework = this;
        instance.id = instance.id || this.generateId();
        
        return instance;
    }

    // Theme management
    registerTheme(name, theme) {
        this.themes.set(name, theme);
        console.log(`Theme "${name}" registered`);
    }

    setTheme(name) {
        if (!this.themes.has(name)) {
            console.warn(`Theme "${name}" not found. Using default theme.`);
            name = 'default';
        }

        this.currentTheme = name;
        this.applyTheme(name);
        this.emit('themeChanged', { theme: name });
    }

    getTheme(name = null) {
        return this.themes.get(name || this.currentTheme);
    }

    applyTheme(name) {
        const theme = this.getTheme(name);
        if (!theme) return;

        // Apply CSS custom properties for theming
        const root = document.documentElement;
        
        // Colors
        Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(`--ui-color-${key}`, value);
        });

        // Spacing
        Object.entries(theme.spacing).forEach(([key, value]) => {
            root.style.setProperty(`--ui-spacing-${key}`, value);
        });

        // Border radius
        Object.entries(theme.borderRadius).forEach(([key, value]) => {
            root.style.setProperty(`--ui-radius-${key}`, value);
        });

        // Shadows
        Object.entries(theme.shadows).forEach(([key, value]) => {
            root.style.setProperty(`--ui-shadow-${key}`, value);
        });

        // Typography
        root.style.setProperty('--ui-font-family', theme.typography.fontFamily);
        Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
            root.style.setProperty(`--ui-font-size-${key}`, value);
        });
        Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
            root.style.setProperty(`--ui-font-weight-${key}`, value);
        });
    }

    // Utility methods
    generateId(prefix = 'ui-component') {
        return `${prefix}-${++this.componentCounter}`;
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

    // Accessibility helpers
    static addAccessibilityAttributes(element, options = {}) {
        const {
            role,
            ariaLabel,
            ariaDescribedBy,
            ariaExpanded,
            ariaHidden,
            tabIndex,
            ariaLive,
            ariaAtomic
        } = options;

        if (role) element.setAttribute('role', role);
        if (ariaLabel) element.setAttribute('aria-label', ariaLabel);
        if (ariaDescribedBy) element.setAttribute('aria-describedby', ariaDescribedBy);
        if (ariaExpanded !== undefined) element.setAttribute('aria-expanded', ariaExpanded);
        if (ariaHidden !== undefined) element.setAttribute('aria-hidden', ariaHidden);
        if (tabIndex !== undefined) element.setAttribute('tabindex', tabIndex);
        if (ariaLive) element.setAttribute('aria-live', ariaLive);
        if (ariaAtomic !== undefined) element.setAttribute('aria-atomic', ariaAtomic);

        return element;
    }

    // Animation helpers
    static animate(element, keyframes, options = {}) {
        const defaultOptions = {
            duration: 300,
            easing: 'ease-out',
            fill: 'forwards'
        };

        return element.animate(keyframes, { ...defaultOptions, ...options });
    }

    // CSS class utilities
    static addClass(element, ...classes) {
        element.classList.add(...classes);
        return element;
    }

    static removeClass(element, ...classes) {
        element.classList.remove(...classes);
        return element;
    }

    static toggleClass(element, className, force) {
        element.classList.toggle(className, force);
        return element;
    }

    static hasClass(element, className) {
        return element.classList.contains(className);
    }
}

// Base Component Class
class UIComponent {
    constructor(props = {}, children = []) {
        this.props = { ...this.getDefaultProps(), ...props };
        this.children = children;
        this.element = null;
        this.framework = null;
        this.id = props.id || null;
        this.mounted = false;
        this.eventListeners = new Map();
    }

    getDefaultProps() {
        return {
            className: '',
            style: {},
            disabled: false,
            hidden: false
        };
    }

    createElement(tag = 'div') {
        const element = document.createElement(tag);
        element.id = this.id;
        
        // Apply classes
        if (this.props.className) {
            element.className = this.props.className;
        }

        // Apply inline styles
        Object.assign(element.style, this.props.style);

        // Apply common attributes
        if (this.props.disabled) element.disabled = true;
        if (this.props.hidden) element.hidden = true;

        return element;
    }

    render() {
        // Override in subclasses
        return this.createElement();
    }

    mount(container) {
        if (this.mounted) {
            console.warn('Component is already mounted');
            return this;
        }

        this.element = this.render();
        
        if (container) {
            container.appendChild(this.element);
        }

        this.mounted = true;
        this.onMount();
        
        return this;
    }

    unmount() {
        if (!this.mounted) return this;

        this.onUnmount();
        
        // Remove event listeners
        this.eventListeners.forEach((listener, key) => {
            const [element, event] = key.split(':');
            const el = element === 'this' ? this.element : document.querySelector(element);
            if (el) el.removeEventListener(event, listener);
        });
        this.eventListeners.clear();

        // Remove from DOM
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        this.mounted = false;
        this.element = null;
        
        return this;
    }

    // Lifecycle methods
    onMount() {
        // Override in subclasses
    }

    onUnmount() {
        // Override in subclasses
    }

    // Event handling
    addEventListener(element, event, callback, options = {}) {
        const key = `${element}:${event}`;
        const el = element === 'this' ? this.element : document.querySelector(element);
        
        if (el) {
            el.addEventListener(event, callback, options);
            this.eventListeners.set(key, callback);
        }
        
        return this;
    }

    removeEventListener(element, event) {
        const key = `${element}:${event}`;
        const callback = this.eventListeners.get(key);
        
        if (callback) {
            const el = element === 'this' ? this.element : document.querySelector(element);
            if (el) el.removeEventListener(event, callback);
            this.eventListeners.delete(key);
        }
        
        return this;
    }

    // Property updates
    updateProps(newProps) {
        this.props = { ...this.props, ...newProps };
        if (this.mounted) {
            this.update();
        }
        return this;
    }

    update() {
        // Override in subclasses for efficient updates
        if (this.mounted && this.element) {
            const newElement = this.render();
            this.element.parentNode.replaceChild(newElement, this.element);
            this.element = newElement;
        }
        return this;
    }

    // Utility methods
    find(selector) {
        return this.element ? this.element.querySelector(selector) : null;
    }

    findAll(selector) {
        return this.element ? Array.from(this.element.querySelectorAll(selector)) : [];
    }

    show() {
        if (this.element) {
            this.element.hidden = false;
            this.props.hidden = false;
        }
        return this;
    }

    hide() {
        if (this.element) {
            this.element.hidden = true;
            this.props.hidden = true;
        }
        return this;
    }

    enable() {
        if (this.element) {
            this.element.disabled = false;
            this.props.disabled = false;
        }
        return this;
    }

    disable() {
        if (this.element) {
            this.element.disabled = true;
            this.props.disabled = true;
        }
        return this;
    }
}

// Create global instance
window.UI = new UIFramework();
window.UIComponent = UIComponent;
