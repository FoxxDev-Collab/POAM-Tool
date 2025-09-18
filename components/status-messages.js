class StatusMessages {
    constructor() {
        this.container = null;
        this.activeMessages = new Map();
        this.messageCounter = 0;
    }

    init() {
        // Create a dedicated toast container
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        }
        
        console.log('StatusMessages initialized');
    }

    showLoading(text, id = null) {
        return this.showMessage(text, 'loading', 0, id);
    }

    showSuccess(text, duration = 3000, id = null) {
        return this.showMessage(text, 'success', duration, id);
    }

    showError(text, duration = 5000, id = null) {
        return this.showMessage(text, 'error', duration, id);
    }

    showInfo(text, duration = 3000, id = null) {
        return this.showMessage(text, 'info', duration, id);
    }

    showMessage(text, type = 'info', duration = 3000, id = null) {
        // Generate unique ID if not provided
        const messageId = id || `msg-${++this.messageCounter}`;
        
        // Remove existing message with same ID
        this.hideMessage(messageId);
        
        // Create message element
        const messageEl = this.createMessageElement(text, type, messageId);
        
        // Store message reference
        this.activeMessages.set(messageId, {
            element: messageEl,
            type,
            timeout: null
        });
        
        // Add to DOM
        if (this.container) {
            this.container.prepend(messageEl);
        }
        
        // Set auto-dismiss timeout if duration specified
        if (duration > 0) {
            const timeout = setTimeout(() => {
                this.hideMessage(messageId);
            }, duration);
            
            this.activeMessages.get(messageId).timeout = timeout;
        }
        
        // Dispatch message event
        document.dispatchEvent(new CustomEvent('statusMessage', {
            detail: { id: messageId, text, type, duration }
        }));
        
        return messageId;
    }

    createMessageElement(text, type, id) {
        const messageEl = document.createElement('div');
        messageEl.id = `status-message-${id}`;
        messageEl.className = `status-message ${type}`;
        messageEl.setAttribute('data-message-id', id);
        
        // Add icon based on type
        const icon = this.getIconForType(type);
        
        const content = document.createElement('div');
        content.className = 'status-message-content';

        if (icon && window.Icons) {
            const iconEl = window.Icons.create(icon, { size: 20, className: 'status-message-icon' });
            if (iconEl) {
                if (type === 'loading') {
                    iconEl.classList.add('spin');
                }
                content.appendChild(iconEl);
            }
        }

        const textEl = document.createElement('span');
        textEl.className = 'status-message-text';
        textEl.textContent = text;
        content.appendChild(textEl);

        if (type !== 'loading') {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'status-message-close';
            closeBtn.setAttribute('aria-label', 'Close');
            closeBtn.innerHTML = '&times;';
            content.appendChild(closeBtn);
        }

        messageEl.appendChild(content);
        
        // Add close button functionality
        const closeBtn = messageEl.querySelector('.status-message-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideMessage(id));
        }
        
        // Add animation classes
        messageEl.style.opacity = '0';
        messageEl.style.transform = 'translateY(-20px)';
        
        // Trigger animation
        requestAnimationFrame(() => {
            messageEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            messageEl.style.opacity = '1';
            messageEl.style.transform = 'translateY(0)';
        });
        
        return messageEl;
    }

    hideMessage(messageId) {
        const message = this.activeMessages.get(messageId);
        if (!message) return;
        
        // Clear timeout
        if (message.timeout) {
            clearTimeout(message.timeout);
        }
        
        // Animate out
        const element = message.element;
        if (element && element.parentNode) {
            element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            element.style.opacity = '0';
            element.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }, 300);
        }
        
        // Remove from active messages
        this.activeMessages.delete(messageId);
        
        // Dispatch hide event
        document.dispatchEvent(new CustomEvent('statusMessageHidden', {
            detail: { id: messageId }
        }));
    }

    hideAllMessages() {
        const messageIds = Array.from(this.activeMessages.keys());
        messageIds.forEach(id => this.hideMessage(id));
    }

    hideMessagesByType(type) {
        const messageIds = Array.from(this.activeMessages.entries())
            .filter(([id, message]) => message.type === type)
            .map(([id]) => id);
        
        messageIds.forEach(id => this.hideMessage(id));
    }

    getIconForType(type) {
        const icons = {
            loading: 'loader',
            success: 'check-circle',
            error: 'alert-circle',
            info: 'info'
        };
        
        return icons[type] || null;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Convenience methods for common patterns
    updateLoadingMessage(messageId, newText) {
        const message = this.activeMessages.get(messageId);
        if (message && message.type === 'loading') {
            const textEl = message.element.querySelector('.status-message-text');
            if (textEl) {
                textEl.textContent = newText;
            }
        }
    }

    convertLoadingToSuccess(messageId, successText, duration = 3000) {
        this.hideMessage(messageId);
        return this.showSuccess(successText, duration, messageId);
    }

    convertLoadingToError(messageId, errorText, duration = 5000) {
        this.hideMessage(messageId);
        return this.showError(errorText, duration, messageId);
    }

    // Get active message count
    getActiveMessageCount() {
        return this.activeMessages.size;
    }

    // Check if specific message is active
    isMessageActive(messageId) {
        return this.activeMessages.has(messageId);
    }
}

// Make available globally
window.StatusMessages = StatusMessages;
