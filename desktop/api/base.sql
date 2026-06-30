-- Active: 1782298057016@@127.0.0.1@3307@gestion_mp3
CREATE DATABASE gestion_mp3;

USE gestion_mp3;

CREATE TABLE mp3 (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    filename    VARCHAR(255) NOT NULL,
    path_serveur VARCHAR(255) NOT NULL,
    title       VARCHAR(255),
    artist      VARCHAR(255),
    album       VARCHAR(255),
    genre       VARCHAR(255),
    language    VARCHAR(100),
    year        VARCHAR(10),
    duration    FLOAT,
    bitrate     VARCHAR(50),
    filesize    BIGINT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE playlist (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE playlist_mp3 (
    playlist_id INT NOT NULL,
    mp3_id      INT NOT NULL,
    position    INT NOT NULL,
    PRIMARY KEY (playlist_id, mp3_id),
    FOREIGN KEY (playlist_id) REFERENCES playlist(id) ON DELETE CASCADE,
    FOREIGN KEY (mp3_id) REFERENCES mp3(id) ON DELETE CASCADE
);