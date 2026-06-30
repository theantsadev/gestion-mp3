<?php
function isBlacklisted(array $metadata): bool
{
    $blacklist = BLACKLIST; // ['genre' => ['pop', 'rock'], 'artist' => [...], ...]

    foreach ($blacklist as $field => $values) {
        if (empty($values)) continue;

        $metaValue = strtolower(trim($metadata[$field] ?? ''));

        foreach ($values as $blocked) {
            if ($metaValue === strtolower(trim($blocked))) {
                return true;
            }
        }
    }

    return false;
}
