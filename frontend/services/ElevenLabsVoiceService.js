/**
 * ElevenLabsVoiceService.js
 *
 * Singleton audio service for Disha-Setu indoor navigation.
 *
 * Key guarantees:
 *  - Sentences ALWAYS play to completion before the next starts
 *  - cancel() is safe to call at any time, from any async context
 *  - speak() after cancel() always restarts properly regardless of internal state
 *  - Web uses native HTMLAudioElement for reliable onended callbacks
 *  - Native (iOS/Android) uses expo-av with file system cache
 */

import * as Speech from 'expo-speech';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ─── ElevenLabs Configuration ────────────────────────────────────────────────

const ELEVENLABS_API_KEY =
    Constants.expoConfig?.extra?.EXPO_PUBLIC_ELEVENLABS_API_KEY ||
    process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY ||
    '';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const ELEVENLABS_MODEL = 'eleven_multilingual_v2';

/**
 * ElevenLabs voice IDs by language code.
 * All use eleven_multilingual_v2 — swap IDs here to change voices.
 */
const VOICE_MAP = {
    en: { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },    // English (Indian)
    hi: { voiceId: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily' },     // Hindi
    bn: { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },    // Bengali
    ta: { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },    // Tamil
    te: { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },    // Telugu
    mr: { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },    // Marathi
    kn: { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },    // Kannada
    pa: { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },    // Punjabi
    ml: { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },    // Malayalam
};

// BCP-47 tags for expo-speech fallback
const BCP47_TAGS = {
    en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN',
    te: 'te-IN', mr: 'mr-IN', kn: 'kn-IN', pa: 'pa-IN', ml: 'ml-IN',
};

// ─── LRU Cache (stores Blobs — more efficient than base64 strings) ────────────

const LRU_MAX = 50;

class LRUCache {
    constructor(max) {
        this._max = max;
        this._map = new Map();
    }
    get(key) {
        if (!this._map.has(key)) return null;
        const v = this._map.get(key);
        this._map.delete(key);
        this._map.set(key, v);
        return v;
    }
    set(key, value) {
        if (this._map.has(key)) this._map.delete(key);
        this._map.set(key, value);
        if (this._map.size > this._max) this._map.delete(this._map.keys().next().value);
    }
    has(key) { return this._map.has(key); }
    clear() { this._map.clear(); }
}

// ─── Singleton Service ────────────────────────────────────────────────────────

const ElevenLabsVoiceService = (() => {
    // ── State ─────────────────────────────────────────────────────────────────
    let _queue = [];           // Array<{ text, lang, cacheKey }>
    let _state = 'idle';       // 'idle' | 'fetching' | 'playing'
    let _processing = false;   // is _processQueue running?
    let _cancelGen = 0;        // incremented on every cancel — stale closures detect it
    const _cache = new LRUCache(LRU_MAX);
    const _listeners = new Set();

    // Web-only: reference to HTMLAudioElement so we can stop it
    let _webAudio = null;
    // Native-only: expo-av Sound reference
    let _avSound = null;

    // ── Helpers ───────────────────────────────────────────────────────────────

    function _setState(s) {
        _state = s;
        _listeners.forEach(fn => fn(s));
    }

    function _cacheKey(text, lang) {
        return `${lang}::${text}`;
    }

    // ── Fetch from ElevenLabs → Blob ──────────────────────────────────────────

    async function _fetchBlob(text, lang) {
        const voice = VOICE_MAP[lang] || VOICE_MAP['en'];
        const url = `${ELEVENLABS_BASE_URL}/text-to-speech/${voice.voiceId}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
                text,
                model_id: ELEVENLABS_MODEL,
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.0,
                    use_speaker_boost: true,
                },
            }),
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            throw new Error(`ElevenLabs ${response.status}: ${errText}`);
        }

        return response.blob();
    }

    // ── Platform-specific playback ────────────────────────────────────────────

    /**
     * Web playback via HTMLAudioElement.
     * GUARANTEED to resolve only on `onended` or `onerror`.
     * No didJustFinish timing ambiguity.
     */
    function _playWeb(blob, myGen) {
        return new Promise((resolve) => {
            // Revoke any prior object URL and stop prior audio
            if (_webAudio) {
                try { _webAudio.pause(); } catch (_) { }
                _webAudio = null;
            }

            const url = URL.createObjectURL(blob);
            const audio = new window.Audio(url);

            let settled = false;
            const finish = (reason) => {
                if (settled) return;
                settled = true;
                try { URL.revokeObjectURL(url); } catch (_) { }
                _webAudio = null;
                resolve();
            };

            audio.addEventListener('ended', () => finish('ended'));
            audio.addEventListener('error', (e) => {
                console.warn('[ElevenLabsVoiceService] Web audio error:', e.message);
                finish('error');
            });

            _webAudio = audio;

            audio.play().catch((err) => {
                // Browser autoplay blocked — resolve so queue continues
                console.warn('[ElevenLabsVoiceService] play() blocked:', err.message);
                finish('blocked');
            });
        });
    }

    /**
     * Native playback via expo-av.
     * Resolves on didJustFinish=true OR error.
     */
    async function _playNative(blob, myGen) {
        // Convert blob → base64 data URI for expo-av
        const dataUri = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        return new Promise(async (resolve) => {
            try {
                const { Audio } = await import('expo-av');
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                    shouldDuckAndroid: true,
                });

                const { sound } = await Audio.Sound.createAsync(
                    { uri: dataUri },
                    { shouldPlay: true },
                    (status) => {
                        // Only resolve when audio genuinely finished or errored
                        if (status.isLoaded && status.didJustFinish) {
                            resolve();
                        } else if (status.error) {
                            console.warn('[ElevenLabsVoiceService] Native playback error:', status.error);
                            resolve();
                        }
                    }
                );
                _avSound = sound;
            } catch (err) {
                console.warn('[ElevenLabsVoiceService] createAsync failed:', err.message);
                resolve();
            }
        });
    }

    async function _releaseNativeSound() {
        if (_avSound) {
            try {
                await _avSound.stopAsync();
                await _avSound.unloadAsync();
            } catch (_) { }
            _avSound = null;
        }
    }

    function _stopCurrentAudio() {
        // Web
        if (_webAudio) {
            try { _webAudio.pause(); } catch (_) { }
            _webAudio = null;
        }
        // Speech fallback
        try { Speech.stop(); } catch (_) { }
        // Native (expo-av) — async but we fire-and-forget for speed
        if (_avSound) {
            const s = _avSound;
            _avSound = null;
            s.stopAsync().catch(() => { }).then(() => s.unloadAsync().catch(() => { }));
        }
    }

    // ── expo-speech fallback ──────────────────────────────────────────────────

    function _speakNative(text, lang) {
        return new Promise((resolve) => {
            Speech.speak(text, {
                language: BCP47_TAGS[lang] || 'en-IN',
                pitch: 1.0,
                rate: 0.9,
                onDone: resolve,
                onError: resolve,
                onStopped: resolve,
            });
        });
    }

    // ── Queue processor ───────────────────────────────────────────────────────

    /**
     * Processes the queue one item at a time.
     * Uses a generation counter (_cancelGen) to safely detect stale runs.
     * A stale run (from before a cancel) will see its generation doesn't match
     * and exits cleanly without touching the new session's state.
     */
    async function _processQueue(myGen) {
        // Stale run check — if cancel() was called since we started, stop
        if (myGen !== _cancelGen) return;

        if (_queue.length === 0) {
            _setState('idle');
            _processing = false;
            return;
        }

        const item = _queue.shift();
        const { text, lang, cacheKey } = item;

        let blob = _cache.get(cacheKey);

        try {
            if (!blob) {
                _setState('fetching');
                if (myGen !== _cancelGen) return; // check again after state change
                blob = await _fetchBlob(text, lang);
                if (myGen !== _cancelGen) return; // cancelled during fetch
                _cache.set(cacheKey, blob);
            }

            if (myGen !== _cancelGen) return;

            _setState('playing');

            if (Platform.OS === 'web') {
                await _playWeb(blob, myGen);
            } else {
                await _playNative(blob, myGen);
                await _releaseNativeSound();
            }
        } catch (err) {
            console.warn('[ElevenLabsVoiceService] error, falling back to expo-speech:', err.message);
            if (myGen === _cancelGen) {
                _setState('playing');
                await _speakNative(text, lang);
            }
        }

        // Continue with next item
        await _processQueue(myGen);
    }

    // ── Public API ────────────────────────────────────────────────────────────

    return {
        /**
         * Enqueue text for playback.
         *
         * FIX vs previous version:
         * - Always resets the cancelled state so new items play even if
         *   cancel() was called and _state hasn't returned to idle yet.
         * - Uses generation counter instead of _cancelled boolean to
         *   safely abort stale processing chains without stopping new ones.
         */
        speak(text, lang = 'en') {
            if (!text?.trim()) return;

            _queue.push({ text, lang, cacheKey: _cacheKey(text, lang) });

            // Restart processing if not already running.
            // This handles the case where processing stopped (idle) OR
            // was cancelled mid-flight and hasn't reset yet.
            if (!_processing) {
                _processing = true;
                _processQueue(_cancelGen);
            }
        },

        /**
         * Stop all audio immediately and drain the queue.
         *
         * FIX vs previous version:
         * - Increments _cancelGen so any in-flight _processQueue call detects
         *   it is stale and exits cleanly — no race condition.
         * - Stops audio synchronously (no await needed by caller).
         * - Does NOT need to be awaited before calling speak() again.
         */
        cancel() {
            _cancelGen++;           // invalidate all in-flight processing chains
            _queue = [];            // drain queue
            _processing = false;    // allow restart
            _stopCurrentAudio();    // stop immediately (synchronous where possible)
            _setState('idle');
        },

        /**
         * Reset for a new route — same as cancel() but also clears the cache key
         * so the dedup in useVoiceNavigation resets too (caller's responsibility).
         */
        reset() {
            this.cancel();
        },

        get state() { return _state; },
        get isActive() { return _processing || _queue.length > 0; },
        get queueLength() { return _queue.length; },

        onStateChange(fn) {
            _listeners.add(fn);
            return () => _listeners.delete(fn);
        },

        clearCache() { _cache.clear(); },
    };
})();

export default ElevenLabsVoiceService;
