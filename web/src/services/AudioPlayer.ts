import { Playlist } from '../models/Playlist';
import { Mp3 } from '../models/Mp3';

export class AudioPlayer {
  private static instance: AudioPlayer | null = null;

  public audio: HTMLAudioElement;
  public playlist: Playlist | null = null;
  public currentTrackIndex: number = -1;
  public isPlaying: boolean = false;
  public currentTime: number = 0;
  public duration: number = 0;
  public volume: number = 0.8;
  private listeners: Array<(player: AudioPlayer) => void> = [];

  private constructor() {
    this.audio = new Audio();
    this.audio.volume = this.volume;

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.notify();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.notify();
    });

    this.audio.addEventListener('timeupdate', () => {
      this.currentTime = this.audio.currentTime;
      this.notify();
    });

    this.audio.addEventListener('durationchange', () => {
      this.duration = this.audio.duration || 0;
      this.notify();
    });

    this.audio.addEventListener('ended', () => {
      this.next();
    });
  }

  public static getInstance(): AudioPlayer {
    if (!AudioPlayer.instance) {
      AudioPlayer.instance = new AudioPlayer();
    }
    return AudioPlayer.instance;
  }

  public play(playlist: Playlist, trackIndex: number): void {
    if (!playlist || playlist.tracks.length === 0) return;
    
    this.playlist = playlist;
    this.currentTrackIndex = trackIndex;
    const track = playlist.tracks[trackIndex];
    
    if (track) {
      this.audio.src = track.getStreamUrl();
      this.audio.play().catch(err => {
        console.error("Playback failed:", err);
      });
    }
  }

  public resume(): void {
    if (this.playlist && this.currentTrackIndex !== -1) {
      this.audio.play().catch(err => console.error(err));
    }
  }

  public pause(): void {
    this.audio.pause();
  }

  public stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.playlist = null;
    this.currentTrackIndex = -1;
    this.isPlaying = false;
    this.notify();
  }

  public next(): void {
    if (!this.playlist || this.currentTrackIndex === -1) return;
    const nextIndex = this.currentTrackIndex + 1;
    if (nextIndex < this.playlist.tracks.length) {
      this.play(this.playlist, nextIndex);
    } else {
      this.stop();
    }
  }

  public prev(): void {
    if (!this.playlist || this.currentTrackIndex === -1) return;
    const prevIndex = this.currentTrackIndex - 1;
    if (prevIndex >= 0) {
      this.play(this.playlist, prevIndex);
    } else {
      this.seek(0);
    }
  }

  public seek(time: number): void {
    if (time >= 0 && time <= this.duration) {
      this.audio.currentTime = time;
      this.currentTime = time;
      this.notify();
    }
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume = clamped;
    this.audio.volume = clamped;
    this.notify();
  }

  public getCurrentTrack(): Mp3 | null {
    if (!this.playlist || this.currentTrackIndex === -1) return null;
    return this.playlist.tracks[this.currentTrackIndex] || null;
  }

  public subscribe(listener: (player: AudioPlayer) => void): () => void {
    this.listeners.push(listener);
    listener(this);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this);
      } catch (err) {
        console.error("Listener notification failed:", err);
      }
    });
  }
}
