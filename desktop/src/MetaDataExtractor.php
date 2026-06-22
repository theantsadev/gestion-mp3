<?php

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/Logger.php';
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/Logger.php';

// Ajoute cette ligne
require_once __DIR__ . '/../vendor/james-heinrich/getid3/src/GetID3.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

class MetaDataExtractor
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

        // Déclare les queues
        $this->channel->queue_declare(QUEUE_P1_P2, false, true, false, false);
        $this->channel->queue_declare(QUEUE_P2_P3, false, true, false, false);
    }

    // ============================================================
    // BOUCLE PRINCIPALE : écoute la queue P1 → P2
    // ============================================================
    public function run(): void
    {
        echo "[P2] MetaDataExtractor démarré. En écoute sur : " . QUEUE_P1_P2 . "\n";

        // 1 message à la fois
        $this->channel->basic_qos(null, 1, null);

        $this->channel->basic_consume(
            QUEUE_P1_P2,
            '',
            false,
            false,  // manual ack
            false,
            false,
            function ($msg) {
                $this->process($msg);
            }
        );

        while ($this->channel->is_consuming()) {
            $this->channel->wait();
        }
    }

    // ============================================================
    // TRAITEMENT d'un message reçu de P1
    // ============================================================
    private function process($msg): void
    {
        $files = json_decode($msg->body, true);

        if (empty($files)) {
            Logger::send('P2', 'WARNING', 'Message vide reçu de P1');
            $this->channel->basic_ack($msg->delivery_info['delivery_tag']);
            return;
        }

        $results = [];

        foreach ($files as $file) {
            $path     = $file['path'];
            $filename = $file['filename'];

            echo "[P2] Extraction metadata : {$filename}\n";

            try {
                $metadata = $this->extract($path, $filename);
                $results[] = $metadata;

                Logger::send(
                    'P2',
                    'INFO',
                    "Extraction OK : {$filename} → " .
                        "titre: {$metadata['title']}, " .
                        "artiste: {$metadata['artist']}, " .
                        "durée: {$metadata['duration_formatted']}"
                );
            } catch (Exception $e) {
                Logger::send('P2', 'ERROR', "Extraction KO : {$filename} → " . $e->getMessage());
            }
        }

        // Envoie les résultats dans la queue P2 → P3
        if (!empty($results)) {
            $this->publish($results);
        }

        // Acquitte le message
        $this->channel->basic_ack($msg->delivery_info['delivery_tag']);
    }

    // ============================================================
    // EXTRACTION des métadonnées avec getID3
    // ============================================================
    private function extract(string $path, string $filename): array
    {
        $getID3 = new \JamesHeinrich\GetID3\GetID3();
        $info   = $getID3->analyze($path);

        // Fusionne les tags ID3
        \JamesHeinrich\GetID3\Utils::CopyTagsToComments($info);

        // Récupère les valeurs avec fallback
        $title    = $info['comments']['title'][0]   ?? pathinfo($filename, PATHINFO_FILENAME);
        $artist   = $info['comments']['artist'][0]  ?? 'Inconnu';
        $album    = $info['comments']['album'][0]   ?? 'Inconnu';
        $genre    = $info['comments']['genre'][0]   ?? 'Inconnu';
        $language = $info['comments']['language'][0] ?? 'Inconnu';
        $year     = $info['comments']['year'][0]    ?? null;
        $track    = $info['comments']['track_number'][0] ?? null;

        $duration         = $info['playtime_seconds'] ?? 0;
        $durationFormatted = gmdate('i:s', (int)$duration);

        $bitrate  = isset($info['audio']['bitrate'])
            ? (int)($info['audio']['bitrate'] / 1000) . ' kbps'
            : 'Inconnu';

        $filesize = filesize($path);

        return [
            'filename'           => $filename,
            'path'               => $path,
            'title'              => $title,
            'artist'             => $artist,
            'album'              => $album,
            'genre'              => $genre,
            'language'           => $language,
            'year'               => $year,
            'track'              => $track,
            'duration_seconds'   => round($duration, 2),
            'duration_formatted' => $durationFormatted,
            'bitrate'            => $bitrate,
            'filesize'           => $filesize,
            'mime_type'          => 'audio/mpeg',
        ];
    }

    // ============================================================
    // PUBLICATION dans la queue queue_p2_p3
    // ============================================================
    private function publish(array $results): void
    {
        $payload = json_encode($results);

        $msg = new AMQPMessage($payload, [
            'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT
        ]);

        $this->channel->basic_publish($msg, '', QUEUE_P2_P3);

        $count = count($results);
        echo "[P2] {$count} fichier(s) envoyé(s) dans la queue P2→P3.\n";
        Logger::send('P2', 'INFO', "{$count} fichier(s) publiés dans " . QUEUE_P2_P3);
    }

    public function __destruct()
    {
        $this->channel->close();
        $this->connection->close();
    }
}

// Point d'entrée
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    $extractor = new MetaDataExtractor();
    $extractor->run();
}
