(function(){
  if (!window.UI || !window.UI.createComponent) return;

  function toBool(val) {
    if (val === '' || val === true) return true;
    if (val === undefined || val === null) return false;
    const s = String(val).toLowerCase();
    return s === 'true' || s === '1' || s === 'yes';
  }

  function migrateButton(el) {
    try {
      // Gather props from data- attributes and existing classes
      const props = {};
      const dataset = el.dataset || {};

      // Map common props
      props.variant = dataset.variant || (el.classList.contains('btn-secondary') ? 'secondary' : el.classList.contains('btn-danger') ? 'danger' : el.classList.contains('btn-success') ? 'success' : el.classList.contains('btn-warning') ? 'warning' : el.classList.contains('btn-export') ? 'info' : 'primary');
      props.size = dataset.size || (el.classList.contains('btn-sm') ? 'sm' : el.classList.contains('btn-lg') ? 'lg' : 'md');
      props.type = el.getAttribute('type') || 'button';
      props.loading = toBool(dataset.loading);
      props.icon = dataset.icon || null;
      props.iconPosition = dataset.iconPosition || 'left';
      props.fullWidth = toBool(dataset.fullWidth);
      props.className = el.className; // preserve any extra classes
      props.ariaLabel = el.getAttribute('aria-label') || undefined;
      props.disabled = el.disabled;
      props.id = el.id || undefined;

      // Children: prefer text content
      const label = (dataset.label || el.textContent || '').trim();
      const children = label ? [label] : [];

      // Create component
      const btn = UI.createComponent('Button', props, children);
      btn.mount();

      // Preserve inline onclick or event listeners
      const inlineOnClick = el.getAttribute('onclick');
      if (inlineOnClick) {
        // eslint-disable-next-line no-new-func
        const handler = new Function(inlineOnClick);
        btn.addEventListener('this', 'click', handler);
      } else if (typeof el.onclick === 'function') {
        btn.addEventListener('this', 'click', el.onclick);
      }

      // Move dataset attributes that aren't UI props as data-* for consumers
      Array.from(el.attributes).forEach(attr => {
        if (/^data-/.test(attr.name)) {
          const name = attr.name;
          const value = attr.value;
          if (!['data-ui-button','data-variant','data-size','data-icon','data-icon-position','data-full-width','data-loading','data-label'].includes(name)) {
            btn.element.setAttribute(name, value);
          }
        }
      });

      // Replace in DOM
      el.parentNode.replaceChild(btn.element, el);

      // Return the new element for callers that need to wire extra behavior
      return btn.element;
    } catch (e) {
      console.warn('Button migration failed for element', el, e);
      return null;
    }
  }

  function migrateAll() {
    const candidates = document.querySelectorAll('button[data-ui-button], a.button[data-ui-button], label[data-ui-button]');
    candidates.forEach((el) => {
      // Special handling: if migrating a label "for" a file input, preserve click behavior
      const isLabel = el.tagName === 'LABEL';
      const htmlFor = isLabel ? el.getAttribute('for') : null;
      const fileInput = htmlFor ? document.getElementById(htmlFor) : null;

      const newEl = migrateButton(el);

      if (isLabel && fileInput && newEl) {
        newEl.addEventListener('click', () => fileInput.click());
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', migrateAll);
  } else {
    migrateAll();
  }
})();
