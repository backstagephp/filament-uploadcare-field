# Uploadcare FileUpload component for Filament Forms

[![Latest Version on Packagist](https://img.shields.io/packagist/v/vormkracht10/filament-fileuploadcare-component.svg?style=flat-square)](https://packagist.org/packages/vormkracht10/filament-fileuploadcare-component)
[![GitHub Tests Action Status](https://img.shields.io/github/actions/workflow/status/vormkracht10/filament-fileuploadcare-component/run-tests.yml?branch=main&label=tests&style=flat-square)](https://github.com/vormkracht10/filament-fileuploadcare-component/actions?query=workflow%3Arun-tests+branch%3Amain)
[![GitHub Code Style Action Status](https://img.shields.io/github/actions/workflow/status/vormkracht10/filament-fileuploadcare-component/fix-php-code-styling.yml?branch=main&label=code%20style&style=flat-square)](https://github.com/vormkracht10/filament-fileuploadcare-component/actions?query=workflow%3A"Fix+PHP+code+styling"+branch%3Amain)
[![Total Downloads](https://img.shields.io/packagist/dt/vormkracht10/filament-fileuploadcare-component.svg?style=flat-square)](https://packagist.org/packages/vormkracht10/filament-fileuploadcare-component)

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
composer require vormkracht10/filament-fileuploadcare-component
```

You can install the package by running the following command:

```bash
php artisan filament-fileuploadcare-component:install
```

This will publish the configuration file with the following contents:

```php
return [
    'public_key' => env('UPLOADCARE_PUBLIC_KEY')
];
```

> [!WARNING]
> Do not use the Flysystem Uploadcare driver with Filament, as it may cause unexpected deletion of files. This component uses the Javascript Uploadcare widget independently of the filesystem driver.

### Customization

If you want to customize the view used by the component, you can publish the views:

```bash
php artisan vendor:publish --tag="filament-fileuploadcare-component-views"
```

## Basic Usage

```php
use Vormkracht10\FileUploadcare\Forms\Components\FileUploadcare;
use Vormkracht10\FileUploadcare\Enums\Style;

public static function form(Form $form): Form
{
    return $form
        ->schema([
            FileUploadcare::make('images')
                ->label('Images'),
        ]);
}
```

## Available Methods

### Configuration Methods

#### `publicKey(string $publicKey)`

Set a custom public key for Uploadcare:

```php
FileUploadcare::make('images')
    ->publicKey('your-custom-key');
```

#### `uploaderStyle(Style $style)`

Set the uploader style (default is `Style::INLINE`):

```php
FileUploadcare::make('images')
    ->uploaderStyle(Style::INLINE);
```

### File Upload Options

#### `multiple(bool $multiple = true, int $min = 0, int $max = 0)`

Enable multiple file uploads with optional min/max constraints:

```php
FileUploadcare::make('images')
    ->multiple(true, 2, 5); // Allow 2-5 files
```

#### `imagesOnly(bool $imgOnly = true)`

Restrict uploads to image files only:

```php
FileUploadcare::make('images')
    ->imagesOnly();
```

#### `accept(array|string $accept)`

Specify allowed file types:

```php
FileUploadcare::make('documents')
    ->accept(['image/*', 'application/pdf']);
```

#### `sourceList(array|string $sourceList)`

Configure upload sources:

```php
FileUploadcare::make('images')
    ->sourceList(['local', 'url', 'camera', 'dropbox']);
```

### Metadata Handling

#### `withMetadata(bool $withMetadata = true)`

Include file metadata in the form data:

```php
FileUploadcare::make('images')
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
use Vormkracht10\FileUploadcare\Forms\Components\FileUploadcare;
use Vormkracht10\FileUploadcare\Enums\Style;

public static function form(Form $form): Form
{
    return $form
        ->schema([
            FileUploadcare::make('documents')
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
