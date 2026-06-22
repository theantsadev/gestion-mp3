export class PlaylistCriteria {
  public selectedGenres: string[];
  public excludedGenres: string[];
  public selectedArtists: string[];
  public excludedArtists: string[];
  public selectedLanguages: string[];
  public excludedLanguages: string[];
  public totalDuration: number;

  constructor(
    selectedGenres: string[] = [],
    excludedGenres: string[] = [],
    selectedArtists: string[] = [],
    excludedArtists: string[] = [],
    selectedLanguages: string[] = [],
    excludedLanguages: string[] = [],
    totalDuration: number = 1800
  ) {
    this.selectedGenres = selectedGenres;
    this.excludedGenres = excludedGenres;
    this.selectedArtists = selectedArtists;
    this.excludedArtists = excludedArtists;
    this.selectedLanguages = selectedLanguages;
    this.excludedLanguages = excludedLanguages;
    this.totalDuration = totalDuration;
  }

  public toJson(): any {
    return {
      selectedGenres: this.selectedGenres,
      excludedGenres: this.excludedGenres,
      selectedArtists: this.selectedArtists,
      excludedArtists: this.excludedArtists,
      selectedLanguages: this.selectedLanguages,
      excludedLanguages: this.excludedLanguages,
      totalDuration: this.totalDuration,
    };
  }
}
