/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * VIKTIGT!
 * 1. Gå till Spotify Developer Dashboard: https://developer.spotify.com/dashboard
 * 2. Skapa en ny app.
 * 3. Kopiera ditt "Client ID" och klistra in det nedan.
 * 4. Gå till appens inställningar (Edit Settings).
 * 5. I fältet "Redirect URIs", lägg till exakt den URL där appen körs.
 *    t.ex. http://localhost:8080/ eller https://ditt-projektnamn.app.run/
 */

export const CLIENT_ID = 'BYT-UT-MOT-DITT-EGNA-SPOTIFY-CLIENT-ID';
export const REDIRECT_URI = window.location.origin + window.location.pathname;

// The scopes our app needs to function
export const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state'
].join(' ');
