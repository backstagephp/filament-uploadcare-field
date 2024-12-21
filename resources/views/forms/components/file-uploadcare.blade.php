<x-dynamic-component :component="$getFieldWrapperView()" :field="$field">
    <div x-data="uploadcareField()" x-init="initUploadcare('{{ $getStatePath() }}', @js($field->getState()))" wire:ignore.self>
        <uc-config ctx-name="{{ $getStatePath() }}" pubkey="{{ $field->getPublicKey() }}" use-cloud-image-editor="true"
            @if ($field->isMultiple()) multiple @endif
            @if ($field->getMultipleMin() > 0) multiple-min="{{ $field->getMultipleMin() }}" @endif
            @if ($field->getMultipleMax() > 0) multiple-max="{{ $field->getMultipleMax() }}" @endif
            @if ($field->isImagesOnly()) img-only @endif group-output>
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
    <script type="module">
        import * as UC from "{{ $jsFile }}";
        UC.defineComponents(UC);
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
                initUploadcare(statePath, initialState) {
                    this.ctx = document.querySelector('uc-upload-ctx-provider');

                    const uploaderCtx = document.querySelector('uc-upload-ctx-provider');
                    const api = uploaderCtx.getAPI();
                    const collectionState = api.getOutputCollectionState();

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

                        @this.set(statePath, JSON.stringify(initialState));
                    }

                    this.ctx.addEventListener('file-upload-success', (e) => {
                        const fileData = {{ $field->isWithMetadata() ? 'e.detail' : 'e.detail.cdnUrl' }};
                        const currentFiles = this.uploadedFiles ? JSON.parse(this.uploadedFiles) : [];

                        currentFiles.push(fileData);
                        this.uploadedFiles = JSON.stringify(currentFiles);

                        this.$refs.hiddenInput.value = this.uploadedFiles;
                        this.$refs.hiddenInput.dispatchEvent(
                            new Event('input', {
                                bubbles: true
                            })
                        );

                        @this.set(statePath, this.uploadedFiles);
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
                                currentFiles[fileIndex] =
                                    {{ $field->isWithMetadata() ? 'fileDetails' : 'fileDetails.cdnUrl' }};
                            }

                            this.uploadedFiles = JSON.stringify(currentFiles);

                            this.$refs.hiddenInput.value = this.uploadedFiles;
                            this.$refs.hiddenInput.dispatchEvent(
                                new Event('input', {
                                    bubbles: true
                                })
                            );

                            @this.set(statePath, this.uploadedFiles);
                        }
                    });

                    this.ctx.addEventListener('file-removed', (e) => {
                        const fileData = {{ $field->isWithMetadata() ? 'e.detail' : 'e.detail.cdnUrl' }};
                        const currentFiles = this.uploadedFiles ? JSON.parse(this.uploadedFiles) : [];

                        const findFile = (files, fileToRemove) => {
                            return files.findIndex(file => {
                                const fileUrl = typeof file === 'object' ? file.cdnUrl : file;
                                const removeUrl = typeof fileToRemove === 'object' ? fileToRemove
                                    .cdnUrl : fileToRemove;
                                return fileUrl === removeUrl;
                            });
                        };

                        const index = findFile(currentFiles, fileData);
                        if (index > -1) {
                            currentFiles.splice(index, 1);
                        }

                        this.uploadedFiles = JSON.stringify(currentFiles);

                        this.$refs.hiddenInput.value = this.uploadedFiles;
                        this.$refs.hiddenInput.dispatchEvent(
                            new Event('input', {
                                bubbles: true
                            })
                        );

                        @this.set(statePath, this.uploadedFiles);
                    });
                },
            };
        }
    </script>
@endpush
