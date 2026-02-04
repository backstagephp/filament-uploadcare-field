import { DoneButtonHider } from './done-button-hider.js';

export default function uploadcareField(config) {
    if (!window._initializedUploadcareContexts) {
        window._initializedUploadcareContexts = new Set();
    }
    
    return {
        name: config.statePath || 'unknown',
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
        isUpdatingState: false,

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
                this.uploadedFiles = (this.isMultiple || this.isWithMetadata) ? '[]' : '';
                // Don't set this.state during initialization - it triggers Livewire's dirty tracking
                // The state is already synced via entangle(), we only need to track uploadedFiles locally
            }
        },

        loadInitialState(api) {
            try {
                const parsedState = this.parseInitialState();
                this.addFilesFromInitialState(api, parsedState);
                this.stateHasBeenInitialized = true;
                // Don't set this.state during initialization - it triggers Livewire's dirty tracking
                // The state is already synced via entangle(), we only need to track uploadedFiles locally
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

                if (!url || !this.isValidUrl(url)) {
                    return;
                }

                const uuid = this.extractUuidFromUrl(url);
                if (uuid && typeof api.addFileFromUuid === 'function') {
                    try {
                        const hasModifiers = cdnUrlModifiers || (url && url.includes('/-/'));
                        
                        if (hasModifiers && typeof api.addFileFromCdnUrl === 'function') {
                            let fullUrl = url;
                            
                            if (cdnUrlModifiers) {
                                const baseUrl = url.split('/-/')[0];
                                // Ensure strict reconstruction if explicit modifiers are provided
                                let modifiers = cdnUrlModifiers;
                                if (modifiers.startsWith('/')) modifiers = modifiers.substring(1);
                                fullUrl = baseUrl + (baseUrl.endsWith('/') ? '' : '/') + (modifiers.startsWith('-/') ? '' : '-/') + modifiers;
                            }
                            
                            api.addFileFromCdnUrl(fullUrl);
                        } else {
                            api.addFileFromUuid(uuid);
                        }
                    } catch (e) {
                        // console.error(`Failed to add file ${index} with UUID ${uuid}:`, e);
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
            this.$watch('state', (value) => {
                if (this.isLocalUpdate) {
                    this.isLocalUpdate = false;
                    return;
                }

                // Initial basic logic: Clear files if state becomes empty
                if (value === null || value === undefined || value === '' || value === '[]' || (Array.isArray(value) && value.length === 0)) {
                    this.clearAllFiles(false);
                } else if (value) {
                    // Try to re-sync or add files if state changes externally
                    // This handles cases where state is set externally to a new non-empty value
                    if (this.isInitialized) {
                       this.addFilesFromState(value);
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
            
            const currentUrls = currentFiles.map(file => {
                // FIX: Check for null/undefined file before accessing properties
                if (!file) return null;
                const url = (file && typeof file === 'object') ? file.cdnUrl : file;
                return url;
            }).filter(Boolean); // Filter out nulls
            

            filesToAdd.forEach((item, index) => {
                if (!item) {
                     console.warn(`[Uploadcare] Skipping null item at index ${index}`);
                     return; 
                }

                // FIX: Check for null/undefined item before accessing properties (double safety)
                const url = (item && typeof item === 'object') ? item.cdnUrl : item;
                
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
                }
                
                const formatted = this.formatFilesForState(parsed);
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
                this.pendingUploads.push(fileData);

                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
                
                debounceTimer = setTimeout(() => {
                    try {
                        let currentFiles = this.getCurrentFiles();
                        
                        for (const file of this.pendingUploads) {
                            currentFiles = this.updateFilesList(currentFiles, file);
                        }
                        
                        this.updateState(currentFiles);
                        this.pendingUploads = [];
                        
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
                if (e.target.getAttribute('ctx-name') !== this.uniqueContextName && e.target !== this.ctx && !this.ctx.contains(e.target)) {
                    return;
                }

                const fileDetails = e.detail;
                
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
                
                debounceTimer = setTimeout(() => {
                    try {
                        const currentFiles = this.getCurrentFiles();
                        const updatedFiles = this.updateFileUrl(currentFiles, fileDetails);
                        
                        
                        this.updateState(updatedFiles);
                    } catch (n) {
                        console.error('Error updating state after URL change:', n);
                    }
                }, 100);
            };
        },

        createFileRemovedHandler(api) {
            let debounceTimer = null;
            
            return (e) => {
                if (e.target.getAttribute('ctx-name') !== this.uniqueContextName && e.target !== this.ctx && !this.ctx.contains(e.target)) {
                    return;
                }

                const removedFile = e.detail;
                this.pendingRemovals.push(removedFile);

                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
                
                debounceTimer = setTimeout(() => {
                    try {
                        let currentFiles = this.getCurrentFiles();
                        for (const r of this.pendingRemovals) {
                            currentFiles = this.removeFile(currentFiles, r);
                        }
                        this.updateState(currentFiles);
                        this.pendingRemovals = [];
                    } catch (n) {
                        console.error('Error in handleFileRemoved:', n);
                    }
                }, 100);
            };
        },

        createFormInputChangeHandler(api) {
            return (t) => {};
        },

        getCurrentFiles() {
            try {
                let files = this.uploadedFiles ? JSON.parse(this.uploadedFiles) : [];
                return Array.isArray(files) ? files : [];
            } catch (e) {
                return [];
            }
        },

        updateFilesList(currentFiles, newFile) {
            if (this.isMultiple) {
                const uuid = this.extractUuidFromUrl(newFile);
                const isDuplicate = currentFiles.some(file => this.extractUuidFromUrl(file) === uuid);
                return isDuplicate ? currentFiles : [...currentFiles, newFile];
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

                updatedFile = { ...originalFile, ...fileDetails };

                // Extract and persist modifiers from the new URL if present
                if (updatedFile.cdnUrl) {
                    const extractedModifiers = this.extractModifiersFromUrl(updatedFile.cdnUrl);
                    if (extractedModifiers) {
                        updatedFile.cdnUrlModifiers = extractedModifiers;
                    } else {
                        updatedFile.cdnUrlModifiers = null;
                        delete updatedFile.cdnUrlModifiers;
                    }
                }
            } else {
                updatedFile = fileDetails.cdnUrl;
            }

            if (this.isMultiple) {
                const newFiles = [...currentFiles];
                newFiles[fileIndex] = updatedFile;
                return newFiles;
            }
            return [updatedFile];
        },

        removeFile(currentFiles, removedFile) {
            const index = this.findFileIndex(currentFiles, removedFile.uuid);
            if (index === -1) return currentFiles;

            if (this.isMultiple) {
                const newFiles = [...currentFiles];
                newFiles.splice(index, 1);
                return newFiles;
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
            if (this.isUpdatingState) return;
            this.isUpdatingState = true;

            try {
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
                const newState = this.buildStateFromFiles(finalFiles);
                
                const currentStateNormalized = this.normalizeStateValue(this.uploadedFiles);
                const newStateNormalized = this.normalizeStateValue(newState);
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
            } finally {
                this.isUpdatingState = false;
            }
        },

        formatFilesForState(files) {
            if (!files) return [];
            if (!Array.isArray(files)) return [];
            
            return files.map(file => {
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
            
            const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
            if (uuidPattern.test(url)) {
                return url;
            }
            
            const uuidMatch = url.match(/\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:\/|$)/i);
            return uuidMatch ? uuidMatch[1] : null;
        },

        extractModifiersFromUrl(url) {
            if (!url || typeof url !== 'string') return '';
            
            const uuid = this.extractUuidFromUrl(url);
            if (!uuid) return '';
            
            const parts = url.split(uuid);
            if (parts.length < 2) return '';
            
            let modifiers = parts[1];
            if (modifiers.startsWith('/')) modifiers = modifiers.substring(1);
            if (modifiers.endsWith('/')) modifiers = modifiers.substring(0, modifiers.length - 1);
            
            return modifiers;
        },

        async syncStateWithUploadcare(api) {
            try {
                let currentFiles = this.getCurrentFilesFromUploadcare(api);
                
                if (currentFiles.length > 0) {
                    const flattenedFiles = [];
                    for (const file of currentFiles) {
                         const url = (file && typeof file === 'object') ? file.cdnUrl : file;
                         if (typeof url === 'string' && url.match(/[a-f0-9-]{36}~[0-9]+/)) {
                             try {
                                 const groupFiles = await this.fetchGroupFiles(url);
                                 flattenedFiles.push(...groupFiles);
                             } catch (e) {
                                 flattenedFiles.push(file);
                             }
                         } else {
                             flattenedFiles.push(file);
                         }
                    }
                    currentFiles = flattenedFiles;
                }

                const formattedFiles = this.formatFilesForState(currentFiles);
                const newState = this.buildStateFromFiles(formattedFiles);
                
                if (this.normalizeStateValue(this.uploadedFiles) !== this.normalizeStateValue(newState)) {
                    this.uploadedFiles = newState;
                    this.isLocalUpdate = true;
                    this.state = this.uploadedFiles;
                }
            } catch (error) {
                console.error('Error syncing state with Uploadcare:', error);
            }
        },

        async fetchGroupFiles(groupUrlOrUuid) {
            let groupId = groupUrlOrUuid;
            if (groupUrlOrUuid.includes('ucarecdn.com') || groupUrlOrUuid.includes('ucarecd.net')) {
                const match = groupUrlOrUuid.match(/\/([a-f0-9-]{36}~[0-9]+)/);
                if (match) groupId = match[1];
            }
            
            const response = await fetch(`https://upload.uploadcare.com/group/info/?pub_key=${this.publicKey}&group_id=${groupId}`);
            if (!response.ok) throw new Error(`Failed to fetch group info: ${response.statusText}`);

            const data = await response.json();
            if (!data.files) return [];

            return data.files.map(file => {
                const cdnUrl = `https://ucarecdn.com/${file.uuid}/`;
                return this.isWithMetadata ? {
                    uuid: file.uuid,
                    cdnUrl: cdnUrl,
                    name: file.original_filename,
                    size: file.size,
                    mimeType: file.mime_type,
                    isImage: file.is_image,
                } : cdnUrl;
            });
        },

        buildStateFromFiles(formattedFiles) {
            if (this.isMultiple || this.isWithMetadata) return JSON.stringify(formattedFiles);
            if (formattedFiles.length > 0) return formattedFiles[0];
            return '';
        },

        getCurrentFilesFromUploadcare(api) {
            try {
                if (api && typeof api.value === 'function') {
                    const value = api.value();
                    if (value) {
                         const files = Array.isArray(value) ? value : this.parseFormInputValue(value);
                         return files.filter(item => item != null);
                    }
                }

                const formInput = this.$el.querySelector('uc-form-input input');
                if (formInput) {
                    return this.parseFormInputValue(formInput.value).filter(item => item != null);
                }
                return [];
            } catch (error) {
                console.error('Error getting current files from Uploadcare:', error);
                return [];
            }
        },

        parseFormInputValue(inputValue) {
            if (!inputValue || (typeof inputValue === 'string' && inputValue.trim() === '')) return [];
            if (typeof inputValue === 'object') return [inputValue];

            try {
                const parsed = JSON.parse(inputValue);
                if (Array.isArray(parsed)) return parsed.filter(file => file !== null && file !== '');
                return (parsed !== null && parsed !== '') ? [parsed] : [];
            } catch (e) {
                return (typeof inputValue === 'string' && inputValue.trim() !== '') ? [inputValue] : [];
            }
        },

        clearAllFiles(emitStateChange = true) {
            const api = this.getUploadcareApi();
            if (api) {
                try {
                    if (api.collection && typeof api.collection.clear === 'function') api.collection.clear();
                    else if (typeof api.getCollection === 'function') {
                         const collection = api.getCollection();
                         if (collection && typeof collection.clear === 'function') collection.clear();
                    }
                } catch (e) {}
                try { if (typeof api.removeAllFiles === 'function') api.removeAllFiles(); } catch (e) {}
                try { if (typeof api.value === 'function') api.value(this.isMultiple ? [] : ''); } catch (e) {}
            }
            
            if (this.uploadedFiles !== ((this.isMultiple || this.isWithMetadata) ? '[]' : '')) {
                this.uploadedFiles = (this.isMultiple || this.isWithMetadata) ? '[]' : '';
                this.isLocalUpdate = true;
                if (emitStateChange) this.state = this.uploadedFiles;
            }
        }
    };
}
