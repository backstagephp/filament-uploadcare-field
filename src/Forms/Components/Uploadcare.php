<?php

namespace Backstage\Uploadcare\Forms\Components;

use Backstage\Uploadcare\Enums\Style;
use Filament\Forms\Components\Field;
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
            $state = json_decode($state, true);
        }

        // Resolve Backstage Media ULIDs (26-char) into Uploadcare CDN URLs / UUIDs,
        // so the widget can show a preview even when the database stores ULIDs.
        if (is_array($state) && ! empty($state) && self::isListOfUlids($state)) {
            $resolved = self::resolveUlidsToUploadcareState($state);
            if (! empty($resolved)) {
                $state = $resolved;
            }
        }

        // Handle array of file objects (extract UUIDs / URLs)
        if (is_array($state) && ! empty($state)) {
            $values = self::extractValues($state);
            if (! empty($values)) {
                $state = $values;
            }
        }

        if ($state === '[]' || $state === '""' || $state === null || $state === '') {
            return null;
        }

        // Transform URLs from database format back to ucarecdn.com format for the widget
        if ($this->shouldTransformUrlsForDb() && ! empty($state)) {
            $state = $this->transformUrlsFromDb($state);
        }

        if (! is_array($state)) {
            $state = [$state];
        }

        return $state;
    }

    private static function isListOfUlids(array $state): bool
    {
        if (! isset($state[0]) || ! is_string($state[0])) {
            return false;
        }

        return (bool) preg_match('/^[0-9A-HJKMNP-TV-Z]{26}$/i', $state[0]);
    }

    private static function extractUuidFromString(string $value): ?string
    {
        if (preg_match('/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i', $value, $matches)) {
            return $matches[1];
        }

        return null;
    }

    private static function resolveUlidsToUploadcareState(array $ulids): array
    {
        $mediaModel = config('backstage.media.model', \Backstage\Media\Models\Media::class);

        if (! is_string($mediaModel) || ! class_exists($mediaModel)) {
            return [];
        }

        $mediaItems = $mediaModel::whereIn('ulid', array_filter($ulids, 'is_string'))
            ->get()
            ->keyBy('ulid');

        $resolved = [];

        foreach ($ulids as $ulid) {
            if (! is_string($ulid)) {
                continue;
            }

            $media = $mediaItems->get($ulid);
            if (! $media) {
                continue;
            }

            $metadata = $media->metadata ?? null;
            if (is_string($metadata)) {
                $metadata = json_decode($metadata, true);
            }
            $metadata = is_array($metadata) ? $metadata : [];

            $editMeta = $media->edit ?? null;
            if (is_string($editMeta)) {
                $editMeta = json_decode($editMeta, true);
            }
            if (is_array($editMeta)) {
                $metadata = array_merge($metadata, $editMeta);
            }

            $cdnUrl = $metadata['cdnUrl'] ?? ($metadata['fileInfo']['cdnUrl'] ?? null);
            $uuid = $metadata['uuid'] ?? ($metadata['fileInfo']['uuid'] ?? null);

            if (! $uuid && is_string($media->filename ?? null)) {
                $uuid = self::extractUuidFromString($media->filename);
            }
            if (! $uuid && is_string($cdnUrl)) {
                $uuid = self::extractUuidFromString($cdnUrl);
            }

            if ((! $cdnUrl || ! filter_var($cdnUrl, FILTER_VALIDATE_URL)) && $uuid) {
                $cdnUrl = 'https://ucarecdn.com/' . $uuid . '/';
            }

            if (is_string($cdnUrl) && filter_var($cdnUrl, FILTER_VALIDATE_URL)) {
                $resolved[] = $cdnUrl;
            } elseif ($uuid) {
                $resolved[] = $uuid;
            }
        }

        return $resolved;
    }

    private static function extractValues(array $state): array
    {
        return array_values(array_filter(array_map(function ($item) {
            if (is_string($item)) {
                return $item;
            }

            if (! is_array($item)) {
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

        $replaceCdn = function ($v) use ($from, $to) {
            if (is_string($v)) {
                return str_replace($from, $to, $v);
            }

            return $v;
        };

        $value = $decodeIfJson($value);

        if (is_string($value)) {
            return $replaceCdn($value);
        }

        if (is_array($value)) {
            return array_map($replaceCdn, $value);
        }

        return $value;
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
