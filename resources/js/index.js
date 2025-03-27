  if (typeof themeHandler === 'undefined') {
    const themeHandler = () => {
        const uploaders = document.querySelectorAll('uc-file-uploader-inline');
        if (!uploaders.length || !localStorage.getItem('theme')) return;

        const userTheme = localStorage.getItem('theme');
        const theme = userTheme === 'system' ?
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') :
            userTheme;

        uploaders.forEach(uploader => uploader.classList.add(`uc-${theme}`));
    };

    // Apply the theme on livewire navigation
    document.addEventListener('livewire:navigated', () => {
        themeHandler();
    });

    // Apply the theme on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        themeHandler();
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const doneButton = document.querySelector('.uc-done-btn.uc-primary-btn');
    if (doneButton) {
        doneButton.style.display = 'none';
    }
});

function uploadcareField() {
    return {
        uploadedFiles: '',
        removeEventListeners: null,

        initUploadcare(statePath, initialState) {
            if (this.removeEventListeners) {
                this.removeEventListeners();
            }

            const initializeUploader = () => {
                this.ctx = document.querySelector(`uc-upload-ctx-provider[ctx-name="${statePath}"]`);

                // Try to get the API
                let api;
                try {
                    api = this.ctx?.getAPI();

                    // Test if the API is actually ready by trying to access a known method
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

                // TODO: Temporary hardcoded fix: remove the required attribute from any input within uc-form-input
                const required = false;

                if (!required) {
                    setTimeout(() => {
                        const inputs = document.querySelectorAll('uc-form-input input[required]');
                        inputs.forEach(input => {
                            input.removeAttribute('required');
                        });
                    }, 100);
                }
                
                // Rest of your initialization code...
                if (initialState) {
                    try {
                        initialState = JSON.parse(initialState);
                    } catch (e) {
                        console.error('initialState is not a valid JSON string');
                    }

                    if (Array.isArray(initialState)) {
                        initialState.forEach(item => {
                            const url = typeof item === 'object' ? item.cdnUrl : item;
                            api.addFileFromCdnUrl(url);
                        });
                    } else {
                        const url = typeof initialState === 'object' ? initialState.cdnUrl : initialState;
                        api.addFileFromCdnUrl(url);
                    }

                    this.set(statePath, JSON.stringify(initialState));
                }

                // Set up event listeners
                const handleFileUploadSuccess = (e) => {
                    const fileData = e.detail.cdnUrl;
                    const currentFiles = this.uploadedFiles ? JSON.parse(this.uploadedFiles) : [];
                    
                    currentFiles.push(fileData);
                    this.uploadedFiles = JSON.stringify(currentFiles);
                    
                    this.$refs.hiddenInput.value = this.uploadedFiles;
                    this.$refs.hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    this.set(statePath, this.uploadedFiles);
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
                            currentFiles[fileIndex] ='fileDetails.cdnUrl';
                        }
                        
                        this.uploadedFiles = JSON.stringify(currentFiles);
                        
                        this.$refs.hiddenInput.value = this.uploadedFiles;
                        this.$refs.hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
                        
                        this.set(statePath, this.uploadedFiles);
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
                    
                    this.uploadedFiles = JSON.stringify(currentFiles);
                    
                    this.$refs.hiddenInput.value = this.uploadedFiles;
                    this.$refs.hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    this.set(statePath, this.uploadedFiles);
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
        },
    };
}