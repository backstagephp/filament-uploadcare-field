import { DoneButtonHider } from './done-button-hider.js';

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
        doneButtonHider: null,
        documentClassObserver: null,

        init() {            
            if (this.isContextAlreadyInitialized()) return;

            this.markContextAsInitialized();
            this.applyTheme();
            this.initUploadcare();
            this.setupThemeObservers();
            this.setupDoneButtonObserver();
        },

        isContextAlreadyInitialized() {
            return window._initializedUploadcareContexts.has(this.uniqueContextName);
        },

        markContextAsInitialized() {
            window._initializedUploadcareContexts.add(this.uniqueContextName);
        },

        applyTheme() {
            const theme = this.getCurrentTheme();
            const uploaders = document.querySelectorAll(`uc-file-uploader-${this.uploaderStyle}`);
            uploaders.forEach(uploader => {
                // Remove existing theme classes
                uploader.classList.remove('uc-dark', 'uc-light');
                // Add the current theme class
                uploader.classList.add(`uc-${theme}`);
            });
        },

        getCurrentTheme() {
            // First check if document has dark class (most reliable for Filament v4)
            if (document.documentElement.classList.contains('dark')) {
                return 'dark';
            }
            
            // If no dark class, it's light theme
            return 'light';
        },
        
        setupThemeObservers() {
            // Listen for localStorage changes (theme toggle)
            window.addEventListener('storage', this.handleThemeStorageChange.bind(this));
            
            // Listen for system theme changes
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));
            
            // Watch for dark class changes on document element (Filament v4 approach)
            this.setupDocumentClassObserver();
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

        setupDocumentClassObserver() {
            // Watch for changes to the document element's class list
            this.documentClassObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        // Check if dark class was added or removed
                        const hasDarkClass = document.documentElement.classList.contains('dark');
                        const hadDarkClass = mutation.oldValue && mutation.oldValue.includes('dark');

                        if (hasDarkClass !== hadDarkClass) {
                            this.applyTheme();
                        }
                    }
                });
            });

            // Start observing the document element for class changes
            this.documentClassObserver.observe(document.documentElement, {
                attributes: true,
                attributeOldValue: true,
                attributeFilter: ['class']
            });
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
                const inputs = document.querySelectorAll('uc-form-input input[required]');
                inputs.forEach(input => input.removeAttribute('required'));
            }, 100);
        },

        initializeState(api) {
            this.$nextTick(() => {
                if (this.initialState && !this.stateHasBeenInitialized && !this.uploadedFiles) {
                    this.loadInitialState(api);
                } else if (!this.initialState && !this.stateHasBeenInitialized) {
                    // Handle empty initial state
                    this.stateHasBeenInitialized = true;
                    this.uploadedFiles = this.isMultiple ? '[]' : '';
                    this.isLocalUpdate = true;
                    this.state = this.uploadedFiles;
                }
                this.setupStateWatcher();
            });
        },

        loadInitialState(api) {
            try {
                const parsedState = this.parseInitialState();
                this.addFilesFromInitialState(api, parsedState);
                this.stateHasBeenInitialized = true;
                
                // Ensure the state is properly set to match the uploaded files
                this.isLocalUpdate = true;
                this.state = this.uploadedFiles;
            } catch (e) {
                console.error('Error parsing initialState:', e);
            }
        },

        parseInitialState() {
            // Helper function to safely extract and parse JSON, handling double encoding
            const safeParse = (value) => {
                if (typeof value === 'string') {
                    try {
                        // First parse attempt
                        let parsed = JSON.parse(value);
                        
                        // Check if the parsed result is also a JSON string (double encoding)
                        if (typeof parsed === 'string') {
                            try {
                                parsed = JSON.parse(parsed);
                            } catch (e) {
                                // If second parse fails, return the first parsed result
                                console.warn('Failed to parse double-encoded JSON:', e);
                            }
                        }
                        
                        return parsed;
                    } catch (e) {
                        console.warn('Failed to parse string as JSON:', e);
                        return value;
                    }
                }
                return value;
            };
            
            // Handle Proxy objects (Livewire sometimes wraps arrays in Proxy)
            if (this.initialState && typeof this.initialState === 'object' && !Array.isArray(this.initialState)) {
                const keys = Object.keys(this.initialState);
                if (keys.length === 1) {
                    return safeParse(this.initialState[keys[0]]);
                }
            }
            
            // Handle all other cases
            return safeParse(this.initialState);
        },

        addFilesFromInitialState(api, parsedState) {
            // Ensure parsedState is a regular array, not a Proxy
            let filesArray = parsedState;
            if (parsedState && typeof parsedState === 'object' && !Array.isArray(parsedState)) {
                // If it's a Proxy object, try to convert it to a regular array
                try {
                    filesArray = Array.from(parsedState);
                } catch (e) {
                    console.warn('Failed to convert Proxy to array:', e);
                    filesArray = [parsedState];
                }
            } else if (!Array.isArray(parsedState)) {
                filesArray = [parsedState];
            }
            
            // If filesArray is an array with one element that is also an array, flatten it
            if (Array.isArray(filesArray) && filesArray.length === 1 && Array.isArray(filesArray[0])) {
                filesArray = filesArray[0];
            }
            
            // Handle case where filesArray contains JSON strings that need to be parsed
            if (Array.isArray(filesArray) && filesArray.length === 1 && typeof filesArray[0] === 'string') {
                try {
                    const parsed = JSON.parse(filesArray[0]);
                    filesArray = Array.isArray(parsed) ? parsed : [parsed];
                } catch (e) {
                    console.warn('Failed to parse JSON string from filesArray[0]:', e);
                }
            }
            
            // Ensure we have an array of individual file objects
            if (!Array.isArray(filesArray)) {
                filesArray = [filesArray];
            }
            
            const addFile = (item, index = 0) => {
                if (!item) return;
                
                // If item is an array, process each element
                if (Array.isArray(item)) {
                    item.forEach((subItem, subIndex) => {
                        addFile(subItem, `${index}.${subIndex}`);
                    });
                    return;
                }
                
                // If item is a string, try to parse it as JSON
                if (typeof item === 'string') {
                    try {
                        const parsedItem = JSON.parse(item);
                        addFile(parsedItem, index);
                        return;
                    } catch (e) {
                        console.warn(`Failed to parse string item ${index} as JSON:`, e);
                    }
                }
                
                const url = typeof item === 'object' ? item.cdnUrl : item;
                
                if (!url || !this.isValidUrl(url)) {
                    console.warn(`Invalid URL for file ${index}:`, url);
                    return;
                }
                
                const uuid = this.extractUuidFromUrl(url);
                if (uuid && typeof api.addFileFromUuid === 'function') {
                    try {
                        api.addFileFromUuid(uuid);
                    } catch (e) {
                        console.error(`Failed to add file ${index} with UUID ${uuid}:`, e);
                    }
                } else if (!uuid) {
                    console.error(`Could not extract UUID from URL: ${url}`);
                } else {
                    console.error(`addFileFromUuid method not available on API`);
                }
            };
            
            // Process each file in the array
            filesArray.forEach(addFile);

            // Store the formatted state to match what will be returned
            const formattedState = this.formatFilesForState(filesArray);
            this.uploadedFiles = JSON.stringify(formattedState);
            
            // Set the initial state to match the formatted version
            this.initialState = this.uploadedFiles;
        },

        isValidUrl(string) {
            if (!string || typeof string !== 'string') return false;
            try {
                new URL(string);
                return true;
            } catch {
                return false;
            }
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
                
                // Skip if the new value is empty and we don't have any files
                if ((!newValue || newValue === '[]' || newValue === '""') && !this.uploadedFiles) {
                    return;
                }
                
                // Normalize both values for comparison
                const normalizedNewValue = this.normalizeStateValue(newValue);
                const normalizedUploadedFiles = this.normalizeStateValue(this.uploadedFiles);
                
                if (normalizedNewValue !== normalizedUploadedFiles) {
                    if (newValue && newValue !== '[]' && newValue !== '""') {
                        this.uploadedFiles = newValue;
                        // Don't trigger another state update when we're just syncing
                        this.isLocalUpdate = true;
                    }
                }
            });
        },

        normalizeStateValue(value) {
            if (!value) return '';
            
            try {
                // If it's already a string, try to parse it
                const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                return JSON.stringify(this.formatFilesForState(parsed));
            } catch (e) {
                // If parsing fails, return the original value
                return value;
            }
        },

        isStateChanged() {
            const currentState = this.normalizeStateValue(this.state);
            const initialState = this.normalizeStateValue(this.initialState);
            return currentState !== initialState;
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
                this.ctx.removeEventListener('file-upload-started', (e) => {
                    const form = this.$el.closest('form');
                    if (form) {
                        form.dispatchEvent(new CustomEvent('form-processing-started', {
                            detail: {
                                message: 'Uploading file...',
                            }
                        }));
                    }
                });
                this.ctx.removeEventListener('file-upload-success', handleFileUploadSuccess);
                this.ctx.removeEventListener('file-url-changed', handleFileUrlChanged);
                this.ctx.removeEventListener('file-removed', handleFileRemoved);
            };
        },

        createFileUploadSuccessHandler() {
            let debounceTimer = null;
            
            return (e) => {
                // Debounce the handler to prevent multiple rapid calls
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
                
                debounceTimer = setTimeout(() => {
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
                }, this.isMultiple ? 200 : 100); // Longer debounce for multiple files
            };
        },

        createFileUrlChangedHandler() {
            let debounceTimer = null;
            
            return (e) => {
                const fileDetails = e.detail;
                if (!fileDetails.cdnUrlModifiers) return;

                // Debounce the handler to prevent multiple rapid calls
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
                
                debounceTimer = setTimeout(() => {
                    try {
                        const currentFiles = this.getCurrentFiles();
                        const updatedFiles = this.updateFileUrl(currentFiles, fileDetails);
                        this.updateState(updatedFiles);
                    } catch (error) {
                        console.error('Error updating state after URL change:', error);
                    }
                }, 100); // 100ms debounce
            };
        },

        createFileRemovedHandler() {
            let debounceTimer = null;
            
            return (e) => {
                // Debounce the handler to prevent multiple rapid calls
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
                
                debounceTimer = setTimeout(() => {
                    try {
                        const removedFile = e.detail;
                        const currentFiles = this.getCurrentFiles();
                        const updatedFiles = this.removeFile(currentFiles, removedFile);
                        this.updateState(updatedFiles);
                    } catch (error) {
                        console.error('Error in handleFileRemoved:', error);
                    }
                }, 100); // 100ms debounce
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
            const newState = JSON.stringify(finalFiles);

            // More robust comparison - parse and compare the actual content
            const currentFiles = this.getCurrentFiles();
            const currentStateNormalized = JSON.stringify(this.formatFilesForState(currentFiles));
            const newStateNormalized = JSON.stringify(this.formatFilesForState(finalFiles));

            const hasActuallyChanged = currentStateNormalized !== newStateNormalized;

            // Only update if the state actually changed
            if (hasActuallyChanged) {
                this.uploadedFiles = newState;
                this.isLocalUpdate = true;
                this.state = this.uploadedFiles;

                // Add a small delay to prevent rapid state updates during multiple file uploads
                if (this.isMultiple && files.length > 1) {
                    this.$nextTick(() => {
                        this.isLocalUpdate = false;
                    });
                }
            }
        },

        formatFilesForState(files) {
            return files.map(file => {
                if (this.isWithMetadata) {
                    return file;
                }
                return typeof file === 'object' ? file.cdnUrl : file;
            });
        },

        setupDoneButtonObserver() {
            const wrapper = this.$el.closest('.uploadcare-wrapper');
            if (wrapper) {
                this.doneButtonHider = new DoneButtonHider(wrapper);
            }
        },

        destroy() {
            if (this.doneButtonHider) {
                this.doneButtonHider.destroy();
                this.doneButtonHider = null;
            }
            
            if (this.documentClassObserver) {
                this.documentClassObserver.disconnect();
                this.documentClassObserver = null;
            }
        },

        extractUuidFromUrl(url) {
            if (!url || typeof url !== 'string') {
                return null;
            }
            
            const uuidMatch = url.match(/\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:\/|$)/i);
            
            if (uuidMatch && uuidMatch[1]) {
                return uuidMatch[1];
            }
            
            if (typeof url === 'object' && url.uuid) {
                return url.uuid;
            }
            
            return null;
        }
    };
}