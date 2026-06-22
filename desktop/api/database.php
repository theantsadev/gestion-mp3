<?php

define('DB_HOST', 'localhost');
define('DB_PORT', '3307');
define('DB_NAME', 'gestion_mp3');
define('DB_USER', 'root');
define('DB_PASS', 'root');

function getDB(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8";
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['error' => 'Connexion BDD échouée : ' . $e->getMessage()]));
        }
    }

    return $pdo;
}