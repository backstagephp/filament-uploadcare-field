<?php

namespace Backstage\Uploadcare\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @see \Backstage\Uploadcare\Uploadcare
 */
class Uploadcare extends Facade
{
    protected static function getFacadeAccessor()
    {
        return \Backstage\Uploadcare\Uploadcare::class;
    }
}
