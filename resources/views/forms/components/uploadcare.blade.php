<div wire:key="uploadcare-wrapper-{{ $getStatePath() }}">
    <x-dynamic-component :component="$getFieldWrapperView()" :field="$field">
        @php
            $sourceList = $field->getSourceList();
            $sources = explode(',', $sourceList);
            $initialClass = count($sources) === 1 ? 'single-source' : '';
            $style = $field->getUploaderStyle();
            $cssFile = "https://cdn.jsdelivr.net/npm/@uploadcare/file-uploader@v1/web/uc-file-uploader-{$style}.min.css";
            $jsFile = "https://cdn.jsdelivr.net/npm/@uploadcare/file-uploader@v1/web/uc-file-uploader-{$style}.min.js";
            $uniqueContextName = $getStatePath() . '-' . \Illuminate\Support\Str::random();
        @endphp

        <div class="uploadcare-wrapper {{ $initialClass }}">
            <div
                wire:ignore
                x-load
                x-load-src="{{ \Filament\Support\Facades\FilamentAsset::getAlpineComponentSrc('uploadcare', 'backstage/filament-uploadcare-field') }}"
                class="relative z-0 rounded-md bg-white dark:bg-gray-900 focus-within:ring focus-within:ring-primary-500 focus-within:z-10"
                x-data="uploadcareField({
                    state: $wire.{{ $applyStateBindingModifiers("entangle('{$getStatePath()}')", isOptimisticallyLive: true) }},
                    statePath: '{{ $getStatePath() }}',
                    uniqueContextName: '{{ $uniqueContextName }}',
                    initialState: @js($field->getState()),
                    publicKey: '{{ $field->getPublicKey() }}',
                    isMultiple: @js($field->isMultiple()),
                    multipleMin: {{ $field->getMultipleMin() ?: 0 }},
                    multipleMax: {{ $field->getMultipleMax() ?: 0 }},
                    isImagesOnly: @js($field->isImagesOnly()),
                    isWithMetadata: @js($field->isWithMetadata()),
                    accept: '{{ $field->getAcceptedFileTypes() }}',
                    sourceList: '{{ $field->getSourceList() }}',
                    uploaderStyle: '{{ $field->getUploaderStyle() }}'
                })"
                x-init="init()"
            >
                <uc-config ctx-name="{{ $uniqueContextName }}" pubkey="{{ $field->getPublicKey() }}" use-cloud-image-editor="true"
                    @if ($field->isMultiple()) multiple @endif
                    @if (! $field->isMultiple()) multiple="false" multiple-min="1" multiple-max="1" @endif
                    @if ($field->getMultipleMin() > 0) multiple-min="{{ $field->getMultipleMin() }}" @endif
                    @if ($field->getMultipleMax() > 0) multiple-max="{{ $field->getMultipleMax() }}" @endif
                    @if ($field->isImagesOnly()) img-only @else accept="{{ $field->getAcceptedFileTypes() }}" @endif group-output
                    @if (count(explode(',', $field->getSourceList())) > 1) source-list="{{ $field->getSourceList() }}" @endif
                    max-local-file-size-bytes="{{ $field->getMaxLocalFileSizeBytes() }}"
                    @if($field->getCropPreset()) crop-preset="{{ $field->getCropPreset() }}" @endif
                    @if($field->shouldRemoveCopyright()) remove-copyright @endif
                    @if($field->isRequired()) required="true" @endif
                    cdn-cname="{{ $field->getCdnCname() }}">
                </uc-config>

                <uc-upload-ctx-provider ctx-name="{{ $uniqueContextName }}" wire:ignore>
                    <uc-file-uploader-{{ $field->getUploaderStyle() }} ctx-name="{{ $uniqueContextName }}">
                        <uc-form-input ctx-name="{{ $uniqueContextName }}" wire:model="{{ $getStatePath() }}"></uc-form-input>
                    </uc-file-uploader-{{ $field->getUploaderStyle() }}>
                </uc-upload-ctx-provider>

                <input type="hidden" x-model="uploadedFiles" x-ref="hiddenInput" :value="state" />
            </div>
        </div>
        
        <link rel="stylesheet" href="{{ $cssFile }}">
        <script src="{{ $jsFile }}" defer type="module"></script>
    </x-dynamic-component>
</div>