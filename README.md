# Uploadcare FileUpload component for Filament Forms

[![Latest Version on Packagist](https://img.shields.io/packagist/v/backstage/filament-uploadcare-field.svg?style=flat-square)](https://packagist.org/packages/backstage/filament-uploadcare-field)
[![GitHub Tests Action Status](https://img.shields.io/github/actions/workflow/status/backstage/filament-uploadcare-field/run-tests.yml?branch=main&label=tests&style=flat-square)](https://github.com/backstagephp/filament-uploadcare-field/actions?query=workflow%3Arun-tests+branch%3Amain)
[![GitHub Code Style Action Status](https://img.shields.io/github/actions/workflow/status/backstage/filament-uploadcare-field/fix-php-code-styling.yml?branch=main&label=code%20style&style=flat-square)](https://github.com/backstagephp/filament-uploadcare-field/actions?query=workflow%3A"Fix+PHP+code+styling"+branch%3Amain)
[![Total Downloads](https://img.shields.io/packagist/dt/backstage/filament-uploadcare-field.svg?style=flat-square)](https://packagist.org/packages/backstage/filament-uploadcare-field)

## Nice to meet you, we're [Vormkracht10](https://vormkracht10.nl)

Hi! We are a web development agency from Nijmegen in the Netherlands and we use Laravel for everything: advanced websites with a lot of bells and whitles and large web applications.

## About the package

This package provides a FileUpload component for Filament Forms that integrates with [Uploadcare](https://uploadcare.com) for file storage. It offers a flexible and customizable file upload experience with support for multiple files, image-only uploads, and metadata handling.

### Our other Uploadcare related packages

-   [PHP Uploadcare Transformations](https://github.com/vormkracht10/php-uploadcare-transformations)
-   [Flysystem Uploadcare](https://github.com/vormkracht10/flysystem-uploadcare)

## Installation

You can install the package via composer:

```bash
composer require backstage/filament-uploadcare-field
```

Then you need to add the Uploadcare public key to your `services.php` config file:

```php
return [
    'uploadcare' => [
        'public_key' => env('UPLOADCARE_PUBLIC_KEY')
    ]
];
```

> [!WARNING]
> Do not use the Flysystem Uploadcare driver with Filament, as it may cause unexpected deletion of files. This component uses the Javascript Uploadcare widget independently of the filesystem driver.

### Casting attributes

While Filament typically recommends using an `array` cast for file upload fields, this package requires a different approach. Since the Uploadcare component handles JSON parsing internally, you should **not** add an `array` cast to your Eloquent model properties. This prevents double JSON encoding, which would make the data more difficult to work with in your application.

### Customization

If you want to customize the view used by the component, you can publish the views:

```bash
php artisan vendor:publish --tag="filament-uploadcare-field-views"
```

## Basic Usage

```php
use Backstage\Uploadcare\Forms\Components\Uploadcare;
use Backstage\Uploadcare\Enums\Style;

public static function form(Form $form): Form
{
    return $form
        ->schema([
            Uploadcare::make('images')
                ->label('Images'),
        ]);
}
```

## Available Methods

### Configuration Methods

#### `publicKey(string $publicKey)`

Set a custom public key for Uploadcare:

```php
Uploadcare::make('images')
    ->publicKey('your-custom-key');
```

#### `cdnCname(string $cdnCname)`

Set a custom CDN CNAME for serving files (default is 'https://ucarecdn.com'):

```php
Uploadcare::make('images')
    ->cdnCname('https://your-custom-cdn.com');
```

#### `dbCdnCname(string $dbCdnCname)`

Set a custom CDN CNAME for storing URLs in your database. This allows you to bypass CDN limitations by transforming URLs when saving to and retrieving from the database:

```php
Uploadcare::make('images')
    ->dbCdnCname('https://your-custom-cdn.com');
```

When this option is set, the component will:

1. Transform URLs from 'https://ucarecdn.com' to your custom domain when saving to the database
2. Transform URLs from your custom domain back to 'https://ucarecdn.com' when loading data for the uploader widget

This is particularly useful when you need to use your own domain for serving files while maintaining compatibility with Uploadcare's system.

#### `uploaderStyle(Style $style)`

Set the uploader style (default is `Style::INLINE`):

```php
Uploadcare::make('images')
    ->uploaderStyle(Style::INLINE);
```

### File Upload Options

#### `multiple(bool $multiple = true, int $min = 0, int $max = 0)`

Enable multiple file uploads with optional min/max constraints:

```php
Uploadcare::make('images')
    ->multiple(true, 2, 5); // Allow 2-5 files
```

#### `imagesOnly(bool $imgOnly = true)`

Restrict uploads to image files only:

```php
Uploadcare::make('images')
    ->imagesOnly();
```

#### `image(bool $image = true)`

Alias for `imagesOnly()`:

```php
Uploadcare::make('images')
    ->image(); // Same as ->imagesOnly()
```

#### `accept(array|string $accept)` (deprecated)

Specify allowed file types:

```php
Uploadcare::make('documents')
    ->accept(['image/*', 'application/pdf']);
```

#### `acceptedFileTypes(array|string $acceptedFileTypes)` (replaces `accept`)

Specify allowed file types:

```php
Uploadcare::make('documents')
    ->accept(['image/*', 'application/pdf']);
```

#### `sourceList(array|string $sourceList)`

Configure upload sources:

```php
Uploadcare::make('images')
    ->sourceList(['local', 'url', 'camera', 'dropbox']);
```

#### `maxLocalFileSizeBytes(int $bytes)`

Set the maximum file size for local uploads in bytes (default is 500MB):

```php
Uploadcare::make('images')
    ->maxLocalFileSizeBytes(524288000); // 500MB
```

#### `maxLocalFileSize(string $size)`

Set the maximum file size for local uploads using human-readable format:

```php
Uploadcare::make('images')
    ->maxLocalFileSize('10MB'); // Supports B, KB, MB, GB, TB
```

#### `cropPreset(string|array $preset)`

Set the crop aspect ratio(s) for images. Accepts a single preset, comma-separated string, or array of presets. Each preset should be in format "width:height" (e.g., "1:1" for square, "16:9" for widescreen), "free" for unconstrained cropping, or an empty string to disable cropping. Decimal values are supported (e.g., "1.91:1"):

```php
// Single preset
Uploadcare::make('images')
    ->cropPreset('1:1'); // Square crop only

// Multiple presets (comma-separated string)
Uploadcare::make('images')
    ->cropPreset('free, 1:1, 16:9'); // Free, square, or widescreen

// Multiple presets (array)
Uploadcare::make('images')
    ->cropPreset(['free', '1:1', '16:9', '4:3']);

// Free crop only
Uploadcare::make('images')
    ->cropPreset('free');

// Disable cropping
Uploadcare::make('images')
    ->cropPreset('');
```

#### `imageEditorAspectRatios(string|array $aspectRatios)`

Alias for `cropPreset()` to maintain compatibility with Filament's default FileUpload field:

```php
Uploadcare::make('images')
    ->imageEditorAspectRatios(['1:1', '16:9', '4:3']);
```

#### `removeCopyright(bool $remove = true)`

Remove the Uploadcare copyright from the uploader interface. This feature is available on some paid plans:

```php
Uploadcare::make('images')
    ->removeCopyright(); // Remove copyright
```

### Metadata Handling

#### `withMetadata(bool $withMetadata = true)`

Include file metadata in the form data:

```php
Uploadcare::make('images')
    ->withMetadata();
```

To handle the metadata in your form:

```php
class EditContent extends EditRecord
{
    protected static string $resource = ContentResource::class;

    protected function mutateFormDataBeforeSave(array $data): array
    {
        if (isset($data['images'])) {
            // Access metadata through $data['images']
            // Process metadata as needed
        }

        return $data;
    }
}
```

## Complete Example

Here's a comprehensive example showcasing multiple features:

```php
use Backstage\Uploadcare\Forms\Components\Uploadcare;
use Backstage\Uploadcare\Enums\Style;

public static function form(Form $form): Form
{
    return $form
        ->schema([
            Uploadcare::make('documents')
                ->label('Documents')
                ->uploaderStyle(Style::INLINE)
                ->multiple(true, 1, 5)
                ->accept(['application/pdf', 'image/*'])
                ->sourceList(['local', 'url'])
                ->withMetadata()
                ->columnSpanFull(),
        ]);
}
```

## Testing

```bash
composer test
```

## Changelog

Please see [CHANGELOG](CHANGELOG.md) for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](.github/CONTRIBUTING.md) for details.

## Security Vulnerabilities

Please review [our security policy](../../security/policy) on how to report security vulnerabilities.

## Credits

-   [Baspa](https://github.com/vormkracht10)
-   [All Contributors](../../contributors)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
