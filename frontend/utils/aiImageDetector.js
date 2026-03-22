/**
 * utils/aiImageDetector.js
 *
 * Lightweight, client-side AI-generated image detector.
 * Runs entirely on-device — no external API, no perceptible delay.
 *
 * Detection strategy (heuristics, each adds suspicion score):
 *  1. Missing/absent EXIF data  (real camera photos always have EXIF)
 *  2. Power-of-2 exact dimensions (512×512, 1024×1024 — AI default outputs)
 *  3. Known AI-tool filename patterns (ComfyUI_, stable_, sdxl_, aiart_…)
 *  4. Exact-square aspect ratio with high resolution
 *  5. PNG format from library (camera photos are almost never PNG)
 *
 * Returns:
 *   'real'      — image passes; allow submission
 *   'ai'        — image is likely AI-generated; block submission
 *   'uncertain' — not enough signal; fail-safe → allow submission
 */

/**
 * Check if a number is a power of 2 (common AI output sizes: 512, 768, 1024, 1280, …)
 */
const isPowerOfTwo = (n) => n > 0 && (n & (n - 1)) === 0;

/**
 * Common AI art / generation tool filename prefixes and patterns
 */
const AI_FILENAME_PATTERNS = [
    /^comfyui[_\-]/i,
    /^stable[_\-\s]diff/i,
    /^sdxl[_\-]/i,
    /^aiart[_\-]/i,
    /^midjourney[_\-]/i,
    /^dalle[_\-]/i,
    /^dall[\s\-]?e[_\-]/i,
    /^flux[_\-]/i,
    /^generated[_\-]/i,
    /^ai[_\-]?gen/i,
    /^image_[\d]{4,}/i,    // image_0001.png style (common AI export)
    /^\d{8,}_\d+\.png$/i,  // pure numeric names (Midjourney)
];

/**
 * Heuristic weights — tune thresholds without changing callers
 */
const SCORE_AI_THRESHOLD = 2; // >= this → 'ai'
const SCORE_UNCERTAIN_THRESHOLD = 1; // >= this → 'uncertain' (if not already 'ai')

/**
 * Main detector function.
 *
 * @param {object} imageAsset — asset object from expo-image-picker result.assets[0]
 *   Expected fields: { uri, width, height, fileName, type, exif }
 * @returns {Promise<'real'|'ai'|'uncertain'>}
 */
export const detectAIImage = async (imageAsset) => {
    try {
        let score = 0;
        const { width = 0, height = 0, fileName = '', type = '', exif } = imageAsset;

        // ── Heuristic 1: EXIF absence ──────────────────────────────────────
        // Real camera shots always embed EXIF (Make, Model, DateTimeOriginal…).
        // AI generators produce flat images with no EXIF at all.
        const hasExif = exif && Object.keys(exif).length > 0;
        const hasCameraExif = hasExif && (
            exif.Make || exif.Model || exif.DateTimeOriginal ||
            exif.FocalLength || exif.ExposureTime || exif.ISOSpeedRatings
        );

        if (!hasCameraExif) {
            score += 1; // No real camera EXIF → suspicious
        }

        // ── Heuristic 2: Power-of-2 dimensions ────────────────────────────
        // AI models default to 512, 768, 1024, 1280, 1536, 2048 px outputs.
        if (width > 0 && height > 0) {
            const wPow2 = isPowerOfTwo(width);
            const hPow2 = isPowerOfTwo(height);
            if (wPow2 && hPow2) {
                score += 2; // Both dims power-of-2 → strong AI signal
            } else if (wPow2 || hPow2) {
                score += 1; // One dim is power-of-2 → mild signal
            }
        }

        // ── Heuristic 3: Exact square high-res ────────────────────────────
        // AI tools frequently output perfect squares (1024×1024, 1536×1536…)
        if (width === height && width >= 512) {
            score += 1;
        }

        // ── Heuristic 4: Filename pattern ──────────────────────────────────
        const name = (fileName || '').toLowerCase().trim();
        if (name) {
            for (const pattern of AI_FILENAME_PATTERNS) {
                if (pattern.test(name)) {
                    score += 2; // Known AI export filename → strong signal
                    break;
                }
            }
        }

        // ── Heuristic 5: PNG from library ──────────────────────────────────
        // Real photos in gallery are JPEG. PNGs from gallery are often
        // screenshots or AI-generated images (both are mildly suspicious).
        const isPng = (type || '').toLowerCase().includes('png') ||
                      (name.endsWith('.png'));
        if (isPng && !hasCameraExif) {
            score += 1; // PNG with no camera EXIF is suspicious
        }

        // ── Decision ───────────────────────────────────────────────────────
        if (score >= SCORE_AI_THRESHOLD) {
            // Allow real photos that happen to lack EXIF (some phones/apps strip it)
            // but have natural dimensions — only block when multiple signals align.
            if (score >= SCORE_AI_THRESHOLD + 1 || (score >= SCORE_AI_THRESHOLD && !hasCameraExif)) {
                return 'ai';
            }
        }

        if (score >= SCORE_UNCERTAIN_THRESHOLD) {
            return 'uncertain';
        }

        return 'real';
    } catch (_err) {
        // Any runtime failure → fail-safe, allow submission
        return 'uncertain';
    }
};
