class ContainerComponent extends UIComponent {
    constructor(props = {}, children = []) {
        super(props, children);
    }

    getDefaultProps() {
        return {
            ...super.getDefaultProps(),
            size: 'lg', // sm, md, lg, xl, fluid
            centered: false,
            padding: 'md' // none, sm, md, lg
        };
    }

    render() {
        const container = this.createElement('div');
        
        const classes = [
            'ui-container',
            `ui-container--${this.props.size}`,
            `ui-container--padding-${this.props.padding}`
        ];
        
        if (this.props.centered) classes.push('ui-container--centered');
        
        container.className = classes.join(' ') + (this.props.className ? ` ${this.props.className}` : '');

        // Add children
        this.children.forEach(child => {
            if (typeof child === 'string') {
                container.appendChild(document.createTextNode(child));
            } else {
                container.appendChild(child);
            }
        });

        return container;
    }
}

// Grid Component
class GridComponent extends UIComponent {
    constructor(props = {}, children = []) {
        super(props, children);
    }

    getDefaultProps() {
        return {
            ...super.getDefaultProps(),
            columns: 12,
            gap: 'md', // none, xs, sm, md, lg, xl
            responsive: true,
            align: 'stretch', // start, center, end, stretch
            justify: 'start' // start, center, end, space-between, space-around, space-evenly
        };
    }

    render() {
        const grid = this.createElement('div');
        
        const classes = [
            'ui-grid',
            `ui-grid--gap-${this.props.gap}`,
            `ui-grid--align-${this.props.align}`,
            `ui-grid--justify-${this.props.justify}`
        ];
        
        if (this.props.responsive) classes.push('ui-grid--responsive');
        
        grid.className = classes.join(' ') + (this.props.className ? ` ${this.props.className}` : '');
        
        // Set CSS custom property for columns
        grid.style.setProperty('--ui-grid-columns', this.props.columns);

        // Add children
        this.children.forEach(child => {
            if (typeof child === 'string') {
                grid.appendChild(document.createTextNode(child));
            } else {
                grid.appendChild(child);
            }
        });

        return grid;
    }

    setColumns(columns) {
        this.props.columns = columns;
        if (this.element) {
            this.element.style.setProperty('--ui-grid-columns', columns);
        }
        return this;
    }
}

// Grid Item Component
class GridItemComponent extends UIComponent {
    constructor(props = {}, children = []) {
        super(props, children);
    }

    getDefaultProps() {
        return {
            ...super.getDefaultProps(),
            span: 1,
            spanSm: null,
            spanMd: null,
            spanLg: null,
            spanXl: null,
            offset: 0,
            offsetSm: null,
            offsetMd: null,
            offsetLg: null,
            offsetXl: null,
            order: null,
            orderSm: null,
            orderMd: null,
            orderLg: null,
            orderXl: null
        };
    }

    render() {
        const item = this.createElement('div');
        
        const classes = ['ui-grid-item'];
        
        // Add span classes
        if (this.props.span) classes.push(`ui-grid-item--span-${this.props.span}`);
        if (this.props.spanSm) classes.push(`ui-grid-item--span-sm-${this.props.spanSm}`);
        if (this.props.spanMd) classes.push(`ui-grid-item--span-md-${this.props.spanMd}`);
        if (this.props.spanLg) classes.push(`ui-grid-item--span-lg-${this.props.spanLg}`);
        if (this.props.spanXl) classes.push(`ui-grid-item--span-xl-${this.props.spanXl}`);
        
        // Add offset classes
        if (this.props.offset) classes.push(`ui-grid-item--offset-${this.props.offset}`);
        if (this.props.offsetSm) classes.push(`ui-grid-item--offset-sm-${this.props.offsetSm}`);
        if (this.props.offsetMd) classes.push(`ui-grid-item--offset-md-${this.props.offsetMd}`);
        if (this.props.offsetLg) classes.push(`ui-grid-item--offset-lg-${this.props.offsetLg}`);
        if (this.props.offsetXl) classes.push(`ui-grid-item--offset-xl-${this.props.offsetXl}`);
        
        // Add order classes
        if (this.props.order !== null) classes.push(`ui-grid-item--order-${this.props.order}`);
        if (this.props.orderSm !== null) classes.push(`ui-grid-item--order-sm-${this.props.orderSm}`);
        if (this.props.orderMd !== null) classes.push(`ui-grid-item--order-md-${this.props.orderMd}`);
        if (this.props.orderLg !== null) classes.push(`ui-grid-item--order-lg-${this.props.orderLg}`);
        if (this.props.orderXl !== null) classes.push(`ui-grid-item--order-xl-${this.props.orderXl}`);
        
        item.className = classes.join(' ') + (this.props.className ? ` ${this.props.className}` : '');

        // Add children
        this.children.forEach(child => {
            if (typeof child === 'string') {
                item.appendChild(document.createTextNode(child));
            } else {
                item.appendChild(child);
            }
        });

        return item;
    }
}

// Flex Component
class FlexComponent extends UIComponent {
    constructor(props = {}, children = []) {
        super(props, children);
    }

    getDefaultProps() {
        return {
            ...super.getDefaultProps(),
            direction: 'row', // row, column, row-reverse, column-reverse
            wrap: 'nowrap', // nowrap, wrap, wrap-reverse
            justify: 'start', // start, center, end, space-between, space-around, space-evenly
            align: 'stretch', // start, center, end, stretch, baseline
            gap: 'md', // none, xs, sm, md, lg, xl
            inline: false
        };
    }

    render() {
        const flex = this.createElement('div');
        
        const classes = [
            this.props.inline ? 'ui-flex-inline' : 'ui-flex',
            `ui-flex--direction-${this.props.direction}`,
            `ui-flex--wrap-${this.props.wrap}`,
            `ui-flex--justify-${this.props.justify}`,
            `ui-flex--align-${this.props.align}`,
            `ui-flex--gap-${this.props.gap}`
        ];
        
        flex.className = classes.join(' ') + (this.props.className ? ` ${this.props.className}` : '');

        // Add children
        this.children.forEach(child => {
            if (typeof child === 'string') {
                flex.appendChild(document.createTextNode(child));
            } else {
                flex.appendChild(child);
            }
        });

        return flex;
    }
}

// Flex Item Component
class FlexItemComponent extends UIComponent {
    constructor(props = {}, children = []) {
        super(props, children);
    }

    getDefaultProps() {
        return {
            ...super.getDefaultProps(),
            grow: null, // number or null
            shrink: null, // number or null
            basis: null, // auto, content, or size value
            align: null, // auto, start, center, end, stretch, baseline
            order: null // number or null
        };
    }

    render() {
        const item = this.createElement('div');
        
        const classes = ['ui-flex-item'];
        
        if (this.props.grow !== null) classes.push(`ui-flex-item--grow-${this.props.grow}`);
        if (this.props.shrink !== null) classes.push(`ui-flex-item--shrink-${this.props.shrink}`);
        if (this.props.align) classes.push(`ui-flex-item--align-${this.props.align}`);
        if (this.props.order !== null) classes.push(`ui-flex-item--order-${this.props.order}`);
        
        item.className = classes.join(' ') + (this.props.className ? ` ${this.props.className}` : '');

        // Set flex-basis if specified
        if (this.props.basis) {
            item.style.flexBasis = this.props.basis;
        }

        // Add children
        this.children.forEach(child => {
            if (typeof child === 'string') {
                item.appendChild(document.createTextNode(child));
            } else {
                item.appendChild(child);
            }
        });

        return item;
    }
}

// Stack Component (Vertical Flex)
class StackComponent extends FlexComponent {
    constructor(props = {}, children = []) {
        super({ ...props, direction: 'column' }, children);
    }
}

// HStack Component (Horizontal Flex)
class HStackComponent extends FlexComponent {
    constructor(props = {}, children = []) {
        super({ ...props, direction: 'row' }, children);
    }
}

// Spacer Component
class SpacerComponent extends UIComponent {
    constructor(props = {}) {
        super(props, []);
    }

    getDefaultProps() {
        return {
            ...super.getDefaultProps(),
            size: 'md', // xs, sm, md, lg, xl, or custom value
            direction: 'both' // horizontal, vertical, both
        };
    }

    render() {
        const spacer = this.createElement('div');
        
        const classes = [
            'ui-spacer',
            `ui-spacer--${this.props.direction}`
        ];
        
        // Handle size
        if (['xs', 'sm', 'md', 'lg', 'xl'].includes(this.props.size)) {
            classes.push(`ui-spacer--${this.props.size}`);
        } else {
            // Custom size
            spacer.style.setProperty('--ui-spacer-size', this.props.size);
            classes.push('ui-spacer--custom');
        }
        
        spacer.className = classes.join(' ') + (this.props.className ? ` ${this.props.className}` : '');

        return spacer;
    }
}

// Divider Component
class DividerComponent extends UIComponent {
    constructor(props = {}, children = []) {
        super(props, children);
    }

    getDefaultProps() {
        return {
            ...super.getDefaultProps(),
            orientation: 'horizontal', // horizontal, vertical
            variant: 'solid', // solid, dashed, dotted
            color: 'default', // default, light, dark, or custom
            spacing: 'md', // xs, sm, md, lg, xl
            label: null
        };
    }

    render() {
        const divider = this.createElement('div');
        
        const classes = [
            'ui-divider',
            `ui-divider--${this.props.orientation}`,
            `ui-divider--${this.props.variant}`,
            `ui-divider--color-${this.props.color}`,
            `ui-divider--spacing-${this.props.spacing}`
        ];
        
        if (this.props.label) classes.push('ui-divider--labeled');
        
        divider.className = classes.join(' ') + (this.props.className ? ` ${this.props.className}` : '');

        // Add label if provided
        if (this.props.label) {
            const label = document.createElement('span');
            label.className = 'ui-divider__label';
            label.textContent = this.props.label;
            divider.appendChild(label);
        }

        return divider;
    }
}

// Center Component
class CenterComponent extends UIComponent {
    constructor(props = {}, children = []) {
        super(props, children);
    }

    getDefaultProps() {
        return {
            ...super.getDefaultProps(),
            inline: false
        };
    }

    render() {
        const center = this.createElement('div');
        
        const classes = [
            this.props.inline ? 'ui-center-inline' : 'ui-center'
        ];
        
        center.className = classes.join(' ') + (this.props.className ? ` ${this.props.className}` : '');

        // Add children
        this.children.forEach(child => {
            if (typeof child === 'string') {
                center.appendChild(document.createTextNode(child));
            } else {
                center.appendChild(child);
            }
        });

        return center;
    }
}

// Register components with UI framework
if (window.UI) {
    window.UI.registerComponent('Container', ContainerComponent);
    window.UI.registerComponent('Grid', GridComponent);
    window.UI.registerComponent('GridItem', GridItemComponent);
    window.UI.registerComponent('Flex', FlexComponent);
    window.UI.registerComponent('FlexItem', FlexItemComponent);
    window.UI.registerComponent('Stack', StackComponent);
    window.UI.registerComponent('HStack', HStackComponent);
    window.UI.registerComponent('Spacer', SpacerComponent);
    window.UI.registerComponent('Divider', DividerComponent);
    window.UI.registerComponent('Center', CenterComponent);
}

// Export components
window.ContainerComponent = ContainerComponent;
window.GridComponent = GridComponent;
window.GridItemComponent = GridItemComponent;
window.FlexComponent = FlexComponent;
window.FlexItemComponent = FlexItemComponent;
window.StackComponent = StackComponent;
window.HStackComponent = HStackComponent;
window.SpacerComponent = SpacerComponent;
window.DividerComponent = DividerComponent;
window.CenterComponent = CenterComponent;
