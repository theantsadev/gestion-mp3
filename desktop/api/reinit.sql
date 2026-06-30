-- Active: 1782298057016@@127.0.0.1@3307@gestion_mp3
-- ============================================================
-- SCRIPT DE RÉINITIALISATION DES DONNÉES
-- ============================================================

USE gestion_mp3;

-- Désactive temporairement les contraintes FK pour éviter les erreurs d'ordre
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE playlist_mp3;
TRUNCATE TABLE playlist;
TRUNCATE TABLE mp3;

-- Réactive les contraintes FK
SET FOREIGN_KEY_CHECKS = 1;

-- Vérification
SELECT 'mp3'          AS table_name, COUNT(*) AS nb_lignes FROM mp3
UNION ALL
SELECT 'playlist'     AS table_name, COUNT(*) AS nb_lignes FROM playlist
UNION ALL
SELECT 'playlist_mp3' AS table_name, COUNT(*) AS nb_lignes FROM playlist_mp3;