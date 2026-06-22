<?php

define('UPLOADS_DIR', __DIR__ . '/../uploads/');

// ============================================================
// POST /mp3/upload → reçoit le fichier + métadonnées (P3)
// ============================================================
\Flight::route('POST /mp3/upload', function () {

    $db = getDB();

    // Vérifie qu'un fichier a été envoyé
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        \Flight::json(['error' => 'Fichier manquant ou erreur upload'], 400);
        return;
    }

    $file     = $_FILES['file'];
    $filename = basename($file['name']);
    $destPath = UPLOADS_DIR . $filename;

    // Déplace le fichier dans uploads/
    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        \Flight::json(['error' => 'Impossible de sauvegarder le fichier'], 500);
        return;
    }

    // Sauvegarde en BDD
    $stmt = $db->prepare("
        INSERT INTO mp3 (filename, path_serveur, title, artist, album, genre, language, year, duration, bitrate, filesize)
        VALUES (:filename, :path_serveur, :title, :artist, :album, :genre, :language, :year, :duration, :bitrate, :filesize)
    ");

    $stmt->execute([
        ':filename'     => $filename,
        ':path_serveur' => $destPath,
        ':title'        => $_POST['title']    ?? null,
        ':artist'       => $_POST['artist']   ?? null,
        ':album'        => $_POST['album']    ?? null,
        ':genre'        => $_POST['genre']    ?? null,
        ':language'     => $_POST['language'] ?? null,
        ':year'         => $_POST['year']     ?? null,
        ':duration'     => $_POST['duration'] ?? null,
        ':bitrate'      => $_POST['bitrate']  ?? null,
        ':filesize'     => $_POST['filesize'] ?? null,
    ]);

    $id = $db->lastInsertId();

    \Flight::json([
        'success' => true,
        'id'      => $id,
        'message' => "MP3 '{$filename}' uploadé et sauvegardé."
    ], 201);
});

// ============================================================
// GET /mp3 → liste tous les mp3
// ============================================================
\Flight::route('GET /mp3', function () {

    $db   = getDB();
    $stmt = $db->query("SELECT * FROM mp3 ORDER BY created_at DESC");
    $data = $stmt->fetchAll();

    \Flight::json($data);
});

// ============================================================
// POST /mp3/generate-playlist → genere une playlist en fonction des critères donnés
// ============================================================
\Flight::route('POST /mp3/generate-playlist', function () {
    $db = getDB();
    $body = json_decode(file_get_contents('php://input'), true);

    $stmt = $db->query("SELECT * FROM mp3 ORDER BY created_at DESC");
    $allTracks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $filtered = [];
    foreach ($allTracks as $track) {
        $genre = $track['genre'] ?? 'Inconnu';
        $artist = $track['artist'] ?? 'Inconnu';
        $language = $track['language'] ?? 'Inconnu';

        // Filtrage des genres (inclusions)
        if (!empty($body['selectedGenres'])) {
            $match = false;
            foreach ($body['selectedGenres'] as $sg) {
                if (strcasecmp($genre, $sg) === 0) { $match = true; break; }
            }
            if (!$match) continue;
        }
        // Filtrage des genres (exclusions)
        if (!empty($body['excludedGenres'])) {
            $exclude = false;
            foreach ($body['excludedGenres'] as $eg) {
                if (strcasecmp($genre, $eg) === 0) { $exclude = true; break; }
            }
            if ($exclude) continue;
        }

        // Filtrage des artistes (inclusions)
        if (!empty($body['selectedArtists'])) {
            $match = false;
            foreach ($body['selectedArtists'] as $sa) {
                if (strcasecmp($artist, $sa) === 0) { $match = true; break; }
            }
            if (!$match) continue;
        }
        // Filtrage des artistes (exclusions)
        if (!empty($body['excludedArtists'])) {
            $exclude = false;
            foreach ($body['excludedArtists'] as $ea) {
                if (strcasecmp($artist, $ea) === 0) { $exclude = true; break; }
            }
            if ($exclude) continue;
        }

        // Filtrage des langues (inclusions)
        if (!empty($body['selectedLanguages'])) {
            $match = false;
            foreach ($body['selectedLanguages'] as $sl) {
                if (strcasecmp($language, $sl) === 0) { $match = true; break; }
            }
            if (!$match) continue;
        }
        // Filtrage des langues (exclusions)
        if (!empty($body['excludedLanguages'])) {
            $exclude = false;
            foreach ($body['excludedLanguages'] as $el) {
                if (strcasecmp($language, $el) === 0) { $exclude = true; break; }
            }
            if ($exclude) continue;
        }

        $filtered[] = $track;
    }

    // Résolution du sous-ensemble le plus proche de la durée cible (Dynamic Programming Subset-Sum)
    $target = isset($body['totalDuration']) ? (int) $body['totalDuration'] : 1800;
    if ($target <= 0) $target = 1800;

    // Limiter pour éviter les dépassements de mémoire/temps (sécurité)
    $filtered = array_slice($filtered, 0, 100);

    // On s'autorise à dépasser d'au maximum 15 minutes (900 secondes) pour trouver le meilleur compromis
    $maxLimit = $target + 900;
    
    // dp[sum] = tableau des morceaux
    $dp = [0 => []];

    foreach ($filtered as $track) {
        $dur = (int) round($track['duration'] ?? 0);
        if ($dur <= 0) continue;

        $currentSums = array_keys($dp);
        rsort($currentSums);

        foreach ($currentSums as $sum) {
            $newSum = $sum + $dur;
            if ($newSum <= $maxLimit) {
                if (!isset($dp[$newSum])) {
                    $dp[$newSum] = array_merge($dp[$sum], [$track]);
                }
            }
        }
    }

    // Recherche de la somme minimisant abs(somme - target)
    $bestSum = 0;
    $minDiff = null;
    foreach ($dp as $sum => $tracks) {
        $diff = abs($sum - $target);
        if ($minDiff === null || $diff < $minDiff) {
            $minDiff = $diff;
            $bestSum = $sum;
        }
    }

    $bestPlaylist = $dp[$bestSum] ?? [];
    $bestDuration = array_sum(array_column($bestPlaylist, "duration"));

    \Flight::json([
        "playlist"       => $bestPlaylist,
        "total_duration" => $bestDuration,
        "precision"      => $target - $bestDuration,
        "count"          => count($bestPlaylist)
    ]);
});


// ============================================================
// GET /mp3/@id → détail d'un mp3
// ============================================================
\Flight::route('GET /mp3/@id', function ($id) {

    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM mp3 WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $data = $stmt->fetch();

    if (!$data) {
        \Flight::json(['error' => 'MP3 introuvable'], 404);
        return;
    }

    \Flight::json($data);
});

// ============================================================
// PUT /mp3/@id → modifier les métadonnées
// ============================================================
\Flight::route('PUT /mp3/@id', function ($id) {

    $db   = getDB();
    $body = json_decode(file_get_contents('php://input'), true);

    if (!$body) {
        \Flight::json(['error' => 'Corps de la requête invalide'], 400);
        return;
    }

    $stmt = $db->prepare("
        UPDATE mp3 SET
            title    = :title,
            artist   = :artist,
            album    = :album,
            genre    = :genre,
            language = :language,
            year     = :year
        WHERE id = :id
    ");

    $stmt->execute([
        ':title'    => $body['title']    ?? null,
        ':artist'   => $body['artist']   ?? null,
        ':album'    => $body['album']    ?? null,
        ':genre'    => $body['genre']    ?? null,
        ':language' => $body['language'] ?? null,
        ':year'     => $body['year']     ?? null,
        ':id'       => $id,
    ]);

    \Flight::json(['success' => true, 'message' => 'MP3 mis à jour.']);
});

// ============================================================
// DELETE /mp3/@id → supprimer un mp3
// ============================================================
\Flight::route('DELETE /mp3/@id', function ($id) {

    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM mp3 WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $data = $stmt->fetch();

    if (!$data) {
        \Flight::json(['error' => 'MP3 introuvable'], 404);
        return;
    }

    // Supprime le fichier physique
    if (file_exists($data['path_serveur'])) {
        unlink($data['path_serveur']);
    }

    // Supprime en BDD
    $stmt = $db->prepare("DELETE FROM mp3 WHERE id = :id");
    $stmt->execute([':id' => $id]);

    \Flight::json(['success' => true, 'message' => 'MP3 supprimé.']);
});

// ============================================================
// GET /mp3/@id/stream → stream le fichier MP3 pour lecture
// ============================================================
\Flight::route('GET /mp3/@id/stream', function ($id) {
    $db = getDB();
    $stmt = $db->prepare("SELECT path_serveur, filename FROM mp3 WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $data = $stmt->fetch();
    
    if (!$data || !file_exists($data['path_serveur'])) {
        \Flight::json(['error' => 'Fichier introuvable'], 404);
        return;
    }
    
    // Configurer les entêtes pour la lecture audio
    header('Content-Type: audio/mpeg');
    header('Content-Disposition: inline; filename="' . basename($data['filename']) . '"');
    header('Content-Length: ' . filesize($data['path_serveur']));
    header('Accept-Ranges: bytes');
    
    readfile($data['path_serveur']);
});

// ============================================================
// GET /playlists → liste toutes les playlists
// ============================================================
\Flight::route('GET /playlists', function () {
    $db = getDB();
    $stmt = $db->query("
        SELECT p.*, COUNT(pm.mp3_id) as track_count, COALESCE(SUM(m.duration), 0) as total_duration
        FROM playlist p
        LEFT JOIN playlist_mp3 pm ON p.id = pm.playlist_id
        LEFT JOIN mp3 m ON pm.mp3_id = m.id
        GROUP BY p.id
        ORDER BY p.created_at DESC
    ");
    $data = $stmt->fetchAll();
    \Flight::json($data);
});

// ============================================================
// GET /playlists/@id → détail d'une playlist
// ============================================================
\Flight::route('GET /playlists/@id', function ($id) {
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM playlist WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $playlist = $stmt->fetch();
    
    if (!$playlist) {
        \Flight::json(['error' => 'Playlist introuvable'], 404);
        return;
    }
    
    $stmt = $db->prepare("
        SELECT m.* FROM mp3 m
        JOIN playlist_mp3 pm ON m.id = pm.mp3_id
        WHERE pm.playlist_id = :id
        ORDER BY pm.position ASC
    ");
    $stmt->execute([':id' => $id]);
    $tracks = $stmt->fetchAll();
    
    $playlist['tracks'] = $tracks;
    \Flight::json($playlist);
});

// ============================================================
// POST /playlists → enregistrer une playlist
// ============================================================
\Flight::route('POST /playlists', function () {
    $db = getDB();
    $body = json_decode(file_get_contents('php://input'), true);
    
    if (empty($body['name']) || empty($body['mp3_ids'])) {
        \Flight::json(['error' => 'Nom et liste d\'identifiants MP3 requis'], 400);
        return;
    }
    
    $db->beginTransaction();
    try {
        $stmt = $db->prepare("INSERT INTO playlist (name) VALUES (:name)");
        $stmt->execute([':name' => $body['name']]);
        $playlistId = $db->lastInsertId();
        
        $stmtItem = $db->prepare("
            INSERT INTO playlist_mp3 (playlist_id, mp3_id, position)
            VALUES (:playlist_id, :mp3_id, :position)
        ");
        
        $position = 1;
        foreach ($body['mp3_ids'] as $mp3Id) {
            $stmtItem->execute([
                ':playlist_id' => $playlistId,
                ':mp3_id' => $mp3Id,
                ':position' => $position++
            ]);
        }
        
        $db->commit();
        
        \Flight::json([
            'success' => true,
            'id' => $playlistId,
            'message' => 'Playlist sauvegardée avec succès.'
        ], 201);
    } catch (\Exception $e) {
        $db->rollBack();
        \Flight::json(['error' => 'Erreur lors de la sauvegarde de la playlist : ' . $e->getMessage()], 500);
    }
});

// ============================================================
// DELETE /playlists/@id → supprimer une playlist
// ============================================================
\Flight::route('DELETE /playlists/@id', function ($id) {
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM playlist WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $playlist = $stmt->fetch();
    
    if (!$playlist) {
        \Flight::json(['error' => 'Playlist introuvable'], 404);
        return;
    }
    
    $stmt = $db->prepare("DELETE FROM playlist WHERE id = :id");
    $stmt->execute([':id' => $id]);
    
    \Flight::json(['success' => true, 'message' => 'Playlist supprimée.']);
});

// ============================================================
// GET /playlists/@id/zip → télécharger les fichiers d'une playlist au format ZIP
// ============================================================
\Flight::route('GET /playlists/@id/zip', function ($id) {
    $db = getDB();
    
    $stmt = $db->prepare("SELECT * FROM playlist WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $playlist = $stmt->fetch();
    if (!$playlist) {
        \Flight::json(['error' => 'Playlist introuvable'], 404);
        return;
    }
    
    $stmt = $db->prepare("
        SELECT m.* FROM mp3 m
        JOIN playlist_mp3 pm ON m.id = pm.mp3_id
        WHERE pm.playlist_id = :id
        ORDER BY pm.position ASC
    ");
    $stmt->execute([':id' => $id]);
    $tracks = $stmt->fetchAll();
    
    if (empty($tracks)) {
        \Flight::json(['error' => 'Playlist vide'], 400);
        return;
    }
    
    $zip = new \ZipArchive();
    $zipFilename = tempnam(sys_get_temp_dir(), 'playlist_zip');
    
    if ($zip->open($zipFilename, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
        \Flight::json(['error' => 'Impossible de créer le fichier ZIP'], 500);
        return;
    }
    
    $added = 0;
    foreach ($tracks as $track) {
        $filepath = $track['path_serveur'];
        if (file_exists($filepath)) {
            $filename = basename($track['filename']);
            $zip->addFile($filepath, $filename);
            $added++;
        }
    }
    
    $zip->close();
    
    if ($added === 0) {
        @unlink($zipFilename);
        \Flight::json(['error' => 'Aucun fichier physique trouvé pour cette playlist'], 404);
        return;
    }
    
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . rawurlencode($playlist['name']) . '.zip"');
    header('Content-Length: ' . filesize($zipFilename));
    header('Pragma: no-cache');
    header('Expires: 0');
    
    readfile($zipFilename);
    @unlink($zipFilename);
});
