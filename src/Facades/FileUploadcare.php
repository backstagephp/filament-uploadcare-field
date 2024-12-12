<?php

namespace Vormkracht10\FileUploadcare\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @see \Vormkracht10\FileUploadcare\FileUploadcare
 */
class FileUploadcare extends Facade
{
    protected static function getFacadeAccessor()
    {
        return \Vormkracht10\FileUploadcare\FileUploadcare::class;
    }
}
