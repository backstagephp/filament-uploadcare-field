<?php

namespace Vormkracht10\FileUploadcare\Commands;

use Illuminate\Console\Command;

class FileUploadcareCommand extends Command
{
    public $signature = 'filament-fileuploadcare-component';

    public $description = 'My command';

    public function handle(): int
    {
        $this->comment('All done');

        return self::SUCCESS;
    }
}
