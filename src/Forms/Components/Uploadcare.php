<?php

namespace Backstage\Uploadcare\Forms\Components;

use Backstage\Uploadcare\Enums\Style;
use Filament\Forms\Components\Field;

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

    public static function make(string $name): static
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
            throw new \InvalidArgumentException('Crop preset must be in format "width:height" or empty string for free crop.');
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

    public function maxLocalFileSize(string $size): static
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $number = (int) preg_replace('/[^0-9]/', '', $size);
        $unit = strtoupper(preg_replace('/[^A-Za-z]/', '', $size));

        if (! in_array($unit, $units)) {
            throw new \InvalidArgumentException('Invalid size unit. Use B, KB, MB, GB, or TB.');
        }

        $exponent = array_search($unit, $units);
        $this->maxLocalFileSizeBytes = $number * (1024 ** $exponent);

        return $this;
    }
}
