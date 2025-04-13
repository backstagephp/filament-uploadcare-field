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

#### `accept(array|string $accept)`

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
