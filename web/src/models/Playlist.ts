import { Mp3 } from './Mp3';

export class Playlist {
  public name: string;
  public tracks: Mp3[];
  public id?: number;
  public created_at?: string;

  constructor(
    name: string,
    tracks: Mp3[] = [],
    id?: number,
    created_at?: string
  ) {
    this.name = name;
    this.tracks = tracks;
    this.id = id;
    this.created_at = created_at;
  }

  public getTotalDuration(): number {
    return this.tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
  }

  public getFormattedTotalDuration(): string {
    const totalSec = this.getTotalDuration();
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = Math.floor(totalSec % 60);

    const parts: string[] = [];
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    if (minutes > 0 || hours > 0) {
      parts.push(`${minutes}m`);
    }
    parts.push(`${seconds}s`);

    return parts.join(' ');
  }

  public addTrack(track: Mp3, position?: number): void {
    if (position !== undefined && position >= 0 && position <= this.tracks.length) {
      this.tracks.splice(position, 0, track);
    } else {
      this.tracks.push(track);
    }
  }

  public removeTrack(trackId: number): void {
    this.tracks = this.tracks.filter(t => t.id !== trackId);
  }

  public swapTracks(indexA: number, indexB: number): void {
    if (
      indexA >= 0 && indexA < this.tracks.length &&
      indexB >= 0 && indexB < this.tracks.length
    ) {
      const temp = this.tracks[indexA];
      this.tracks[indexA] = this.tracks[indexB];
      this.tracks[indexB] = temp;
    }
  }

  public static fromJson(json: any): Playlist {
    const tracks = Array.isArray(json.tracks) 
      ? json.tracks.map((t: any) => Mp3.fromJson(t))
      : [];
    return new Playlist(
      json.name || 'Sans titre',
      tracks,
      json.id ? Number(json.id) : undefined,
      json.created_at || undefined
    );
  }
}
