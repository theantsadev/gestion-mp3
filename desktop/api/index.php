<?php

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/database.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Debug temporaire
error_log("Routes file exists: " . (file_exists(__DIR__ . '/routes/mp3.php') ? 'YES' : 'NO'));
error_log("Request URI: " . $_SERVER['REQUEST_URI']);

require_once __DIR__ . '/routes/mp3.php';

\Flight::start();