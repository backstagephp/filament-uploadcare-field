export default function uploadcareField(config) {
    
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
        isWithMetadata: config.isWithMetadata,
        uploadedFiles: '',
        ctx: null,
        removeEventListeners: null,
        uniqueContextName: config.uniqueContextName,
        isInitialized: false,
        stateHasBeenInitialized: false,
        isStateWatcherActive: false,
        isLocalUpdate: false,

        init() {            
            // Check if this context was already initialized
            if (window._initializedUploadcareContexts.has(this.uniqueContextName)) {
                console.log('Context already initialized, skipping..');
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
                this.$nextTick(() => {
                    if (this.initialState && !this.stateHasBeenInitialized) {
                        try {
                            const parsedState = typeof this.initialState === 'string' ? 
                                JSON.parse(this.initialState) : this.initialState;
                            
                            if (Array.isArray(parsedState)) {
                                parsedState.forEach(item => {
                                    if (item) {
                                        const url = typeof item === 'object' ? item.cdnUrl : item;
                                        api.addFileFromCdnUrl(url);
                                    }
                                });
                            } else if (parsedState) {
                                const url = typeof parsedState === 'object' ? parsedState.cdnUrl : parsedState;
                                if (url) {
                                    api.addFileFromCdnUrl(url);
                                }
                            }

                            this.uploadedFiles = typeof this.initialState === 'string' ? 
                                this.initialState : JSON.stringify(parsedState);
                            this.stateHasBeenInitialized = true;
                        } catch (e) {
                            console.error('Error parsing initialState:', e);
                        }
                    }
                    
                    // Set up the state watcher after initial state is loaded
                    this.$watch('state', (newValue) => {
                        if (this.isLocalUpdate) {
                            this.isLocalUpdate = false;
                            return;
                        }
                        
                        if (!this.stateHasBeenInitialized) {
                            this.stateHasBeenInitialized = true;
                            return;
                        }
                        
                        // If this is an external update (not from this field), ignore it
                        if (newValue !== this.uploadedFiles) {
                            console.log('External state change detected, ignoring to prevent cross-field contamination');
                        }
                    });
                });

                // Set up event listeners
                const handleFileUploadSuccess = (e) => {
                    const fileData = this.isWithMetadata ? e.detail : e.detail.cdnUrl;
                    try {
                        let currentFiles = [];
                        
                        try {
                            currentFiles = this.uploadedFiles ? JSON.parse(this.uploadedFiles) : [];
                            if (!Array.isArray(currentFiles)) {
                                currentFiles = [];
                            }
                        } catch (parseError) {
                            currentFiles = [];
                        }
                        
                        // Add the new file data to the collection
                        if (this.isMultiple) {
                            currentFiles.push(fileData);
                        } else {
                            currentFiles = [fileData];
                        }
                        
                        this.uploadedFiles = JSON.stringify(currentFiles);
                        this.isLocalUpdate = true;
                        this.state = this.uploadedFiles;
                    } catch (error) {
                        console.error('Error updating state after upload:', error);
                    }
                };

                const handleFileUrlChanged = (e) => {
                    const fileDetails = e.detail;
                    if (fileDetails.cdnUrlModifiers && fileDetails.cdnUrlModifiers !== "") {
                        try {
                            let currentFiles = [];
                            
                            try {
                                currentFiles = this.uploadedFiles ? JSON.parse(this.uploadedFiles) : [];
                                if (!Array.isArray(currentFiles)) {
                                    currentFiles = [];
                                }
                            } catch (parseError) {
                                currentFiles = [];
                            }
                            
                            // Find and update the file with the matching UUID
                            const findFile = (files, uuid) => {
                                return files.findIndex(file => {
                                    const fileUrl = typeof file === 'object' ? file.cdnUrl : file;
                                    return fileUrl && fileUrl.includes(uuid);
                                });
                            };
                            
                            const fileIndex = findFile(currentFiles, fileDetails.uuid);
                            
                            if (fileIndex > -1) {
                                if (this.isMultiple) {
                                    currentFiles[fileIndex] = this.isWithMetadata ? fileDetails : fileDetails.cdnUrl;
                                } else {
                                    currentFiles = [this.isWithMetadata ? fileDetails : fileDetails.cdnUrl];
                                }
                                
                                this.uploadedFiles = JSON.stringify(currentFiles);
                                this.isLocalUpdate = true;
                                this.state = this.uploadedFiles;
                            }
                        } catch (error) {
                            console.error('Error updating state after URL change:', error);
                        }
                    }
                };

                const handleFileRemoved = (e) => {
                    console.log('handleFileRemoved triggered');
                    try {
                        const removedFile = e.detail;
                        console.log('Removed file details:', removedFile);
                        let currentFiles = [];
                        
                        try {
                            currentFiles = this.uploadedFiles ? JSON.parse(this.uploadedFiles) : [];
                            console.log('Current files before cleanup:', currentFiles);
                            
                            // First, clean up duplicate entries
                            const uniqueFiles = new Map();
                            
                            currentFiles.forEach(file => {
                                let uuid;
                                if (typeof file === 'string') {
                                    uuid = file.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i)?.[0];
                                    if (uuid) {
                                        // Only add string URL if we don't have the full object yet
                                        if (!uniqueFiles.has(uuid)) {
                                            uniqueFiles.set(uuid, file);
                                        }
                                    }
                                } else {
                                    uuid = file.uuid;
                                    if (uuid) {
                                        // Always prefer the full object over string URL
                                        uniqueFiles.set(uuid, file);
                                    }
                                }
                            });
                            
                            currentFiles = Array.from(uniqueFiles.values());
                            console.log('Current files after cleanup:', currentFiles);
                            
                            // Find and remove the file that was deleted
                            const findFile = (files, fileToRemove) => {
                                console.log('Finding file to remove:', fileToRemove);
                                return files.findIndex(file => {
                                    if (typeof file === 'string') {
                                        return file === fileToRemove.cdnUrl;
                                    } else {
                                        return file.uuid === fileToRemove.uuid;
                                    }
                                });
                            };
                            
                            const index = findFile(currentFiles, removedFile);
                            console.log('Found index to remove:', index);
                            
                            if (index > -1) {
                                if (this.isMultiple) {
                                    currentFiles.splice(index, 1);
                                } else {
                                    currentFiles = [];
                                }
                                
                                console.log('Current files after removal:', currentFiles);
                                
                                // Convert back to the appropriate format based on isWithMetadata
                                const finalFiles = currentFiles.map(file => {
                                    if (this.isWithMetadata) {
                                        if (typeof file === 'string') {
                                            return {
                                                uuid: file.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i)?.[0],
                                                cdnUrl: file,
                                                isImage: true,
                                                mimeType: 'image/png'
                                            };
                                        }
                                        return file;
                                    }
                                    return typeof file === 'object' ? file.cdnUrl : file;
                                });
                                
                                this.uploadedFiles = JSON.stringify(finalFiles);
                                this.isLocalUpdate = true;
                                this.state = this.uploadedFiles;
                                console.log('Final state:', this.state);
                            } else {
                                console.log('No matching file found to remove');
                            }
                        } catch (parseError) {
                            console.log('Parse error:', parseError);
                            currentFiles = [];
                        }
                    } catch (error) {
                        console.error('Error in handleFileRemoved:', error);
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