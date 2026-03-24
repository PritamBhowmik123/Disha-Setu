import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

// Pre-fetch voices to prevent delay during navigation
let cachedVoices = null;
Speech.getAvailableVoicesAsync().then(voices => {
    cachedVoices = voices;
}).catch(() => { });

// ── Deduplication guard ──────────────────────────────────────────────────────
// Tracks the last announced step by a unique key so voice never fires twice
// for the same step, even if the component re-renders or the timer ticks.
let _lastSpokenKey = null;

export const VoiceHapticEngine = {
    /**
     * Triggers voice instructions and haptic vibrations based on the navigation step.
     * Voice fires at most ONCE per unique step (dedup by roomId + stepIndex).
     * @param {Object} step - The direction step object from the routing engine
     * @param {string} language - 'en' | 'hi' | 'bn' | 'ta' | 'te' | 'mr' | 'kn' | 'pa' | 'ml'
     * @param {boolean} [force=false] - Skip dedup check (use for manual "repeat" button)
     */
    triggerInstruction(step, language = 'en', force = false) {
        if (!step) return;

        // ── Deduplication ─────────────────────────────────────────────────────
        const stepKey = `${step.roomId ?? step.roomName}-${step.step}`;
        if (!force && stepKey === _lastSpokenKey) return;   // already announced
        _lastSpokenKey = stepKey;

        // Stop any currently-playing speech so instructions never overlap
        Speech.stop();

        const { instruction, roomType, roomName, floorNumber } = step;

        // ── Classify action ────────────────────────────────────────────────────
        let actionKey = 'STRAIGHT';
        if (/arrive|arrived|destination/i.test(instruction))        actionKey = 'ARRIVED';
        else if (/start|begin|depart/i.test(instruction))           actionKey = 'START';
        else if (roomType === 'elevator' || roomType === 'lift')     actionKey = 'ELEVATOR';
        else if (roomType === 'stairs' || roomType === 'staircase')  actionKey = 'STAIRS';
        else if (/left/i.test(instruction))                          actionKey = 'LEFT_TURN';
        else if (/right/i.test(instruction))                         actionKey = 'RIGHT_TURN';

        // Floor phrasing helper
        const floorSuffix = floorNumber !== undefined
            ? ` to Floor ${floorNumber === 0 ? 'G (ground)' : floorNumber}`
            : '';

        const N = (style) => ({ fn: 'notification', style });
        const I = (style) => ({ fn: 'impact', style });

        const dictionary = {
            LEFT_TURN: {
                speech: {
                    en: `Turn left and continue toward ${roomName}.`,
                    hi: `Baaye mudiye aur ${roomName} ki taraf badhein.`,
                    bn: `Bam dike ghurun ebong ${roomName} dike egiye jan.`,
                    ta: `Idadhu puram thirumbi ${roomName} nokki sellavum.`,
                    te: `Edama vaipu thiragi ${roomName} vaipu vellandi.`,
                    mr: `Daavikade vala ani ${roomName} kade jaa.`,
                    kn: `Edakke tirugi ${roomName} kadege hogi.`,
                    pa: `Khabbe mudo te ${roomName} wal jao.`,
                    ml: `Idathottu thirini ${roomName} lottu pokuka.`
                },
                haptic: [I(Haptics.ImpactFeedbackStyle.Medium), I(Haptics.ImpactFeedbackStyle.Medium)],
            },
            RIGHT_TURN: {
                speech: {
                    en: `Turn right and head toward ${roomName}.`,
                    hi: `Daaye mudiye aur ${roomName} ki taraf jaiye.`,
                    bn: `Dan dike ghurun ebong ${roomName} dike jan.`,
                    ta: `Valadhu puram thirumbi ${roomName} nokki sellavum.`,
                    te: `Kudi vaipu thiragi ${roomName} vaipu vellandi.`,
                    mr: `Ujavikade vala ani ${roomName} kade jaa.`,
                    kn: `Balakke tirugi ${roomName} kadege hogi.`,
                    pa: `Sajje mudo te ${roomName} wal jao.`,
                    ml: `Valathottu thirini ${roomName} lottu pokuka.`
                },
                haptic: [I(Haptics.ImpactFeedbackStyle.Heavy)],
            },
            ELEVATOR: {
                speech: {
                    en: `Take the elevator${floorSuffix}. Then head toward ${roomName}.`,
                    hi: `Lift lijiye${floorSuffix}. Phir ${roomName} ki taraf jaiye.`,
                    bn: `Lift nin${floorSuffix}. Tarpor ${roomName} dike jan.`,
                    ta: `Liftil sellavum${floorSuffix}. Appuram ${roomName} nokki sellavum.`,
                    te: `Lift teesukondi${floorSuffix}. Tarvatha ${roomName} vaipu vellandi.`,
                    mr: `Lift ghya${floorSuffix}. Mag ${roomName} kade jaa.`,
                    kn: `Lift tegedukolli${floorSuffix}. Nantar ${roomName} kadege hogi.`,
                    pa: `Lift lao${floorSuffix}. Phir ${roomName} wal jao.`,
                    ml: `Lift edukuka${floorSuffix}. Pinne ${roomName} lottu pokuka.`
                },
                haptic: [I(Haptics.ImpactFeedbackStyle.Light), I(Haptics.ImpactFeedbackStyle.Medium), I(Haptics.ImpactFeedbackStyle.Light)],
            },
            STAIRS: {
                speech: {
                    en: `Use the stairs${floorSuffix}. Continue toward ${roomName}.`,
                    hi: `Seedhiyon se jaiye${floorSuffix}. ${roomName} ki taraf badhein.`,
                    bn: `Siri diye jan${floorSuffix}. ${roomName} dike egiye jan.`,
                    ta: `Padiyaga sellavum${floorSuffix}. ${roomName} nokki thodarvum.`,
                    te: `Metlu ekkandi${floorSuffix}. ${roomName} vaipu vellandi.`,
                    mr: `Padyavrun jaa${floorSuffix}. ${roomName} kade chala.`,
                    kn: `Mettilugalanu balasi${floorSuffix}. ${roomName} kadege hogi.`,
                    pa: `Pauriya to jao${floorSuffix}. ${roomName} wal jao.`,
                    ml: `Padiyiloode pokuka${floorSuffix}. ${roomName} lottu thodarnnu pokuka.`
                },
                haptic: [I(Haptics.ImpactFeedbackStyle.Medium), I(Haptics.ImpactFeedbackStyle.Light)],
            },
            STRAIGHT: {
                speech: {
                    en: `Go straight for a few meters toward ${roomName}.`,
                    hi: `Kuch kadam seedha jaiye, ${roomName} ki taraf.`,
                    bn: `Kichutu shoja egiye jan, ${roomName} dike.`,
                    ta: `Sila meter neraaga sellavum, ${roomName} nokki.`,
                    te: `Kొంత dooram nera vellandi, ${roomName} vaipu.`,
                    mr: `Kahi meter sarak jaa, ${roomName} kade.`,
                    kn: `Svalpa doora nera hogi, ${roomName} kadege.`,
                    pa: `Kuch kadam seedha jao, ${roomName} wal.`,
                    ml: `Kure meetar nere pokuka, ${roomName} lottu.`
                },
                haptic: null,
            },
            START: {
                speech: {
                    en: `Navigation started. You are at ${roomName}. Follow the route ahead.`,
                    hi: `Navigation shuru. Aap ${roomName} par hain. Aage ke route ka anusaran karein.`,
                    bn: `Navigation shuru. Apni ${roomName} te achen. Samner route anusaran korun.`,
                    ta: `Navigation thondangivitta. Neengal ${roomName} il irukkeengal. Route-ai pinn thodaravum.`,
                    te: `Navigation start aindi. Meeru ${roomName} lo unnaru. Mundu route follow cheyandi.`,
                    mr: `Navigation suruu zali. Tumhi ${roomName} la ahat. Pudhe route follow kara.`,
                    kn: `Navigation shuru aiytu. Neevu ${roomName} nalli iddiri. Mundina route follow madi.`,
                    pa: `Navigation shuru ho gayi. Tusi ${roomName} te ho. Age route follow karo.`,
                    ml: `Navigation thuadangi. Ningal ${roomName} il anu. Munnil route pinthudarchukuka.`
                },
                haptic: [N(Haptics.NotificationFeedbackType.Success)],
            },
            ARRIVED: {
                speech: {
                    en: `You have arrived at ${roomName}. Your destination is ahead.`,
                    hi: `Aap ${roomName} pahunch gaye hain. Aapki manzil saamne hai.`,
                    bn: `Apni ${roomName} pouche gechen. Apnar destination saamne.`,
                    ta: `Neengal ${roomName} vandhadainthumeer. Ungal destination munnale.`,
                    te: `Meeru ${roomName} cherukunnaru. Meeru destination mundule.`,
                    mr: `Tumhi ${roomName} pohochla ahat. Tumcha destination samor aahe.`,
                    kn: `Neevu ${roomName} talupidiri. Nimma destination mundide.`,
                    pa: `Tussi ${roomName} pahunch gaye ho. Tumhada destination samne hai.`,
                    ml: `Ningal ${roomName} ethiyirikkunnu. Ningalude destination munnilaanu.`
                },
                haptic: [N(Haptics.NotificationFeedbackType.Success)],
            },
        };

        const action = dictionary[actionKey];
        if (!action) return;

        // ── TTS with voice selection ───────────────────────────────────────────
        const bcp47Tags = {
            en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN',
            te: 'te-IN', mr: 'mr-IN', kn: 'kn-IN', pa: 'pa-IN', ml: 'ml-IN'
        };
        const speechLanguage = bcp47Tags[language] || 'en-IN';
        const textToSpeak = action.speech[language] || action.speech['en'];

        const speakWithOptions = (voices) => {
            const options = { language: speechLanguage, pitch: 1.1, rate: 0.9 };

            if (voices?.length > 0) {
                let langVoices = voices.filter(v =>
                    v.language?.replace('_', '-').toLowerCase() === speechLanguage.toLowerCase()
                );
                if (!langVoices.length) {
                    const primary = speechLanguage.split('-')[0].toLowerCase();
                    langVoices = voices.filter(v => v.language?.toLowerCase().startsWith(primary));
                }
                if (langVoices.length > 0) {
                    const bestVoice = langVoices.sort((a, b) => {
                        const score = v => {
                            let pts = 0;
                            const n = v.name.toLowerCase();
                            if (/female|woman|girl/.test(n)) pts += 50;
                            if (['lekha', 'isha', 'sangeeta', 'vani', 'pallavi'].some(k => n.includes(k))) pts += 50;
                            if (/rishi|male|boy|man/.test(n) && !n.includes('female')) pts -= 50;
                            if (v.quality === 'Enhanced' || v.quality === 'Premium') pts += 20;
                            if (/network|neural/.test(n)) pts += 20;
                            if (n.includes('local')) pts -= 10;
                            return pts;
                        };
                        return score(b) - score(a);
                    })[0];
                    if (bestVoice?.identifier) options.voice = bestVoice.identifier;
                }
            }
            Speech.speak(textToSpeak, options);
        };

        if (cachedVoices) {
            speakWithOptions(cachedVoices);
        } else {
            Speech.getAvailableVoicesAsync().then(v => {
                cachedVoices = v;
                speakWithOptions(v);
            }).catch(() => speakWithOptions(null));
        }

        // ── Haptic ────────────────────────────────────────────────────────────
        if (action.haptic) {
            action.haptic.forEach(({ fn, style }, i) => {
                setTimeout(() => {
                    if (fn === 'notification') Haptics.notificationAsync(style).catch(() => {});
                    else Haptics.impactAsync(style).catch(() => {});
                }, i * 300);
            });
        }
    },

    /** Reset dedup guard — call this when a new route starts */
    reset() {
        _lastSpokenKey = null;
        Speech.stop();
    },
};
