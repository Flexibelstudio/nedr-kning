/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { SpotifyManager } from './spotify';

const countdownDisplay = document.getElementById('countdown-display') as HTMLDivElement;
const startButton = document.getElementById('start-button') as HTMLButtonElement;

// Store the Swedish voice globally to avoid searching for it every time.
let swedishVoice: SpeechSynthesisVoice | null = null;
let spotifyManager: SpotifyManager | null = null;

/**
 * Loads available voices and finds a Swedish one.
 * This is crucial because getVoices() can be asynchronous.
 */
function loadAndSetSwedishVoice() {
    // No need to run again if we found it.
    if (swedishVoice || !('speechSynthesis' in window)) return;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        swedishVoice = voices.find(voice => voice.lang === 'sv-SE') ||
                       voices.find(voice => voice.lang.startsWith('sv-')) ||
                       null;
        // If voices are loaded and we found one, we don't need the event listener anymore.
        if (swedishVoice) {
            window.speechSynthesis.onvoiceschanged = null;
        }
    }
}

// Check for speech synthesis support and set up voice loading.
if ('speechSynthesis' in window) {
    // The 'voiceschanged' event fires when the list of voices has been loaded.
    window.speechSynthesis.onvoiceschanged = loadAndSetSwedishVoice;
    // Also try to load them immediately, as they might already be available.
    loadAndSetSwedishVoice();
}


/**
 * Uses the Web Speech API to speak the given text in Swedish.
 * @param text The text to be spoken.
 */
function speak(text: string) {
    if ('speechSynthesis' in window) {
        // In case the 'speak' function is called before voices are loaded,
        // we make one more attempt to find the voice.
        if (!swedishVoice) {
            loadAndSetSwedishVoice();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        // Use the specific Swedish voice if found; otherwise, the browser will use a default.
        if (swedishVoice) {
            utterance.voice = swedishVoice;
        }
        utterance.lang = 'sv-SE'; // Set language as a fallback.
        utterance.rate = 1.3;     // A slightly faster rate sounds more energetic.

        // Cancel any previously queued speech to ensure the new one plays immediately.
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    } else {
        console.warn('Web Speech API is not supported in this browser.');
    }
}

async function startCountdown() {
    // On some browsers, the very first speech synthesis command must be triggered
    // by a user action. This empty speak call helps "wake up" the engine.
    if ('speechSynthesis' in window) {
      speak('');
    }

    startButton.disabled = true;
    countdownDisplay.classList.remove('go');

    // Dampen Spotify volume if available
    await spotifyManager?.dampenVolume();

    let count = 10;

    const countdownInterval = () => {
        if (count > 0) {
            countdownDisplay.textContent = count.toString();
            countdownDisplay.classList.remove('animate');
            // Trigger reflow to restart animation
            void countdownDisplay.offsetWidth;
            countdownDisplay.classList.add('animate');
            speak(count.toString());
            count--;
            setTimeout(countdownInterval, 1000);
        } else {
            countdownDisplay.textContent = 'KÖR!';
            countdownDisplay.classList.add('go');
            countdownDisplay.classList.remove('animate');
            void countdownDisplay.offsetWidth;
            countdownDisplay.classList.add('animate');
            speak('KÖR!');
            setTimeout(async () => {
                startButton.disabled = false;
                countdownDisplay.textContent = '';
                countdownDisplay.classList.remove('go', 'animate');
                // Restore Spotify volume
                await spotifyManager?.restoreVolume();
            }, 3000);
        }
    };

    countdownInterval();
}

/**
 * Main application entry point
 */
function main() {
    // Initialize Spotify Manager
    try {
        spotifyManager = new SpotifyManager();
        spotifyManager.initialize();
    } catch(e) {
        console.error("Could not initialize Spotify Manager. Did you add your CLIENT_ID in spotify-config.ts?", e);
    }

    // Attach countdown listener
    startButton.addEventListener('click', startCountdown);
}

// Run the app
main();