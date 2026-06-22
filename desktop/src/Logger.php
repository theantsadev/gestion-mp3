<?php

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/config.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

class Logger
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

        // Déclare la queue de logs
        $this->channel->queue_declare(
            QUEUE_LOGS,
            false,  // passive
            true,   // durable (survit au redémarrage)
            false,  // exclusive
            false   // auto-delete
        );
    }

    // ============================================================
    // CONSOMMATEUR : écoute la queue et écrit dans le fichier log
    // ============================================================
    public function listen(): void
    {
        echo "[Logger] En écoute sur la queue : " . QUEUE_LOGS . "\n";

        $this->channel->basic_consume(
            QUEUE_LOGS,
            '',
            false,
            true,   // auto-ack
            false,
            false,
            function ($msg) {
                $data = json_decode($msg->body, true);
                $this->writeLog($data['source'], $data['level'], $data['message']);
            }
        );

        // Boucle infinie d'écoute
        while ($this->channel->is_consuming()) {
            $this->channel->wait();
        }
    }

    // ============================================================
    // PRODUCTEUR STATIQUE : envoie un message dans la queue logs
    // ============================================================
    public static function send(string $source, string $level, string $message): void
    {
        try {
            $connection = new AMQPStreamConnection(
                RABBITMQ_HOST,
                RABBITMQ_PORT,
                RABBITMQ_USER,
                RABBITMQ_PASS,
                RABBITMQ_VHOST
            );

            $channel = $connection->channel();

            $channel->queue_declare(QUEUE_LOGS, false, true, false, false);

            $payload = json_encode([
                'source'    => $source,             // P1, P2 ou P3
                'level'     => $level,              // INFO, ERROR, WARNING
                'message'   => $message,
                'timestamp' => date('Y-m-d H:i:s'),
            ]);

            $msg = new AMQPMessage($payload, [
                'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT
            ]);

            $channel->basic_publish($msg, '', QUEUE_LOGS);

            $channel->close();
            $connection->close();

        } catch (Exception $e) {
            // Fallback : écriture directe si RabbitMQ est down
            $fallback = LOGS_DIR . 'fallback_' . date('Y-m-d') . '.log';
            file_put_contents($fallback, "[FALLBACK][{$source}][{$level}] {$message}\n", FILE_APPEND);
        }
    }

    // ============================================================
    // ÉCRITURE DANS LE FICHIER LOG
    // ============================================================
    private function writeLog(string $source, string $level, string $message): void
    {
        // Un fichier log par jour
        $logFile = LOGS_DIR . 'app_' . date('Y-m-d') . '.log';

        $line = sprintf(
            "[%s][%s][%s] %s\n",
            date('Y-m-d H:i:s'),
            strtoupper($source),
            strtoupper($level),
            $message
        );

        file_put_contents($logFile, $line, FILE_APPEND);
        echo $line; // Affiche aussi dans le terminal
    }

    public function __destruct()
    {
        $this->channel->close();
        $this->connection->close();
    }
}


// Point d'entrée : lance le Logger en écoute
// Uniquement si le fichier est exécuté directement (pas inclus)
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    $logger = new Logger();
    $logger->listen();
}