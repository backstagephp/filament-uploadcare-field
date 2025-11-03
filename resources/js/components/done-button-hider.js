export class DoneButtonHider {
    constructor(wrapper) {
        this.wrapper = wrapper;
        this.observer = null;
        this.init();
    }

    init() {
        // Hide any existing Done buttons
        this.hideDoneButtons();
        
        // Set up a mutation observer to hide Done buttons as they're added
        this.setupObserver();
    }

    setupObserver() {
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if the added node is a Done button
                            if (node.classList && node.classList.contains('uc-done-btn')) {
                                this.hideDoneButton(node);
                            }
                            // Check if the added node contains Done buttons
                            const doneButtons = node.querySelectorAll && node.querySelectorAll('.uc-done-btn');
                            if (doneButtons) {
                                doneButtons.forEach(button => this.hideDoneButton(button));
                            }
                        }
                    });
                }
            });
        });
        
        // Start observing the uploadcare wrapper
        if (this.wrapper) {
            this.observer.observe(this.wrapper, {
                childList: true,
                subtree: true
            });
        }
    }

    hideDoneButtons() {
        const doneButtons = document.querySelectorAll('.uc-done-btn');
        doneButtons.forEach(button => this.hideDoneButton(button));
    }

    hideDoneButton(button) {
        if (button) {
            button.style.display = 'none';
            button.style.visibility = 'hidden';
            button.style.opacity = '0';
            button.style.pointerEvents = 'none';
            button.style.position = 'absolute';
            button.style.width = '0';
            button.style.height = '0';
            button.style.overflow = 'hidden';
            button.style.clip = 'rect(0, 0, 0, 0)';
            button.style.margin = '0';
            button.style.padding = '0';
            button.style.border = '0';
            button.style.background = 'transparent';
            button.style.color = 'transparent';
            button.style.fontSize = '0';
            button.style.lineHeight = '0';
        }
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}
