/**
 * useVoiceNavigation.js
 *
 * React hook that wraps ElevenLabsVoiceService for use inside navigation components.
 *
 * Responsibilities:
 *  - Builds spoken text from a navigation step object (same dictionary as VoiceHapticEngine)
 *  - Deduplicates: same step spoken only once unless force=true
 *  - Handles component unmount → auto-cancels audio
 *  - Exposes reactive `isPlaying` state so UI can show a speaker indicator
 *  - Triggers haptic feedback via VoiceHapticEngine (haptics-only, unchanged)
 *
 * Usage:
 *   const { speak, cancel, reset, isPlaying } = useVoiceNavigation();
 *   speak(step, i18n.language);      // plays one instruction
 *   speak(step, i18n.language, true); // force (skip dedup)
 *   reset();                          // call on new route start
 *   cancel();                         // call on stop/unmount
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import ElevenLabsVoiceService from '../services/ElevenLabsVoiceService';
import { VoiceHapticEngine } from '../services/VoiceHapticEngine';

// ─── Navigation Speech Dictionary ────────────────────────────────────────────
//
// Identical to the speech dictionary inside the old VoiceHapticEngine, but now
// lives here so it can be used independently. VoiceHapticEngine retains the
// haptic dictionary only.
//
const SPEECH_DICTIONARY = {
    LEFT_TURN: {
        en: (r) => `Turn left and continue toward ${r}.`,
        hi: (r) => `Baaye mudiye aur ${r} ki taraf badhein.`,
        bn: (r) => `Bam dike ghurun ebong ${r} dike egiye jan.`,
        ta: (r) => `Idadhu puram thirumbi ${r} nokki sellavum.`,
        te: (r) => `Edama vaipu thiragi ${r} vaipu vellandi.`,
        mr: (r) => `Daavikade vala ani ${r} kade jaa.`,
        kn: (r) => `Edakke tirugi ${r} kadege hogi.`,
        pa: (r) => `Khabbe mudo te ${r} wal jao.`,
        ml: (r) => `Idathottu thirini ${r} lottu pokuka.`,
    },
    RIGHT_TURN: {
        en: (r) => `Turn right and head toward ${r}.`,
        hi: (r) => `Daaye mudiye aur ${r} ki taraf jaiye.`,
        bn: (r) => `Dan dike ghurun ebong ${r} dike jan.`,
        ta: (r) => `Valadhu puram thirumbi ${r} nokki sellavum.`,
        te: (r) => `Kudi vaipu thiragi ${r} vaipu vellandi.`,
        mr: (r) => `Ujavikade vala ani ${r} kade jaa.`,
        kn: (r) => `Balakke tirugi ${r} kadege hogi.`,
        pa: (r) => `Sajje mudo te ${r} wal jao.`,
        ml: (r) => `Valathottu thirini ${r} lottu pokuka.`,
    },
    ELEVATOR: {
        en: (r, f) => `Take the elevator${f}. Then head toward ${r}.`,
        hi: (r, f) => `Lift lijiye${f}. Phir ${r} ki taraf jaiye.`,
        bn: (r, f) => `Lift nin${f}. Tarpor ${r} dike jan.`,
        ta: (r, f) => `Liftil sellavum${f}. Appuram ${r} nokki sellavum.`,
        te: (r, f) => `Lift teesukondi${f}. Tarvatha ${r} vaipu vellandi.`,
        mr: (r, f) => `Lift ghya${f}. Mag ${r} kade jaa.`,
        kn: (r, f) => `Lift tegedukolli${f}. Nantar ${r} kadege hogi.`,
        pa: (r, f) => `Lift lao${f}. Phir ${r} wal jao.`,
        ml: (r, f) => `Lift edukuka${f}. Pinne ${r} lottu pokuka.`,
    },
    STAIRS: {
        en: (r, f) => `Use the stairs${f}. Continue toward ${r}.`,
        hi: (r, f) => `Seedhiyon se jaiye${f}. ${r} ki taraf badhein.`,
        bn: (r, f) => `Siri diye jan${f}. ${r} dike egiye jan.`,
        ta: (r, f) => `Padiyaga sellavum${f}. ${r} nokki thodarvum.`,
        te: (r, f) => `Metlu ekkandi${f}. ${r} vaipu vellandi.`,
        mr: (r, f) => `Padyavrun jaa${f}. ${r} kade chala.`,
        kn: (r, f) => `Mettilugalanu balasi${f}. ${r} kadege hogi.`,
        pa: (r, f) => `Pauriya to jao${f}. ${r} wal jao.`,
        ml: (r, f) => `Padiyiloode pokuka${f}. ${r} lottu thodarnnu pokuka.`,
    },
    STRAIGHT: {
        en: (r) => `Go straight for a few meters toward ${r}.`,
        hi: (r) => `Kuch kadam seedha jaiye, ${r} ki taraf.`,
        bn: (r) => `Kichutu shoja egiye jan, ${r} dike.`,
        ta: (r) => `Sila meter neraaga sellavum, ${r} nokki.`,
        te: (r) => `Konta dooram nera vellandi, ${r} vaipu.`,
        mr: (r) => `Kahi meter sarak jaa, ${r} kade.`,
        kn: (r) => `Svalpa doora nera hogi, ${r} kadege.`,
        pa: (r) => `Kuch kadam seedha jao, ${r} wal.`,
        ml: (r) => `Kure meetar nere pokuka, ${r} lottu.`,
    },
    START: {
        en: (r) => `Navigation started. You are at ${r}. Follow the route ahead.`,
        hi: (r) => `Navigation shuru. Aap ${r} par hain. Aage ke route ka anusaran karein.`,
        bn: (r) => `Navigation shuru. Apni ${r} te achen. Samner route anusaran korun.`,
        ta: (r) => `Navigation thondangivitta. Neengal ${r} il irukkeengal. Route-ai pinn thodaravum.`,
        te: (r) => `Navigation start aindi. Meeru ${r} lo unnaru. Mundu route follow cheyandi.`,
        mr: (r) => `Navigation suruu zali. Tumhi ${r} la ahat. Pudhe route follow kara.`,
        kn: (r) => `Navigation shuru aiytu. Neevu ${r} nalli iddiri. Mundina route follow madi.`,
        pa: (r) => `Navigation shuru ho gayi. Tusi ${r} te ho. Age route follow karo.`,
        ml: (r) => `Navigation thuadangi. Ningal ${r} il anu. Munnil route pinthudarchukuka.`,
    },
    ARRIVED: {
        en: (r) => `You have arrived at ${r}. Your destination is ahead.`,
        hi: (r) => `Aap ${r} pahunch gaye hain. Aapki manzil saamne hai.`,
        bn: (r) => `Apni ${r} pouche gechen. Apnar destination saamne.`,
        ta: (r) => `Neengal ${r} vandhadainthumeer. Ungal destination munnale.`,
        te: (r) => `Meeru ${r} cherukunnaru. Meeru destination mundule.`,
        mr: (r) => `Tumhi ${r} pohochla ahat. Tumcha destination samor aahe.`,
        kn: (r) => `Neevu ${r} talupidiri. Nimma destination mundide.`,
        pa: (r) => `Tussi ${r} pahunch gaye ho. Tumhada destination samne hai.`,
        ml: (r) => `Ningal ${r} ethiyirikkunnu. Ningalude destination munnilaanu.`,
    },
};

// ─── Step → Action Key Classifier ────────────────────────────────────────────

function classifyAction(step) {
    const { instruction, roomType } = step;
    if (/arrive|arrived|destination/i.test(instruction))       return 'ARRIVED';
    if (/start|begin|depart/i.test(instruction))               return 'START';
    if (roomType === 'elevator' || roomType === 'lift')        return 'ELEVATOR';
    if (roomType === 'stairs' || roomType === 'staircase')     return 'STAIRS';
    if (/left/i.test(instruction))                             return 'LEFT_TURN';
    if (/right/i.test(instruction))                            return 'RIGHT_TURN';
    return 'STRAIGHT';
}

// ─── Build spoken text from a navigation step ─────────────────────────────────

function buildSpeechText(step, lang) {
    const actionKey = classifyAction(step);
    const { roomName, floorNumber } = step;

    const floorSuffix = floorNumber !== undefined
        ? ` to Floor ${floorNumber === 0 ? 'G (ground)' : floorNumber}`
        : '';

    const templateMap = SPEECH_DICTIONARY[actionKey];
    if (!templateMap) return step.instruction; // last resort: use raw instruction

    const template = templateMap[lang] || templateMap['en'];
    if (!template) return step.instruction;

    // ELEVATOR and STAIRS templates take (roomName, floorSuffix)
    if (actionKey === 'ELEVATOR' || actionKey === 'STAIRS') {
        return template(roomName, floorSuffix);
    }
    return template(roomName);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @returns {{
 *   speak:    (step: object, lang: string, force?: boolean) => void,
 *   cancel:   () => Promise<void>,
 *   reset:    () => Promise<void>,
 *   isPlaying: boolean,
 *   isFetching: boolean,
 * }}
 */
export function useVoiceNavigation() {
    const [serviceState, setServiceState] = useState(ElevenLabsVoiceService.state);
    const lastSpokenKeyRef = useRef(null);

    // ── Subscribe to service state changes ───────────────────────────────────
    useEffect(() => {
        const unsubscribe = ElevenLabsVoiceService.onStateChange(setServiceState);
        return unsubscribe;
    }, []);

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            // When the navigation screen unmounts, stop any in-progress audio
            // cancel() is now synchronous — safe to call in cleanup
            ElevenLabsVoiceService.cancel();
        };
    }, []);

    // ── speak ─────────────────────────────────────────────────────────────────
    const speak = useCallback((step, lang = 'en', force = false) => {
        if (!step) return;

        // Deduplication: don't re-speak the same step
        const stepKey = `${step.roomId ?? step.roomName}-${step.step}`;
        if (!force && stepKey === lastSpokenKeyRef.current) return;
        lastSpokenKeyRef.current = stepKey;

        // Build the localized sentence
        const text = buildSpeechText(step, lang);

        // Trigger haptics (unchanged VoiceHapticEngine, haptics-only)
        VoiceHapticEngine.triggerHaptic(step);

        // Enqueue audio — service handles sequencing
        ElevenLabsVoiceService.speak(text, lang);
    }, []);

    // ── cancel ────────────────────────────────────────────────────────────────
    const cancel = useCallback(() => {
        ElevenLabsVoiceService.cancel();
    }, []);

    // ── reset ─────────────────────────────────────────────────────────────────
    const reset = useCallback(() => {
        lastSpokenKeyRef.current = null;
        ElevenLabsVoiceService.reset();
    }, []);

    return {
        speak,
        cancel,
        reset,
        isPlaying: serviceState === 'playing',
        isFetching: serviceState === 'fetching',
    };
}
