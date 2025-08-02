/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { CLIENT_ID, REDIRECT_URI, SCOPES } from './spotify-config';

// Define minimal types for the Spotify SDK objects to provide some type safety.
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: Spotify.PlayerOptions) => Spotify.Player;
    };
  }
}

namespace Spotify {
  export interface Player {
    connect: () => Promise<boolean>;
    disconnect: () => void;
    getCurrentState: () => Promise<WebPlaybackState | null>;
    getVolume: () => Promise<number>;
    setVolume: (volume: number) => Promise<void>;
    nextTrack: () => Promise<void>;
    previousTrack: () => Promise<void>;
    togglePlay: () => Promise<void>;
    on: (event: string, callback: (data: any) => void) => void;
  }

  export interface PlayerOptions {
    name: string;
    getOAuthToken: (cb: (token: string) => void) => void;
    volume?: number;
  }

  export interface WebPlaybackState {
    paused: boolean;
    track_window: {
      current_track: WebPlaybackTrack;
    };
  }

  export interface WebPlaybackTrack {
    uri: string;
    name: string;
    album: {
      name: string;
      images: { url: string }[];
    };
    artists: { name: string }[];
  }
}

const TOKEN_KEY = 'spotify_access_token';
const TOKEN_EXPIRY_KEY = 'spotify_token_expiry';

export class SpotifyManager {
  private player: Spotify.Player | null = null;
  private deviceId: string | null = null;
  private originalVolume: number = 0.5;

  // DOM Elements
  private loginButton = document.getElementById('spotify-login-button')!;
  private playerBar = document.getElementById('spotify-player-bar')!;
  private albumArt = document.getElementById('spotify-album-art') as HTMLImageElement;
  private trackName = document.getElementById('spotify-track-name')!;
  private trackArtist = document.getElementById('spotify-track-artist')!;
  private playPauseButton = document.getElementById('spotify-play-pause-button')!;
  private playIcon = this.playPauseButton.querySelector('.play-icon') as SVGElement;
  private pauseIcon = this.playPauseButton.querySelector('.pause-icon') as SVGElement;
  private prevButton = document.getElementById('spotify-prev-button')!;
  private nextButton = document.getElementById('spotify-next-button')!;
  private volumeSlider = document.getElementById('spotify-volume-slider') as HTMLInputElement;
  private logoutButton = document.getElementById('spotify-logout-button')!;
  private setupInstructions = document.getElementById('setup-instructions')!;
  private startButton = document.getElementById('start-button')!;


  constructor() {
    this.handleLoginClick = this.handleLoginClick.bind(this);
    this.handlePlayPause = this.handlePlayPause.bind(this);
    this.handlePrevTrack = this.handlePrevTrack.bind(this);
    this.handleNextTrack = this.handleNextTrack.bind(this);
    this.handleVolumeChange = this.handleVolumeChange.bind(this);
    this.logout = this.logout.bind(this);
  }

  initialize() {
    if (CLIENT_ID.startsWith('BYT-UT-MOT')) {
        console.error("Spotify Client ID has not been set in spotify-config.ts. Spotify integration will be disabled.");
        // Show setup instructions and hide the rest of the app functionality.
        this.setupInstructions.style.display = 'block';
        this.startButton.style.display = 'none';
        this.loginButton.style.display = 'none';
        return;
    }
    this.addEventListeners();
    this.handleAuthentication();
  }

  private addEventListeners() {
    this.loginButton.addEventListener('click', this.handleLoginClick);
    this.playPauseButton.addEventListener('click', this.handlePlayPause);
    this.prevButton.addEventListener('click', this.handlePrevTrack);
    this.nextButton.addEventListener('click', this.handleNextTrack);
    this.volumeSlider.addEventListener('input', this.handleVolumeChange);
    this.logoutButton.addEventListener('click', this.logout);
  }

  private handleAuthentication() {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1)); // remove #
      const accessToken = params.get('access_token');
      const expiresIn = params.get('expires_in');

      if (accessToken && expiresIn) {
        const expiryTime = Date.now() + parseInt(expiresIn, 10) * 1000;
        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
        window.location.hash = ''; // Clear the hash from the URL
        this.setupPlayer(accessToken);
        return;
      }
    }

    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

    if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry, 10)) {
      this.setupPlayer(storedToken);
    } else {
      this.showLoginButton();
    }
  }

  private handleLoginClick() {
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.search = new URLSearchParams({
      response_type: 'token',
      client_id: CLIENT_ID,
      scope: SCOPES,
      redirect_uri: REDIRECT_URI,
    }).toString();
    window.location.href = authUrl.toString();
  }

  private setupPlayer(accessToken: string) {
    window.onSpotifyWebPlaybackSDKReady = () => {
      this.player = new window.Spotify.Player({
        name: 'Start-nedräkning App',
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.5
      });

      this.player.on('ready', ({ device_id }) => {
        console.log('Spotify Player is ready with device ID', device_id);
        this.deviceId = device_id;
        this.showPlayerBar();
      });

      this.player.on('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
      });

      this.player.on('player_state_changed', (state) => {
        if (!state) {
            return;
        }
        this.updateUI(state);
      });

      this.player.on('authentication_error', ({ message }) => {
        console.error('Failed to authenticate', message);
        this.logout();
      });

      this.player.connect();
    };
  }

  private updateUI(state: Spotify.WebPlaybackState) {
    const track = state.track_window.current_track;
    this.albumArt.src = track.album.images[0]?.url || '';
    this.trackName.textContent = track.name;
    this.trackArtist.textContent = track.artists.map(artist => artist.name).join(', ');

    if (state.paused) {
      this.playIcon.style.display = 'block';
      this.pauseIcon.style.display = 'none';
    } else {
      this.playIcon.style.display = 'none';
      this.pauseIcon.style.display = 'block';
    }
  }
  
  private showLoginButton() {
    this.loginButton.style.display = 'block';
    this.playerBar.classList.add('hidden');
  }

  private showPlayerBar() {
    this.loginButton.style.display = 'none';
    this.playerBar.classList.remove('hidden');
  }

  private logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    this.player?.disconnect();
    this.player = null;
    this.showLoginButton();
  }

  // --- Public Methods for External Control ---

  public async dampenVolume() {
    if (!this.player) return;
    try {
      this.originalVolume = await this.player.getVolume();
      // Dampen to a low but audible volume
      await this.player.setVolume(0.1); 
    } catch (e) {
      console.error("Could not dampen volume", e);
    }
  }

  public async restoreVolume() {
    if (!this.player) return;
    try {
      // Restore to the original volume
      await this.player.setVolume(this.originalVolume);
    } catch (e) {
      console.error("Could not restore volume", e);
    }
  }

  // Control Handlers
  private handlePlayPause() { this.player?.togglePlay(); }
  private handlePrevTrack() { this.player?.previousTrack(); }
  private handleNextTrack() { this.player?.nextTrack(); }
  private handleVolumeChange(event: Event) {
    const volume = parseFloat((event.target as HTMLInputElement).value);
    this.player?.setVolume(volume);
  }
}
