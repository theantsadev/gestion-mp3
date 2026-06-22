import { useState, useEffect, useRef } from 'react';
import { Mp3 } from './models/Mp3';
import { Playlist } from './models/Playlist';
import { PlaylistCriteria } from './models/PlaylistCriteria';
import { ApiService } from './services/ApiService';
import { AudioPlayer } from './services/AudioPlayer';

function App() {
  // State pour la bibliothèque
  const [mp3s, setMp3s] = useState<Mp3[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // State pour l'upload
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState({
    title: '',
    artist: '',
    album: '',
    genre: '',
    language: '',
    year: '',
    duration: '',
  });

  // State pour l'édition
  const [editingMp3, setEditingMp3] = useState<Mp3 | null>(null);

  // State pour les playlists enregistrées
  const [playlists, setPlaylists] = useState<any[]>([]);

  // State pour le générateur de playlist
  const [targetDurationMin, setTargetDurationMin] = useState(30); // 30 minutes
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [excludedGenres, setExcludedGenres] = useState<string[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [excludedArtists, setExcludedArtists] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [excludedLanguages, setExcludedLanguages] = useState<string[]>([]);

  const [proposedPlaylist, setProposedPlaylist] = useState<Playlist | null>(null);
  const [precision, setPrecision] = useState<number | null>(null);
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);

  // State pour l'enregistrement de la playlist
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [playlistName, setPlaylistName] = useState('');

  // State pour le lecteur audio global
  const [playerState, setPlayerState] = useState({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    currentTrack: null as Mp3 | null,
    playlist: null as Playlist | null,
    currentTrackIndex: -1,
    volume: 0.8,
  });

  // Vue active (dashboard)
  const [activeTab, setActiveTab] = useState<'library' | 'generator' | 'playlists'>('library');

  // Réf pour le input file d'upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger la bibliothèque et les playlists
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const tracks = await ApiService.fetchMp3s();
      setMp3s(tracks);
      const lists = await ApiService.fetchPlaylists();
      setPlaylists(lists);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // S'abonner aux changements du lecteur audio
    const player = AudioPlayer.getInstance();
    const unsubscribe = player.subscribe((p) => {
      setPlayerState({
        isPlaying: p.isPlaying,
        currentTime: p.currentTime,
        duration: p.duration,
        currentTrack: p.getCurrentTrack(),
        playlist: p.playlist,
        currentTrackIndex: p.currentTrackIndex,
        volume: p.volume,
      });
    });

    return unsubscribe;
  }, []);

  // Déterminer la liste des genres, artistes, langues uniques
  const getUniqueValues = (key: 'genre' | 'artist' | 'language') => {
    const values = mp3s
      .map(track => {
        if (key === 'genre') return track.getDisplayGenre();
        if (key === 'artist') return track.getDisplayArtist();
        return track.getDisplayLanguage();
      })
      .filter(v => v !== 'Inconnu' && v.trim() !== '');
    return Array.from(new Set(values));
  };

  const uniqueGenres = getUniqueValues('genre');
  const uniqueArtists = getUniqueValues('artist');
  const uniqueLanguages = getUniqueValues('language');

  // Gérer le clic sur un filtre (inclus / exclus / neutre)
  const toggleFilter = (val: string, type: 'genre' | 'artist' | 'language') => {
    let selected: string[];
    let setSelected: React.Dispatch<React.SetStateAction<string[]>>;
    let excluded: string[];
    let setExcluded: React.Dispatch<React.SetStateAction<string[]>>;

    if (type === 'genre') {
      selected = selectedGenres; setSelected = setSelectedGenres;
      excluded = excludedGenres; setExcluded = setExcludedGenres;
    } else if (type === 'artist') {
      selected = selectedArtists; setSelected = setSelectedArtists;
      excluded = excludedArtists; setExcluded = setExcludedArtists;
    } else {
      selected = selectedLanguages; setSelected = setSelectedLanguages;
      excluded = excludedLanguages; setExcluded = setExcludedLanguages;
    }

    if (selected.includes(val)) {
      // Passer de sélectionné à exclu
      setSelected(selected.filter(x => x !== val));
      setExcluded([...excluded, val]);
    } else if (excluded.includes(val)) {
      // Passer d'exclu à neutre
      setExcluded(excluded.filter(x => x !== val));
    } else {
      // Passer de neutre à sélectionné
      setSelected([...selected, val]);
    }
  };

  // Sélectionner le fichier pour l'upload et lire automatiquement sa durée
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      
      // Nettoyer le nom du fichier pour faire un titre par défaut
      const defaultTitle = file.name.replace(/\.[^/.]+$/, "");
      
      setUploadMetadata(prev => ({
        ...prev,
        title: defaultTitle,
      }));

      // Extraire la durée en JS
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        setUploadMetadata(prev => ({
          ...prev,
          duration: Math.round(audio.duration).toString(),
        }));
      };
    }
  };

  // Soumettre l'upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setError(null);
    setLoading(true);
    try {
      await ApiService.uploadMp3(uploadFile, uploadMetadata);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadMetadata({
        title: '',
        artist: '',
        album: '',
        genre: '',
        language: '',
        year: '',
        duration: '',
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'upload');
    } finally {
      setLoading(false);
    }
  };

  // Ouvrir le formulaire d'édition
  const startEdit = (track: Mp3) => {
    setEditingMp3(track);
  };

  // Soumettre l'édition de métadonnées
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMp3) return;

    setError(null);
    setLoading(true);
    try {
      await ApiService.updateMp3(editingMp3.id, {
        title: editingMp3.title,
        artist: editingMp3.artist,
        album: editingMp3.album,
        genre: editingMp3.genre,
        language: editingMp3.language,
        year: editingMp3.year,
      });
      setEditingMp3(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  // Supprimer un morceau
  const handleDeleteMp3 = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer ce morceau ?')) return;
    setError(null);
    setLoading(true);
    try {
      await ApiService.deleteMp3(id);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur de suppression');
    } finally {
      setLoading(false);
    }
  };

  // Générer la playlist
  const handleGeneratePlaylist = async () => {
    setError(null);
    setLoading(true);
    try {
      const criteria = new PlaylistCriteria(
        selectedGenres,
        excludedGenres,
        selectedArtists,
        excludedArtists,
        selectedLanguages,
        excludedLanguages,
        targetDurationMin * 60 // secondes
      );

      const result = await ApiService.generatePlaylist(criteria);
      setProposedPlaylist(result.playlist);
      setPrecision(result.precision);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la génération de la playlist');
    } finally {
      setLoading(false);
    }
  };

  // Enregistrer la playlist proposée
  const handleSavePlaylist = async () => {
    if (!proposedPlaylist || !playlistName.trim()) return;

    setError(null);
    setLoading(true);
    try {
      const mp3Ids = proposedPlaylist.tracks.map(t => t.id);
      await ApiService.savePlaylist(playlistName, mp3Ids);
      setShowSaveModal(false);
      setPlaylistName('');
      setProposedPlaylist(null);
      await loadData();
      setActiveTab('playlists');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement de la playlist');
    } finally {
      setLoading(false);
    }
  };

  // Supprimer une playlist
  const handleDeletePlaylist = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer cette playlist ?')) return;
    setError(null);
    setLoading(true);
    try {
      await ApiService.deletePlaylist(id);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression de la playlist');
    } finally {
      setLoading(false);
    }
  };

  // Lancer la lecture d'un morceau particulier dans une playlist
  const playTrack = (playlist: Playlist, index: number) => {
    AudioPlayer.getInstance().play(playlist, index);
  };

  // Actions de contrôle du lecteur audio global
  const handlePlayPause = () => {
    const player = AudioPlayer.getInstance();
    if (playerState.isPlaying) {
      player.pause();
    } else {
      player.resume();
    }
  };

  const handleNext = () => {
    AudioPlayer.getInstance().next();
  };

  const handlePrev = () => {
    AudioPlayer.getInstance().prev();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    AudioPlayer.getInstance().setVolume(parseFloat(e.target.value));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    AudioPlayer.getInstance().seek(parseFloat(e.target.value));
  };

  // Rechercher les morceaux éligibles pour remplacer un morceau à un index spécifique
  const getEligibleSwaps = () => {
    if (!proposedPlaylist || swappingIndex === null) return [];
    
    // Un morceau éligible doit correspondre aux critères du filtre
    // et ne doit pas déjà être dans la playlist proposée.
    const currentIds = proposedPlaylist.tracks.map(t => t.id);
    
    return mp3s.filter(track => {
      // Ne doit pas être déjà dans la playlist
      if (currentIds.includes(track.id)) return false;

      const genre = track.getDisplayGenre();
      const artist = track.getDisplayArtist();
      const language = track.getDisplayLanguage();

      // Vérifier critères d'inclusion/exclusion
      if (selectedGenres.length > 0 && !selectedGenres.includes(genre)) return false;
      if (excludedGenres.includes(genre)) return false;
      if (selectedArtists.length > 0 && !selectedArtists.includes(artist)) return false;
      if (excludedArtists.includes(artist)) return false;
      if (selectedLanguages.length > 0 && !selectedLanguages.includes(language)) return false;
      if (excludedLanguages.includes(language)) return false;

      return true;
    });
  };

  // Exécuter le remplacement du morceau
  const executeSwap = (newTrack: Mp3) => {
    if (!proposedPlaylist || swappingIndex === null) return;
    
    proposedPlaylist.swapTracks(swappingIndex, swappingIndex); // force OO call structure
    const updatedTracks = [...proposedPlaylist.tracks];
    updatedTracks[swappingIndex] = newTrack;
    
    const newPl = new Playlist(proposedPlaylist.name, updatedTracks, proposedPlaylist.id, proposedPlaylist.created_at);
    setProposedPlaylist(newPl);
    
    // Recalculer la précision locale
    const newTotal = newPl.getTotalDuration();
    setPrecision((targetDurationMin * 60) - newTotal);
    setSwappingIndex(null);
  };

  // Retirer un morceau de la playlist proposée
  const removeTrackFromProposal = (index: number) => {
    if (!proposedPlaylist) return;
    const updatedTracks = proposedPlaylist.tracks.filter((_, idx) => idx !== index);
    const newPl = new Playlist(proposedPlaylist.name, updatedTracks, proposedPlaylist.id, proposedPlaylist.created_at);
    setProposedPlaylist(newPl);
    setPrecision((targetDurationMin * 60) - newPl.getTotalDuration());
  };

  // Réordonner la playlist proposée
  const moveTrackInProposal = (index: number, direction: 'up' | 'down') => {
    if (!proposedPlaylist) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= proposedPlaylist.tracks.length) return;
    
    const pl = new Playlist(proposedPlaylist.name, [...proposedPlaylist.tracks]);
    pl.swapTracks(index, targetIdx);
    setProposedPlaylist(pl);
  };

  // Filtrer les morceaux affichés dans la bibliothèque
  const filteredMp3s = mp3s.filter(track => {
    const query = searchQuery.toLowerCase();
    return (
      (track.title || '').toLowerCase().includes(query) ||
      (track.artist || '').toLowerCase().includes(query) ||
      (track.album || '').toLowerCase().includes(query) ||
      (track.filename || '').toLowerCase().includes(query) ||
      (track.genre || '').toLowerCase().includes(query)
    );
  });

  // Formater les secondes en MM:SS
  const formatSeconds = (totalSec: number) => {
    const minutes = Math.floor(totalSec / 60);
    const seconds = Math.floor(totalSec % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="main-header">
        <div className="header-brand">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/>
            </svg>
          </div>
          <h1>Pulse<span>MP3</span></h1>
        </div>
        <p className="header-subtitle">Gestionnaire de Musique & Générateur Intelligent de Playlists</p>
        
        <nav className="nav-tabs">
          <button 
            className={`tab-btn ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            Bibliothèque ({mp3s.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'generator' ? 'active' : ''}`}
            onClick={() => setActiveTab('generator')}
          >
            Générateur de Playlist
          </button>
          <button 
            className={`tab-btn ${activeTab === 'playlists' ? 'active' : ''}`}
            onClick={() => setActiveTab('playlists')}
          >
            Playlists Enregistrées ({playlists.length})
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="content-area">
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>&times;</button>
          </div>
        )}

        {loading && <div className="loading-spinner">Chargement en cours...</div>}

        {/* 1. LIBRARY TAB */}
        {activeTab === 'library' && (
          <section className="tab-section glass-panel">
            <div className="section-header">
              <h2>Bibliothèque Audio</h2>
              <div className="actions">
                <input 
                  type="text" 
                  placeholder="Rechercher titre, artiste, album..." 
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
                  + Importer un MP3
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="music-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Artiste</th>
                    <th>Album</th>
                    <th>Genre</th>
                    <th>Langue</th>
                    <th>Durée</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMp3s.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-state">
                        Aucun morceau trouvé. Importez des fichiers pour commencer !
                      </td>
                    </tr>
                  ) : (
                    filteredMp3s.map((track) => (
                      <tr key={track.id} className={playerState.currentTrack?.id === track.id ? 'playing-row' : ''}>
                        <td className="track-title-cell">
                          <button 
                            className="play-row-btn"
                            onClick={() => playTrack(new Playlist("Library", [track]), 0)}
                          >
                            {playerState.isPlaying && playerState.currentTrack?.id === track.id ? '⏸' : '▶'}
                          </button>
                          <span>{track.getDisplayName()}</span>
                        </td>
                        <td>{track.getDisplayArtist()}</td>
                        <td>{track.album || 'Inconnu'}</td>
                        <td>
                          <span className="badge badge-genre">{track.getDisplayGenre()}</span>
                        </td>
                        <td>
                          <span className="badge badge-lang">{track.getDisplayLanguage()}</span>
                        </td>
                        <td>{track.getFormattedDuration()}</td>
                        <td>
                          <div className="row-actions">
                            <button className="btn-icon" title="Modifier" onClick={() => startEdit(track)}>✏️</button>
                            <button className="btn-icon btn-danger" title="Supprimer" onClick={() => handleDeleteMp3(track.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 2. GENERATOR TAB */}
        {activeTab === 'generator' && (
          <div className="generator-grid">
            {/* Colonne Filtres */}
            <section className="glass-panel criteria-panel">
              <h2>Critères de Génération</h2>
              
              <div className="criteria-group">
                <label>Durée totale de la Playlist (Minutes)</label>
                <div className="duration-slider-container">
                  <input 
                    type="range" 
                    min="5" 
                    max="240" 
                    step="5"
                    value={targetDurationMin}
                    onChange={(e) => setTargetDurationMin(parseInt(e.target.value))}
                    className="slider"
                  />
                  <span className="duration-bubble">{targetDurationMin} min ({targetDurationMin * 60}s)</span>
                </div>
              </div>

              {/* Filtre Genres */}
              <div className="criteria-group">
                <h3>Genres</h3>
                <p className="help-text">Cliquez pour modifier : Gris (Ignorer), Vert (+ Inclure), Rouge (- Exclure)</p>
                <div className="pill-group">
                  {uniqueGenres.map(genre => {
                    const isSelected = selectedGenres.includes(genre);
                    const isExcluded = excludedGenres.includes(genre);
                    let badgeClass = 'pill-neutral';
                    if (isSelected) badgeClass = 'pill-selected';
                    if (isExcluded) badgeClass = 'pill-excluded';
                    
                    return (
                      <button 
                        key={genre} 
                        className={`pill-toggle ${badgeClass}`}
                        onClick={() => toggleFilter(genre, 'genre')}
                      >
                        {isSelected && '✓ '}
                        {isExcluded && '✗ '}
                        {genre}
                      </button>
                    );
                  })}
                  {uniqueGenres.length === 0 && <p className="empty-help">Aucun genre disponible.</p>}
                </div>
              </div>

              {/* Filtre Artistes */}
              <div className="criteria-group">
                <h3>Artistes</h3>
                <p className="help-text">Cliquez pour modifier : Gris (Ignorer), Vert (+ Inclure), Rouge (- Exclure)</p>
                <div className="pill-group">
                  {uniqueArtists.map(artist => {
                    const isSelected = selectedArtists.includes(artist);
                    const isExcluded = excludedArtists.includes(artist);
                    let badgeClass = 'pill-neutral';
                    if (isSelected) badgeClass = 'pill-selected';
                    if (isExcluded) badgeClass = 'pill-excluded';

                    return (
                      <button 
                        key={artist} 
                        className={`pill-toggle ${badgeClass}`}
                        onClick={() => toggleFilter(artist, 'artist')}
                      >
                        {isSelected && '✓ '}
                        {isExcluded && '✗ '}
                        {artist}
                      </button>
                    );
                  })}
                  {uniqueArtists.length === 0 && <p className="empty-help">Aucun artiste disponible.</p>}
                </div>
              </div>

              {/* Filtre Langues */}
              <div className="criteria-group">
                <h3>Langues</h3>
                <p className="help-text">Cliquez pour modifier : Gris (Ignorer), Vert (+ Inclure), Rouge (- Exclure)</p>
                <div className="pill-group">
                  {uniqueLanguages.map(lang => {
                    const isSelected = selectedLanguages.includes(lang);
                    const isExcluded = excludedLanguages.includes(lang);
                    let badgeClass = 'pill-neutral';
                    if (isSelected) badgeClass = 'pill-selected';
                    if (isExcluded) badgeClass = 'pill-excluded';

                    return (
                      <button 
                        key={lang} 
                        className={`pill-toggle ${badgeClass}`}
                        onClick={() => toggleFilter(lang, 'language')}
                      >
                        {isSelected && '✓ '}
                        {isExcluded && '✗ '}
                        {lang}
                      </button>
                    );
                  })}
                  {uniqueLanguages.length === 0 && <p className="empty-help">Aucune langue disponible.</p>}
                </div>
              </div>

              <button 
                className="btn btn-primary btn-block"
                onClick={handleGeneratePlaylist}
                disabled={mp3s.length === 0}
              >
                Générer la Playlist
              </button>
            </section>

            {/* Colonne Proposition */}
            <section className="glass-panel proposal-panel">
              <h2>Playlist Proposée</h2>

              {proposedPlaylist ? (
                <div className="proposal-content">
                  <div className="proposal-summary">
                    <div className="summary-stat">
                      <span className="stat-label">Titres</span>
                      <span className="stat-value">{proposedPlaylist.tracks.length}</span>
                    </div>
                    <div className="summary-stat">
                      <span className="stat-label">Durée totale</span>
                      <span className="stat-value">{proposedPlaylist.getFormattedTotalDuration()}</span>
                    </div>
                    <div className="summary-stat">
                      <span className="stat-label">Précision</span>
                      <span className={`stat-value ${precision !== null && Math.abs(precision) < 30 ? 'text-success' : 'text-warning'}`}>
                        {precision !== null ? `${precision > 0 ? '-' : '+'}${formatSeconds(Math.abs(precision))}` : '0s'}
                      </span>
                    </div>
                  </div>

                  <div className="proposal-tracks-list">
                    {proposedPlaylist.tracks.map((track, idx) => (
                      <div key={`${track.id}-${idx}`} className="proposal-track-item">
                        <div className="track-drag-controls">
                          <button 
                            disabled={idx === 0} 
                            onClick={() => moveTrackInProposal(idx, 'up')}
                            className="btn-arrow"
                          >
                            ▲
                          </button>
                          <button 
                            disabled={idx === proposedPlaylist.tracks.length - 1} 
                            onClick={() => moveTrackInProposal(idx, 'down')}
                            className="btn-arrow"
                          >
                            ▼
                          </button>
                        </div>

                        <div className="track-info">
                          <h4>{track.getDisplayName()}</h4>
                          <p>{track.getDisplayArtist()} • {track.getFormattedDuration()}</p>
                        </div>

                        <div className="track-proposal-actions">
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSwappingIndex(idx)}
                          >
                            Remplacer
                          </button>
                          <button 
                            className="btn btn-danger-outline btn-sm"
                            onClick={() => removeTrackFromProposal(idx)}
                          >
                            Retirer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="proposal-footer">
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => playTrack(proposedPlaylist, 0)}
                    >
                      ▶ Écouter l'aperçu
                    </button>
                    <button 
                      className="btn btn-success"
                      onClick={() => setShowSaveModal(true)}
                    >
                      💾 Enregistrer la Playlist
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty-panel-state">
                  <p>Ajustez vos critères à gauche et cliquez sur "Générer la Playlist".</p>
                  <p className="sub">L'algorithme trouvera le sous-ensemble de titres qui respecte vos filtres et s'approche le plus de la durée voulue.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* 3. PLAYLISTS TAB */}
        {activeTab === 'playlists' && (
          <section className="tab-section glass-panel">
            <h2>Playlists Enregistrées</h2>
            <div className="playlists-grid">
              {playlists.length === 0 ? (
                <div className="empty-state-full">
                  <p>Aucune playlist n'a encore été enregistrée.</p>
                  <button className="btn btn-primary" onClick={() => setActiveTab('generator')}>
                    Générer une playlist
                  </button>
                </div>
              ) : (
                playlists.map((pl) => (
                  <div key={pl.id} className="playlist-card glass-panel">
                    <div className="playlist-card-header">
                      <h3>{pl.name}</h3>
                      <span className="playlist-date">
                        Créée le {new Date(pl.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="playlist-card-stats">
                      <div>
                        <strong>{pl.track_count}</strong> titres
                      </div>
                      <div>
                        <strong>{formatSeconds(pl.total_duration)}</strong> de musique
                      </div>
                    </div>

                    <div className="playlist-card-actions">
                      <button 
                        className="btn btn-primary"
                        onClick={async () => {
                          const fullPl = await ApiService.fetchPlaylist(pl.id);
                          playTrack(fullPl, 0);
                        }}
                      >
                        ▶ Lire
                      </button>
                      <a 
                        href={ApiService.getZipUrl(pl.id)} 
                        className="btn btn-secondary btn-link"
                        title="Télécharger l'archive ZIP contenant les morceaux"
                      >
                        📥 ZIP
                      </a>
                      <button 
                        className="btn btn-danger-outline"
                        onClick={() => handleDeletePlaylist(pl.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      {/* Global Audio Player Bar */}
      {playerState.currentTrack && (
        <footer className="player-bar">
          <div className="player-track-info">
            <div className="playing-disc">🎵</div>
            <div>
              <h3>{playerState.currentTrack.getDisplayName()}</h3>
              <p>{playerState.currentTrack.getDisplayArtist()} • {playerState.currentTrack.album || 'Sans album'}</p>
            </div>
          </div>

          <div className="player-controls-timeline">
            <div className="player-controls">
              <button onClick={handlePrev} className="control-btn" title="Précédent">⏮</button>
              <button onClick={handlePlayPause} className="control-btn play-pause-btn" title={playerState.isPlaying ? 'Pause' : 'Lecture'}>
                {playerState.isPlaying ? '⏸' : '▶'}
              </button>
              <button onClick={handleNext} className="control-btn" title="Suivant">⏭</button>
            </div>

            <div className="player-timeline">
              <span>{formatSeconds(playerState.currentTime)}</span>
              <input 
                type="range" 
                min="0" 
                max={playerState.duration || 1} 
                step="0.1"
                value={playerState.currentTime}
                onChange={handleSeek}
                className="timeline-slider"
              />
              <span>{formatSeconds(playerState.duration)}</span>
            </div>
          </div>

          <div className="player-volume-control">
            <span className="volume-icon">🔊</span>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              value={playerState.volume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />
          </div>
        </footer>
      )}

      {/* MODAL : Upload MP3 */}
      {showUploadModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>Importer un nouveau fichier MP3</h3>
              <button className="close-btn" onClick={() => setShowUploadModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleUploadSubmit}>
              <div className="form-group">
                <label>Fichier Audio (.mp3) *</label>
                <input 
                  type="file" 
                  accept="audio/mp3,audio/mpeg" 
                  onChange={handleFileChange}
                  required
                  ref={fileInputRef}
                  className="file-input"
                />
              </div>

              {uploadFile && (
                <>
                  <div className="form-group">
                    <label>Titre</label>
                    <input 
                      type="text" 
                      value={uploadMetadata.title}
                      onChange={(e) => setUploadMetadata({...uploadMetadata, title: e.target.value})}
                      placeholder="Titre de la chanson"
                    />
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Artiste</label>
                      <input 
                        type="text" 
                        value={uploadMetadata.artist}
                        onChange={(e) => setUploadMetadata({...uploadMetadata, artist: e.target.value})}
                        placeholder="Nom de l'artiste"
                      />
                    </div>
                    <div className="form-group">
                      <label>Album</label>
                      <input 
                        type="text" 
                        value={uploadMetadata.album}
                        onChange={(e) => setUploadMetadata({...uploadMetadata, album: e.target.value})}
                        placeholder="Nom de l'album"
                      />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Genre</label>
                      <input 
                        type="text" 
                        value={uploadMetadata.genre}
                        onChange={(e) => setUploadMetadata({...uploadMetadata, genre: e.target.value})}
                        placeholder="Ex: Rock, Pop, Rap"
                      />
                    </div>
                    <div className="form-group">
                      <label>Langue</label>
                      <input 
                        type="text" 
                        value={uploadMetadata.language}
                        onChange={(e) => setUploadMetadata({...uploadMetadata, language: e.target.value})}
                        placeholder="Ex: Français, Anglais"
                      />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Année</label>
                      <input 
                        type="text" 
                        value={uploadMetadata.year}
                        onChange={(e) => setUploadMetadata({...uploadMetadata, year: e.target.value})}
                        placeholder="Ex: 2024"
                      />
                    </div>
                    <div className="form-group">
                      <label>Durée (secondes)</label>
                      <input 
                        type="number" 
                        value={uploadMetadata.duration}
                        onChange={(e) => setUploadMetadata({...uploadMetadata, duration: e.target.value})}
                        placeholder="Calculé automatiquement"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={!uploadFile}>Importer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : Édition Métadonnées */}
      {editingMp3 && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>Modifier les métadonnées</h3>
              <button className="close-btn" onClick={() => setEditingMp3(null)}>&times;</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Fichier d'origine</label>
                <input type="text" value={editingMp3.filename} disabled className="disabled-input" />
              </div>

              <div className="form-group">
                <label>Titre</label>
                <input 
                  type="text" 
                  value={editingMp3.title || ''}
                  onChange={(e) => setEditingMp3(new Mp3(
                    editingMp3.id, editingMp3.filename, editingMp3.path_serveur,
                    e.target.value, editingMp3.artist, editingMp3.album, editingMp3.genre,
                    editingMp3.language, editingMp3.year, editingMp3.duration, editingMp3.bitrate,
                    editingMp3.filesize, editingMp3.created_at
                  ))}
                  placeholder="Titre"
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Artiste</label>
                  <input 
                    type="text" 
                    value={editingMp3.artist || ''}
                    onChange={(e) => setEditingMp3(new Mp3(
                      editingMp3.id, editingMp3.filename, editingMp3.path_serveur,
                      editingMp3.title, e.target.value, editingMp3.album, editingMp3.genre,
                      editingMp3.language, editingMp3.year, editingMp3.duration, editingMp3.bitrate,
                      editingMp3.filesize, editingMp3.created_at
                    ))}
                    placeholder="Artiste"
                  />
                </div>
                <div className="form-group">
                  <label>Album</label>
                  <input 
                    type="text" 
                    value={editingMp3.album || ''}
                    onChange={(e) => setEditingMp3(new Mp3(
                      editingMp3.id, editingMp3.filename, editingMp3.path_serveur,
                      editingMp3.title, editingMp3.artist, e.target.value, editingMp3.genre,
                      editingMp3.language, editingMp3.year, editingMp3.duration, editingMp3.bitrate,
                      editingMp3.filesize, editingMp3.created_at
                    ))}
                    placeholder="Album"
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Genre</label>
                  <input 
                    type="text" 
                    value={editingMp3.genre || ''}
                    onChange={(e) => setEditingMp3(new Mp3(
                      editingMp3.id, editingMp3.filename, editingMp3.path_serveur,
                      editingMp3.title, editingMp3.artist, editingMp3.album, e.target.value,
                      editingMp3.language, editingMp3.year, editingMp3.duration, editingMp3.bitrate,
                      editingMp3.filesize, editingMp3.created_at
                    ))}
                    placeholder="Genre"
                  />
                </div>
                <div className="form-group">
                  <label>Langue</label>
                  <input 
                    type="text" 
                    value={editingMp3.language || ''}
                    onChange={(e) => setEditingMp3(new Mp3(
                      editingMp3.id, editingMp3.filename, editingMp3.path_serveur,
                      editingMp3.title, editingMp3.artist, editingMp3.album, editingMp3.genre,
                      e.target.value, editingMp3.year, editingMp3.duration, editingMp3.bitrate,
                      editingMp3.filesize, editingMp3.created_at
                    ))}
                    placeholder="Langue"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Année</label>
                <input 
                  type="text" 
                  value={editingMp3.year || ''}
                  onChange={(e) => setEditingMp3(new Mp3(
                    editingMp3.id, editingMp3.filename, editingMp3.path_serveur,
                    editingMp3.title, editingMp3.artist, editingMp3.album, editingMp3.genre,
                    editingMp3.language, e.target.value, editingMp3.duration, editingMp3.bitrate,
                    editingMp3.filesize, editingMp3.created_at
                  ))}
                  placeholder="Année"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingMp3(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer les modifications</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : Choisir morceaux pour le Remplacement/Swap */}
      {swappingIndex !== null && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel swap-modal-content">
            <div className="modal-header">
              <h3>Remplacer le titre #{swappingIndex + 1}</h3>
              <button className="close-btn" onClick={() => setSwappingIndex(null)}>&times;</button>
            </div>
            
            <div className="swap-list-container">
              <p className="help-text">Choisissez un morceau de remplacement éligible (qui correspond aux mêmes critères) :</p>
              
              <div className="swap-list">
                {getEligibleSwaps().length === 0 ? (
                  <p className="empty-help text-center py-4">Aucun autre titre éligible trouvé dans la bibliothèque.</p>
                ) : (
                  getEligibleSwaps().map(track => (
                    <div key={track.id} className="swap-item glass-panel">
                      <div>
                        <h4>{track.getDisplayName()}</h4>
                        <p>{track.getDisplayArtist()} • {track.getFormattedDuration()}</p>
                      </div>
                      <button 
                        className="btn btn-success btn-sm"
                        onClick={() => executeSwap(track)}
                      >
                        Choisir
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setSwappingIndex(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL : Sauvegarde Playlist */}
      {showSaveModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>Enregistrer la playlist</h3>
              <button className="close-btn" onClick={() => setShowSaveModal(false)}>&times;</button>
            </div>
            <div className="form-group">
              <label>Nom de la Playlist</label>
              <input 
                type="text" 
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder="Ex: My Smooth Jazz Mix, Cardio 2024..."
                required
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSaveModal(false)}>Annuler</button>
              <button 
                className="btn btn-success" 
                onClick={handleSavePlaylist}
                disabled={!playlistName.trim()}
              >
                Confirmer l'enregistrement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
