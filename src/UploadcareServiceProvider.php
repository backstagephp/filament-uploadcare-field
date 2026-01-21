<?php

namespace Backstage\Uploadcare;

use Backstage\Uploadcare\Testing\TestsUploadcare;
use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Assets\Asset;
use Filament\Support\Assets\Css;
use Filament\Support\Facades\FilamentAsset;
use Filament\Support\Facades\FilamentIcon;
use Filament\Support\Facades\FilamentView;
use Filament\View\PanelsRenderHook;
use Illuminate\Filesystem\Filesystem;
use Livewire\Features\SupportTesting\Testable;
use Spatie\LaravelPackageTools\Commands\InstallCommand;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class UploadcareServiceProvider extends PackageServiceProvider
{
    public static string $name = 'filament-uploadcare-field';

    public static string $viewNamespace = 'filament-uploadcare-field';

    public function configurePackage(Package $package): void
    {
        /*
         * This class is a Package Service Provider
         *
         * More info: https://github.com/spatie/laravel-package-tools
         */
        $package->name(static::$name)
            ->hasCommands($this->getCommands())
            ->hasInstallCommand(function (InstallCommand $command) {
                $command
                    ->askToStarRepoOnGitHub('backstagephp/filament-uploadcare-field');
            });

        $configFileName = $package->shortName();

        if (file_exists($package->basePath("/../config/{$configFileName}.php"))) {
            $package->hasConfigFile();
        }

        if (file_exists($package->basePath('/../database/migrations'))) {
            $package->hasMigrations($this->getMigrations());
        }

        if (file_exists($package->basePath('/../resources/lang'))) {
            $package->hasTranslations();
        }

        if (file_exists($package->basePath('/../resources/views'))) {
            $package->hasViews(static::$viewNamespace);
        }
    }

    public function packageRegistered(): void {}

    public function packageBooted(): void
    {
        // Asset Registration
        FilamentAsset::register(
            $this->getAssets(),
            $this->getAssetPackageName()
        );

        FilamentAsset::registerScriptData(
            $this->getScriptData(),
            $this->getAssetPackageName()
        );

        // Icon Registration
        FilamentIcon::register($this->getIcons());

        // Handle Stubs
        if (app()->runningInConsole()) {
            foreach (app(Filesystem::class)->files(__DIR__ . '/../stubs/') as $file) {
                $this->publishes([
                    $file->getRealPath() => base_path("stubs/filament-uploadcare-field/{$file->getFilename()}"),
                ], 'filament-uploadcare-field-stubs');
            }
        }

        // Testing
        Testable::mixin(new TestsUploadcare);

        FilamentView::registerRenderHook(PanelsRenderHook::HEAD_END, function () {
            return <<<'HTML'
                    <script type="module">
                        // Load base UC module and register all locales BEFORE components initialize
                        (async () => {
                            const supportedLocales = ['de', 'es', 'fr', 'he', 'it', 'nl', 'pl', 'pt', 'ru', 'tr', 'uk', 'zh-TW', 'zh'];
                            
                            try {
                                // Import the base UC module which has defineLocale
                                const UCModule = await import('https://cdn.jsdelivr.net/npm/@uploadcare/file-uploader@v1/web/file-uploader.min.js');
                                const UC = UCModule.default || UCModule;
                                
                                if (!UC || typeof UC.defineLocale !== 'function') {
                                    return;
                                }
                                
                                // Load and register all locales in parallel
                                const localePromises = supportedLocales.map(async (locale) => {
                                    try {
                                        const localeModule = await import(`https://cdn.jsdelivr.net/npm/@uploadcare/file-uploader@v1/locales/file-uploader/${locale}.js`);
                                        const localeData = localeModule.default || localeModule;
                                        UC.defineLocale(locale, localeData);
                                        return { locale, success: true };
                                    } catch (error) {
                                        return { locale, success: false, error };
                                    }
                                });
                                
                                await Promise.all(localePromises);
                                
                                // Make UC available globally so component scripts can use it
                                window.UC = UC;
                                window._uploadcareLocales = new Set(supportedLocales);
                                window._uploadcareAllLocalesLoaded = true;
                            } catch (error) {
                                // Silently fail
                            }
                        })();

                        // Component initialization and source list handling
                        (async () => {
                            // Wait for UC to be available
                            while (!window.UC) {
                                await new Promise(resolve => setTimeout(resolve, 50));
                            }
                            
                            const UC = window.UC;
                            
                            // Import component script and define components
                            const componentModule = await import("https://cdn.jsdelivr.net/npm/@uploadcare/file-uploader@v1/web/uc-file-uploader-inline.min.js");
                            const ComponentUC = componentModule.default || componentModule;
                            
                            // Use the same UC instance for defineComponents
                            if (typeof UC.defineComponents === 'function') {
                                UC.defineComponents(UC);
                            }

                            const handleSourceList = (wrapper) => {
                                if (wrapper.classList.contains('processed')) return;

                                const config = wrapper.querySelector('uc-config');
                                if (!config) return;

                                const sourceList = config.getAttribute('source-list') || '';
                                const sources = sourceList.split(',');

                                if (sources.length === 1) {
                                    wrapper.classList.add('single-source');
                                }

                                // Mark as processed to avoid reprocessing
                                wrapper.classList.add('processed');
                            };

                            // Initial check for existing elements
                            document.addEventListener('DOMContentLoaded', () => {
                                document.querySelectorAll('.uploadcare-wrapper').forEach(handleSourceList);
                            });

                            // Watch for new elements
                            const observer = new MutationObserver((mutations) => {
                                mutations.forEach(mutation => {
                                    mutation.addedNodes.forEach(node => {
                                        if (node.nodeType === 1) { // Check if it's an element node
                                            if (node.classList?.contains('uploadcare-wrapper')) {
                                                handleSourceList(node);
                                            }
                                            // Also check children of added nodes
                                            node.querySelectorAll?.('.uploadcare-wrapper')?.forEach(handleSourceList);
                                        }
                                    });
                                });
                            });

                            // Start observing with more specific options
                            observer.observe(document.body, {
                                childList: true,
                                subtree: true,
                                attributes: true,
                                attributeFilter: ['source-list']
                            });
                        })();
                    </script>
                HTML;
        });
    }

    protected function getAssetPackageName(): ?string
    {
        return 'backstage/filament-uploadcare-field';
    }

    /**
     * @return array<Asset>
     */
    protected function getAssets(): array
    {
        return [
            AlpineComponent::make('uploadcare', __DIR__ . '/../resources/dist/filament-uploadcare-field.js'),
            Css::make('filament-uploadcare-field-styles', __DIR__ . '/../resources/dist/filament-uploadcare-field.css'),
        ];
    }

    /**
     * @return array<class-string>
     */
    protected function getCommands(): array
    {
        return [];
    }

    /**
     * @return array<string>
     */
    protected function getIcons(): array
    {
        return [];
    }

    /**
     * @return array<string>
     */
    protected function getRoutes(): array
    {
        return [];
    }

    /**
     * @return array<string, mixed>
     */
    protected function getScriptData(): array
    {
        return [];
    }

    /**
     * @return array<string>
     */
    protected function getMigrations(): array
    {
        return [
            'create_filament-uploadcare-field_table',
        ];
    }
}
