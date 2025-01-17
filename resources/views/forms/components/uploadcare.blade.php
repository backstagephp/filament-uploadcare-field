<x-dynamic-component :component="$getFieldWrapperView()" :field="$field">
    @php
        $sourceList = $field->getSourceList();
        $sources = explode(',', $sourceList);
        $initialClass = count($sources) === 1 ? 'single-source' : '';
    @endphp

    <div x-data="uploadcareField()" x-init="initUploadcare('{{ $getStatePath() }}', @js($field->getState()))" wire:ignore.self class="uploadcare-wrapper {{ $initialClass }}">

        <uc-config ctx-name="{{ $getStatePath() }}" pubkey="{{ $field->getPublicKey() }}" use-cloud-image-editor="true"
            @if ($field->isMultiple()) multiple @endif
            @if ($field->getMultipleMin() > 0) multiple-min="{{ $field->getMultipleMin() }}" @endif
            @if ($field->getMultipleMax() > 0) multiple-max="{{ $field->getMultipleMax() }}" @endif
            @if ($field->isImagesOnly()) img-only @else accept="{{ $field->getAccept() }}" @endif group-output
            @if (count(explode(',', $field->getSourceList())) > 1) source-list="{{ $field->getSourceList() }}" @endif>
        </uc-config>

        <uc-upload-ctx-provider ctx-name="{{ $getStatePath() }}" wire:ignore>
            <uc-file-uploader-{{ $field->getUploaderStyle() }} ctx-name="{{ $getStatePath() }}">
                <uc-form-input ctx-name="{{ $getStatePath() }}" wire:model="{{ $getStatePath() }}"></uc-form-input>
                </uc-file-uploader-{{ $field->getUploaderStyle() }}>
        </uc-upload-ctx-provider>

        <input type="hidden" x-model="uploadedFiles" x-ref="hiddenInput" :value="@entangle($getStatePath())" />
    </div>
</x-dynamic-component>

@push('scripts')
    @php
        $style = $field->getUploaderStyle();
        $cssFile = "https://cdn.jsdelivr.net/npm/@uploadcare/file-uploader@v1/web/uc-file-uploader-{$style}.min.css";
        $jsFile = "https://cdn.jsdelivr.net/npm/@uploadcare/file-uploader@v1/web/uc-file-uploader-{$style}.min.js";
    @endphp
    <link rel="stylesheet" href="{{ $cssFile }}">
    <style>
        .uploadcare-wrapper {
            all: revert;
        }

        /* Move our layout control styles after the initial reset */
        body .uploadcare-wrapper.single-source uc-start-from .uc-content,
        body .uploadcare-wrapper.single-source uc-file-uploader-regular .uc-start-from .uc-content,
        body .uploadcare-wrapper.single-source uc-file-uploader-inline .uc-start-from .uc-content {
            display: flex !important;
            flex-direction: column !important;
            gap: calc(var(--uc-padding)* 2);
            width: 100%;
            height: 100%;
            padding: calc(var(--uc-padding)* 2);
            background-color: var(--uc-background);
        }

        body .uploadcare-wrapper:not(.single-source) uc-start-from .uc-content,
        body .uploadcare-wrapper:not(.single-source) uc-file-uploader-regular .uc-start-from .uc-content,
        body .uploadcare-wrapper:not(.single-source) uc-file-uploader-inline .uc-start-from .uc-content {
            display: grid !important;
            grid-auto-flow: row;
            gap: calc(var(--uc-padding)* 2);
            width: 100%;
            height: 100%;
            padding: calc(var(--uc-padding)* 2);
            background-color: var(--uc-background);
        }

        .uploadcare-wrapper :where(uc-file-uploader-regular,
            uc-file-uploader-minimal,
            uc-file-uploader-inline,
            uc-upload-ctx-provider,
            uc-form-input) {
            isolation: isolate;
        }

        .uploadcare-wrapper :where(.uc-done-btn,
            .uc-primary-btn,
            .uc-file-preview,
            .uc-dropzone) {
            all: revert;
            font-family: inherit;
            box-sizing: border-box;
        }

        .uploadcare-wrapper {
            position: relative;
            z-index: 1;
        }

        /* Hide source list when there's only one source */
        .uploadcare-wrapper.single-source uc-source-list {
            display: none !important;
        }

        .uc-image_container {
            height: 400px !important;
        }

        /* Dark theme customization */
        .uc-dark {
            --uc-background-dark: rgb(17 17 17);
            --uc-foreground-dark: rgb(229 229 229);
            --uc-primary-oklch-dark: 69% 0.1768 258.4;
            --uc-primary-dark: rgb(161 161 161);
            --uc-primary-hover-dark: rgb(113 113 113);
            --uc-primary-transparent-dark: rgba(161, 161, 161, 0.075);
            --uc-primary-foreground-dark: rgb(255 255 255);
            --uc-secondary-dark: rgba(229, 229, 229, 0.07);
            --uc-secondary-hover-dark: rgba(229, 229, 229, 0.1);
            --uc-secondary-foreground-dark: rgb(229 229 229);
            --uc-muted-dark: rgb(55 55 55);
            --uc-muted-foreground-dark: rgb(156 156 156);
            --uc-destructive-dark: rgba(239, 68, 68, 0.1);
            --uc-destructive-foreground-dark: rgb(239 68 68);
            --uc-border-dark: rgb(64 64 64);
            --uc-dialog-shadow-dark: 0px 6px 20px rgba(0, 0, 0, 0.25);

            /* SimpleBtn */
            --uc-simple-btn-dark: rgb(55 55 55);
            --uc-simple-btn-hover-dark: rgb(75 75 75);
            --uc-simple-btn-foreground-dark: rgb(255 255 255);
        }
    </style>

    <script type="module">
        import * as UC from "{{ $jsFile }}";
        UC.defineComponents(UC);

        const handleSourceList = (wrapper) => {
            if (wrapper.classList.contains('processed')) return;

            const config = wrapper.querySelector('uc-config');
            if (!config) return;

            const sourceList = config.getAttribute('source-list') || '';
            const sources = sourceList.split(',');

            if (sources.length === 1) {
                wrapper.classList.add('single-source');
            }

            // Mark as processed to avoid reprocessing
            wrapper.classList.add('processed');
        };

        // Initial check for existing elements
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.uploadcare-wrapper').forEach(handleSourceList);
        });

        // Watch for new elements
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Check if it's an element node
                        if (node.classList?.contains('uploadcare-wrapper')) {
                            handleSourceList(node);
                        }
                        // Also check children of added nodes
                        node.querySelectorAll?.('.uploadcare-wrapper')?.forEach(handleSourceList);
                    }
                });
            });
        });

        // Start observing with more specific options
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['source-list']
        });
    </script>
@endpush

@push('scripts')
    <script>
        // Define themeHandler only if it is not already defined
        if (typeof themeHandler === 'undefined') {
            const themeHandler = () => {
                const uploaders = document.querySelectorAll('uc-file-uploader-{{ $field->getUploaderStyle() }}');
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
    </script>
@endpush

@push('scripts')
    <script>
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

                        // Rest of your initialization code...
                        if (initialState) {
                            try {
                                initialState = JSON.parse(initialState);
                            } catch (e) {
                                console.error('initialState is not a valid JSON string');
                            }
                            // ... rest of the code ...
                        }
                    };

                    // Start initialization
                    initializeUploader();
                },
            };
        }
    </script>
@endpush
