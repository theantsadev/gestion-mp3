<?php

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/Logger.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

class ApiSender
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

        // Déclare la queue P2 → P3
        $this->channel->queue_declare(QUEUE_P2_P3, false, true, false, false);
    }

    // ============================================================
    // BOUCLE PRINCIPALE : écoute la queue P2 → P3
    // ============================================================
    public function run(): void
    {
        echo "[P3] ApiSender démarré. En écoute sur : " . QUEUE_P2_P3 . "\n";

        $this->channel->basic_qos(null, 1, null);

        $this->channel->basic_consume(
            QUEUE_P2_P3,
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
    // TRAITEMENT d'un message reçu de P2
    // ============================================================
    private function process($msg): void
    {
        $files = json_decode($msg->body, true);

        if (empty($files)) {
            Logger::send('P3', 'WARNING', 'Message vide reçu de P2');
            $this->channel->basic_ack($msg->delivery_info['delivery_tag']);
            return;
        }

        foreach ($files as $file) {
            $filename = $file['filename'];
            $path     = $file['path'];

            echo "[P3] Envoi en cours : {$filename}\n";
            Logger::send('P3', 'INFO', "Envoi en cours : {$filename}");

            try {
                $success = $this->sendToApi($file);

                if ($success) {
                    // Supprime le fichier source
                    if (file_exists($path)) {
                        unlink($path);
                        echo "[P3] Fichier supprimé : {$filename}\n";
                        Logger::send('P3', 'INFO', "Envoi OK : {$filename} → supprimé de sources/");
                    }
                } else {
                    Logger::send('P3', 'ERROR', "Envoi KO : {$filename} → fichier conservé");
                }

            } catch (Exception $e) {
                Logger::send('P3', 'ERROR', "Exception pour {$filename} : " . $e->getMessage());
            }
        }

        // Acquitte le message
        $this->channel->basic_ack($msg->delivery_info['delivery_tag']);
    }

    // ============================================================
    // ENVOI à l'API via multipart/form-data
    // ============================================================
    private function sendToApi(array $file): bool
    {
        $path     = $file['path'];
        $filename = $file['filename'];

        // Prépare le fichier pour l'envoi multipart
        $postFields = [
            'file'     => new \CURLFile($path, 'audio/mpeg', $filename),
            'title'    => $file['title']              ?? '',
            'artist'   => $file['artist']             ?? '',
            'album'    => $file['album']              ?? '',
            'genre'    => $file['genre']              ?? '',
            'language' => $file['language']           ?? '',
            'year'     => $file['year']               ?? '',
            'duration' => $file['duration_seconds']   ?? 0,
            'bitrate'  => $file['bitrate']            ?? '',
            'filesize' => $file['filesize']           ?? 0,
        ];

        $ch = curl_init();

        curl_setopt_array($ch, [
            CURLOPT_URL            => API_UPLOAD_ENDPOINT,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $postFields,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_HTTPHEADER     => [
                'Accept: application/json',
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        // Log la réponse
        echo "[P3] HTTP {$httpCode} pour {$filename}\n";

        if ($curlError) {
            Logger::send('P3', 'ERROR', "cURL error pour {$filename} : {$curlError}");
            return false;
        }

        // Succès si HTTP 200 ou 201
        if ($httpCode === 200 || $httpCode === 201) {
            return true;
        }

        Logger::send('P3', 'ERROR',
            "Envoi échoué pour {$filename} → HTTP {$httpCode} : {$response}"
        );

        return false;
    }

    public function __destruct()
    {
        $this->channel->close();
        $this->connection->close();
    }
}

// Point d'entrée
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    $sender = new ApiSender();
    $sender->run();
}