/**
 * ElevenLabsVoiceService.js
 *
 * Singleton audio service for Disha-Setu indoor navigation.
 *
 * Platform strategy:
 *
 *   WEB (Expo Web / browser):
 *     Uses Web Audio API (AudioContext + AudioBufferSourceNode).
 *     AudioBufferSourceNode.onended is bulletproof — fires exactly once,
 *     only when the buffer fully plays. HTMLAudioElement was causing spurious
 *     error/stalled events on Expo Web that cut sentences after 1-2 words.
 *
 *   ANDROID / iOS (React Native):
 *     expo-av on Android requires a file:// or https:// URI — it does NOT
 *     support data:// URIs (ExoPlayer limitation). Since expo-file-system is
 *     not installed, we use expo-speech (the device TTS) which:
 *       - Works perfectly on Android for all 9 supported languages
 *       - Has no sentence cut-off issues (OS manages playback lifecycle)
 *       - Supports Hindi, Bengali, Tamil etc. via BCP-47 language tags
 *     When ElevenLabs key is present, audio is fetched → converted to a
 *     blob:// URL using URL.createObjectURL (available in RN ≥ 0.69) and
 *     played via expo-av. If that fails, falls back to expo-speech.
 *
 * Queue:
 *   All items play one-at-a-time. Each waits for previous to fully finish.
 *   Generation counter (_cancelGen) makes cancel() safe to call from any
 *   async context — stale chains detect they're outdated and exit cleanly.
 */

import * as Speech from 'expo-speech';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ─── Configuration ────────────────────────────────────────────────────────────

const ELEVENLABS_API_KEY =
    Constants.expoConfig?.extra?.EXPO_PUBLIC_ELEVENLABS_API_KEY ||
    process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY ||
    '';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const ELEVENLABS_MODEL = 'eleven_multilingual_v2';

const VOICE_MAP = {
    en: { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
    // Rachel handles Hindi-English code-switching reliably; Lily truncated audio mid-sentence
    hi: { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },
    bn: { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },
    ta: { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },
    te: { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },
    mr: { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },
    kn: { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },
    pa: { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },
    ml: { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },
};

// BCP-47 tags for expo-speech (device TTS) — works on Android natively
const BCP47_TAGS = {
    en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN',
    te: 'te-IN', mr: 'mr-IN', kn: 'kn-IN', pa: 'pa-IN', ml: 'ml-IN',
};

// ─── LRU Cache ────────────────────────────────────────────────────────────────

const LRU_MAX = 50;

class LRUCache {
    constructor(max) { this._max = max; this._map = new Map(); }
    get(key) {
        if (!this._map.has(key)) return null;
        const v = this._map.get(key);
        this._map.delete(key); this._map.set(key, v);
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

// ─── Singleton ────────────────────────────────────────────────────────────────

const ElevenLabsVoiceService = (() => {
    let _queue = [];
    let _state = 'idle';
    let _processing = false;
    let _cancelGen = 0;
    const _cache = new LRUCache(LRU_MAX);
    const _listeners = new Set();

    // Web Audio API (browser only)
    let _audioCtx = null;
    let _audioSource = null;

    // Native expo-av
    let _avSound = null;

    // ── Helpers ───────────────────────────────────────────────────────────────

    function _setState(s) { _state = s; _listeners.forEach(fn => fn(s)); }
    function _cacheKey(text, lang) { return `${lang}::${text}`; }

    // ── Fetch from ElevenLabs ─────────────────────────────────────────────────

    async function _fetchAudioBuffer(text, lang) {
        const voice = VOICE_MAP[lang] || VOICE_MAP['en'];
        const response = await fetch(
            `${ELEVENLABS_BASE_URL}/text-to-speech/${voice.voiceId}`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': ELEVENLABS_API_KEY,
                },
                body: JSON.stringify({
                    text,
                    model_id: ELEVENLABS_MODEL,
                    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0 },
                }),
            }
        );

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            throw new Error(`ElevenLabs ${response.status}: ${errText}`);
        }

        return response.arrayBuffer(); // raw MP3 bytes, platform-neutral
    }

    // ── WEB: Web Audio API playback ───────────────────────────────────────────

    function _getAudioContext() {
        if (!_audioCtx || _audioCtx.state === 'closed') {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) throw new Error('Web Audio API not available');
            _audioCtx = new AC();
        }
        return _audioCtx;
    }

    /**
     * Play audio on web using Web Audio API.
     * AudioBufferSourceNode.onended fires EXACTLY ONCE, only when fully played.
     * This is why web audio no longer cuts off mid-sentence.
     */
    async function _playWeb(audioBuffer) {
        return new Promise(async (resolve) => {
            let settled = false;
            const done = () => {
                if (settled) return;
                settled = true;
                _audioSource = null;
                resolve();
            };
            try {
                const ctx = _getAudioContext();
                if (ctx.state === 'suspended') await ctx.resume();
                // slice(0) copies because decodeAudioData detaches the original
                const decoded = await ctx.decodeAudioData(audioBuffer.slice(0));
                const source = ctx.createBufferSource();
                source.buffer = decoded;
                source.connect(ctx.destination);
                source.onended = done;
                _audioSource = source;
                source.start(0);
            } catch (err) {
                console.warn('[ElevenLabsVoiceService] Web Audio error:', err.message);
                done();
            }
        });
    }

    // ── NATIVE: expo-av playback (Android / iOS) ──────────────────────────────

    /**
     * Play audio on Android/iOS using expo-av.
     *
     * Android limitation: ExoPlayer (used by expo-av) does NOT support
     * data:// URIs. We convert the ArrayBuffer to a Blob object URL using
     * URL.createObjectURL, which IS available in React Native ≥ 0.69 (via
     * the Blob polyfill). This gives us a blob:// URI that ExoPlayer CAN load.
     *
     * If blob URL creation fails, we fall back to expo-speech.
     */
    async function _playNative(audioBuffer) {
        let blobUrl = null;

        try {
            // React Native's Blob + URL.createObjectURL support (RN ≥ 0.69)
            const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
            blobUrl = URL.createObjectURL(blob);
        } catch (e) {
            // URL.createObjectURL not available — caller will fall back to speech
            throw new Error('Blob URL not supported on this RN version: ' + e.message);
        }

        return new Promise(async (resolve) => {
            const cleanup = () => {
                if (blobUrl) {
                    try { URL.revokeObjectURL(blobUrl); } catch (_) { }
                    blobUrl = null;
                }
            };

            try {
                const { Audio } = await import('expo-av');
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                    shouldDuckAndroid: true,
                });

                const { sound } = await Audio.Sound.createAsync(
                    { uri: blobUrl },
                    { shouldPlay: true },
                    (status) => {
                        if (status.isLoaded && status.didJustFinish) {
                            cleanup();
                            resolve();
                        } else if (status.error) {
                            console.warn('[ElevenLabsVoiceService] expo-av status error:', status.error);
                            cleanup();
                            resolve();
                        }
                    }
                );
                _avSound = sound;
            } catch (err) {
                cleanup();
                console.warn('[ElevenLabsVoiceService] expo-av createAsync failed:', err.message);
                resolve();
            }
        });
    }

    async function _releaseNativeSound() {
        if (_avSound) {
            try { await _avSound.stopAsync(); } catch (_) { }
            try { await _avSound.unloadAsync(); } catch (_) { }
            _avSound = null;
        }
    }

    // ── Stop current audio ────────────────────────────────────────────────────

    function _stopCurrentAudio() {
        // Web Audio API
        if (_audioSource) {
            try {
                _audioSource.onended = null; // prevent done() firing after stop
                _audioSource.stop();
            } catch (_) { }
            _audioSource = null;
        }
        // expo-speech (native fallback)
        try { Speech.stop(); } catch (_) { }
        // expo-av (native primary)
        if (_avSound) {
            const s = _avSound;
            _avSound = null;
            s.stopAsync().catch(() => { }).then(() => s.unloadAsync().catch(() => { }));
        }
    }

    // ── expo-speech fallback ──────────────────────────────────────────────────

    /**
     * Device TTS via expo-speech.
     * This is the primary path on Android (no ElevenLabs), and the fallback
     * when ElevenLabs fails. Works perfectly for all 9 languages on Android —
     * Android has built-in Google TTS engine that supports Indic scripts well.
     */
    function _speakWithDeviceTTS(text, lang) {
        return new Promise((resolve) => {
            Speech.speak(text, {
                language: BCP47_TAGS[lang] || 'en-IN',
                pitch: 1.0,
                rate: 0.85, // slightly slower for clarity
                onDone: resolve,
                onError: resolve,
                onStopped: resolve,
            });
        });
    }

    // ── Queue processor ───────────────────────────────────────────────────────

    async function _processQueue(myGen) {
        if (myGen !== _cancelGen) return; // stale chain — newer session took over

        if (_queue.length === 0) {
            _setState('idle');
            _processing = false;
            return;
        }

        const { text, lang, cacheKey } = _queue.shift();

        // On native without an API key, skip ElevenLabs entirely
        const useElevenLabs = !!ELEVENLABS_API_KEY;

        let audioBuffer = useElevenLabs ? _cache.get(cacheKey) : null;

        try {
            if (useElevenLabs && !audioBuffer) {
                _setState('fetching');
                if (myGen !== _cancelGen) return;

                audioBuffer = await _fetchAudioBuffer(text, lang);
                if (myGen !== _cancelGen) return;

                _cache.set(cacheKey, audioBuffer.slice(0)); // cache a copy
            }

            if (myGen !== _cancelGen) return;
            _setState('playing');

            if (Platform.OS === 'web') {
                // Web: always use Web Audio API (reliable onended)
                await _playWeb(audioBuffer);
            } else if (useElevenLabs) {
                // Native: try ElevenLabs audio via blob URL, fall back to device TTS
                try {
                    await _playNative(audioBuffer);
                    await _releaseNativeSound();
                } catch (nativeErr) {
                    console.warn('[ElevenLabsVoiceService] Native blob playback failed, using device TTS:', nativeErr.message);
                    await _speakWithDeviceTTS(text, lang);
                }
            } else {
                // No API key: use device TTS directly (always works on Android)
                await _speakWithDeviceTTS(text, lang);
            }
        } catch (err) {
            // ElevenLabs fetch failed — fall back to device TTS
            console.warn('[ElevenLabsVoiceService] ElevenLabs fetch failed, using device TTS:', err.message);
            if (myGen === _cancelGen) {
                _setState('playing');
                await _speakWithDeviceTTS(text, lang);
            }
        }

        await _processQueue(myGen);
    }

    // ── Public API ────────────────────────────────────────────────────────────

    return {
        speak(text, lang = 'en') {
            if (!text?.trim()) return;
            _queue.push({ text, lang, cacheKey: _cacheKey(text, lang) });
            if (!_processing) {
                _processing = true;
                _processQueue(_cancelGen);
            }
        },

        cancel() {
            _cancelGen++;
            _queue = [];
            _processing = false;
            _stopCurrentAudio();
            _setState('idle');
        },

        reset() { this.cancel(); },

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
