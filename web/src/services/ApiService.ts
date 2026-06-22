import { Mp3 } from '../models/Mp3';
import { Playlist } from '../models/Playlist';
import { PlaylistCriteria } from '../models/PlaylistCriteria';

const API_BASE_URL = 'http://localhost:8080/api';

export class ApiService {
  public static async fetchMp3s(): Promise<Mp3[]> {
    const response = await fetch(`${API_BASE_URL}/mp3`);
    if (!response.ok) {
      throw new Error('Impossible de charger la bibliothèque MP3');
    }
    const data = await response.json();
    return Array.isArray(data) ? data.map(item => Mp3.fromJson(item)) : [];
  }

  public static async uploadMp3(file: File, metadata: Record<string, string>): Promise<{ success: boolean; id: number; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    Object.keys(metadata).forEach(key => {
      if (metadata[key] !== undefined && metadata[key] !== null) {
        formData.append(key, metadata[key]);
      }
    });

    const response = await fetch(`${API_BASE_URL}/mp3/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Erreur lors du téléchargement du fichier MP3');
    }

    return await response.json();
  }

  public static async updateMp3(id: number, metadata: Record<string, any>): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/mp3/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Erreur lors de la mise à jour des métadonnées');
    }

    return await response.json();
  }

  public static async deleteMp3(id: number): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/mp3/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Erreur lors de la suppression du fichier MP3');
    }

    return await response.json();
  }

  public static async generatePlaylist(criteria: PlaylistCriteria): Promise<{ playlist: Playlist; precision: number }> {
    const response = await fetch(`${API_BASE_URL}/mp3/generate-playlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(criteria.toJson())
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Erreur lors de la génération de la playlist');
    }

    const data = await response.json();
    const tracks = Array.isArray(data.playlist) 
      ? data.playlist.map((item: any) => Mp3.fromJson(item)) 
      : [];
    
    const playlist = new Playlist("Playlist Proposée", tracks);
    return {
      playlist,
      precision: Number(data.precision)
    };
  }

  public static async fetchPlaylists(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/playlists`);
    if (!response.ok) {
      throw new Error('Impossible de charger les playlists');
    }
    return await response.json();
  }

  public static async fetchPlaylist(id: number): Promise<Playlist> {
    const response = await fetch(`${API_BASE_URL}/playlists/${id}`);
    if (!response.ok) {
      throw new Error('Impossible de charger la playlist spécifiée');
    }
    const data = await response.json();
    return Playlist.fromJson(data);
  }

  public static async savePlaylist(name: string, mp3Ids: number[]): Promise<{ success: boolean; id: number; message: string }> {
    const response = await fetch(`${API_BASE_URL}/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, mp3_ids: mp3Ids })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Erreur lors de la sauvegarde de la playlist');
    }

    return await response.json();
  }

  public static async deletePlaylist(id: number): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/playlists/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Erreur lors de la suppression de la playlist');
    }

    return await response.json();
  }

  public static getZipUrl(id: number): string {
    return `${API_BASE_URL}/playlists/${id}/zip`;
  }
}
