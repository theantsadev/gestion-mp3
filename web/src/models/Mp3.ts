export class Mp3 {
  public id: number;
  public filename: string;
  public path_serveur: string;
  public title: string | null;
  public artist: string | null;
  public album: string | null;
  public genre: string | null;
  public language: string | null;
  public year: string | null;
  public duration: number | null;
  public bitrate: string | null;
  public filesize: number | null;
  public created_at: string | null;

  constructor(
    id: number,
    filename: string,
    path_serveur: string,
    title: string | null,
    artist: string | null,
    album: string | null,
    genre: string | null,
    language: string | null,
    year: string | null,
    duration: number | null,
    bitrate: string | null,
    filesize: number | null,
    created_at: string | null
  ) {
    this.id = id;
    this.filename = filename;
    this.path_serveur = path_serveur;
    this.title = title;
    this.artist = artist;
    this.album = album;
    this.genre = genre;
    this.language = language;
    this.year = year;
    this.duration = duration;
    this.bitrate = bitrate;
    this.filesize = filesize;
    this.created_at = created_at;
  }

  public getFormattedDuration(): string {
    if (!this.duration) return '0:00';
    const minutes = Math.floor(this.duration / 60);
    const seconds = Math.floor(this.duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  public getStreamUrl(): string {
    return `http://localhost:8080/api/mp3/${this.id}/stream`;
  }

  public getDisplayName(): string {
    if (this.title && this.title.trim() !== '' && this.title !== 'Inconnu') {
      return this.title;
    }
    return this.filename;
  }

  public getDisplayArtist(): string {
    if (this.artist && this.artist.trim() !== '' && this.artist !== 'Inconnu') {
      return this.artist;
    }
    return 'Inconnu';
  }

  public getDisplayGenre(): string {
    if (this.genre && this.genre.trim() !== '' && this.genre !== 'Inconnu') {
      return this.genre;
    }
    return 'Inconnu';
  }

  public getDisplayLanguage(): string {
    if (this.language && this.language.trim() !== '' && this.language !== 'Inconnu') {
      return this.language;
    }
    return 'Inconnu';
  }

  public static fromJson(json: any): Mp3 {
    return new Mp3(
      Number(json.id),
      json.filename || '',
      json.path_serveur || '',
      json.title || null,
      json.artist || null,
      json.album || null,
      json.genre || null,
      json.language || null,
      json.year || null,
      json.duration ? Number(json.duration) : null,
      json.bitrate || null,
      json.filesize ? Number(json.filesize) : null,
      json.created_at || null
    );
  }
}
