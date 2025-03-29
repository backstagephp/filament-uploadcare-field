export default function uploadcareField(config) {
    return {
        // state: config.state,
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

        init() {
            this.initUploadcare();
        },

        initUploadcare() {
            const initializeUploader = () => {
                this.ctx = document.querySelector(`uc-upload-ctx-provider[ctx-name="${this.statePath}"]`);

                // Try to get the API
                let api;
                try {
                    api = this.ctx?.getAPI();

                    // Test if the API is actually ready
                    if (!api || !api.addFileFromCdnUrl) {
                        setTimeout(initializeUploader, 100);
                        return;
                    }
                } catch (e) {
                    setTimeout(initializeUploader, 100);
                    return;
                }

                if (!this.ctx || !api) {
                    return;
                }

                // Initialize with existing state if available
                if (this.initialState) {
                    try {
                        const parsedState = typeof this.initialState === 'string' ? 
                            JSON.parse(this.initialState) : this.initialState;
                        
                        if (Array.isArray(parsedState)) {
                            parsedState.forEach(item => {
                                const url = typeof item === 'object' ? item.cdnUrl : item;
                                api.addFileFromCdnUrl(url);
                            });
                        } else {
                            const url = typeof parsedState === 'object' ? parsedState.cdnUrl : parsedState;
                            api.addFileFromCdnUrl(url);
                        }

                        this.uploadedFiles = JSON.stringify(parsedState);
                    } catch (e) {
                        console.error('Error parsing initialState:', e);
                    }
                }

                // Set up event listeners
                this.ctx.addEventListener('file-upload-success', (e) => {
                    const fileData = e.detail.cdnUrl;
                    const currentFiles = this.uploadedFiles ? JSON.parse(this.uploadedFiles) : [];
                    
                    currentFiles.push(fileData);
                    this.uploadedFiles = JSON.stringify(currentFiles);
                    
                    this.state = this.uploadedFiles;
                });

                this.ctx.addEventListener('file-url-changed', (e) => {
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
                        
                        this.uploadedFiles = JSON.stringify(currentFiles);
                        this.state = this.uploadedFiles;
                    }
                });

                this.ctx.addEventListener('file-removed', (e) => {
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
                    
                    this.uploadedFiles = JSON.stringify(currentFiles);
                    this.state = this.uploadedFiles;
                });
            };

            // Start initialization
            initializeUploader();
        }
    };
} 