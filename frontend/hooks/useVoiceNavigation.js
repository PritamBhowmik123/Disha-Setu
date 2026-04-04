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
//
// IMPORTANT — Hindi sentence design:
// Room names in the database are English (e.g. "Main Entrance", "Registration Desk").
// ElevenLabs Lily voice truncates audio when it hits a mid-sentence language switch
// (Hindi → English room name → back to Hindi). Fix: put room name at the END of
// every Hindi sentence so there is no continuation after the English noun.
// All other languages follow the same end-placement rule where practical.
//
const SPEECH_DICTIONARY = {
    LEFT_TURN: {
        en: (r) => `Turn left and continue toward ${r}.`,
        // Room name at end — no Hindi words after the English noun
        hi: (r) => `Baaye mudkar seedha jaiye. Agli jagah hai ${r}.`,
        bn: (r) => `Bam dike ghurun ebong egiye jan. Porer jagah holo ${r}.`,
        ta: (r) => `Idadhu puram thirumbi sellavum. Aduthapadiyaaga ${r}.`,
        te: (r) => `Edama vaipu thiragi vellandi. Tarvatha ${r}.`,
        mr: (r) => `Daavikade vala ani pudhe jaa. Pudhi jagah ${r}.`,
        kn: (r) => `Edakke tirugi hogi. Munde ${r}.`,
        pa: (r) => `Khabbe mudo te age jao. Agli jagah ${r}.`,
        ml: (r) => `Idathottu thirini pokuka. Aduth ${r}.`,
    },
    RIGHT_TURN: {
        en: (r) => `Turn right and head toward ${r}.`,
        hi: (r) => `Daaye mudkar seedha jaiye. Agli jagah hai ${r}.`,
        bn: (r) => `Dan dike ghurun ebong jan. Porer jagah holo ${r}.`,
        ta: (r) => `Valadhu puram thirumbi sellavum. Aduthapadiyaaga ${r}.`,
        te: (r) => `Kudi vaipu thiragi vellandi. Tarvatha ${r}.`,
        mr: (r) => `Ujavikade vala ani pudhe jaa. Pudhi jagah ${r}.`,
        kn: (r) => `Balakke tirugi hogi. Munde ${r}.`,
        pa: (r) => `Sajje mudo te age jao. Agli jagah ${r}.`,
        ml: (r) => `Valathottu thirini pokuka. Aduth ${r}.`,
    },
    ELEVATOR: {
        en: (r, f) => `Take the elevator${f}. Then head toward ${r}.`,
        hi: (r, f) => `Lift lijiye${f}. Agle padav par pahunchein ${r}.`,
        bn: (r, f) => `Lift nin${f}. Ekhon jan ${r}.`,
        ta: (r, f) => `Liftil sellavum${f}. Iduthu sellavum ${r}.`,
        te: (r, f) => `Lift teesukondi${f}. Tarvatha vellandi ${r}.`,
        mr: (r, f) => `Lift ghya${f}. Nantar jaa ${r}.`,
        kn: (r, f) => `Lift tegedukolli${f}. Nantar hogi ${r}.`,
        pa: (r, f) => `Lift lao${f}. Phir jao ${r}.`,
        ml: (r, f) => `Lift edukuka${f}. Pinne pokuka ${r}.`,
    },
    STAIRS: {
        en: (r, f) => `Use the stairs${f}. Continue toward ${r}.`,
        hi: (r, f) => `Seedhiyon ka upyog karein${f}. Phir jaiye ${r}.`,
        bn: (r, f) => `Siri diye jan${f}. Tarpor jan ${r}.`,
        ta: (r, f) => `Padiyaga sellavum${f}. Thodarndu sellavum ${r}.`,
        te: (r, f) => `Metlu ekkandi${f}. Tarvatha vellandi ${r}.`,
        mr: (r, f) => `Padyavrun jaa${f}. Nantar jaa ${r}.`,
        kn: (r, f) => `Mettilugalanu balasi${f}. Nantar hogi ${r}.`,
        pa: (r, f) => `Pauriyan to jao${f}. Phir jao ${r}.`,
        ml: (r, f) => `Padiyiloode pokuka${f}. Thodarnnu pokuka ${r}.`,
    },
    STRAIGHT: {
        en: (r) => `Go straight for a few steps. You are heading toward ${r}.`,
        // Room name at end so no Hindi after English noun
        hi: (r) => `Seedha aage badhte rahiye. Ja rahe hain aap ${r} ki taraf.`,
        bn: (r) => `Shoja egiye jan. Jachchen ${r}.`,
        ta: (r) => `Neraaga sellavum. Pogum idam ${r}.`,
        te: (r) => `Nera vellandi. Velutunnaru ${r}.`,
        mr: (r) => `Seedha pudhe jaa. Jadha jatoy ${r}.`,
        kn: (r) => `Nera hogi. Hoguttiruvudu ${r}.`,
        pa: (r) => `Seedha age jao. Ja rahe ho ${r}.`,
        ml: (r) => `Nere pokuka. Pokuvathu ${r}.`,
    },
    START: {
        en: (r) => `Navigation started. You are at ${r}. Follow the route ahead.`,
        // Two short sentences. Room name at end of first sentence — nothing follows it in Hindi.
        hi: (r) => `Navigation shuru ho gayi. Aap abhi hain ${r} par.`,
        bn: (r) => `Navigation shuru. Apni ekhon achen ${r}.`,
        ta: (r) => `Navigation thondangivitta. Neengal irukkeengal ${r}.`,
        te: (r) => `Navigation start aindi. Meeru unnaru ${r} lo.`,
        mr: (r) => `Navigation suruu. Tumhi aahat ${r} la.`,
        kn: (r) => `Navigation shuru. Neevu iddiri ${r} nalli.`,
        pa: (r) => `Navigation shuru. Tusi ho ${r} te.`,
        ml: (r) => `Navigation thuadangi. Ningal anu ${r} il.`,
    },
    ARRIVED: {
        en: (r) => `You have arrived. Your destination is ${r}.`,
        // Very short — room name at end
        hi: (r) => `Aap pahunch gaye hain. Aapki manzil hai ${r}.`,
        bn: (r) => `Apni pouchhe gechen. Destination holo ${r}.`,
        ta: (r) => `Neengal vandhadainthumeer. Destination ${r}.`,
        te: (r) => `Meeru cherukunnaru. Destination ${r}.`,
        mr: (r) => `Tumhi pohochla. Destination aahe ${r}.`,
        kn: (r) => `Neevu talupidiri. Destination ${r}.`,
        pa: (r) => `Tussi pahunch gaye. Destination hai ${r}.`,
        ml: (r) => `Ningal ethiyirikkunnu. Destination ${r}.`,
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
