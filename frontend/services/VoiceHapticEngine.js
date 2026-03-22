import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

export const VoiceHapticEngine = {
    /**
     * Triggers voice instructions and haptic vibrations based on the navigation step
     * @param {Object} step - The direction step object from the routing engine
     * @param {string} language - 'en' (English) or 'hi' (Hindi)
     */
    triggerInstruction(step, language = 'en') {
        if (!step) return;

        const { instruction, roomType, roomName } = step;

        let actionKey = 'STRAIGHT'; // default

        if (instruction.includes('Arrive')) {
            actionKey = 'ARRIVED';
        } else if (instruction.includes('Start')) {
            actionKey = 'START';
        } else if (roomType === 'elevator') {
            actionKey = 'ELEVATOR';
        } else if (roomType === 'stairs') {
            actionKey = 'STAIRS';
        } else if (instruction.includes('left') || instruction.includes('Left')) {
            actionKey = 'LEFT_TURN';
        } else if (instruction.includes('right') || instruction.includes('Right')) {
            actionKey = 'RIGHT_TURN';
        }

        // Clean the instruction string by removing text inside brackets like "(Floor 0)"
        const cleanInstructionStr = instruction.replace(/\s*\(.*?\)\s*/g, '').trim();

        // NotificationFeedbackType values: 'success' | 'warning' | 'error'
        // ImpactFeedbackStyle values: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
        // Tag each haptic entry so we know which API to call.
        const N = (style) => ({ fn: 'notification', style }); // notificationAsync
        const I = (style) => ({ fn: 'impact', style });       // impactAsync

        const dictionary = {
            'LEFT_TURN': {
                speech: { en: cleanInstructionStr, hi: 'Aage se baaye mudiye' },
                haptic: [I(Haptics.ImpactFeedbackStyle.Medium), I(Haptics.ImpactFeedbackStyle.Medium)],
            },
            'RIGHT_TURN': {
                speech: { en: cleanInstructionStr, hi: 'Aage se daaye mudiye' },
                haptic: [I(Haptics.ImpactFeedbackStyle.Heavy)],
            },
            'ELEVATOR': {
                speech: { en: cleanInstructionStr, hi: 'Lift lijiye' },
                haptic: [I(Haptics.ImpactFeedbackStyle.Light), I(Haptics.ImpactFeedbackStyle.Medium), I(Haptics.ImpactFeedbackStyle.Light)],
            },
            'STAIRS': {
                speech: { en: cleanInstructionStr, hi: 'Seedhiyon se jaiye' },
                haptic: [I(Haptics.ImpactFeedbackStyle.Medium), I(Haptics.ImpactFeedbackStyle.Light)],
            },
            'STRAIGHT': {
                speech: { en: cleanInstructionStr, hi: `Seedha ${roomName} ki taraf jaiye` },
                haptic: null,
            },
            'START': {
                speech: { en: cleanInstructionStr, hi: `${roomName} se shuruat karein.` },
                haptic: [N(Haptics.NotificationFeedbackType.Success)],
            },
            'ARRIVED': {
                speech: { en: cleanInstructionStr, hi: `Aap ${roomName} pahunch gaye hain` },
                haptic: [N(Haptics.NotificationFeedbackType.Success)],
            },
        };

        const action = dictionary[actionKey];
        if (!action) return;

        // Trigger Voice TTS
        Speech.speak(action.speech[language]);

        // Trigger Haptic Vibration Patterns
        if (action.haptic) {
            action.haptic.forEach(({ fn, style }, index) => {
                setTimeout(() => {
                    if (fn === 'notification') {
                        Haptics.notificationAsync(style).catch(() => {});
                    } else {
                        Haptics.impactAsync(style).catch(() => {});
                    }
                }, index * 300); // stagger multiple bumps by 300ms
            });
        }
    }
};
