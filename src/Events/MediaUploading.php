<?php

namespace Backstage\Uploadcare\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MediaUploading
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public mixed $file
    ) {}
}
