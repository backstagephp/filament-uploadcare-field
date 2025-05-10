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
            if (this.isContextAlreadyInitialized()) return;
            
            this.markContextAsInitialized();
            this.applyTheme();
            this.initUploadcare();
            this.setupThemeObservers();
        },

        isContextAlreadyInitialized() {
            return window._initializedUploadcareContexts.has(this.uniqueContextName);
        },

        markContextAsInitialized() {
            window._initializedUploadcareContexts.add(this.uniqueContextName);
        },

        applyTheme() {
            const theme = this.getCurrentTheme();
            const uploaders = document.querySelectorAll('uc-file-uploader-inline');
            uploaders.forEach(uploader => uploader.classList.add(`uc-${theme}`));
        },

        getCurrentTheme() {
            const userTheme = localStorage.getItem('theme');
            return userTheme === 'system' 
                ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                : userTheme;
        },
        
        setupThemeObservers() {
            window.addEventListener('storage', this.handleThemeStorageChange.bind(this));
            
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));
        },

        handleThemeStorageChange(event) {
            if (event.key === 'theme') {
                this.applyTheme();
            }
        },

        handleSystemThemeChange() {
            if (localStorage.getItem('theme') === 'system') {
                this.applyTheme();
            }
        },
        
        initUploadcare() {
            if (this.removeEventListeners) {
                this.removeEventListeners();
            }

            this.initializeUploader();
        },

        initializeUploader(retryCount = 0, maxRetries = 10) {
            if (retryCount >= maxRetries) {
                console.error('Failed to initialize Uploadcare after maximum retries');
                return;
            }

            this.ctx = document.querySelector(`uc-upload-ctx-provider[ctx-name="${this.uniqueContextName}"]`);
            const api = this.getUploadcareApi();

            if (!this.isValidContext(api)) {
                setTimeout(() => this.initializeUploader(retryCount + 1, maxRetries), 100);
                return;
            }

            this.markAsInitialized();
            this.removeRequiredAttributes();
            this.initializeState(api);
            this.setupEventListeners(api);
        },

        getUploadcareApi() {
            try {
                return this.ctx?.getAPI();
            } catch (e) {
                return null;
            }
        },

        isValidContext(api) {
            return this.ctx && api && api.addFileFromCdnUrl;
        },

        markAsInitialized() {
            this.isInitialized = true;
        },

        removeRequiredAttributes() {
            setTimeout(() => {
                const config = this.$el.closest('uc-config');
                if (config && !config.hasAttribute('required')) {
                    const inputs = document.querySelectorAll('uc-form-input input[required]');
                    inputs.forEach(input => input.removeAttribute('required'));
                }
            }, 100);
        },

        initializeState(api) {
            this.$nextTick(() => {
                if (this.initialState && !this.stateHasBeenInitialized && !this.uploadedFiles) {
                    this.loadInitialState(api);
                }
                this.setupStateWatcher();
            });
        },

        loadInitialState(api) {
            try {
                const parsedState = this.parseInitialState();
                this.addFilesFromInitialState(api, parsedState);
                this.stateHasBeenInitialized = true;
            } catch (e) {
                console.error('Error parsing initialState:', e);
            }
        },

        parseInitialState() {
            return typeof this.initialState === 'string' 
                ? JSON.parse(this.initialState) 
                : this.initialState;
        },

        addFilesFromInitialState(api, parsedState) {
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

            this.uploadedFiles = typeof this.initialState === 'string' 
                ? this.initialState 
                : JSON.stringify(parsedState);
        },

        setupStateWatcher() {
            this.$watch('state', (newValue) => {
                if (this.isLocalUpdate) {
                    this.isLocalUpdate = false;
                    return;
                }
                
                if (!this.stateHasBeenInitialized) {
                    this.stateHasBeenInitialized = true;
                    return;
                }
                
                if (newValue !== this.uploadedFiles) {
                    if (newValue && newValue !== '[]' && newValue !== '""') {
                        this.uploadedFiles = newValue;
                    }
                }
            });
        },

        setupEventListeners(api) {
            const handleFileUploadSuccess = this.createFileUploadSuccessHandler();
            const handleFileUrlChanged = this.createFileUrlChangedHandler();
            const handleFileRemoved = this.createFileRemovedHandler();

            // Add file upload started event
            this.ctx.addEventListener('file-upload-started', (e) => {
                const form = this.$el.closest('form');
                if (form) {
                    form.dispatchEvent(new CustomEvent('form-processing-started', {
                        detail: {
                            message: 'Uploading file...',
                        }
                    }));
                }
            });

            this.ctx.addEventListener('file-upload-success', handleFileUploadSuccess);
            this.ctx.addEventListener('file-url-changed', handleFileUrlChanged);
            this.ctx.addEventListener('file-removed', handleFileRemoved);

            this.removeEventListeners = () => {
                this.ctx.removeEventListener('file-upload-started', handleFileUploadStarted);
                this.ctx.removeEventListener('file-upload-success', handleFileUploadSuccess);
                this.ctx.removeEventListener('file-url-changed', handleFileUrlChanged);
                this.ctx.removeEventListener('file-removed', handleFileRemoved);
            };
        },

        createFileUploadSuccessHandler() {
            return (e) => {
                const fileData = this.isWithMetadata ? e.detail : e.detail.cdnUrl;
                try {
                    const currentFiles = this.getCurrentFiles();
                    const updatedFiles = this.updateFilesList(currentFiles, fileData);
                    this.updateState(updatedFiles);

                    // Dispatch form processing finished event
                    const form = this.$el.closest('form');
                    if (form) {
                        form.dispatchEvent(new CustomEvent('form-processing-finished'));
                    }
                } catch (error) {
                    console.error('Error updating state after upload:', error);
                }
            };
        },

        createFileUrlChangedHandler() {
            return (e) => {
                const fileDetails = e.detail;
                if (!fileDetails.cdnUrlModifiers) return;

                try {
                    const currentFiles = this.getCurrentFiles();
                    const updatedFiles = this.updateFileUrl(currentFiles, fileDetails);
                    this.updateState(updatedFiles);
                } catch (error) {
                    console.error('Error updating state after URL change:', error);
                }
            };
        },

        createFileRemovedHandler() {
            return (e) => {
                try {
                    const removedFile = e.detail;
                    const currentFiles = this.getCurrentFiles();
                    const updatedFiles = this.removeFile(currentFiles, removedFile);
                    this.updateState(updatedFiles);
                } catch (error) {
                    console.error('Error in handleFileRemoved:', error);
                }
            };
        },

        getCurrentFiles() {
            try {
                const files = this.uploadedFiles ? JSON.parse(this.uploadedFiles) : [];
                return Array.isArray(files) ? files : [];
            } catch (error) {
                return [];
            }
        },

        updateFilesList(currentFiles, newFile) {
            if (this.isMultiple) {
                // Check if the file already exists to prevent duplicates
                const isDuplicate = currentFiles.some(file => {
                    const existingUrl = typeof file === 'object' ? file.cdnUrl : file;
                    const newUrl = typeof newFile === 'object' ? newFile.cdnUrl : newFile;
                    return existingUrl === newUrl;
                });
                
                if (!isDuplicate) {
                    return [...currentFiles, newFile];
                }
                return currentFiles;
            }
            return [newFile];
        },

        updateFileUrl(currentFiles, fileDetails) {
            const fileIndex = this.findFileIndex(currentFiles, fileDetails.uuid);
            if (fileIndex === -1) return currentFiles;

            const updatedFile = this.isWithMetadata ? fileDetails : fileDetails.cdnUrl;
            if (this.isMultiple) {
                currentFiles[fileIndex] = updatedFile;
                return currentFiles;
            }
            return [updatedFile];
        },

        removeFile(currentFiles, removedFile) {
            const index = this.findFileIndex(currentFiles, removedFile.uuid);
            if (index === -1) return currentFiles;

            if (this.isMultiple) {
                currentFiles.splice(index, 1);
                return currentFiles;
            }
            return [];
        },

        findFileIndex(files, uuid) {
            return files.findIndex(file => {
                const fileUrl = typeof file === 'object' ? file.cdnUrl : file;
                return fileUrl && fileUrl.includes(uuid);
            });
        },

        updateState(files) {
            const finalFiles = this.formatFilesForState(files);
            this.uploadedFiles = JSON.stringify(finalFiles);
            this.isLocalUpdate = true;
            this.state = this.uploadedFiles;
        },

        formatFilesForState(files) {
            return files.map(file => {
                if (this.isWithMetadata) {
                    return file;
                }
                return typeof file === 'object' ? file.cdnUrl : file;
            });
        }
    };
}