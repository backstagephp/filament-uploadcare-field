<x-dynamic-component :component="$getFieldWrapperView()" :field="$field">
    <div x-data="uploadcareField()" x-init="initUploadcare('{{ $getStatePath() }}', @js($field->getState()))" wire:ignore.self>
        <uc-config ctx-name="{{ $getStatePath() }}" pubkey="{{ $field->getPublicKey() }}" use-cloud-image-editor="true"
            @if ($field->isMultiple()) multiple @endif
            @if ($field->getMultipleMin() > 0) multiple-min="{{ $field->getMultipleMin() }}" @endif
            @if ($field->getMultipleMax() > 0) multiple-max="{{ $field->getMultipleMax() }}" @endif
            @if ($field->isImagesOnly()) img-only @endif group-output
            addFileFromCdnUrl="https://ucarecdn.com/b07ff2d9-def4-407e-b7d3-44a3c88a5ba3/">
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
                        api.addFileFromCdnUrl(initialState);
                        @this.set(statePath, initialState); // Synchronize with Livewire
                    }

                    this.ctx.addEventListener('file-upload-success', (e) => {
                        const file = e.detail.cdnUrl;

                        this.uploadedFiles = file;

                        this.$refs.hiddenInput.value = file;
                        this.$refs.hiddenInput.dispatchEvent(
                            new Event('input', {
                                bubbles: true
                            })
                        );
                        @this.set(statePath, file); // Synchronize with Livewire
                    });
                },
            };
        }
    </script>
@endpush
