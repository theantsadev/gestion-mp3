# Architecture Desktop - Gestion MP3

## Flux général

```
sources/  →  P1  →  P2  →  P3  →  API
```

---

## P1 — `SourceListener.php`

**Rôle :** Surveiller le dossier `sources/`

| | |
|---|---|
| **Input** | Dossier `sources/` |
| **Output** | Liste des chemins absolus des `.mp3` trouvés |
| **Fréquence** | Toutes les 5 minutes |

**Actions :**
- Scan le dossier `sources/` à intervalle régulier
- Détecte les nouveaux fichiers `.mp3`
- Transmet la liste des chemins absolus à P2

**Log :**
```
[2024-01-15 10:00:00] Fichier trouvé : /absolute/path/sources/track01.mp3
[2024-01-15 10:00:00] Fichier trouvé : /absolute/path/sources/track02.mp3
```

---

## P2 — `MetaDataExtractor.php`

**Rôle :** Extraire les métadonnées des fichiers MP3

| | |
|---|---|
| **Input** | Liste des chemins absolus (reçue de P1) |
| **Output** | Liste MP3 + métadonnées associées |

**Métadonnées extraites :**
- Titre
- Artiste
- Album
- Genre
- Durée
- Bitrate
- ...

**Log :**
```
[2024-01-15 10:00:01] Extraction OK : track01.mp3 → titre: "Song", artiste: "Artist", durée: 3:45
[2024-01-15 10:00:01] Extraction KO : track02.mp3 → métadonnées manquantes
```

---

## P3 — `ApiSender.php`

**Rôle :** Envoyer les données à l'API et nettoyer les fichiers

| | |
|---|---|
| **Input** | Liste MP3 + métadonnées (reçue de P2) |
| **Output** | — |

**Actions :**
- Envoie chaque fichier + ses métadonnées à l'API web
- ✅ **Si succès** → supprime le fichier dans `sources/`
- ❌ **Si échec** → conserve le fichier, logue l'erreur

**Log :**
```
[2024-01-15 10:00:02] Envoi en cours : track01.mp3
[2024-01-15 10:00:03] Envoi OK : track01.mp3 → supprimé de sources/
[2024-01-15 10:00:03] Envoi KO : track02.mp3 → erreur HTTP 500, fichier conservé
```

---

## Structure du projet

```
project/
├── sources/                  # Dépôt MP3 entrants
├── logs/                     # Fichiers log horodatés
├── src/
│   ├── SourceListener.php    # P1
│   ├── MetaDataExtractor.php # P2
│   └── ApiSender.php         # P3
├── config/
│   └── config.php            # URL API, chemins, intervalles...
└── run.php                   # Point d'entrée
```
