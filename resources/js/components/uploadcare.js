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
        formInputObserver: null,

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
                uploader.classList.remove('uc-dark', 'uc-light');
                uploader.classList.add(`uc-${theme}`);
            });
        },

        getCurrentTheme() {
            if (document.documentElement.classList.contains('dark')) {
                return 'dark';
            }
            return 'light';
        },
        
        setupThemeObservers() {
            window.addEventListener('storage', this.handleThemeStorageChange.bind(this));
            
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));
            
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
            this.documentClassObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const hasDarkClass = document.documentElement.classList.contains('dark');
                        const hadDarkClass = mutation.oldValue && mutation.oldValue.includes('dark');

                        if (hasDarkClass !== hadDarkClass) {
                            this.applyTheme();
                        }
                    }
                });
            });

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
                this.isLocalUpdate = true;
                this.state = this.uploadedFiles;
            } catch (e) {
                console.error('Error parsing initialState:', e);
            }
        },

        parseInitialState() {
            const safeParse = (value) => {
                if (typeof value === 'string') {
                    try {
                        let parsed = JSON.parse(value);
                        
                        if (typeof parsed === 'string') {
                            try {
                                parsed = JSON.parse(parsed);
                            } catch (e) {
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
            
            if (this.initialState && typeof this.initialState === 'object' && !Array.isArray(this.initialState)) {
                const keys = Object.keys(this.initialState);
                if (keys.length === 1) {
                    return safeParse(this.initialState[keys[0]]);
                }
            }
            
            return safeParse(this.initialState);
        },

        addFilesFromInitialState(api, parsedState) {
            let filesArray = parsedState;
            if (parsedState && typeof parsedState === 'object' && !Array.isArray(parsedState)) {
                try {
                    filesArray = Array.from(parsedState);
                } catch (e) {
                    console.warn('Failed to convert Proxy to array:', e);
                    filesArray = [parsedState];
                }
            } else if (!Array.isArray(parsedState)) {
                filesArray = [parsedState];
            }
            
            if (Array.isArray(filesArray) && filesArray.length === 1 && Array.isArray(filesArray[0])) {
                filesArray = filesArray[0];
            }
            
            if (Array.isArray(filesArray) && filesArray.length === 1 && typeof filesArray[0] === 'string') {
                try {
                    const parsed = JSON.parse(filesArray[0]);
                    filesArray = Array.isArray(parsed) ? parsed : [parsed];
                } catch (e) {
                    console.warn('Failed to parse JSON string from filesArray[0]:', e);
                }
            }
            
            if (!Array.isArray(filesArray)) {
                filesArray = [filesArray];
            }
            
            const addFile = (item, index = 0) => {
                if (!item) return;

                if (Array.isArray(item)) {
                    item.forEach((subItem, subIndex) => {
                        addFile(subItem, `${index}.${subIndex}`);
                    });
                    return;
                }

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
                const cdnUrlModifiers = typeof item === 'object' ? item.cdnUrlModifiers : null;

                if (!url || !this.isValidUrl(url)) {
                    console.warn(`Invalid URL for file ${index}:`, url);
                    return;
                }

                const uuid = this.extractUuidFromUrl(url);
                if (uuid && typeof api.addFileFromUuid === 'function') {
                    try {
                        if (cdnUrlModifiers && typeof api.addFileFromCdnUrl === 'function') {
                            const baseUrl = url.split('/-/')[0];
                            const fullUrl = baseUrl + '/' + cdnUrlModifiers;
                            api.addFileFromCdnUrl(fullUrl);
                        } else {
                            api.addFileFromUuid(uuid);
                        }
                    } catch (e) {
                        console.error(`Failed to add file ${index} with UUID ${uuid}:`, e);
                    }
                } else if (!uuid) {
                    console.error(`Could not extract UUID from URL: ${url}`);
                } else {
                    console.error(`addFileFromUuid method not available on API`);
                }
            };
            
            filesArray.forEach(addFile);

            const formattedState = this.formatFilesForState(filesArray);
            this.uploadedFiles = JSON.stringify(formattedState);
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
                
                if ((!newValue || newValue === '[]' || newValue === '""') && !this.uploadedFiles) {
                    return;
                }
                
                const normalizedNewValue = this.normalizeStateValue(newValue);
                const normalizedUploadedFiles = this.normalizeStateValue(this.uploadedFiles);
                
                if (normalizedNewValue !== normalizedUploadedFiles) {
                    if (newValue && newValue !== '[]' && newValue !== '""') {
                        this.uploadedFiles = newValue;
                        this.isLocalUpdate = true;
                    }
                }
            });
        },

        normalizeStateValue(value) {
            if (!value) return '';
            
            try {
                const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                return JSON.stringify(this.formatFilesForState(parsed));
            } catch (e) {
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
            const handleFormInputChange = this.createFormInputChangeHandler(api);

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
            
            this.$nextTick(() => {
                const formInput = this.$el.querySelector('uc-form-input input');
                if (formInput) {
                    formInput.addEventListener('input', handleFormInputChange);
                    formInput.addEventListener('change', handleFormInputChange);
                    const observer = new MutationObserver(() => {
                        handleFormInputChange({ target: formInput });
                    });
                    observer.observe(formInput, {
                        attributes: true,
                        attributeFilter: ['value']
                    });
                    this.formInputObserver = observer;
                } else {
                    setTimeout(() => {
                        const formInput = this.$el.querySelector('uc-form-input input');
                        if (formInput) {
                            formInput.addEventListener('input', handleFormInputChange);
                            formInput.addEventListener('change', handleFormInputChange);
                        }
                    }, 200);
                }
            });

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
                
                const formInput = this.$el.querySelector('uc-form-input input');
                if (formInput) {
                    formInput.removeEventListener('input', handleFormInputChange);
                    formInput.removeEventListener('change', handleFormInputChange);
                }
                
                if (this.formInputObserver) {
                    this.formInputObserver.disconnect();
                    this.formInputObserver = null;
                }
            };
        },

        createFileUploadSuccessHandler() {
            let debounceTimer = null;
            
            return (e) => {
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
                
                debounceTimer = setTimeout(() => {
                    const fileData = this.isWithMetadata ? e.detail : e.detail.cdnUrl;
                    try {
                        const currentFiles = this.getCurrentFiles();
                        const updatedFiles = this.updateFilesList(currentFiles, fileData);
                        this.updateState(updatedFiles);

                        const form = this.$el.closest('form');
                        if (form) {
                            form.dispatchEvent(new CustomEvent('form-processing-finished'));
                        }
                    } catch (error) {
                        console.error('Error updating state after upload:', error);
                    }
                }, this.isMultiple ? 200 : 100);
            };
        },

        createFileUrlChangedHandler() {
            let debounceTimer = null;
            
            return (e) => {
                const fileDetails = e.detail;
                if (!fileDetails.cdnUrlModifiers) return;

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
                }, 100);
            };
        },

        createFileRemovedHandler() {
            let debounceTimer = null;
            
            return (e) => {
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
                
                debounceTimer = setTimeout(() => {
                    try {
                        const removedFile = e.detail;
                        const currentFiles = this.getCurrentFiles();
                        const updatedFiles = this.removeFile(currentFiles, removedFile);
                        this.updateState(updatedFiles);
                        
                        const api = this.getUploadcareApi();
                        if (api) {
                            setTimeout(() => {
                                this.syncStateWithUploadcare(api);
                            }, 150);
                        }
                    } catch (error) {
                        console.error('Error in handleFileRemoved:', error);
                    }
                }, 100);
            };
        },

        createFormInputChangeHandler(api) {
            let debounceTimer = null;
            
            return (e) => {
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
                
                debounceTimer = setTimeout(() => {
                    this.syncStateWithUploadcare(api);
                }, 200);
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
            const currentFiles = this.getCurrentFiles();
            const currentStateNormalized = JSON.stringify(this.formatFilesForState(currentFiles));
            const newStateNormalized = JSON.stringify(this.formatFilesForState(finalFiles));
            const hasActuallyChanged = currentStateNormalized !== newStateNormalized;

            if (hasActuallyChanged) {
                this.uploadedFiles = newState;
                this.isLocalUpdate = true;
                this.state = this.uploadedFiles;

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
            
            if (this.formInputObserver) {
                this.formInputObserver.disconnect();
                this.formInputObserver = null;
            }
            
            if (this.removeEventListeners) {
                this.removeEventListeners();
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
        },

        syncStateWithUploadcare(api) {
            try {
                const currentFiles = this.getCurrentFilesFromUploadcare(api);
                const formattedFiles = this.formatFilesForState(currentFiles);
                const newState = this.buildStateFromFiles(formattedFiles);
                const currentStateNormalized = this.normalizeStateValue(this.uploadedFiles);
                const newStateNormalized = this.normalizeStateValue(newState);
                
                if (currentStateNormalized !== newStateNormalized) {
                    this.uploadedFiles = newState;
                    this.isLocalUpdate = true;
                    this.state = this.uploadedFiles;
                }
            } catch (error) {
                console.error('Error syncing state with Uploadcare:', error);
            }
        },

        buildStateFromFiles(formattedFiles) {
            if (this.isMultiple) {
                return JSON.stringify(formattedFiles);
            }
            
            if (formattedFiles.length > 0) {
                return this.isWithMetadata ? JSON.stringify(formattedFiles[0]) : formattedFiles[0];
            }
            
            return '';
        },

        getCurrentFilesFromUploadcare(api) {
            try {
                const formInput = this.$el.querySelector('uc-form-input input');
                
                if (formInput) {
                    return this.parseFormInputValue(formInput.value);
                }
                
                const fileItems = this.$el.querySelectorAll('uc-file-item, [data-file-item]');
                return fileItems.length === 0 ? [] : [];
            } catch (error) {
                console.error('Error getting current files from Uploadcare:', error);
                return [];
            }
        },

        parseFormInputValue(inputValue) {
            if (!inputValue || (typeof inputValue === 'string' && inputValue.trim() === '')) {
                return [];
            }
            
            try {
                const parsed = JSON.parse(inputValue);
                
                if (Array.isArray(parsed)) {
                    return parsed.filter(file => file !== null && file !== '');
                }
                
                if (parsed !== null && parsed !== '') {
                    return [parsed];
                }
                
                return [];
            } catch (e) {
                if (typeof inputValue === 'string' && inputValue.trim() !== '') {
                    return [inputValue];
                }
                
                return [];
            }
        }
    };
}