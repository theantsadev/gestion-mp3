<?php

// ============================================================
// RABBITMQ
// ============================================================
define('RABBITMQ_HOST', 'localhost');
define('RABBITMQ_PORT', 5672);
define('RABBITMQ_USER', 'guest');
define('RABBITMQ_PASS', 'guest');
define('RABBITMQ_VHOST', '/');

// ============================================================
// QUEUES
// ============================================================
define('QUEUE_P1_P2', 'queue_p1_p2');       // P1 → P2
define('QUEUE_P2_P3', 'queue_p2_p3');       // P2 → P3
define('QUEUE_LOGS',  'queue_logs');         // P1, P2, P3 → Logger

// ============================================================
// BLACKLIST
// ============================================================
define('BLACKLIST', [
    'genre'  => ['pop', 'salegy', 'folk'],
    'artist' => ['Justin Bieber'],
    'album'  => [],
]);


// ============================================================
// CHEMINS
// ============================================================
define('SOURCES_DIR', __DIR__ . '/../sources/');
define('LOGS_DIR',    __DIR__ . '/../logs/');

// ============================================================
// API
// ============================================================
define('API_BASE_URL', 'http://localhost:8080/api');
define('API_UPLOAD_ENDPOINT', API_BASE_URL . '/mp3/upload');

// ============================================================
// INTERVALLES
// ============================================================
define('SCAN_INTERVAL', 20); // 5 minutes en secondes