<?php

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/Logger.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

class SourceListener
{
    private $connection;
    private $channel;

    public function __construct()
    {
        $this->connection = new AMQPStreamConnection(
            RABBITMQ_HOST,
            RABBITMQ_PORT,
            RABBITMQ_USER,
            RABBITMQ_PASS,
            RABBITMQ_VHOST
        );

        $this->channel = $this->connection->channel();

        // Déclare la queue P1 → P2
        $this->channel->queue_declare(
            QUEUE_P1_P2,
            false,  // passive
            true,   // durable
            false,  // exclusive
            false   // auto-delete
        );
    }

    // ============================================================
    // BOUCLE PRINCIPALE : scan toutes les 5 minutes
    // ============================================================
    public function run(): void
    {
        echo "[P1] SourceListener démarré. Scan toutes les " . (SCAN_INTERVAL / 60) . " min.\n";

        while (true) {
            try {
                $this->scan();
            } catch (Exception $e) {
                Logger::send('P1', 'ERROR', 'Exception : ' . $e->getMessage());
            }

            sleep(SCAN_INTERVAL);
        }
    }

    // ============================================================
    // SCAN du dossier sources/
    // ============================================================
    private function scan(): void
    {
        echo "[P1] Scan de : " . SOURCES_DIR . "\n";

        // Vérifie que le dossier existe
        if (!is_dir(SOURCES_DIR)) {
            Logger::send('P1', 'ERROR', 'Dossier sources/ introuvable : ' . SOURCES_DIR);
            return;
        }

        // Récupère tous les fichiers .mp3
        $files = glob(SOURCES_DIR . '*.mp3');

        if (empty($files)) {
            echo "[P1] Aucun fichier MP3 trouvé.\n";
            Logger::send('P1', 'INFO', 'Aucun fichier MP3 trouvé dans sources/');
            return;
        }

        $list = [];

        foreach ($files as $filePath) {
            $absolutePath = realpath($filePath);
            $fileName     = basename($filePath);

            echo "[P1] Fichier trouvé : {$absolutePath}\n";
            Logger::send('P1', 'INFO', "Fichier trouvé : {$absolutePath}");

            $list[] = [
                'filename' => $fileName,
                'path'     => $absolutePath,
            ];
        }

        // Envoie la liste dans la queue P1 → P2
        $this->publish($list);
    }

    // ============================================================
    // PUBLICATION dans la queue queue_p1_p2
    // ============================================================
    private function publish(array $list): void
    {
        $payload = json_encode($list);

        $msg = new AMQPMessage($payload, [
            'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT
        ]);

        $this->channel->basic_publish($msg, '', QUEUE_P1_P2);

        $count = count($list);
        echo "[P1] {$count} fichier(s) envoyé(s) dans la queue.\n";
        Logger::send('P1', 'INFO', "{$count} fichier(s) publiés dans " . QUEUE_P1_P2);
    }

    public function __destruct()
    {
        $this->channel->close();
        $this->connection->close();
    }
}

// Point d'entrée
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    $listener = new SourceListener();
    $listener->run();
}