# Uploadcare FileUpload component for Filament Forms

[![Latest Version on Packagist](https://img.shields.io/packagist/v/vormkracht10/filament-fileuploadcare-component.svg?style=flat-square)](https://packagist.org/packages/vormkracht10/filament-fileuploadcare-component)
[![GitHub Tests Action Status](https://img.shields.io/github/actions/workflow/status/vormkracht10/filament-fileuploadcare-component/run-tests.yml?branch=main&label=tests&style=flat-square)](https://github.com/vormkracht10/filament-fileuploadcare-component/actions?query=workflow%3Arun-tests+branch%3Amain)
[![GitHub Code Style Action Status](https://img.shields.io/github/actions/workflow/status/vormkracht10/filament-fileuploadcare-component/fix-php-code-styling.yml?branch=main&label=code%20style&style=flat-square)](https://github.com/vormkracht10/filament-fileuploadcare-component/actions?query=workflow%3A"Fix+PHP+code+styling"+branch%3Amain)
[![Total Downloads](https://img.shields.io/packagist/dt/vormkracht10/filament-fileuploadcare-component.svg?style=flat-square)](https://packagist.org/packages/vormkracht10/filament-fileuploadcare-component)

## Nice to meet you, we're [Vormkracht10](https://vormkracht10.nl)

Hi! We are a web development agency from Nijmegen in the Netherlands and we use Laravel for everything: advanced websites with a lot of bells and whitles and large web applications.

## About the package

This package provides a FileUpload component for Filament Forms that use [Uploadcare](https://uploadcare.com) as the file storage.

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

This is the contents of the published config file:

```php
return [
    'public_key' => env('UPLOADCARE_PUBLIC_KEY')
];
```

> [!WARNING]
> Make sure you **don't** use the Flysystem Uploadcare driver when using Filament. There is a bug where all other files in Uploadcare will be deleted when using the Flysystem driver. This uploader uses the Javascript Uploadcare widget, so it's independent of the filesystem driver.

## Usage

```php
use Vormkracht10\FileUploadcare\Forms\Components\FileUploadcare;
use Vormkracht10\FileUploadcare\Enums\Style;

 public static function form(Form $form): Form
{
    return $form
        ->schema([
            FileUploadcare::make('images')
                ->label('Images')
                ->uploaderStyle(Style::INLINE)
                ->multiple(false)
                ->imagesOnly()
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
