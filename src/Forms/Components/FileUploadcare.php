<?php

namespace Vormkracht10\FileUploadcare\Forms\Components;

use Filament\Forms\Components\Field;
use Vormkracht10\FileUploadcare\Enums\Style;

class FileUploadcare extends Field
{
    protected string $view = 'forms.components.file-uploadcare';

    protected string $publicKey;

    protected bool $multiple = false;

    protected int $multipleMin = 0;

    protected int $multipleMax = 0;

    protected bool $imgOnly = false;

    protected Style $uploaderStyle = Style::INLINE;

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

    // Enum met Style en dan 'inline' of 'regular' of 'minimal'
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
}
