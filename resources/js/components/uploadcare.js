export default function uploadcareField(config) {
    console.log('uploadcareField function called');
    
    // Create a static Set to track initialized contexts
    if (!window._initializedUploadcareContexts) {
        window._initializedUploadcareContexts = new Set();
    }

    return {
        state: config.state,
        statePath: config.statePath,
        initialState: config.initialState,
        publicKey: config.publicKey,
        isMultiple: config.isMultiple,
        multipleMin: config.multipleMin,
        multipleMax: config.multipleMax,
        isImagesOnly: config.isImagesOnly,
        accept: config.accept,
        sourceList: config.sourceList,
        uploaderStyle: config.uploaderStyle,
        uploadedFiles: '',
        ctx: null,
        removeEventListeners: null,
        uniqueContextName: config.uniqueContextName,
        isInitialized: false,

        init() {
            console.log('Alpine init called for context:', this.uniqueContextName);
            
            // Check if this context was already initialized
            if (window._initializedUploadcareContexts.has(this.uniqueContextName)) {
                console.log('Context already initialized, skipping:', this.uniqueContextName);
                return;
            }

            // Mark this context as initialized
            window._initializedUploadcareContexts.add(this.uniqueContextName);

            // Apply theme handler
            this.applyTheme();
            
            // Initialize uploadcare
            this.initUploadcare();
            
            // Set up observers for theme changes
            this.setupThemeObservers();
        },

        applyTheme() {
            const userTheme = localStorage.getItem('theme');
            const theme = userTheme === 'system' ?
                (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') :
                userTheme;

            const uploaders = document.querySelectorAll('uc-file-uploader-inline');
            uploaders.forEach(uploader => uploader.classList.add(`uc-${theme}`));
        },
        
        setupThemeObservers() {
            // Check for theme changes
            window.addEventListener('storage', (event) => {
                if (event.key === 'theme') {
                    this.applyTheme();
                }
            });
            
            // Also watch for media query changes if using system theme
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', () => {
                if (localStorage.getItem('theme') === 'system') {
                    this.applyTheme();
                }
            });
        },
        
        initUploadcare() {
            console.log('initUploadcare called');
            if (this.removeEventListeners) {
                this.removeEventListeners();
            }

            const initializeUploader = (retryCount = 0, maxRetries = 10) => {
                console.log(`Attempt ${retryCount + 1} of ${maxRetries}`);
                if (retryCount >= maxRetries) {
                    console.error('Failed to initialize Uploadcare after maximum retries');
                    return;
                }

                this.ctx = document.querySelector(`uc-upload-ctx-provider[ctx-name="${this.uniqueContextName}"]`);

                // Check if this context already has files initialized
                try {
                    const existingApi = this.ctx?.getAPI();
                    if (existingApi?.getFiles()?.length > 0) {
                        console.log('Files already initialized for this context, skipping...');
                        return;
                    }
                } catch (e) {
                    // If we can't access the API yet, continue with initialization
                }

                console.log('initializeUploader');
                // Try to get the API
                let api;
                try {
                    api = this.ctx?.getAPI();

                    // Test if the API is actually ready
                    if (!api || !api.addFileFromCdnUrl) {
                        setTimeout(() => initializeUploader(retryCount + 1, maxRetries), 100);
                        return;
                    }
                } catch (e) {
                    setTimeout(() => initializeUploader(retryCount + 1, maxRetries), 100);
                    return;
                }

                if (!this.ctx || !api) {
                    return;
                }

                // Mark as initialized before proceeding
                this.isInitialized = true;

                // Remove required attribute from any input within uc-form-input
                setTimeout(() => {
                    const inputs = document.querySelectorAll('uc-form-input input[required]');
                    inputs.forEach(input => {
                        input.removeAttribute('required');
                    });
                }, 100);
                
                // Initialize with existing state if available
                console.log('initialState', this.initialState);
                if (this.initialState) {
                    try {
                        const parsedState = typeof this.initialState === 'string' ? 
                            JSON.parse(this.initialState) : this.initialState;
                        
                        console.log('parsedState', parsedState);
                        if (Array.isArray(parsedState)) {
                            if (parsedState.length === 1) {
                                console.log('single item 1');
                                // Handle single-item array like a single item (because of the 'too many files' error)
                                const item = parsedState[0];
                                const url = typeof item === 'object' ? item.cdnUrl : item;
                                api.addFileFromCdnUrl(url);
                            } else {
                                console.log('multiple items');
                                // Handle multiple items as before
                                parsedState.forEach(item => {
                                    const url = typeof item === 'object' ? item.cdnUrl : item;
                                    api.addFileFromCdnUrl(url);
                                });
                            }
                        } else {
                            console.log('single item 2');
                            const url = typeof parsedState === 'object' ? parsedState.cdnUrl : parsedState;
                            api.addFileFromCdnUrl(url);
                        }

                        this.uploadedFiles = JSON.stringify(parsedState);
                    } catch (e) {
                        console.error('Error parsing initialState:', e);
                    }
                }

                // Set up event listeners
                const handleFileUploadSuccess = (e) => {
                    const fileData = e.detail.cdnUrl;
                    const currentFiles = this.uploadedFiles ? JSON.parse(this.uploadedFiles) : [];
                    
                    currentFiles.push(fileData);
                    this.state = JSON.stringify(currentFiles);
                };

                const handleFileUrlChanged = (e) => {
                    const fileDetails = e.detail;
                    if (fileDetails.cdnUrlModifiers && fileDetails.cdnUrlModifiers !== "") {
                        const currentFiles = this.uploadedFiles ? JSON.parse(this.uploadedFiles) : [];
                        
                        const findFile = (files, uuid) => {
                            return files.findIndex(file => {
                                const fileUrl = typeof file === 'object' ? file.cdnUrl : file;
                                return fileUrl.includes(uuid);
                            });
                        };
                        
                        const fileIndex = findFile(currentFiles, fileDetails.uuid);
                        
                        if (fileIndex > -1) {
                            currentFiles[fileIndex] = fileDetails.cdnUrl;
                        }
                        
                        this.state = JSON.stringify(currentFiles);
                    }
                };

                const handleFileRemoved = (e) => {
                    const fileData = e.detail.cdnUrl;
                    const currentFiles = this.uploadedFiles ? JSON.parse(this.uploadedFiles) : [];
                    
                    const findFile = (files, fileToRemove) => {
                        return files.findIndex(file => {
                            const fileUrl = typeof file === 'object' ? file.cdnUrl : file;
                            const removeUrl = typeof fileToRemove === 'object' ? fileToRemove.cdnUrl : fileToRemove;
                            return fileUrl === removeUrl;
                        });
                    };
                    
                    const index = findFile(currentFiles, fileData);
                    if (index > -1) {
                        currentFiles.splice(index, 1);
                    }
                    
                    this.state = JSON.stringify(currentFiles);
                };

                // Add event listeners
                this.ctx.addEventListener('file-upload-success', handleFileUploadSuccess);
                this.ctx.addEventListener('file-url-changed', handleFileUrlChanged);
                this.ctx.addEventListener('file-removed', handleFileRemoved);

                // Store cleanup function
                this.removeEventListeners = () => {
                    this.ctx.removeEventListener('file-upload-success', handleFileUploadSuccess);
                    this.ctx.removeEventListener('file-url-changed', handleFileUrlChanged);
                    this.ctx.removeEventListener('file-removed', handleFileRemoved);
                };
            };

            // Start initialization
            initializeUploader();
        }
    };
}