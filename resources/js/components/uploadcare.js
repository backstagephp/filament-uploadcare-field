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
        localeName: config.localeName || 'en',
        uploadedFiles: '',
        ctx: null,
        removeEventListeners: null,
        uniqueContextName: config.uniqueContextName,
        pendingUploads: [],
        pendingRemovals: [],
        isInitialized: false,
        stateHasBeenInitialized: false,
        isStateWatcherActive: false,
        isLocalUpdate: false,
        doneButtonHider: null,
        documentClassObserver: null,
        formInputObserver: null,

        async init() {
            if (this.isContextAlreadyInitialized()) {
                return;
            }

            this.markContextAsInitialized();
            this.applyTheme();
            
            await this.loadAllLocales();
            
            // ZOMBIE CHECK: If component was removed while loading locales, abort.
            if (!this.$el.isConnected) {
                return;
            }

            this.setupStateWatcher();
            
            this.$el.addEventListener('uploadcare-state-updated', (e) => {
                const uuid = e.detail.uuid;
                if (uuid && this.isInitialized) {
                    this.loadFileFromUuid(uuid);
                } else if (uuid) {
                    this.$nextTick(() => {
                        if (this.isInitialized) {
                            this.loadFileFromUuid(uuid);
                        }
                    });
                }
            });
            
            this.initUploadcare();
            this.setupThemeObservers();
            this.setupDoneButtonObserver();

            // PROACTIVE CLEAR: If we are initializing and state is already empty/null,
            // ensure the widget is also cleared (covers some re-init scenarios).
            // Especially helpful when using "Create & Create Another".
            if (!this.state || this.state === '[]' || this.state === '""') {
                this.$nextTick(() => {
                    if (this.isInitialized) {
                        // Only verify if we really need to clear visually
                        const current = this.getCurrentFiles();
                        if (current.length > 0) {
                             this.clearAllFiles(false);
                        }
                    }
                });
            }
        },

        isContextAlreadyInitialized() {
            return window._initializedUploadcareContexts.has(this.uniqueContextName);
        },

        markContextAsInitialized() {
            window._initializedUploadcareContexts.add(this.uniqueContextName);
        },

        async loadAllLocales() {
            if (!window._uploadcareAllLocalesLoaded) {
                await new Promise((resolve) => {
                    if (window._uploadcareAllLocalesLoaded) {
                        resolve();
                        return;
                    }
                    const checkInterval = setInterval(() => {
                        if (window._uploadcareAllLocalesLoaded) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 100);
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        resolve();
                    }, 5000);
                });
            }
            
            const supportedLocales = ['de', 'es', 'fr', 'he', 'it', 'nl', 'pl', 'pt', 'ru', 'tr', 'uk', 'zh-TW', 'zh'];
            document.querySelectorAll('uc-config[data-locale-name]').forEach(config => {
                const locale = config.getAttribute('data-locale-name');
                if (locale && supportedLocales.includes(locale) && !config.getAttribute('locale-name')) {
                    config.setAttribute('locale-name', locale);
                }
            });
        },

        async loadLocale() {
            if (this.localeName === 'en' || this.localeLoaded) {
                return;
            }

            if (window._uploadcareLocales && window._uploadcareLocales.has(this.localeName)) {
                this.localeLoaded = true;
                return;
            }

            if (!window._uploadcareLocales) {
                window._uploadcareLocales = new Set();
            }

            const supportedLocales = ['de', 'es', 'fr', 'he', 'it', 'nl', 'pl', 'pt', 'ru', 'tr', 'uk', 'zh-TW', 'zh'];
            
            if (!supportedLocales.includes(this.localeName)) {
                return;
            }

            try {
                const localeUrl = `https://cdn.jsdelivr.net/npm/@uploadcare/file-uploader@v1/locales/file-uploader/${this.localeName}.js`;
                const localeModule = await import(localeUrl);
                const localeData = localeModule.default || localeModule;
                
                const getUC = () => {
                    const UploaderElement = customElements.get('uc-file-uploader-inline') || 
                                          customElements.get('uc-file-uploader-regular') || 
                                          customElements.get('uc-file-uploader-minimal');
                    
                    if (UploaderElement && UploaderElement.UC) {
                        return UploaderElement.UC;
                    }
                    
                    return window.UC;
                };
                
                const registerLocale = () => {
                    const UC = getUC();
                    if (UC && typeof UC.defineLocale === 'function') {
                        UC.defineLocale(this.localeName, localeData);
                        window._uploadcareLocales.add(this.localeName);
                        this.localeLoaded = true;
                        return true;
                    }
                    return false;
                };
                
                if (!registerLocale()) {
                    let attempts = 0;
                    const maxAttempts = 50;
                    const checkUC = setInterval(() => {
                        attempts++;
                        if (registerLocale()) {
                            clearInterval(checkUC);
                        } else if (attempts >= maxAttempts) {
                            clearInterval(checkUC);
                        }
                    }, 100);
                }
            } catch (error) {
                console.error('[Uploadcare Locale JS] Failed to load locale:', this.localeName, error);
            }
        },

        applyTheme() {
            const theme = this.getCurrentTheme();
            const uploaders = this.$el.querySelectorAll(`uc-file-uploader-${this.uploaderStyle}`);
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
                return;
            }

            this.ctx = this.$el.querySelector(`uc-upload-ctx-provider[ctx-name="${this.uniqueContextName}"]`);
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
            if (this.initialState && !this.stateHasBeenInitialized && !this.uploadedFiles) {
                this.loadInitialState(api);
            } else if (!this.initialState && !this.stateHasBeenInitialized) {
                this.stateHasBeenInitialized = true;
                this.uploadedFiles = this.isMultiple ? '[]' : '';
                this.isLocalUpdate = true;
                this.state = this.uploadedFiles;
            }
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
                            try { parsed = JSON.parse(parsed); } catch (e) {}
                        }
                        return parsed;
                    } catch (e) {
                        return value;
                    }
                }
                return value;
            };
            
            if (this.initialState && (this.initialState && typeof this.initialState === 'object') && !Array.isArray(this.initialState)) {
                this.initialState = [this.initialState];
            }

            const parsedState = this.parseStateValue(this.initialState);
            console.log(`[Uploadcare ${this.statePath}] initializeState`, { hasInitialState: !!this.initialState, parsedCount: Array.isArray(parsedState) ? parsedState.length : 'n/a' });

            return parsedState;
        },

        addFilesFromInitialState(api, parsedState) {
            let filesArray = [];
            if (parsedState && (parsedState && typeof parsedState === 'object') && !Array.isArray(parsedState)) {
                try {
                    filesArray = Array.from(parsedState);
                } catch (e) {
                    filesArray = [parsedState];
                }
            } else if (Array.isArray(parsedState)) {
                filesArray = parsedState;
            } else if (parsedState) {
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
                }
            }
            
            if (!Array.isArray(filesArray) || filesArray.length === 0) {
                return;
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
                    }
                }

                const url = (item && typeof item === 'object') ? item.cdnUrl : item;
                const cdnUrlModifiers = (item && typeof item === 'object') ? item.cdnUrlModifiers : null;
                console.log(`[Uploadcare ${this.statePath}] addFilesFromInitialState adding item`, { index, url });

                if (!url || !this.isValidUrl(url)) {
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

            // CRITICAL FIX: If using metadata, we must ensure initial state is stored as objects,
            // even if we received strings (URLs). Otherwise, subsequent updates (like updateFileUrl)
            // will try to spread the string {...file}, creating a character map corruption.
            let stateToStore = filesArray.map(file => {
                let currentFile = file;
                if (file && typeof file === 'object') {
                    if (!file.uuid) {
                        file.uuid = this.extractUuidFromUrl(file.cdnUrl);
                    }
                    return file;
                }
                
                if (typeof file === 'string') {
                    const uuid = this.extractUuidFromUrl(file);
                    return { 
                        cdnUrl: file, 
                        uuid: uuid,
                        name: '', 
                        size: 0, 
                        mimeType: '', 
                        isImage: false 
                    }; 
                }
                return file;
            });

            const formattedState = this.formatFilesForState(stateToStore);
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
            this.$watch('state', (newValue, oldValue) => {
                if (this.isLocalUpdate) {
                    this.isLocalUpdate = false;
                    return;
                }
                
                // ZOMBIE PROOFING: If component is detached, stop watching/syncing immediately.
                if (!this.$el.isConnected) {
                    return;
                }
                
                if (!this.stateHasBeenInitialized) {
                    this.stateHasBeenInitialized = true;
                    return;
                }
                
                if (!newValue || newValue === '[]' || newValue === '""' || (Array.isArray(newValue) && newValue.length === 0)) {
                    // Only clear if we actually have files to clear. 
                    // Prevents infinite loop of: Server(null) -> Watcher -> clearAllFiles -> State([]) -> Server(null)
                    if (this.uploadedFiles && this.uploadedFiles !== '[]' && this.uploadedFiles !== '""') {
                         // Double check we aren't just initialized with empty
                         const current = this.getCurrentFiles();
                         if (current.length > 0) {
                            console.log(`[Uploadcare ${this.statePath}] State cleared (server sent empty), calling clearAllFiles(SILENT)`);
                            this.clearAllFiles(false);
                         }
                    }
                    return;
                }
                
                const normalizedNewValue = this.normalizeStateValue(newValue);
                const normalizedUploadedFiles = this.normalizeStateValue(this.uploadedFiles);
                
                if (normalizedNewValue !== normalizedUploadedFiles) {
                    if (newValue && newValue !== '[]' && newValue !== '""') {
                        this.addFilesFromState(newValue);
                    }
                }
            });
        },
        
        parseStateValue(value) {
            if (!value) return null;
            
            try {
                if (typeof value === 'string') {
                    return JSON.parse(value);
                }
                return value;
            } catch (e) {
                return value;
            }
        },

        addFilesFromState(newValue) {
            const parsed = this.parseStateValue(newValue);
            let filesToAdd = parsed;

            if (!Array.isArray(filesToAdd)) {
                filesToAdd = [filesToAdd];
            }
            
            // Filter out nulls/undefined to prevent crashes
            filesToAdd = filesToAdd.filter(item => item !== null && item !== undefined);

            if (filesToAdd.length === 0) {
                return false;
            }

            const api = this.getUploadcareApi();
            if (!api || typeof api.addFileFromCdnUrl !== 'function') {
                return false;
            }

            const currentFiles = this.getCurrentFiles();
            console.log('[Uploadcare] addFilesFromState currentFiles', currentFiles.length, currentFiles);
            
            const currentUrls = currentFiles.map(file => {
                // FIX: Check for null/undefined file before accessing properties
                if (!file) return null;
                const url = (file && typeof file === 'object') ? file.cdnUrl : file;
                return url;
            }).filter(Boolean); // Filter out nulls
            
            console.log(`[Uploadcare ${this.statePath}] addFilesFromState filesToAdd`, filesToAdd.length, filesToAdd);

            filesToAdd.forEach((item, index) => {
                if (!item) {
                     console.warn(`[Uploadcare] Skipping null item at index ${index}`);
                     return; 
                }

                // FIX: Check for null/undefined item before accessing properties (double safety)
                const url = (item && typeof item === 'object') ? item.cdnUrl : item;
                
                console.log(`[Uploadcare] Processing item ${index}`, { url, item });
                if (url && typeof url === 'string' && (url.includes('ucarecdn.com') || url.includes('ucarecd.net'))) {
                    const urlExists = currentUrls.some(currentUrl => {
                        const uuid1 = this.extractUuidFromUrl(url);
                        const uuid2 = this.extractUuidFromUrl(currentUrl);
                        return uuid1 && uuid2 && uuid1 === uuid2;
                    });
                    
                    if (!urlExists) {
                        try {
                            api.addFileFromCdnUrl(url);
                        } catch (e) {
                            console.error('[Uploadcare] Failed to add file from URL:', url, e);
                        }
                    }
                }
            });
            
            // Deduplicate: merge newly arriving state with current, ensuring unique UUIDs
            let finalStateArray = [];
            const processedUuids = new Set();
            
            const addUnique = (item) => {
                if (!item) return;
                const url = (item && typeof item === 'object') ? item.cdnUrl : item;
                const uuid = this.extractUuidFromUrl(url);
                if (uuid && !processedUuids.has(uuid)) {
                    processedUuids.add(uuid);
                    if (this.isWithMetadata && typeof item !== 'object') {
                        finalStateArray.push({
                            cdnUrl: item,
                            uuid: uuid,
                            name: '', size: 0, mimeType: '', isImage: false
                        });
                    } else {
                        finalStateArray.push(item);
                    }
                } else if (!uuid) {
                    finalStateArray.push(item); // Fallback for things without UUIDs
                }
            };
            
            // Re-build state from scratch to ensure uniqueness
            const incomingState = this.parseStateValue(newValue) || [];
            (Array.isArray(incomingState) ? incomingState : [incomingState]).forEach(addUnique);
            
            this.uploadedFiles = JSON.stringify(finalStateArray);
            this.isLocalUpdate = true;
            return true;
        },

        normalizeStateValue(value) {
            if (!value) return '';
            
            try {
                const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                
                // If already an array of strings or properly formatted objects, don't re-format
                if (Array.isArray(parsed)) {
                    const allStringsOrProperObjects = parsed.every(item => 
                        typeof item === 'string' || 
                        (typeof item === 'object' && item !== null && ('cdnUrl' in item || 'uuid' in item))
                    );
                    if (allStringsOrProperObjects) {
                        return JSON.stringify(parsed);
                    }
                    console.log('[Uploadcare] normalizing mixed/raw array', parsed);
                }
                
                const formatted = this.formatFilesForState(parsed);
                console.log('[Uploadcare] normalizeStateValue result', formatted);
                return JSON.stringify(formatted);
            } catch (e) {   
                console.error('[Uploadcare] normalizeStateValue error', e);
                return value;
            }
        },

        isStateChanged() {
            const currentState = this.normalizeStateValue(this.state);
            const initialState = this.normalizeStateValue(this.initialState);
            return currentState !== initialState;
        },

        setupEventListeners(api) {
            this.pendingUploads = [];
            this.pendingRemovals = [];
            
            const handleFileUploadSuccess = this.createFileUploadSuccessHandler(api);
            const handleFileUrlChanged = this.createFileUrlChangedHandler(api);
            const handleFileRemoved = this.createFileRemovedHandler(api);
            const handleFormInputChange = this.createFormInputChangeHandler(api);

            const handleFileUploadStarted = (e) => {
                // Verify event target belongs to this instance
                if (e.target !== this.ctx && !this.ctx.contains(e.target)) return;
                
                const form = this.$el.closest('form');
                if (form) {
                    form.dispatchEvent(new CustomEvent('form-processing-started', {
                        detail: {
                            message: 'Uploading file...',
                        }
                    }));
                }
            };

            this.ctx.addEventListener('file-upload-started', handleFileUploadStarted);
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
                }
            });

            this.removeEventListeners = () => {
                this.ctx.removeEventListener('file-upload-started', handleFileUploadStarted);
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

        createFileUploadSuccessHandler(api) {
            let debounceTimer = null;
            
            return (e) => {
                const eventCtxName = e.target.getAttribute('ctx-name');

                // CRITICAL ISOLATION CHECK: Ensure this event is intended for THIS field instance
                if (eventCtxName !== this.uniqueContextName && e.target !== this.ctx && !this.ctx.contains(e.target)) {
                    return;
                }

                const fileData = this.isWithMetadata ? e.detail : e.detail.cdnUrl;
                const fileUuid = this.extractUuidFromUrl(fileData);
                
                this.pendingUploads.push(fileData);

                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
                
                debounceTimer = setTimeout(() => {
                    try {
                        let currentFiles = this.getCurrentFiles();
                        
                        // Add all buffered files
                        for (const file of this.pendingUploads) {
                             currentFiles = this.updateFilesList(currentFiles, file);
                        }
                        
                        this.updateState(currentFiles);
                        this.pendingUploads = []; // Clear buffer

                        const form = this.$el.closest('form');
                        if (form) {
                            form.dispatchEvent(new CustomEvent('form-processing-finished'));
                        }
                    } catch (error) {
                        console.error('[Uploadcare] Error updating state after upload:', error);
                    }
                }, 200);
            };
        },

        createFileUrlChangedHandler(api) {
            let debounceTimer = null;
            
            return (e) => {
                const eventCtxName = e.target.getAttribute('ctx-name');
                // CRITICAL ISOLATION CHECK
                if (eventCtxName !== this.uniqueContextName && e.target !== this.ctx && !this.ctx.contains(e.target)) return;

                const fileDetails = e.detail;

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

        createFileRemovedHandler(api) {
            let debounceTimer = null;
            
            return (e) => {
                const eventCtxName = e.target.getAttribute('ctx-name');
                // CRITICAL ISOLATION CHECK
                if (eventCtxName !== this.uniqueContextName && e.target !== this.ctx && !this.ctx.contains(e.target)) return;

                const removedFile = e.detail;
                // Buffer the removal
                this.pendingRemovals.push(removedFile);

                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
                
                debounceTimer = setTimeout(() => {
                    try {
                        let currentFiles = this.getCurrentFiles();
                        
                        // Process all buffered removals
                        for (const fileToRemove of this.pendingRemovals) {
                             currentFiles = this.removeFile(currentFiles, fileToRemove);
                        }
                        
                        this.updateState(currentFiles);
                        this.pendingRemovals = []; // Clear buffer
                    } catch (error) {
                        console.error('Error in handleFileRemoved:', error);
                    }
                }, 100);
            };
        },

        createFormInputChangeHandler(api) {
            // Deprecated/Secondary: Only use for fallback if state is empty but input has value?
            // For now, disabling auto-sync to avoid overriding the event-based source of truth
            // unless we strictly handle external changes.
            return (e) => {
               // no-op or specific logic if needed
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
                const newUuid = this.extractUuidFromUrl(newFile);
                
                const isDuplicate = currentFiles.some(file => {
                    return this.extractUuidFromUrl(file) === newUuid;
                });
                
                if (!isDuplicate) {
                    return [...currentFiles, newFile];
                }
                return currentFiles;
            }
            return [newFile];
        },

        updateFileUrl(currentFiles, fileDetails) {
            let uuid = fileDetails.uuid;
            
            if (!uuid && fileDetails.cdnUrl) {
                uuid = this.extractUuidFromUrl(fileDetails.cdnUrl);
            }
            
            if (!uuid) return currentFiles;

            // Ensure uuid is present in fileDetails for the merge
            if (!fileDetails.uuid) {
                fileDetails = { ...fileDetails, uuid };
            }

            const fileIndex = this.findFileIndex(currentFiles, uuid);
            if (fileIndex === -1) return currentFiles;

            let updatedFile;
            if (this.isWithMetadata) {
                let originalFile = currentFiles[fileIndex];
                
                // CRITICAL FIX: Ensure originalFile is an object before spreading
                // If it's a string (URL), convert it to an object first to prevent character map corruption
                if (typeof originalFile === 'string') {
                    const uuid = this.extractUuidFromUrl(originalFile);
                     originalFile = { 
                         cdnUrl: originalFile, 
                         uuid: uuid,
                         name: '', 
                         size: 0, 
                         mimeType: '', 
                         isImage: false 
                     };
                }

                // Merge with existing file to preserve properties like uuid if missing in detail
                updatedFile = { ...originalFile, ...fileDetails };
            } else {
                updatedFile = fileDetails.cdnUrl;
            }

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
            if (!uuid) return -1;
            return files.findIndex(file => {
                const fileUrl = (file && typeof file === 'object') ? file.cdnUrl : file;
                const fileUuid = this.extractUuidFromUrl(fileUrl);
                return fileUuid === uuid;
            });
        },

        updateState(files) {
            // Deduplicate by UUID
            const processedUuids = new Set();
            const uniqueFiles = files.filter(file => {
                const url = (file && typeof file === 'object') ? file.cdnUrl : file;
                const uuid = this.extractUuidFromUrl(url);
                if (uuid) {
                    if (processedUuids.has(uuid)) return false;
                    processedUuids.add(uuid);
                    return true;
                }
                return true;
            });

            const finalFiles = this.formatFilesForState(uniqueFiles);
            const newState = JSON.stringify(finalFiles);
            const currentFiles = this.getCurrentFiles();
            const currentStateNormalized = JSON.stringify(this.formatFilesForState(currentFiles));
            const newStateNormalized = JSON.stringify(finalFiles); 
            const hasActuallyChanged = currentStateNormalized !== newStateNormalized;

            if (hasActuallyChanged) {
                this.uploadedFiles = newState;
                this.isLocalUpdate = true;
                this.state = this.uploadedFiles;

                if (this.isMultiple && uniqueFiles.length > 1) {
                    this.$nextTick(() => {
                        this.isLocalUpdate = false;
                    });
                }
            }
        },

        formatFilesForState(files) {
            // CRITICAL: Ensure files is always an array
            if (!files) return [];
            if (!Array.isArray(files)) {
                console.warn('[Uploadcare] formatFilesForState called with non-array:', typeof files, files);
                // If it's a string, try to parse it
                if (typeof files === 'string') {
                    try {
                        const parsed = JSON.parse(files);
                        if (Array.isArray(parsed)) {
                            files = parsed;
                        } else {
                            return [];
                        }
                    } catch {
                        return [];
                    }
                } else {
                    return [];
                }
            }
            
            return files.map(file => {
                // SELF-HEALING: Detect character-mapped strings (e.g. {"0":"h","1":"t".,..})
                if (file && typeof file === 'object' && !file.cdnUrl && !file.uuid && '0' in file) {
                     const keys = Object.keys(file);
                     // If it looks like an array-like object with sequential keys (0, 1, 2...)
                     if (keys.length > 5 && keys.includes('0') && keys.includes('1') && keys.includes('2')) {
                         // Attempt to reconstruct the string
                         let reconstructed = '';
                         // We can't rely on Object.values order, so we accept iteration if keys are sequential-ish, 
                         // but standard Object.values works for integer keys usually.
                         // Safer: assume it's array-like
                         const maxKey = Math.max(...keys.map(k => parseInt(k)).filter(n => !isNaN(n)));
                         if (maxKey === keys.length - 1) {
                             const arr = new Array(keys.length);
                             for (let i = 0; i < keys.length; i++) {
                                 arr[i] = file[i];
                             }
                             reconstructed = arr.join('');
                         } else {
                             // Fallback to simple join if needed
                             reconstructed = Object.values(file).join('');
                         }

                         if (reconstructed.match(/^https?:\/\//)) {
                             console.warn('[Uploadcare] SELF-HEALED CORRUPTED STRING:', reconstructed);
                             if (this.isWithMetadata) {
                                 const uuid = this.extractUuidFromUrl(reconstructed);
                                 return { 
                                     cdnUrl: reconstructed, 
                                     uuid: uuid,
                                     name: '', 
                                     size: 0, 
                                     mimeType: '', 
                                     isImage: false 
                                 }; 
                             }
                             return reconstructed;
                         }
                     }
                }

                if (this.isWithMetadata) {
                    return file;
                }
                return (file && typeof file === 'object') ? file.cdnUrl : file;
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

        extractUuidFromUrl(urlOrObject) {
            if (!urlOrObject) return null;
            
            let url = urlOrObject;
            if (typeof urlOrObject === 'object') {
                if (urlOrObject.uuid) return urlOrObject.uuid;
                url = urlOrObject.cdnUrl || '';
            }

            if (!url || typeof url !== 'string') {
                return null;
            }
            
            // Check if string is just a UUID
            const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
            if (uuidPattern.test(url)) {
                return url;
            }
            
            const uuidMatch = url.match(/\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:\/|$)/i);
            
            if (uuidMatch && uuidMatch[1]) {
                return uuidMatch[1];
            }
            
            return null;
        },


        async syncStateWithUploadcare(api) {
            try {
                let currentFiles = this.getCurrentFilesFromUploadcare(api);
                
                // Handle Group URLs
                if (currentFiles.length > 0) {
                    const flattenedFiles = [];
                    for (const file of currentFiles) {
                         console.log(`[Uploadcare ${this.statePath}] syncStateWithUploadcare - state item`, file);
                         const url = (file && typeof file === 'object') ? file.cdnUrl : file;
                         // Check for Group UUID or URL (uuid~count)
                         if (typeof url === 'string' && url.match(/[a-f0-9-]{36}~[0-9]+/)) {
                             console.log('[Uploadcare] Found group URL:', url);
                             try {
                                 const groupFiles = await this.fetchGroupFiles(url);
                                 console.log('[Uploadcare] Expanded group to:', groupFiles.length, 'files');
                                 flattenedFiles.push(...groupFiles);
                             } catch (e) {
                                 console.error('[Uploadcare] Failed to expand group:', url, e);
                                 flattenedFiles.push(file); // Fallback to original
                             }
                         } else {
                             flattenedFiles.push(file);
                         }
                    }
                    console.log('[Uploadcare] Flattened files count:', flattenedFiles.length);
                    currentFiles = flattenedFiles;
                }

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

        async fetchGroupFiles(groupUrlOrUuid) {
            // Extract group ID (uuid~count)
            let groupId = groupUrlOrUuid;
            if (groupUrlOrUuid.includes('ucarecdn.com') || groupUrlOrUuid.includes('ucarecd.net')) {
                const match = groupUrlOrUuid.match(/\/([a-f0-9-]{36}~[0-9]+)/);
                if (match) {
                    groupId = match[1];
                }
            }
            
            // Use Upload API to get group info as CDN endpoint returns HTML widget
            const response = await fetch(`https://upload.uploadcare.com/group/info/?pub_key=${this.publicKey}&group_id=${groupId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch group info: ${response.statusText}`);
            }

            const data = await response.json();
            if (!data.files) {
                return [];
            }

            // Map to the format expected by the component
            return data.files.map(file => {
                const cdnUrl = `https://ucarecdn.com/${file.uuid}/`;
                if (this.isWithMetadata) {
                    return {
                        uuid: file.uuid,
                        cdnUrl: cdnUrl,
                        name: file.original_filename,
                        size: file.size,
                        mimeType: file.mime_type,
                        isImage: file.is_image,
                    };
                }
                return cdnUrl;
            });
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
                // Use widget API directly if available
                if (api && typeof api.value === 'function') {
                    const value = api.value();
                    if (value) {
                         if (Array.isArray(value)) {
                             return value.filter(item => item !== null && item !== undefined); 
                         }
                         const parsed = this.parseFormInputValue(value);
                         return parsed.filter(item => item !== null && item !== undefined);
                    }
                    return [];
                }

                const formInput = this.$el.querySelector('uc-form-input input');
                
                if (formInput) {
                    const parsed = this.parseFormInputValue(formInput.value);
                    return parsed.filter(item => item !== null && item !== undefined);
                }
                
                return [];
            } catch (error) {
                console.error('Error getting current files from Uploadcare:', error);
                return [];
            }
        },

        parseFormInputValue(inputValue) {
            if (!inputValue || (typeof inputValue === 'string' && inputValue.trim() === '')) {
                return [];
            }
            
            // If it's a raw Uploadcare object/collection
            if (typeof inputValue === 'object') {
                return [inputValue]; // Or handle collection
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
        },

        clearAllFiles(emitStateChange = true) {
            const path = this.statePath || 'unknown';
            
            const api = this.getUploadcareApi();
            if (api) {
                console.log(`[Uploadcare ${path}] API found. Attempting clear methods.`, {
                    hasCollection: !!api.collection,
                    hasGetCollection: typeof api.getCollection === 'function',
                    hasRemoveAll: typeof api.removeAllFiles === 'function'
                });

                // 1. Try Collection Clear (Standard for Blocks)
                try {
                    if (api.collection && typeof api.collection.clear === 'function') {
                        api.collection.clear();
                    } else if (typeof api.getCollection === 'function') {
                        const coll = api.getCollection();
                        if (coll && typeof coll.clear === 'function') coll.clear();
                    }
                } catch (e) {
                    console.warn(`[Uploadcare ${path}] collection clear error:`, e);
                }

                // 2. Try removeAllFiles
                try {
                    if (typeof api.removeAllFiles === 'function') {
                        api.removeAllFiles();
                    }
                } catch (e) {}

                // 3. Try value reset
                try {
                    if (typeof api.value === 'function') {
                        api.value([]);
                    } else {
                        api.value = [];
                    }
                } catch (e) {}
            } else {
                console.warn(`[Uploadcare ${path}] No API discovered for clearing`);
            }

            // Also try to reach into form-input if possible
            try {
                const formInput = this.$el.querySelector('uc-form-input');
                if (formInput && typeof formInput.getAPI === 'function') {
                    const fiApi = formInput.getAPI();
                    if (fiApi) {
                        // console.log(`[Uploadcare ${path}] resetting uc-form-input via API`);
                        fiApi.value = this.isMultiple ? [] : '';
                    }
                }
            } catch (e) {}

            if (this.uploadedFiles !== (this.isMultiple ? '[]' : '')) {
                this.uploadedFiles = this.isMultiple ? '[]' : '';
                this.isLocalUpdate = true;
                
                if (emitStateChange) {
                    this.state = this.uploadedFiles;
                }
            }
        }
    };
}