<x-dynamic-component :component="$getFieldWrapperView()" :field="$field">
    <div x-data="uploadcareField()" x-init="initUploadcare('{{ $getStatePath() }}')">
        <uc-config ctx-name="{{ $getStatePath() }}" pubkey="{{ $field->getPublicKey() }}"
            @if ($field->isMultiple()) multiple @endif
            @if ($field->getMultipleMin() > 0) multiple-min="{{ $field->getMultipleMin() }}" @endif
            @if ($field->getMultipleMax() > 0) multiple-max="{{ $field->getMultipleMax() }}" @endif
            @if ($field->isImagesOnly()) img-only @endif group-output>
        </uc-config>

        <uc-upload-ctx-provider ctx-name="{{ $getStatePath() }}">
            <uc-file-uploader-{{ $field->getUploaderStyle() }} ctx-name="{{ $getStatePath() }}">
                <uc-form-input ctx-name="{{ $getStatePath() }}" wire:model="{{ $getStatePath() }}"></uc-form-input>
                </uc-file-uploader-{{ $field->getUploaderStyle() }}>
        </uc-upload-ctx-provider>

        <input type="hidden" x-model="uploadedFiles" x-ref="hiddenInput" :value="@entangle($getStatePath())" />
        @if ($field->getState())
            <div class="grid grid-cols-1 gap-4 mt-4">
                <div class="flex items">
                    <img src="{{ $field->getState() }}" alt="" class="w-20 h-20 object-cover">
                </div>
            </div>
        @endif
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
        function uploadcareField() {
            return {
                uploadedFiles: '',

                initUploadcare(statePath) {
                    console.log(statePath);
                    const uploader = document.querySelector(
                        `uc-file-uploader-{{ $field->getUploaderStyle() }}[ctx-name="${statePath}"]`);
                    const ctx = document.querySelector('uc-upload-ctx-provider');

                    ctx.addEventListener('file-upload-success', (e) => {
                        const file = e.detail.cdnUrl;

                        this.uploadedFiles = file;

                        // Trigger Alpine.js reactivity
                        this.$nextTick(() => {
                            this.$refs.hiddenInput.value = file;
                            this.$refs.hiddenInput.dispatchEvent(new Event('input', {
                                bubbles: true
                            }));
                        });

                        // Livewire 3 supports emitting events via Alpine's `$wire` directly
                        //this.$wire.fileUploaded(file); // Using Alpine's $wire
                    });
                },
            };
        }
    </script>
@endpush
