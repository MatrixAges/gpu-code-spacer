<?php
class ValidationSample {
    protected static function callClass($container, $target, array $parameters = [], $defaultMethod = null)
    {
        $segments = explode('@', $target);

        // We will assume an @ sign is used to delimit the class name from the method
        // name. We will split on this @ sign and then build a callable array that
        // we can pass right back into the "call" method for dependency binding.
        $method = count($segments) === 2
            ? $segments[1]
            : $defaultMethod;

        if (is_null($method)) {
            throw new InvalidArgumentException('Method not provided.');
        }

        return static::call(
            $container,
            [$container->make($segments[0]), $method],
            $parameters
        );
    }
}
