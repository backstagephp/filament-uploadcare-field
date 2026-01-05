<?php

namespace Backstage\Uploadcare\Forms\Components;

use Backstage\Uploadcare\Enums\Style;
use Backstage\UploadcareField\Uploadcare as Factory;
use Filament\Forms\Components\Field;
use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;

class Uploadcare extends Field
{
    protected string $view = 'filament-uploadcare-field::forms.components.uploadcare';

    protected string $publicKey;

    protected bool $multiple = false;

    protected int $multipleMin = 0;

    protected int $multipleMax = 0;

    protected bool $imgOnly = false;

    protected bool $withMetadata = false;

    protected string $fieldUlid = '';

    protected Style $uploaderStyle = Style::INLINE;

    protected array $sourceList = [
        'local',
    ];

    protected array $acceptedFileTypes = [
        'image/*',
        'video/*',
        'audio/*',
        'application/*',
    ];

    protected int $maxLocalFileSizeBytes = 524288000; // 500MB default

    protected string $cropPreset = '';

    protected bool $removeCopyright = false;

    protected string $cdnCname = 'https://ucarecdn.com';

    protected string $dbCdnCname = '';

    protected bool $transformUrlsForDb = false;

    public static function make(?string $name = null): static
    {
        return parent::make($name)
            ->publicKey(config('services.uploadcare.public_key'))
            ->removeCopyright();
    }

    public function publicKey(string $publicKey): static
    {
        $this->publicKey = $publicKey;

        return $this;
    }

    public function multiple(bool $multiple = true, int $min = 0, int $max = 0): static
    {
        $this->multiple = $multiple;
        $this->multipleMin = $min;
        $this->multipleMax = $max;

        return $this;
    }

    public function imagesOnly(bool $imgOnly = true): static
    {
        $this->imgOnly = $imgOnly;

        return $this;
    }

    public function image(bool $image = true): static
    {
        $this->imgOnly = $image;

        return $this;
    }

    public function uploaderStyle(Style $style = Style::INLINE): static
    {
        $this->uploaderStyle = $style;

        return $this;
    }

    public function getPublicKey(): string
    {
        return $this->publicKey;
    }

    public function fieldUlid(string $ulid): static
    {
        $this->fieldUlid = $ulid;

        return $this;
    }

    public function getFieldUlid(): string
    {
        if ($this->fieldUlid) {
            return $this->fieldUlid;
        }

        $name = $this->getName();
        if (str_contains($name, '.')) {
            $parts = explode('.', $name);
            foreach ($parts as $part) {
                if (preg_match('/^[0-9A-HJKMNP-TV-Z]{26}$/i', $part)) {
                    return $part;
                }
            }
            return end($parts);
        }

        return $name;
    }

    public function isMultiple(): bool
    {
        return $this->multiple;
    }

    public function getMultipleMin(): int
    {
        return $this->multipleMin;
    }

    public function getMultipleMax(): int
    {
        return $this->multipleMax;
    }

    public function isImagesOnly(): bool
    {
        return $this->imgOnly;
    }

    public function getUploaderStyle(): string
    {
        return $this->uploaderStyle->value;
    }

    public function withMetadata(bool $withMetadata = true): static
    {
        $this->withMetadata = $withMetadata;

        return $this;
    }

    public function isWithMetadata(): bool
    {
        return $this->withMetadata;
    }

    public function sourceList(array | string $sourceList): static
    {
        $this->sourceList = is_array($sourceList) ? $sourceList : [$sourceList];

        return $this;
    }

    public function getSourceList(): string
    {
        return implode(',', $this->sourceList);
    }

    /** @deprecated use acceptedFileTypes() instead */
    public function accept(array | string $accept): static
    {
        $this->acceptedFileTypes = is_array($accept) ? $accept : [$accept];

        return $this;
    }

    public function acceptedFileTypes(array | string $acceptedFileTypes): static
    {
        $this->acceptedFileTypes = is_array($acceptedFileTypes) ? $acceptedFileTypes : [$acceptedFileTypes];

        return $this;
    }

    public function getAcceptedFileTypes(): string
    {
        return implode(',', $this->acceptedFileTypes);
    }

    public function maxLocalFileSizeBytes(int $bytes): static
    {
        $this->maxLocalFileSizeBytes = $bytes;

        return $this;
    }

    public function getMaxLocalFileSizeBytes(): int
    {
        return $this->maxLocalFileSizeBytes;
    }

    public function cropPreset(string | array $preset): static
    {
        // Handle array input by converting to comma-separated string
        if (is_array($preset)) {
            $preset = implode(', ', $preset);
        }

        if ($preset === '') {
            $this->cropPreset = $preset;

            return $this;
        }

        // Split by comma and trim each value
        $presets = array_map('trim', explode(',', $preset));

        foreach ($presets as $value) {
            // Allow 'free' or aspect ratio format like '1:1', '16:9', or '1.91:1' (supports decimals)
            if ($value !== 'free' && ! preg_match('/^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/', $value)) {
                throw new InvalidArgumentException(
                    'Crop preset must be empty string, "free", aspect ratio (e.g., "1:1", "1.91:1"), comma-separated string (e.g., "free, 1:1, 16:9"), or array (e.g., ["free", "1:1", "16:9"]).'
                );
            }
        }

        $this->cropPreset = $preset;

        return $this;
    }

    // For compatibility with the default Filament File Upload field
    public function imageEditorAspectRatios(string | array $aspectRatios): static
    {
        $this->cropPreset($aspectRatios);

        return $this;
    }

    public function getCropPreset(): string
    {
        return $this->cropPreset;
    }

    public function removeCopyright(bool $remove = true): static
    {
        $this->removeCopyright = $remove;

        return $this;
    }

    public function shouldRemoveCopyright(): bool
    {
        return $this->removeCopyright;
    }

    public function cdnCname(string $cdnCname): static
    {
        $this->cdnCname = $cdnCname;

        return $this;
    }

    public function getCdnCname(): string
    {
        return $this->cdnCname;
    }

    public function dbCdnCname(string $dbCdnCname): static
    {
        $this->dbCdnCname = $dbCdnCname;
        $this->transformUrlsForDb = ! empty($dbCdnCname);

        return $this;
    }

    public function getDbCdnCname(): string
    {
        return $this->dbCdnCname ?: $this->cdnCname;
    }

    public function shouldTransformUrlsForDb(): bool
    {
        return $this->transformUrlsForDb;
    }

    public function maxLocalFileSize(string $size): static
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $number = (int) preg_replace('/[^0-9]/', '', $size);
        $unit = strtoupper(preg_replace('/[^A-Za-z]/', '', $size));

        if (! in_array($unit, $units)) {
            throw new InvalidArgumentException('Invalid size unit. Use B, KB, MB, GB, or TB.');
        }

        $exponent = array_search($unit, $units);
        $this->maxLocalFileSizeBytes = $number * (1024 ** $exponent);

        return $this;
    }

    public function getState(): mixed
    {
        $state = parent::getState();
        
        // Handle double-encoded JSON or JSON strings
        if (is_string($state) && json_validate($state)) {
            $decoded = json_decode($state, true);
            if (is_array($decoded)) {
                $state = $decoded;
            }
        }

        if ($state === null || $state === '' || $state === []) {
             return $state;
        }

        // If it's already a rich object (single file field), we're done resolving.
        if (is_array($state) && ! array_is_list($state) && (isset($state['uuid']) || isset($state['cdnUrl']))) {
            return $state;
        }

        // If it's a list where the first item is already a rich object, we're done resolving.
        if (is_array($state) && array_is_list($state) && ! empty($state) && is_array($state[0]) && (isset($state[0]['cdnUrl']) || isset($state[0]['uuid']))) {
            return $this->isMultiple() ? $state : $state[0];
        }

        // Normalize to list for resolution to avoid shredding associative arrays
        $wasList = is_array($state) && array_is_list($state);
        $items = $wasList ? $state : [$state];

        // Resolve Backstage Media ULIDs or Models into Uploadcare rich objects.
        $resolved = self::resolveUlidsToUploadcareState($items, $this->getRecord(), $this->getFieldUlid());
        
        // Transform URLs from database format back to ucarecdn.com format for the widget
        if ($this->shouldTransformUrlsForDb()) {
            $resolved = $this->transformUrlsFromDb($resolved);
        }

        // Final return format based on isMultiple()
        if ($this->isMultiple()) {
            return array_values($resolved);
        }

        return $resolved[0] ?? null;
    }
    private static function isListOfUlids(array $state): bool
    {
        if (empty($state) || ! array_is_list($state)) return false;
        
        $first = $state[0];
        if ($first instanceof Model) return true;
        if (!is_string($first)) return false;

        return (bool) preg_match('/^[0-9A-HJKMNP-TV-Z]{26}$/i', $first);
    }

    private static function extractUuidFromString(string $value): ?string
    {
        if (preg_match('/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i', $value, $matches)) {
            return $matches[1];
        }

        return null;
    }

    private static function resolveUlidsToUploadcareState(array $items, ?Model $record = null, ?string $fieldName = null): array
    {
        if (empty($items)) {
            return [];
        }

        $resolved = [];
        $ulidsToResolve = [];
        $preResolvedModels = [];

        foreach ($items as $index => $item) {
            if ($item instanceof Model) {
                $preResolvedModels[$index] = $item;
            } elseif (is_string($item) && ! empty($item)) {
                $ulidsToResolve[$index] = $item;
            } elseif (is_array($item)) {
                if (isset($item['cdnUrl']) || isset($item['uuid'])) {
                    $resolved[$index] = $item; // Already a rich object
                } elseif (isset($item['ulid'])) {
                    $ulidsToResolve[$index] = $item['ulid'];
                }
            }
        }

        if (! empty($ulidsToResolve)) {
            $mediaItems = null;
            $mediaModel = config('backstage.media.model', \Backstage\Media\Models\Media::class);

            // If we have a record and it has a values relationship (Backstage CMS), use it to get pivot metadata
            if ($record && $fieldName && method_exists($record, 'values')) {
                try {
                    $fieldSlug = $fieldName;
                    if (str_contains($fieldName, '.')) {
                        $parts = explode('.', $fieldName);
                        foreach ($parts as $part) {
                            if (preg_match('/^[0-9A-HJKMNP-TV-Z]{26}$/i', $part)) {
                                $fieldSlug = $part;
                                break;
                            }
                        }
                        if ($fieldSlug === $fieldName) {
                            $fieldSlug = end($parts);
                        }
                    }

                    $fieldValue = $record->values()
                        ->where(function ($query) use ($fieldSlug) {
                            $query->whereHas('field', function ($q) use ($fieldSlug) {
                                $q->where('slug', $fieldSlug)
                                  ->orWhere('ulid', $fieldSlug);
                            })
                            ->orWhere('ulid', $fieldSlug);
                        })
                        ->first();

                    if ($fieldValue) {
                        $mediaItems = $fieldValue->media()
                            ->withPivot(['meta', 'position'])
                            ->whereIn('media_ulid', array_values($ulidsToResolve))
                            ->get()
                            ->keyBy('ulid');
                        
                    }
                } catch (\Exception $e) {}
            }

            // Fallback for record media or direct query
            if ((! $mediaItems || $mediaItems->isEmpty()) && $record && method_exists($record, 'media')) {
                try {
                    $mediaItems = $record->media()
                        ->withPivot(['meta', 'position'])
                        ->whereIn('media_ulid', array_values($ulidsToResolve))
                        ->get()
                        ->keyBy('ulid');
                } catch (\Exception $e) {}
            }

            if (! $mediaItems || $mediaItems->isEmpty()) {
                $mediaItems = $mediaModel::whereIn('ulid', array_values($ulidsToResolve))->get()->keyBy('ulid');
            }

            foreach ($ulidsToResolve as $index => $ulid) {
                $media = $mediaItems->get($ulid);
                if ($media) {
                    $resolved[$index] = Factory::mapMediaToValue($media);
                } else {
                    $resolved[$index] = $ulid; // Keep as string if not found
                }
            }
        }

        foreach ($preResolvedModels as $index => $model) {
            $resolved[$index] = Factory::mapMediaToValue($model);
        }

        ksort($resolved); // Restore original order
        
        $final = array_values($resolved);
        
        // Deduplicate by UUID to prevent same file appearing twice
        $uniqueUuids = [];
        $final = array_filter($final, function($item) use (&$uniqueUuids) {
            $uuid = is_array($item) ? ($item['uuid'] ?? null) : (is_string($item) ? $item : null);
            if (!$uuid) return true;
            if (in_array($uuid, $uniqueUuids)) return false;
            $uniqueUuids[] = $uuid;
            return true;
        });
        $final = array_values($final);

        return $final;
    }

    private static function extractValues(array $state): array
    {
        if (! array_is_list($state)) {
            if (isset($state['uuid']) || isset($state['cdnUrl'])) {
                return [$state];
            }
            return [];
        }

        return array_values(array_filter(array_map(function ($item) {
            if (is_string($item)) {
                return $item;
            }

            // If it's already a structured object, keep it.
            if (is_array($item) && (isset($item['cdnUrl']) || isset($item['uuid']))) {
                return $item;
            }

            if (is_object($item) && (isset($item->cdnUrl) || isset($item->uuid))) {
                return $item;
            }

            // Allow objects (Models) if they implement ArrayAccess or are just objects we can read properties from
            if (! is_array($item) && ! is_object($item)) {
                return null;
            }

            // Check for 'edit' meta which contains cropped URL from our backend hydration
            $cdnUrl = null;
            $edit = $item['edit'] ?? null;
            if ($edit) {
                $edit = is_string($edit) ? json_decode($edit, true) : $edit;
                $cdnUrl = $edit['cdnUrl'] ?? null;
            }

            if (! $cdnUrl) {
                // Fallback to metadata
                $meta = $item['metadata'] ?? null;
                if ($meta) {
                    $meta = is_string($meta) ? json_decode($meta, true) : $meta;
                    $cdnUrl = $meta['cdnUrl'] ?? null;
                }
            }

            if (! $cdnUrl) {
                // Safely access array/object keys
                $cdnUrl = $item['cdnUrl'] ?? $item['ucarecdn'] ?? null;
            }

            if ($cdnUrl) {
                return $cdnUrl;
            }

            return $item['uuid'] ?? $item['filename'] ?? null;
        }, $state)));
    }

    private function transformUrls($value, string $from, string $to): mixed
    {
        $decodeIfJson = function ($v) use (&$decodeIfJson) {
            if (is_string($v)) {
                $decoded = json_decode($v, true);

                if (json_last_error() === JSON_ERROR_NONE && ($decoded !== $v)) {
                    return $decodeIfJson($decoded);
                }
            }

            return $v;
        };

        $replaceCdn = function ($v) use ($from, $to, &$replaceCdn) {
            if (is_string($v)) {
                return str_replace($from, $to, $v);
            }

            if (is_array($v)) {
                if (array_is_list($v)) {
                    return array_map($replaceCdn, $v);
                }

                // Protect associative arrays from shredding via array_map
                foreach ($v as $key => $subValue) {
                    $v[$key] = $replaceCdn($subValue);
                }
                return $v;
            }

            return $v;
        };

        $value = $decodeIfJson($value);

        return $replaceCdn($value);
    }

    public function transformUrlsFromDb($value): mixed
    {
        return $this->transformUrls($value, $this->getDbCdnCname(), 'https://ucarecdn.com');
    }

    public function transformUrlsToDb($value): mixed
    {
        return $this->transformUrls($value, 'https://ucarecdn.com', $this->getDbCdnCname());
    }

    /**
     * Get the normalized locale for Uploadcare.
     * Uploadcare supports: de, en, es, fr, he, it, nl, pl, pt, ru, tr, uk, zh-TW, zh
     */
    public function getLocaleName(): string
    {
        $locale = app()->getLocale();

        // Normalize locale: convert 'en_US' or 'en-US' to 'en', but keep 'zh-TW' as is
        $normalized = str_replace('_', '-', $locale);

        // Handle special cases
        if (str_starts_with($normalized, 'zh')) {
            // Check if it's zh-TW (Traditional Chinese)
            if (str_contains($normalized, 'TW') || str_contains($normalized, 'tw')) {
                return 'zh-TW';
            }

            // Otherwise return 'zh' (Simplified Chinese)
            return 'zh';
        }

        // Extract base language code (e.g., 'en' from 'en-US' or 'en_US')
        $baseLocale = explode('-', $normalized)[0];

        // List of supported Uploadcare locales
        $supportedLocales = ['de', 'en', 'es', 'fr', 'he', 'it', 'nl', 'pl', 'pt', 'ru', 'tr', 'uk', 'zh-TW', 'zh'];

        // Check if base locale is supported
        if (in_array($baseLocale, $supportedLocales)) {
            return $baseLocale;
        }

        // Fallback to 'en' if locale is not supported
        return 'en';
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->afterStateHydrated(function (Uploadcare $component, $state) {
            // Already handled in getState()
        });

        $this->dehydrateStateUsing(function (Uploadcare $component, $state) {
            if ($state === null) {
                return null;
            }

            // Transform URLs to database format when saving
            if ($component->shouldTransformUrlsForDb()) {
                return $this->transformUrlsToDb($state);
            }

            return $state;
        });
    }
}
