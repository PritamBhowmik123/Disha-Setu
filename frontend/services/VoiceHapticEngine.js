import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

// Pre-fetch voices to prevent delay during navigation
let cachedVoices = null;
Speech.getAvailableVoicesAsync().then(voices => {
    cachedVoices = voices;
}).catch(() => {});

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
                speech: {
                    en: `${cleanInstructionStr}. Turn left ahead.`,
                    hi: 'Aage se baaye mudiye',
                    bn: 'Samne theke bam dike ghurun',
                    ta: 'Munnalirundhu idadhu puram thirumbavum',
                    te: 'Mundu nundi edama vaipu thiragandi',
                    mr: 'Pudhun daavikade valaa',
                    kn: 'Mundininda edakke tirugi',
                    pa: 'Agge to khabbe mudo',
                    ml: 'Munnil ninnu idathottu thiriyuka'
                },
                haptic: [I(Haptics.ImpactFeedbackStyle.Medium), I(Haptics.ImpactFeedbackStyle.Medium)],
            },
            'RIGHT_TURN': {
                speech: {
                    en: `${cleanInstructionStr}. Turn right ahead.`,
                    hi: 'Aage se daaye mudiye',
                    bn: 'Samne theke dan dike ghurun',
                    ta: 'Munnalirundhu valadhu puram thirumbavum',
                    te: 'Mundu nundi kudi vaipu thiragandi',
                    mr: 'Pudhun ujavikade valaa',
                    kn: 'Mundininda balakke tirugi',
                    pa: 'Agge to sajje mudo',
                    ml: 'Munnil ninnu valathottu thiriyuka'
                },
                haptic: [I(Haptics.ImpactFeedbackStyle.Heavy)],
            },
            'ELEVATOR': {
                speech: {
                    en: `${cleanInstructionStr}. Take the elevator.`,
                    hi: 'Lift lijiye',
                    bn: 'Lift nin',
                    ta: 'Liftil sellavum',
                    te: 'Lift teesukondi',
                    mr: 'Lift ghya',
                    kn: 'Lift tegedukolli',
                    pa: 'Lift lao',
                    ml: 'Lift edukuka'
                },
                haptic: [I(Haptics.ImpactFeedbackStyle.Light), I(Haptics.ImpactFeedbackStyle.Medium), I(Haptics.ImpactFeedbackStyle.Light)],
            },
            'STAIRS': {
                speech: {
                    en: `${cleanInstructionStr}. Take the stairs.`,
                    hi: 'Seedhiyon se jaiye',
                    bn: 'Siri diye jan',
                    ta: 'Padiyaga sellavum',
                    te: 'Metlu ekkandi',
                    mr: 'Padyavrun jaa',
                    kn: 'Mettilugalanu balasi',
                    pa: 'Pauriya to jao',
                    ml: 'Padiyiloode pokuka'
                },
                haptic: [I(Haptics.ImpactFeedbackStyle.Medium), I(Haptics.ImpactFeedbackStyle.Light)],
            },
            'STRAIGHT': {
                speech: {
                    en: `${cleanInstructionStr}. Head straight towards ${roomName}.`,
                    hi: `Seedha ${roomName} ki taraf jaiye`,
                    bn: `Shoja ${roomName} -er dike jan`,
                    ta: `Neraaga ${roomName} nokki sellavum`,
                    te: `Nerega ${roomName} vaipu vellandi`,
                    mr: `Sarak ${roomName} kade jaa`,
                    kn: `Nera ${roomName} kadege hogi`,
                    pa: `Siddha ${roomName} val jao`,
                    ml: `Nere ${roomName} lottu pokuka`
                },
                haptic: null,
            },
            'START': {
                speech: {
                    en: `${cleanInstructionStr}. Starting from ${roomName}.`,
                    hi: `${roomName} se shuruat karein.`,
                    bn: `${roomName} theke shuru korun.`,
                    ta: `${roomName} inirundhu thodangavum.`,
                    te: `${roomName} nundi prarambhinchandi.`,
                    mr: `${roomName} pasun survaat kara.`,
                    kn: `${roomName} inda prarambhisi.`,
                    pa: `${roomName} to shuru karo.`,
                    ml: `${roomName} l ninnu thudanguka.`
                },
                haptic: [N(Haptics.NotificationFeedbackType.Success)],
            },
            'ARRIVED': {
                speech: {
                    en: `${cleanInstructionStr}. You have arrived at ${roomName}.`,
                    hi: `Aap ${roomName} pahunch gaye hain`,
                    bn: `Apni ${roomName} pouche gechen`,
                    ta: `Neengal ${roomName} vandhadainthumeer`,
                    te: `Meeru ${roomName} cherukunnaru`,
                    mr: `Tumhi ${roomName} pohochla ahat`,
                    kn: `Neevu ${roomName} talupidiri`,
                    pa: `Tussi ${roomName} pahunch gaye ho`,
                    ml: `Ningal ${roomName} ethiyirikkunnu`
                },
                haptic: [N(Haptics.NotificationFeedbackType.Success)],
            },
        };

        const action = dictionary[actionKey];
        if (!action) return;

        // Trigger Voice TTS with fallback to English
        const textToSpeak = action.speech[language] || action.speech['en'];
        
        // Map app language to standard BCP 47 language tags to fetch high-quality regional voices
        const bcp47Tags = {
            en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN',
            te: 'te-IN', mr: 'mr-IN', kn: 'kn-IN', pa: 'pa-IN', ml: 'ml-IN'
        };

        const speechLanguage = bcp47Tags[language] || 'en-IN';

        const speakWithOptions = (voices) => {
            const options = {
                language: speechLanguage,
                pitch: 1.15, // Slightly higher pitch for a clearer, younger human girl-like tone
                rate: 0.9,  // Comfortable conversational pacing
            };

            if (voices && voices.length > 0) {
                // Try exact regional match first (e.g. 'en-IN')
                let langVoices = voices.filter(v => 
                    v.language && v.language.replace('_', '-').toLowerCase() === speechLanguage.toLowerCase()
                );

                // Fallback to primary language match (e.g. any 'en' or 'hi' voice) if region-specific is missing
                if (langVoices.length === 0) {
                    const primaryLang = speechLanguage.split('-')[0].toLowerCase();
                    langVoices = voices.filter(v => 
                        v.language && v.language.toLowerCase().startsWith(primaryLang)
                    );
                }

                if (langVoices.length > 0) {
                    // Intelligent Voice Selection: Pick the clearest, human-like female voice
                    const bestVoice = langVoices.sort((a, b) => {
                        const score = (v) => {
                            let pts = 0;
                            const nameLower = v.name.toLowerCase();
                            
                            // 1. STRONGLY prefer female identifiers and known Indian female voices
                            if (nameLower.includes('female') || nameLower.includes('woman') || nameLower.includes('girl')) pts += 50;
                            if (['lekha', 'isha', 'sangeeta', 'vani', 'kannada', 'pallavi'].some(n => nameLower.includes(n))) pts += 50;
                            
                            // 2. Penalize known male identifiers to strictly enforce the restriction
                            if (['rishi', 'male', 'boy', 'man'].some(n => nameLower.includes(n)) && !nameLower.includes('female')) pts -= 50;

                            // 3. Prioritize high-quality / neural / human-like clarity
                            if (v.quality === 'Enhanced' || v.quality === 'Premium') pts += 20;
                            if (nameLower.includes('network') || nameLower.includes('neural')) pts += 20;

                            // 4. Penalize standard/robotic local voices
                            if (nameLower.includes('local')) pts -= 10;
                            
                            return pts;
                        };
                        return score(b) - score(a);
                    })[0];

                    if (bestVoice && bestVoice.identifier) {
                        options.voice = bestVoice.identifier;
                    }
                }
            }

            Speech.speak(textToSpeak, options);
        };

        // Execute intelligently with zero navigation delay
        if (cachedVoices) {
            speakWithOptions(cachedVoices);
        } else {
            Speech.getAvailableVoicesAsync().then((fetchedVoices) => {
                cachedVoices = fetchedVoices;
                speakWithOptions(fetchedVoices);
            }).catch(() => {
                speakWithOptions(null); // Fallback safety
            });
        }

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
