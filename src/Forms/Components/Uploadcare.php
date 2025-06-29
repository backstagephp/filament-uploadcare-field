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

    protected array $accept = [
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
            ->publicKey(config('services.uploadcare.public_key'));
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

    public function accept(array | string $accept): static
    {
        $this->accept = is_array($accept) ? $accept : [$accept];

        return $this;
    }

    public function getAccept(): string
    {
        return implode(',', $this->accept);
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

    public function cropPreset(string $preset): static
    {
        if (! preg_match('/^\d+:\d+$/', $preset) && $preset !== '') {
            throw new InvalidArgumentException('Crop preset must be in format "width:height" or empty string for free crop.');
        }

        $this->cropPreset = $preset;

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
