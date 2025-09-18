class IconLibrary {
    constructor() {
        this.icons = new Map();
        this.defaultProps = {
            size: 24,
            strokeWidth: 2,
            color: 'currentColor',
            fill: 'none',
            className: ''
        };
        
        this.registerIcons();
        console.log('IconLibrary initialized with', this.icons.size, 'icons');
    }

    registerIcons() {
        // Core UI Icons
        this.register('chevron-down', {
            viewBox: '0 0 24 24',
            path: '<path d="M6 9l6 6 6-6"/>'
        });

        this.register('chevron-up', {
            viewBox: '0 0 24 24',
            path: '<path d="M18 15l-6-6-6 6"/>'
        });

        this.register('chevron-left', {
            viewBox: '0 0 24 24',
            path: '<path d="M15 18l-6-6 6-6"/>'
        });

        this.register('chevron-right', {
            viewBox: '0 0 24 24',
            path: '<path d="M9 18l6-6-6-6"/>'
        });

        this.register('x', {
            viewBox: '0 0 24 24',
            path: '<path d="M18 6L6 18M6 6l12 12"/>'
        });

        this.register('plus', {
            viewBox: '0 0 24 24',
            path: '<path d="M12 5v14M5 12h14"/>'
        });

        this.register('minus', {
            viewBox: '0 0 24 24',
            path: '<path d="M5 12h14"/>'
        });

        this.register('check', {
            viewBox: '0 0 24 24',
            path: '<path d="M20 6L9 17l-5-5"/>'
        });

        this.register('alert-circle', {
            viewBox: '0 0 24 24',
            path: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
        });

        this.register('alert-triangle', {
            viewBox: '0 0 24 24',
            path: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
        });

        this.register('info', {
            viewBox: '0 0 24 24',
            path: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
        });

        this.register('check-circle', {
            viewBox: '0 0 24 24',
            path: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M9 11l3 3L22 4"/>'
        });

        // File and Document Icons
        this.register('file', {
            viewBox: '0 0 24 24',
            path: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>'
        });

        this.register('file-text', {
            viewBox: '0 0 24 24',
            path: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>'
        });

        this.register('folder', {
            viewBox: '0 0 24 24',
            path: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'
        });

        this.register('upload', {
            viewBox: '0 0 24 24',
            path: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,5 17,10"/><line x1="12" y1="5" x2="12" y2="15"/>'
        });

        this.register('download', {
            viewBox: '0 0 24 24',
            path: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>'
        });

        // Navigation Icons
        this.register('menu', {
            viewBox: '0 0 24 24',
            path: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>'
        });

        this.register('more-horizontal', {
            viewBox: '0 0 24 24',
            path: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>'
        });

        this.register('more-vertical', {
            viewBox: '0 0 24 24',
            path: '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>'
        });

        this.register('home', {
            viewBox: '0 0 24 24',
            path: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>'
        });

        this.register('settings', {
            viewBox: '0 0 24 24',
            path: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
        });

        // Search and Filter Icons
        this.register('search', {
            viewBox: '0 0 24 24',
            path: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>'
        });

        this.register('filter', {
            viewBox: '0 0 24 24',
            path: '<polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/>'
        });

        this.register('sort-asc', {
            viewBox: '0 0 24 24',
            path: '<path d="M11 11h4"/><path d="M11 15h7"/><path d="M11 19h10"/><path d="M9 7L6 4 3 7"/><path d="M6 6v14"/>'
        });

        this.register('sort-desc', {
            viewBox: '0 0 24 24',
            path: '<path d="M11 5h10"/><path d="M11 9h7"/><path d="M11 13h4"/><path d="M3 17l3 3 3-3"/><path d="M6 18V4"/>'
        });

        // Table Icons
        this.register('table', {
            viewBox: '0 0 24 24',
            path: '<path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v6m0 0v6m0-6h10m0-6v6m0 0v6a2 2 0 0 1-2 2H9m10-6H9m0 0v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6m6 0H3"/>'
        });

        this.register('columns', {
            viewBox: '0 0 24 24',
            path: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="21" y2="9"/><line x1="9" y1="15" x2="21" y2="15"/><line x1="3" y1="9" x2="3" y2="9"/><line x1="3" y1="15" x2="3" y2="15"/>'
        });

        // Theme Icons
        this.register('sun', {
            viewBox: '0 0 24 24',
            path: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
        });

        this.register('moon', {
            viewBox: '0 0 24 24',
            path: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
        });

        // Loading and Status Icons
        this.register('loader', {
            viewBox: '0 0 24 24',
            path: '<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>'
        });

        this.register('refresh-cw', {
            viewBox: '0 0 24 24',
            path: '<polyline points="23,4 23,10 17,10"/><polyline points="1,20 1,14 7,14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>'
        });

        // Expand/Collapse Icons
        this.register('expand', {
            viewBox: '0 0 24 24',
            path: '<polyline points="15,3 21,3 21,9"/><polyline points="9,21 3,21 3,15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>'
        });

        this.register('minimize', {
            viewBox: '0 0 24 24',
            path: '<polyline points="4,14 10,14 10,20"/><polyline points="20,10 14,10 14,4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>'
        });

        // Data Icons
        this.register('database', {
            viewBox: '0 0 24 24',
            path: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>'
        });

        this.register('bar-chart', {
            viewBox: '0 0 24 24',
            path: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>'
        });

        // User and Security Icons
        this.register('user', {
            viewBox: '0 0 24 24',
            path: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
        });

        this.register('users', {
            viewBox: '0 0 24 24',
            path: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
        });

        this.register('lock', {
            viewBox: '0 0 24 24',
            path: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><circle cx="12" cy="16" r="1"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
        });

        this.register('unlock', {
            viewBox: '0 0 24 24',
            path: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><circle cx="12" cy="16" r="1"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>'
        });

        // Communication Icons
        this.register('mail', {
            viewBox: '0 0 24 24',
            path: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>'
        });

        this.register('bell', {
            viewBox: '0 0 24 24',
            path: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'
        });
    }

    register(name, iconData) {
        this.icons.set(name, iconData);
    }

    get(name) {
        return this.icons.get(name);
    }

    has(name) {
        return this.icons.has(name);
    }

    list() {
        return Array.from(this.icons.keys()).sort();
    }

    create(name, props = {}) {
        const iconData = this.get(name);
        if (!iconData) {
            console.warn(`Icon "${name}" not found`);
            return null;
        }

        const finalProps = { ...this.defaultProps, ...props };
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        
        // Set SVG attributes
        svg.setAttribute('width', finalProps.size);
        svg.setAttribute('height', finalProps.size);
        svg.setAttribute('viewBox', iconData.viewBox);
        svg.setAttribute('fill', finalProps.fill);
        svg.setAttribute('stroke', finalProps.color);
        svg.setAttribute('stroke-width', finalProps.strokeWidth);
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        
        if (finalProps.className && typeof finalProps.className === 'string') {
            svg.setAttribute('class', finalProps.className);
        }

        // Add icon paths
        svg.innerHTML = iconData.path;

        // Add accessibility
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-hidden', 'true');

        return svg;
    }

    createComponent(name, props = {}) {
        return new IconComponent(name, props);
    }
}

// Icon Component Class
class IconComponent extends UIComponent {
    constructor(iconName, props = {}) {
        super(props);
        this.iconName = iconName;
    }

    getDefaultProps() {
        return {
            ...super.getDefaultProps(),
            size: 24,
            strokeWidth: 2,
            color: 'currentColor',
            fill: 'none'
        };
    }

    render() {
        const icon = Icons.create(this.iconName, this.props);
        if (!icon) {
            // Fallback for missing icons
            const fallback = document.createElement('div');
            fallback.className = 'icon-missing';
            fallback.textContent = '?';
            fallback.style.cssText = `
                width: ${this.props.size}px;
                height: ${this.props.size}px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: #f0f0f0;
                border-radius: 2px;
                font-size: ${Math.max(10, this.props.size * 0.6)}px;
                color: #999;
            `;
            return fallback;
        }

        // Apply additional classes if specified
        if (this.props.className) {
            icon.classList.add(...this.props.className.split(' '));
        }

        return icon;
    }

    setIcon(iconName) {
        this.iconName = iconName;
        if (this.mounted) {
            this.update();
        }
        return this;
    }

    setSize(size) {
        this.props.size = size;
        if (this.mounted) {
            this.update();
        }
        return this;
    }

    setColor(color) {
        this.props.color = color;
        if (this.mounted) {
            this.update();
        }
        return this;
    }
}

// Create global instances
window.Icons = new IconLibrary();
window.IconComponent = IconComponent;

// Register Icon component with UI framework
if (window.UI) {
    window.UI.registerComponent('Icon', IconComponent);
}
