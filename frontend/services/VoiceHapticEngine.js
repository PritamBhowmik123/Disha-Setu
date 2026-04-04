/**
 * VoiceHapticEngine.js
 *
 * Haptics-only engine. The TTS (text-to-speech) responsibility has been moved
 * to ElevenLabsVoiceService + useVoiceNavigation hook.
 *
 * This file is kept for:
 *   1. Haptic feedback on navigation events (turns, elevator, stairs, etc.)
 *   2. `triggerHaptic(step)` — called by useVoiceNavigation automatically
 *
 * Nothing in the navigation logic changes. VoiceHapticEngine is still imported
 * in useVoiceNavigation.js and called for every step.
 *
 * NOTE: `triggerInstruction()` is preserved as a no-op shim so that any
 * remaining call sites (if any were missed) don't throw at runtime.
 * Remove the shim once you've verified no remaining usages.
 */

import * as Haptics from 'expo-haptics';

const N = (style) => ({ fn: 'notification', style });
const I = (style) => ({ fn: 'impact', style });

const HAPTIC_DICTIONARY = {
    LEFT_TURN:  [I(Haptics.ImpactFeedbackStyle.Medium), I(Haptics.ImpactFeedbackStyle.Medium)],
    RIGHT_TURN: [I(Haptics.ImpactFeedbackStyle.Heavy)],
    ELEVATOR:   [I(Haptics.ImpactFeedbackStyle.Light), I(Haptics.ImpactFeedbackStyle.Medium), I(Haptics.ImpactFeedbackStyle.Light)],
    STAIRS:     [I(Haptics.ImpactFeedbackStyle.Medium), I(Haptics.ImpactFeedbackStyle.Light)],
    STRAIGHT:   null,
    START:      [N(Haptics.NotificationFeedbackType.Success)],
    ARRIVED:    [N(Haptics.NotificationFeedbackType.Success)],
};

function classifyAction(step) {
    const { instruction, roomType } = step || {};
    if (/arrive|arrived|destination/i.test(instruction))       return 'ARRIVED';
    if (/start|begin|depart/i.test(instruction))               return 'START';
    if (roomType === 'elevator' || roomType === 'lift')        return 'ELEVATOR';
    if (roomType === 'stairs' || roomType === 'staircase')     return 'STAIRS';
    if (/left/i.test(instruction))                             return 'LEFT_TURN';
    if (/right/i.test(instruction))                            return 'RIGHT_TURN';
    return 'STRAIGHT';
}

function fireHaptics(hapticPattern) {
    if (!hapticPattern) return;
    hapticPattern.forEach(({ fn, style }, i) => {
        setTimeout(() => {
            if (fn === 'notification') {
                Haptics.notificationAsync(style).catch(() => {});
            } else {
                Haptics.impactAsync(style).catch(() => {});
            }
        }, i * 300);
    });
}

export const VoiceHapticEngine = {
    /**
     * Triggers haptic vibrations for a navigation step.
     * Called automatically by useVoiceNavigation on every step.
     *
     * @param {Object} step - Navigation step object from routing engine
     */
    triggerHaptic(step) {
        if (!step) return;
        const actionKey = classifyAction(step);
        const pattern = HAPTIC_DICTIONARY[actionKey];
        fireHaptics(pattern);
    },

    /**
     * @deprecated — TTS has moved to ElevenLabsVoiceService + useVoiceNavigation.
     * This shim is kept to prevent runtime errors if any call site was missed.
     * It will only fire haptics; voice is silently ignored.
     */
    triggerInstruction(step, _language, _force) {
        if (__DEV__) {
            console.warn(
                '[VoiceHapticEngine] triggerInstruction() is deprecated. ' +
                'Use useVoiceNavigation().speak() instead. ' +
                'Only haptics will fire from this call.'
            );
        }
        this.triggerHaptic(step);
    },

    /**
     * @deprecated — use useVoiceNavigation().reset() instead.
     * Kept as a no-op shim.
     */
    reset() {
        if (__DEV__) {
            console.warn(
                '[VoiceHapticEngine] reset() is deprecated. ' +
                'Use useVoiceNavigation().reset() instead.'
            );
        }
        // No-op: audio reset is handled by ElevenLabsVoiceService
    },
};
