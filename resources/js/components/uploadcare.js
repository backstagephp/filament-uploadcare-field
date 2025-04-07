export default function uploadcareField(config) {
    
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
        isWithMetadata: config.isWithMetadata,
        uploadedFiles: '',
        ctx: null,
        removeEventListeners: null,
        uniqueContextName: config.uniqueContextName,
        isInitialized: false,
        stateHasBeenInitialized: false,
        isStateWatcherActive: false,

        init() {            
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
            if (this.removeEventListeners) {
                this.removeEventListeners();
            }

            const initializeUploader = (retryCount = 0, maxRetries = 10) => {
                if (retryCount >= maxRetries) {
                    console.error('Failed to initialize Uploadcare after maximum retries');
                    return;
                }

                this.ctx = document.querySelector(`uc-upload-ctx-provider[ctx-name="${this.uniqueContextName}"]`);

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
                if (this.initialState && !this.stateHasBeenInitialized) {
                    try {
                        const parsedState = typeof this.initialState === 'string' ? 
                            JSON.parse(this.initialState) : this.initialState;
                        
                        if (Array.isArray(parsedState)) {
                            parsedState.forEach(item => {
                                const url = typeof item === 'object' ? item.cdnUrl : item;
                                api.addFileFromCdnUrl(url);
                            });
                        } else if (parsedState) {
                            const url = typeof parsedState === 'object' ? parsedState.cdnUrl : parsedState;
                            if (url) api.addFileFromCdnUrl(url);
                        }

                        this.uploadedFiles = this.initialState && typeof this.initialState === 'string' ? 
                            this.initialState : JSON.stringify(parsedState);
                        this.stateHasBeenInitialized = true;
                    } catch (e) {
                        console.error('Error parsing initialState:', e);
                    }
                }

                // Setup watch for state only after initialization is complete
                if (!this.isStateWatcherActive) {
                    this.$watch('state', (newValue, oldValue) => {
                        // Don't do anything if values are the same or watcher is triggering on init
                        if (newValue === oldValue || (oldValue === undefined && this.initialState)) {
                            return;
                        }
                        
                        // Ignore when the state change is from this component
                        if (newValue === this.uploadedFiles) {
                            return;
                        }
                        
                        // Only update when we have a value change that's different from our current state
                        try {
                            // We don't sync anything from external state changes after initial load
                            // This prevents cross-field contamination
                            console.log('External state change detected, but ignoring to prevent cross-field contamination');
                        } catch (e) {
                            console.error('Error in state watcher:', e);
                        }
                    });
                    
                    this.isStateWatcherActive = true;
                }

                // Set up event listeners
                const handleFileUploadSuccess = (e) => {
                    const fileData = this.isWithMetadata ? e.detail : e.detail.cdnUrl;
                    
                    try {
                        const currentFiles = this.uploadedFiles ? JSON.parse(this.uploadedFiles) : [];
                        
                        // Add the new file data to the collection
                        if (this.isMultiple) {
                            currentFiles.push(fileData);
                            this.uploadedFiles = JSON.stringify(currentFiles);
                        } else {
                            this.uploadedFiles = JSON.stringify([fileData]);
                        }
                        
                        this.state = this.uploadedFiles;
                    } catch (error) {
                        console.error('Error updating state after upload:', error);
                    }
                };

                const handleFileUrlChanged = (e) => {
                    const fileDetails = e.detail;
                    if (fileDetails.cdnUrlModifiers && fileDetails.cdnUrlModifiers !== "") {
                        try {
                            const currentFiles = this.uploadedFiles ? JSON.parse(this.uploadedFiles) : [];
                            
                            // Find and update the file with the matching UUID
                            const findFile = (files, uuid) => {
                                return files.findIndex(file => {
                                    const fileUrl = typeof file === 'object' ? file.cdnUrl : file;
                                    return fileUrl.includes(uuid);
                                });
                            };
                            
                            const fileIndex = findFile(currentFiles, fileDetails.uuid);
                            
                            if (fileIndex > -1) {
                                if (this.isMultiple) {
                                    currentFiles[fileIndex] = this.isWithMetadata ? fileDetails : fileDetails.cdnUrl;
                                    this.uploadedFiles = JSON.stringify(currentFiles);
                                } else {
                                    this.uploadedFiles = JSON.stringify([this.isWithMetadata ? fileDetails : fileDetails.cdnUrl]);
                                }
                                
                                this.state = this.uploadedFiles;
                            }
                        } catch (error) {
                            console.error('Error updating state after URL change:', error);
                        }
                    }
                };

                const handleFileRemoved = (e) => {
                    try {
                        const removedFile = e.detail;
                        const currentFiles = this.uploadedFiles ? JSON.parse(this.uploadedFiles) : [];
                        
                        // Find and remove the file that was deleted
                        const findFile = (files, fileToRemove) => {
                            return files.findIndex(file => {
                                const fileUrl = typeof file === 'object' ? file.cdnUrl : file;
                                const removeUrl = typeof fileToRemove === 'object' ? fileToRemove.cdnUrl : fileToRemove;
                                return fileUrl === removeUrl;
                            });
                        };
                        
                        const index = findFile(currentFiles, removedFile);
                        if (index > -1) {
                            if (this.isMultiple) {
                                currentFiles.splice(index, 1);
                                this.uploadedFiles = JSON.stringify(currentFiles);
                            } else {
                                this.uploadedFiles = JSON.stringify([]);
                            }
                            
                            this.state = this.uploadedFiles;
                        }
                    } catch (error) {
                        console.error('Error updating state after file removal:', error);
                    }
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